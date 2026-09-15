from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import reports, analysis, chat, settings as settings_router

app = FastAPI(title="AI Report Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Internal error: {exc}"})


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(reports.router)
app.include_router(analysis.router)
app.include_router(chat.router)
app.include_router(settings_router.router)
