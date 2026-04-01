import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret-key-in-production-32chars!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@sigambling.com")

    DAILY_TOKEN_BONUS: float = 100.0
    MIN_BET: float = 1.0
    MAX_BET: float = 10000.0
    HOUSE_EDGE: float = 0.05

    class Config:
        env_file = ".env"


settings = Settings()
