# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str
    MONGO_DB: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REDIS_URL: str = "redis://localhost:6379"  # ← add this with default
    ORS_API_KEY: str ="" # ← add this for OpenRouteService API key
    class Config:
        env_file = ".env"

settings = Settings()