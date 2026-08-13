from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    port: int = 8000
    internal_api_secret: str = "local-dev-internal-secret-change-me"

    # LLM providers (optional). Interview: Groq → Gemini → templates.
    # Resume/JD enrich uses the same cascade when available.
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-flash-latest"


settings = Settings()
