import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class EducationSystem(Base):
    __tablename__ = "education_systems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)  # "anglophone" | "francophone"

    exams = relationship("Exam", back_populates="education_system")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    education_system_id = Column(UUID(as_uuid=True), ForeignKey("education_systems.id"), nullable=False)
    name = Column(String(100), nullable=False)

    education_system = relationship("EducationSystem", back_populates="exams")
    tracks = relationship("Track", back_populates="exam")


class Track(Base):
    __tablename__ = "tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    name = Column(String(100), nullable=False)
    subject_pool_mode = Column(String(20), nullable=False)  # "open" | "closed"
    min_subjects = Column(Integer, nullable=False)
    max_subjects = Column(Integer, nullable=False)

    exam = relationship("Exam", back_populates="tracks")
    subjects = relationship("Subject", back_populates="track")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    track_id = Column(UUID(as_uuid=True), ForeignKey("tracks.id"), nullable=False)
    name = Column(String(100), nullable=False)
    is_compulsory = Column(Boolean, nullable=False, default=False)
    coefficient = Column(Float, nullable=True)

    track = relationship("Track", back_populates="subjects")
    chapters = relationship("Chapter", back_populates="subject")
    concepts = relationship("Concept", back_populates="subject")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    order = Column(Integer, nullable=False, default=0)

    subject = relationship("Subject", back_populates="chapters")
    lessons = relationship("Lesson", back_populates="chapter")
    questions = relationship("Question", back_populates="chapter")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=False)
    title = Column(String(200), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    content = Column(JSON, nullable=True)

    chapter = relationship("Chapter", back_populates="lessons")
    questions = relationship("Question", back_populates="lesson")


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    exam_frequency_score = Column(Float, nullable=True)
    last_seen_year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    subject = relationship("Subject", back_populates="concepts")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False)  # "super_admin" | "admin" | "contributor"
    invited_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    invite_token = Column(String(255), nullable=True)
    invite_status = Column(String(20), nullable=True)  # "pending" | "accepted"
    created_at = Column(DateTime(timezone=True), default=utcnow)

    inviter = relationship("AdminUser", remote_side=[id], backref="invited_users")


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=True)
    type = Column(String(10), nullable=False)  # "qcm" | "free"
    source = Column(String(20), nullable=False)  # "admin_created" | "past_paper"
    year = Column(Integer, nullable=True)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=True)
    answer_field = Column(Text, nullable=True)
    solution_content = Column(JSON, nullable=True)
    difficulty_initial = Column(Float, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    chapter = relationship("Chapter", back_populates="questions")
    lesson = relationship("Lesson", back_populates="questions")
    creator = relationship("AdminUser")


class QuestionConcept(Base):
    __tablename__ = "question_concepts"

    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), primary_key=True)
    concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id"), primary_key=True)


class ContributorSubject(Base):
    __tablename__ = "contributor_subjects"

    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), primary_key=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), primary_key=True)


class StudentUser(Base):
    __tablename__ = "student_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(200), nullable=False)
    school = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    language_pref = Column(String(5), nullable=False)  # "fr" | "en"
    education_system_id = Column(UUID(as_uuid=True), ForeignKey("education_systems.id"), nullable=False)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    track_id = Column(UUID(as_uuid=True), ForeignKey("tracks.id"), nullable=False)
    phone = Column(String(20), nullable=False, unique=True)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    education_system = relationship("EducationSystem")
    exam = relationship("Exam")
    track = relationship("Track")


class StudentSubject(Base):
    __tablename__ = "student_subjects"

    student_id = Column(UUID(as_uuid=True), ForeignKey("student_users.id"), primary_key=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), primary_key=True)


class StudentConceptState(Base):
    __tablename__ = "student_concept_states"

    student_id = Column(UUID(as_uuid=True), ForeignKey("student_users.id"), primary_key=True)
    concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id"), primary_key=True)
    stability = Column(Float, nullable=True)
    difficulty = Column(Float, nullable=True)
    retrievability = Column(Float, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    reps = Column(Integer, nullable=False, default=0)
    lapses = Column(Integer, nullable=False, default=0)
    last_review_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("StudentUser")
    concept = relationship("Concept")


class StudentQuestionLog(Base):
    __tablename__ = "student_question_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("student_users.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False)
    raw_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=False)
    ai_grading_note = Column(Text, nullable=True)
    response_time_seconds = Column(Integer, nullable=True)
    rating = Column(String(10), nullable=True)  # "Again" | "Hard" | "Good" | "Easy"
    created_at = Column(DateTime(timezone=True), default=utcnow)

    student = relationship("StudentUser")
    question = relationship("Question")
    concept = relationship("Concept")
