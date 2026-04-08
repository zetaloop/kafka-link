from fastapi import APIRouter

from kafka_link_shared.settings import utc_timestamp

from ..dependencies import RuntimeDep

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/healthz")
async def healthz(runtime: RuntimeDep) -> dict[str, str]:
    return {
        "status": "ok",
        "service": runtime.settings.service_name,
        "timestamp": utc_timestamp(),
    }
