"""FastAPI application entrypoint."""

from fastapi import FastAPI

from app.api.v1.routers import exams, health, series

app = FastAPI(
    title="A-Share API",
    description="Backend skeleton for the exam-prep platform.",
    version="0.1.0",
)

app.include_router(health.router)
app.include_router(exams.router)
app.include_router(series.router)
