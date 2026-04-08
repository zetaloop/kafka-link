from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import RuntimeDep
from ..services.geocoder import GeocodingNotFoundError

router = APIRouter(prefix="/api/cities", tags=["cities"])


class CreateCityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    query: str = Field(min_length=1)


@router.get("")
async def list_cities(runtime: RuntimeDep) -> list[dict[str, object]]:
    cities = await runtime.store.list_cities()
    return [city.model_dump(mode="json") for city in cities]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_city(
    payload: CreateCityRequest,
    runtime: RuntimeDep,
) -> dict[str, object]:
    try:
        city = await runtime.geocoder.search_city(payload.query)
    except GeocodingNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="City not found"
        ) from error

    stored = await runtime.store.upsert_city(city)
    await runtime.hub.broadcast_json({"type": "city.upserted", "city_id": stored.city_id})
    return stored.model_dump(mode="json")


@router.delete("/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city(city_id: str, runtime: RuntimeDep) -> None:
    deleted = await runtime.store.delete_city(city_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

    await runtime.hub.broadcast_json({"type": "city.deleted", "city_id": city_id})
