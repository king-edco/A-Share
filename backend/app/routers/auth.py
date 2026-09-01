from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, oauth2_scheme, decode_token
from app.models.models import StudentUser, StudentSubject
from app.schemas.student import (
    StudentSignupRequest,
    StudentLoginRequest,
    StudentResponse,
    TokenResponse,
)

router = APIRouter()


def get_current_student(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> StudentUser:
    payload = decode_token(token)
    student_id = payload.get("sub")
    if student_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    student = db.query(StudentUser).filter(StudentUser.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=401, detail="Student not found")
    return student


@router.post("/signup", response_model=StudentResponse)
def signup_student(request: StudentSignupRequest, db: Session = Depends(get_db)):
    existing = db.query(StudentUser).filter(StudentUser.phone == request.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    new_student = StudentUser(
        full_name=request.full_name,
        phone=request.phone,
        email=request.email,
        password_hash=get_password_hash(request.password),
        school=request.school,
        city=request.city,
        language_pref=request.language_pref,
        education_system_id=request.education_system_id,
        exam_id=request.exam_id,
        track_id=request.track_id,
    )
    db.add(new_student)
    db.flush()

    for subject_id in request.subject_ids:
        db.add(StudentSubject(student_id=new_student.id, subject_id=subject_id))

    db.commit()
    db.refresh(new_student)
    return new_student


@router.post("/login", response_model=TokenResponse)
def login_student(request: StudentLoginRequest, db: Session = Depends(get_db)):
    student = db.query(StudentUser).filter(StudentUser.phone == request.phone).first()
    if not student or not verify_password(request.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": str(student.id)})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=StudentResponse)
def get_current_student_profile(current_student: StudentUser = Depends(get_current_student)):
    return current_student
