"""FastAPI application entrypoint."""

from fastapi import FastAPI

from app.api.v1.routers import (
    admin_accounts,
    admin_catalog,
    auth,
    chapters,
    exams,
    health,
    invitations,
    series,
)

app = FastAPI(
    title="A-Share API",
    description="Backend skeleton for the exam-prep platform.",
    version="0.1.0",
)

app.include_router(health.router)
app.include_router(exams.router)
app.include_router(series.router)
app.include_router(chapters.router)
app.include_router(auth.router)
app.include_router(admin_catalog.router)
app.include_router(admin_accounts.router)
app.include_router(invitations.router)
