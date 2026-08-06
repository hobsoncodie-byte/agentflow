from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.modules.config_manager.api.router import router as config_router
from app.modules.market_data.adapters.ib_connection import connect_ib, disconnect_ib
from app.modules.market_data.api.router import router as market_data_router

configure_logging(get_settings())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    # A TWS/IB Gateway connection is a persistent socket, not something to
    # open per-request — established once here and reused by every request
    # (see market_data/api/router.py's get_market_data_service).
    if settings.market_data_provider == "interactive_brokers":
        app.state.ib = await connect_ib(settings)
    else:
        app.state.ib = None
    yield
    if app.state.ib is not None:
        await disconnect_ib(app.state.ib)


app = FastAPI(title="AI-Assisted Futures Trading Platform", version="0.1.0", lifespan=lifespan)

app.include_router(config_router)
app.include_router(market_data_router)


@app.get("/api/v1/system/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
