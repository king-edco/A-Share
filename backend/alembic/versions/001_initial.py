"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "education_systems",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
    )

    op.create_table(
        "exams",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("education_system_id", UUID(as_uuid=True), sa.ForeignKey("education_systems.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
    )

    op.create_table(
        "tracks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("exam_id", UUID(as_uuid=True), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("subject_pool_mode", sa.String(20), nullable=False),
        sa.Column("min_subjects", sa.Integer, nullable=False),
        sa.Column("max_subjects", sa.Integer, nullable=False),
    )

    op.create_table(
        "subjects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("track_id", UUID(as_uuid=True), sa.ForeignKey("tracks.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_compulsory", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("coefficient", sa.Float, nullable=True),
    )

    op.create_table(
        "chapters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("subject_id", UUID(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("order", sa.Integer, nullable=False, server_default=sa.text("0")),
    )

    op.create_table(
        "lessons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("chapter_id", UUID(as_uuid=True), sa.ForeignKey("chapters.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("content", sa.JSON, nullable=True),
    )

    op.create_table(
        "concepts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("subject_id", UUID(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("exam_frequency_score", sa.Float, nullable=True),
        sa.Column("last_seen_year", sa.Integer, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
    )

    op.create_table(
        "admin_users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("invited_by", UUID(as_uuid=True), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("invite_token", sa.String(255), nullable=True),
        sa.Column("invite_status", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "questions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("chapter_id", UUID(as_uuid=True), sa.ForeignKey("chapters.id"), nullable=False),
        sa.Column("lesson_id", UUID(as_uuid=True), sa.ForeignKey("lessons.id"), nullable=True),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("year", sa.Integer, nullable=True),
        sa.Column("options", sa.JSON, nullable=True),
        sa.Column("correct_answer", sa.Text, nullable=True),
        sa.Column("answer_field", sa.Text, nullable=True),
        sa.Column("solution_content", sa.JSON, nullable=True),
        sa.Column("difficulty_initial", sa.Float, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("admin_users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "question_concepts",
        sa.Column("question_id", UUID(as_uuid=True), sa.ForeignKey("questions.id"), primary_key=True),
        sa.Column("concept_id", UUID(as_uuid=True), sa.ForeignKey("concepts.id"), primary_key=True),
    )

    op.create_table(
        "contributor_subjects",
        sa.Column("admin_user_id", UUID(as_uuid=True), sa.ForeignKey("admin_users.id"), primary_key=True),
        sa.Column("subject_id", UUID(as_uuid=True), sa.ForeignKey("subjects.id"), primary_key=True),
    )

    op.create_table(
        "student_users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("school", sa.String(200), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("language_pref", sa.String(5), nullable=False),
        sa.Column("education_system_id", UUID(as_uuid=True), sa.ForeignKey("education_systems.id"), nullable=False),
        sa.Column("exam_id", UUID(as_uuid=True), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("track_id", UUID(as_uuid=True), sa.ForeignKey("tracks.id"), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "student_subjects",
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("student_users.id"), primary_key=True),
        sa.Column("subject_id", UUID(as_uuid=True), sa.ForeignKey("subjects.id"), primary_key=True),
    )

    op.create_table(
        "student_concept_states",
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("student_users.id"), primary_key=True),
        sa.Column("concept_id", UUID(as_uuid=True), sa.ForeignKey("concepts.id"), primary_key=True),
        sa.Column("stability", sa.Float, nullable=True),
        sa.Column("difficulty", sa.Float, nullable=True),
        sa.Column("retrievability", sa.Float, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reps", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("lapses", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("last_review_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "student_question_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("student_users.id"), nullable=False),
        sa.Column("question_id", UUID(as_uuid=True), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("concept_id", UUID(as_uuid=True), sa.ForeignKey("concepts.id"), nullable=False),
        sa.Column("raw_answer", sa.Text, nullable=True),
        sa.Column("is_correct", sa.Boolean, nullable=False),
        sa.Column("ai_grading_note", sa.Text, nullable=True),
        sa.Column("response_time_seconds", sa.Integer, nullable=True),
        sa.Column("rating", sa.String(10), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("student_question_logs")
    op.drop_table("student_concept_states")
    op.drop_table("student_subjects")
    op.drop_table("student_users")
    op.drop_table("contributor_subjects")
    op.drop_table("question_concepts")
    op.drop_table("questions")
    op.drop_table("admin_users")
    op.drop_table("concepts")
    op.drop_table("lessons")
    op.drop_table("chapters")
    op.drop_table("subjects")
    op.drop_table("tracks")
    op.drop_table("exams")
    op.drop_table("education_systems")
