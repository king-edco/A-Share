"""Student registration, login, refresh, and profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_student
from app.core.security import (
    create_student_access_token,
    create_student_refresh_token,
    decode_token_actor,
    hash_password,
    verify_password,
)
from app.db.session import get_async_session
from app.models import Exam, Series, Student, StudentSubject, Subject
from app.schemas.auth import AccessTokenResponse, TokenResponse
from app.schemas.students import (
    StudentLoginRequest,
    StudentProfileRead,
    StudentRefreshRequest,
    StudentRegisterRequest,
)
from app.services.phone import InvalidPhoneNumber, normalize_phone_number
from app.services.subject_pool import (
    InvalidSubjectSelection,
    validate_subject_selection,
)

router = APIRouter(prefix="/api/v1", tags=["students"])

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid phone number or PIN.",
)


@router.post("/students/register", response_model=TokenResponse, status_code=201)
async def register(
    body: StudentRegisterRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    try:
        phone = normalize_phone_number(body.phone_number)
    except InvalidPhoneNumber as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    duplicate = (
        await session.execute(select(Student).where(Student.phone_number == phone))
    ).scalar()
    if duplicate is not None:
        raise HTTPException(
            status_code=409,
            detail="This phone number is already registered.",
        )

    try:
        subject_ids = await validate_subject_selection(
            session, body.exam_id, body.series_id, body.subject_ids
        )
    except InvalidSubjectSelection as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    student = Student(
        phone_number=phone,
        pin_hash=hash_password(body.pin),
        full_name=body.full_name,
        school=body.school,
        city=body.city,
        exam_id=body.exam_id,
        series_id=body.series_id,
    )
    session.add(student)
    await session.flush()
    for subject_id in subject_ids:
        session.add(StudentSubject(student_id=student.id, subject_id=subject_id))
    await session.commit()

    return TokenResponse(
        access_token=create_student_access_token(student.id),
        refresh_token=create_student_refresh_token(student.id),
    )


@router.post("/auth/student/login", response_model=TokenResponse)
async def student_login(
    body: StudentLoginRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    # The phone number is normalized before lookup; rejection uses the same
    # generic message whether the number exists or the PIN is wrong.
    try:
        phone = normalize_phone_number(body.phone_number)
    except InvalidPhoneNumber:
        raise _UNAUTHORIZED

    student = (
        await session.execute(select(Student).where(Student.phone_number == phone))
    ).scalar()
    if student is None or not student.is_active:
        raise _UNAUTHORIZED
    if not verify_password(body.pin, student.pin_hash):
        raise _UNAUTHORIZED

    return TokenResponse(
        access_token=create_student_access_token(student.id),
        refresh_token=create_student_refresh_token(student.id),
    )


@router.post("/auth/student/refresh", response_model=AccessTokenResponse)
async def student_refresh(
    body: StudentRefreshRequest,
    session: AsyncSession = Depends(get_async_session),
) -> AccessTokenResponse:
    """Exchange a valid student refresh token for a new access token.

    The student must still exist and be active; deactivated or deleted
    students lose refresh capability immediately.
    """
    student_id, actor_type = decode_token_actor(
        body.refresh_token, expected_type="refresh"
    )
    if student_id is None or actor_type != "student":
        raise _UNAUTHORIZED
    student = await session.get(Student, student_id)
    if student is None or not student.is_active:
        raise _UNAUTHORIZED
    return AccessTokenResponse(
        access_token=create_student_access_token(student_id)
    )


@router.get("/students/me", response_model=StudentProfileRead)
async def student_me(
    student: Student = Depends(get_current_student),
    session: AsyncSession = Depends(get_async_session),
) -> StudentProfileRead:
    exam = await session.get(Exam, student.exam_id)
    series = await session.get(Series, student.series_id)
    subjects_result = await session.execute(
        select(StudentSubject, Subject)
        .join(Subject, StudentSubject.subject_id == Subject.id)
        .where(StudentSubject.student_id == student.id)
    )
    return StudentProfileRead(
        id=student.id,
        phone_number=student.phone_number,
        full_name=student.full_name,
        school=student.school,
        city=student.city,
        exam_id=student.exam_id,
        exam_name=exam.name if exam else "",
        series_id=student.series_id,
        series_label=series.label if series else "",
        subjects=[
            {"subject_id": link.subject_id, "name": subject.name}
            for link, subject in subjects_result.all()
        ],
    )
