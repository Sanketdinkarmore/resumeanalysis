from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    port: int = 8000
    internal_api_secret: str = "local-dev-internal-secret-change-me"

    # Optional — improves parse accuracy + interview generation later
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-flash-latest"


settings = Settings()
