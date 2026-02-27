"""应用配置"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    ai_api_key: str = os.getenv("AI_API_KEY", "")
    ai_base_url: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
    ai_model: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/english_learning.db")
    rss_fetch_interval: int = int(os.getenv("RSS_FETCH_INTERVAL", "6"))

    class Config:
        env_file = ".env"


settings = Settings()
