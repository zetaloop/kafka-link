from fastapi import APIRouter, status

from ..dependencies import RuntimeDep

router = APIRouter(prefix="/api/preset", tags=["preset"])


@router.post("/demo", status_code=status.HTTP_201_CREATED)
async def load_demo_preset(runtime: RuntimeDep) -> dict[str, object]:
    result = await runtime.store.load_demo_preset()
    await runtime.hub.broadcast_json({"type": "preset.loaded", **result})
    return result
