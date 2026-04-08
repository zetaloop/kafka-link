from dataclasses import dataclass
from re import sub

from httpx import AsyncClient

from kafka_link_shared.models import CityRecord
from kafka_link_shared.settings import utc_now


class GeocodingNotFoundError(Exception):
    pass


@dataclass(slots=True)
class GeocoderService:
    client: AsyncClient

    async def search_city(self, query: str) -> CityRecord:
        response = await self.client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": query,
                "count": 1,
                "language": "zh",
                "format": "json",
            },
        )
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results") or []

        if not results:
            raise GeocodingNotFoundError(query)

        item = results[0]
        city_key = item.get("id")
        city_id = f"openmeteo:{city_key}" if city_key is not None else self._slug(item["name"])

        return CityRecord(
            city_id=city_id,
            name=item["name"],
            country_code=item.get("country_code", "ZZ"),
            admin1=item.get("admin1"),
            latitude=item["latitude"],
            longitude=item["longitude"],
            timezone=item.get("timezone"),
            created_at=utc_now(),
        )

    @staticmethod
    def _slug(value: str) -> str:
        normalized = sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        return normalized or "city"
