"""Application configuration via Pydantic Settings."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Environment ─────────────────────────────────────
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True, alias="DEBUG")

    # ── App ─────────────────────────────────────────────
    app_name: str = "USCP API"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost"],
        alias="CORS_ORIGINS",
    )

    # ── Database ────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://uscp:uscp-dev-password@localhost:5432/uscp",
        alias="DATABASE_URL",
    )

    # ── Redis ───────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # ── JWT ─────────────────────────────────────────────
    jwt_secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        alias="JWT_SECRET_KEY",
    )
    jwt_refresh_secret_key: str = Field(
        default="dev-refresh-secret-key-change-in-production",
        alias="JWT_REFRESH_SECRET_KEY",
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # ── MinIO (S3) ──────────────────────────────────────
    minio_endpoint: str = Field(default="localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="minioadmin123", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(default="uscp-uploads", alias="MINIO_BUCKET")
    minio_secure: bool = Field(default=False, alias="MINIO_SECURE")

    # ── OAuth2 ──────────────────────────────────────────
    kakao_client_id: str = Field(default="", alias="KAKAO_CLIENT_ID")
    kakao_client_secret: str = Field(default="", alias="KAKAO_CLIENT_SECRET")
    kakao_redirect_uri: str = Field(default="", alias="KAKAO_REDIRECT_URI")

    naver_client_id: str = Field(default="", alias="NAVER_CLIENT_ID")
    naver_client_secret: str = Field(default="", alias="NAVER_CLIENT_SECRET")
    naver_redirect_uri: str = Field(default="", alias="NAVER_REDIRECT_URI")

    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(default="", alias="GOOGLE_REDIRECT_URI")

    # ── External APIs ───────────────────────────────────
    vms_mode: str = Field(default="mock", alias="VMS_MODE")  # mock / real
    vms_api_key: str = Field(default="", alias="VMS_API_KEY")
    vms_api_url: str = Field(default="", alias="VMS_API_URL")
    portal_1365_api_key: str = Field(default="", alias="PORTAL_1365_API_KEY")
    portal_1365_api_url: str = Field(default="", alias="PORTAL_1365_API_URL")

    # ── SMTP ────────────────────────────────────────────
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="noreply@uscp.local", alias="SMTP_FROM")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")
    mail_dev_mode: bool = Field(default=True, alias="MAIL_DEV_MODE")
    frontend_url: str = Field(
        default="http://localhost:3800", alias="FRONTEND_URL"
    )

    # ── Monitoring ──────────────────────────────────────
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
