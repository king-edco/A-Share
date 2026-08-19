"""Application settings loaded from environment variables.

No credentials are hardcoded: every value comes from the environment. A local
`.env` file next to the application is also honored for convenience during
development.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the API service."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Async SQLAlchemy connection string, e.g.
    # postgresql+asyncpg://user:password@host:5432/dbname
    database_url: str | None = None


settings = Settings()
