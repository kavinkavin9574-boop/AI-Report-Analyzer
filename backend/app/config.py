import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Curated fallback list, used when we can't (or choose not to) hit OpenRouter's
# live /models endpoint. Kept small and opinionated -- cheap/fast/strong picks
# across providers. Format is "provider/model-slug", exactly as OpenRouter expects.
DEFAULT_AVAILABLE_MODELS = [
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-3.5-haiku",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./report_analyzer.db"

    # LLM (OpenRouter) -- OpenRouter exposes an OpenAI-compatible /chat/completions
    # endpoint and can route a single API key to many providers/models.
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "anthropic/claude-sonnet-4.5"  # default model
    # Comma-separated list of OpenRouter model slugs offered in the UI's model
    # switcher. Overridable via AVAILABLE_MODELS without a code change.
    available_models_raw: str = Field(
        default=",".join(DEFAULT_AVAILABLE_MODELS), alias="AVAILABLE_MODELS"
    )
    # OpenRouter asks integrations to identify themselves via these headers
    # (used for their own leaderboards/rate-limit fairness, not required to work).
    app_url: str = "http://localhost:5173"
    app_title: str = "AI Report Analyzer"

    upload_dir: str = "./uploads"
    processed_dir: str = "./processed"
    max_upload_mb: int = 20
    frontend_origin: str = "http://localhost:5173"
    ocr_lang: str = "en"

    @property
    def available_models(self) -> list[str]:
        return [m.strip() for m in self.available_models_raw.split(",") if m.strip()]


settings = Settings()

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Path(settings.processed_dir).mkdir(parents=True, exist_ok=True)
