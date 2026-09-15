from fastapi import APIRouter

from app.config import settings as app_settings
from app import schemas
from app.services import llm_service

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/models", response_model=schemas.ModelsResponse)
def list_models():
    return {
        "default_model": app_settings.llm_model,
        "models": llm_service.get_available_models(),
    }
