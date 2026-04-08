import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from confluent_kafka import Producer
from httpx import AsyncClient
from redis.asyncio import Redis

from kafka_link_shared.models import CityRecord, RawAirQualityEvent
from kafka_link_shared.settings import ServiceSettings, utc_now
from kafka_link_shared.topics import RAW_AIRQUALITY_TOPIC


class ProducerLike(Protocol):
    def produce(self, topic: str, value: str, key: str | None = None) -> None: ...

    def poll(self, timeout: float) -> None: ...

    def flush(self, timeout: float | None = None) -> int: ...


def parse_openmeteo_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@dataclass(slots=True)
class AirQualityCollector:
    settings: ServiceSettings
    redis: Redis
    http_client: AsyncClient
    producer: ProducerLike

    async def collect_once(self) -> int:
        cities = await self._load_cities()
        if not cities:
            return 0

        response = await self.http_client.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={
                "latitude": ",".join(str(city.latitude) for city in cities),
                "longitude": ",".join(str(city.longitude) for city in cities),
                "current": "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
                "timezone": "auto",
                "forecast_hours": 1,
            },
        )
        response.raise_for_status()

        produced = 0
        payloads = response.json()
        items = payloads if isinstance(payloads, list) else [payloads]
        ingested_at = utc_now()

        for city, item in zip(cities, items, strict=True):
            current = item.get("current") or {}
            event = RawAirQualityEvent(
                city_id=city.city_id,
                observed_at=parse_openmeteo_timestamp(current["time"]),
                ingested_at=ingested_at,
                latitude=city.latitude,
                longitude=city.longitude,
                aqi_us=current["us_aqi"],
                pm2_5=current.get("pm2_5"),
                pm10=current.get("pm10"),
                ozone=current.get("ozone"),
                nitrogen_dioxide=current.get("nitrogen_dioxide"),
            )
            self.producer.produce(
                RAW_AIRQUALITY_TOPIC,
                key=city.city_id,
                value=event.model_dump_json(),
            )
            self.producer.poll(0)
            produced += 1

        return produced

    async def run_forever(self) -> None:
        while True:
            await self.collect_once()
            await asyncio.sleep(self.settings.poll_interval_seconds)

    async def _load_cities(self) -> list[CityRecord]:
        city_ids = sorted(await self.redis.smembers("cities:index"))
        if not city_ids:
            return []

        items = await self.redis.mget([f"city:{city_id}" for city_id in city_ids])
        return [CityRecord.model_validate_json(item) for item in items if item]


async def _main() -> None:
    settings = ServiceSettings.from_env("collector-airquality", default_poll_interval_seconds=1800)
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    http_client = AsyncClient(timeout=settings.request_timeout_seconds)
    producer = Producer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "broker.address.family": "v4",
            "client.id": settings.service_name,
        }
    )
    collector = AirQualityCollector(settings, redis, http_client, producer)

    try:
        await collector.run_forever()
    finally:
        await http_client.aclose()
        await redis.aclose()
        producer.flush(5.0)


def main() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    main()
