from fastapi import APIRouter, HTTPException, status

from ..dependencies import RuntimeDep

router = APIRouter(prefix="/api/views", tags=["views"])


@router.get("/overview")
async def read_overview(runtime: RuntimeDep) -> dict[str, object]:
    return await runtime.store.read_overview()


@router.get("/cities/{city_id}")
async def read_city_detail(city_id: str, runtime: RuntimeDep) -> dict[str, object]:
    detail = await runtime.store.read_city_detail(city_id)
    if detail["city"] is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return detail


@router.get("/earthquakes")
async def read_earthquakes(runtime: RuntimeDep) -> dict[str, object]:
    return {"items": await runtime.store.read_earthquakes_feed()}


@router.get("/alerts")
async def read_alerts(runtime: RuntimeDep) -> dict[str, object]:
    return {"items": await runtime.store.read_alerts_feed()}
