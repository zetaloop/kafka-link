from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from httpx import AsyncClient
from redis.asyncio import Redis

from kafka_link_shared.settings import ServiceSettings

from .routes import cities, health, preset, rules, views, ws
from .runtime import ApiRuntime
from .services.geocoder import GeocoderService
from .services.redis_store import RedisStore
from .services.websocket_hub import ConnectionHub


@asynccontextmanager
async def create_lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = ServiceSettings.from_env("api")
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    http_client = AsyncClient(timeout=settings.request_timeout_seconds)
    runtime = ApiRuntime(
        settings=settings,
        redis=redis,
        http_client=http_client,
        store=RedisStore(redis),
        geocoder=GeocoderService(http_client),
        hub=ConnectionHub(),
    )
    app.state.runtime = runtime

    try:
        yield
    finally:
        await http_client.aclose()
        await redis.aclose()


def create_app(runtime_override: ApiRuntime | None = None) -> FastAPI:
    if runtime_override is None:
        app = FastAPI(title="kafka-link api", lifespan=create_lifespan)
    else:

        @asynccontextmanager
        async def override_lifespan(app: FastAPI) -> AsyncIterator[None]:
            app.state.runtime = runtime_override
            yield

        app = FastAPI(title="kafka-link api", lifespan=override_lifespan)
        app.state.runtime = runtime_override

    app.include_router(health.router)
    app.include_router(cities.router)
    app.include_router(rules.router)
    app.include_router(preset.router)
    app.include_router(views.router)
    app.include_router(ws.router)
    return app


app = create_app()
