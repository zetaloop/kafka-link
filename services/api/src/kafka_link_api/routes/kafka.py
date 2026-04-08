from fastapi import APIRouter, HTTPException, status

from ..dependencies import RuntimeDep

router = APIRouter(prefix="/api/kafka", tags=["kafka"])


@router.get("/cluster")
async def read_cluster(runtime: RuntimeDep) -> dict[str, object]:
    return runtime.kafka_status.read_cluster()


@router.get("/groups")
async def list_groups(runtime: RuntimeDep) -> dict[str, object]:
    return {"items": runtime.kafka_status.list_groups()}


@router.get("/groups/{group_id}")
async def read_group(group_id: str, runtime: RuntimeDep) -> dict[str, object]:
    group = runtime.kafka_status.read_group(group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group
