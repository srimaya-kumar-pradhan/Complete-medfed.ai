"""Application configuration using environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "DORI"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    # Database (defaults to local SQLite for instant zero-dependency running, or PostgreSQL in Docker)
    database_url: str = "sqlite:///./dori.db"

    # Authentication
    jwt_secret: str = "dev-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Security
    encryption_key: str = "dev-encryption-key-change-in-production"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:5174"
    rate_limit_per_minute: int = 60
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # External services
    sms_provider_key: str = "mock"
    voice_provider_key: str = "mock"
    abdm_api_url: str = "mock"
    abdm_client_id: str = "mock"
    abdm_client_secret: str = "mock"
    esanjeevani_api_url: str = "mock"
    esanjeevani_api_key: str = "mock"

    # Storage
    storage_backend: str = "local"
    storage_path: str = "./storage"

    # ML / Federated
    model_provider: str = "medfed"
    federated_node_id: str = "dev-node-001"
    medfed_model_path: str = "C:/Users/srinu/Music/master fed/MedFed.ai-main/MedFed.ai-main/models/global/current/model.pth"
    medfed_repo_path: str = "C:/Users/srinu/Music/master fed/MedFed.ai-main/MedFed.ai-main"
    medfed_device: str = "auto"
    medfed_model_name: str = "MedFed DenseNet121-CheXNet-14Class"
    medfed_model_version: str = "v1.3 (Fed-FibAvg Global)"
    medfed_max_upload_bytes: int = 20 * 1024 * 1024  # 20 MB
    medfed_dataset_path: str = "C:/Users/srinu/Music/fedlearning/DataSET"

    # SMTP / Real Email Alerts
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_secure: bool = False
    smtp_user: str = "sihdori7@gmail.com"
    smtp_password: str = "zmay dnzr ktgx mrab"
    smtp_from: str = "sihdori7@gmail.com"
    email: str = "sihdori7@gmail.com"
    app_psw: str = "zmay dnzr ktgx mrab"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
