from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    environment: Literal["development", "staging", "production"] = "development"
    frontend_url: str = "http://localhost:3000"
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/sniper"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"

    # SendGrid
    sendgrid_api_key: str = ""
    from_email: str = "noreply@sniperapp.com"

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""

    # Rate limiting
    rate_limit_auth: str = "10/minute"
    rate_limit_default: str = "100/minute"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
