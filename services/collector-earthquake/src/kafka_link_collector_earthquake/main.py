import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol

from confluent_kafka import Producer
from httpx import AsyncClient

from kafka_link_shared.models import EventLocation, RawEarthquakeEvent
from kafka_link_shared.settings import ServiceSettings, utc_now
from kafka_link_shared.topics import RAW_EARTHQUAKE_TOPIC

USGS_INITIAL_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"
USGS_LIVE_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"


class ProducerLike(Protocol):
    def produce(self, topic: str, value: str, key: str | None = None) -> None: ...

    def poll(self, timeout: float) -> None: ...

    def flush(self, timeout: float | None = None) -> int: ...


def parse_usgs_timestamp(value_ms: int) -> datetime:
    return datetime.fromtimestamp(value_ms / 1000, tz=utc_now().tzinfo)


@dataclass(slots=True)
class EarthquakeCollector:
    settings: ServiceSettings
    http_client: AsyncClient
    producer: ProducerLike
    seen_updates: dict[str, int] = field(default_factory=dict)
    bootstrapped: bool = False

    async def collect_once(self) -> int:
        endpoint = USGS_INITIAL_FEED if not self.bootstrapped else USGS_LIVE_FEED
        response = await self.http_client.get(endpoint)
        response.raise_for_status()
        payload = response.json()
        features = payload.get("features") or []
        ingested_at = utc_now()
        produced = 0

        for feature in features:
            event_id = feature["id"]
            properties = feature.get("properties") or {}
            updated = int(properties.get("updated") or 0)
            if self.seen_updates.get(event_id, -1) >= updated:
                continue

            coordinates = feature.get("geometry", {}).get("coordinates") or [0.0, 0.0, 0.0]
            magnitude = properties.get("mag")
            if magnitude is None:
                continue

            event = RawEarthquakeEvent(
                event_id=event_id,
                observed_at=parse_usgs_timestamp(int(properties["time"])),
                ingested_at=ingested_at,
                magnitude=float(magnitude),
                location=EventLocation(
                    latitude=float(coordinates[1]),
                    longitude=float(coordinates[0]),
                    depth_km=float(coordinates[2]) if len(coordinates) > 2 else None,
                    place=properties.get("place"),
                ),
                source_url=properties.get("url"),
            )
            self.producer.produce(
                RAW_EARTHQUAKE_TOPIC,
                key=event_id,
                value=event.model_dump_json(),
            )
            self.producer.poll(0)
            self.seen_updates[event_id] = updated
            produced += 1

        self.bootstrapped = True
        return produced

    async def run_forever(self) -> None:
        while True:
            await self.collect_once()
            await asyncio.sleep(self.settings.poll_interval_seconds)


async def _main() -> None:
    settings = ServiceSettings.from_env("collector-earthquake", default_poll_interval_seconds=60)
    http_client = AsyncClient(timeout=settings.request_timeout_seconds)
    producer = Producer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "broker.address.family": "v4",
            "client.id": settings.service_name,
        }
    )
    collector = EarthquakeCollector(settings, http_client, producer)

    try:
        await collector.run_forever()
    finally:
        await http_client.aclose()
        producer.flush(5.0)


def main() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    main()
