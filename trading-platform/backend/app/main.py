from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.modules.config_manager.api.router import router as config_router

configure_logging(get_settings())

app = FastAPI(title="AI-Assisted Futures Trading Platform", version="0.1.0")

app.include_router(config_router)


@app.get("/api/v1/system/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
