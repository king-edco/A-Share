"""ORM models package: re-exports the declarative base and every model."""

from app.models.admin import Admin
from app.models.admin_role import AdminRole
from app.models.base import Base
from app.models.chapter import Chapter
from app.models.exam import Exam
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.series import Series
from app.models.series_subject import SeriesSubject
from app.models.subject import Subject

__all__ = [
    "Admin",
    "AdminRole",
    "Base",
    "Chapter",
    "Exam",
    "Permission",
    "Role",
    "RolePermission",
    "Series",
    "SeriesSubject",
    "Subject",
]
