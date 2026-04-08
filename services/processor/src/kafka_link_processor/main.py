import asyncio
import math
from dataclasses import dataclass
from typing import Protocol

from confluent_kafka import Consumer, Producer
from redis.asyncio import Redis

from kafka_link_shared.models import (
    CityRecord,
    EventLocation,
    NormalizedEvent,
    RawAirQualityEvent,
    RawEarthquakeEvent,
    RawWeatherEvent,
)
from kafka_link_shared.models.events import EventKind
from kafka_link_shared.settings import ServiceSettings
from kafka_link_shared.topics import (
    CONSUMER_GROUP_NORMALIZATION,
    NORMALIZED_EVENTS_TOPIC,
    RAW_AIRQUALITY_TOPIC,
    RAW_EARTHQUAKE_TOPIC,
    RAW_WEATHER_TOPIC,
)

EARTHQUAKE_CITY_RADIUS_KM = 500.0


class ProducerLike(Protocol):
    def produce(self, topic: str, value: str, key: str | None = None) -> None: ...

    def poll(self, timeout: float) -> None: ...

    def flush(self, timeout: float | None = None) -> int: ...


class ConsumerLike(Protocol):
    def subscribe(self, topics: list[str]) -> None: ...

    def poll(self, timeout: float): ...

    def close(self) -> None: ...


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(math.radians, [lat1, lon1, lat2, lon2])
    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad
    arc = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(arc))


@dataclass(slots=True)
class EventProcessor:
    settings: ServiceSettings
    redis: Redis
    consumer: ConsumerLike
    producer: ProducerLike

    async def process_message(self, topic: str, payload: str) -> NormalizedEvent:
        if topic == RAW_WEATHER_TOPIC:
            return self._normalize_weather(RawWeatherEvent.model_validate_json(payload))

        if topic == RAW_AIRQUALITY_TOPIC:
            return self._normalize_airquality(RawAirQualityEvent.model_validate_json(payload))

        if topic == RAW_EARTHQUAKE_TOPIC:
            return await self._normalize_earthquake(RawEarthquakeEvent.model_validate_json(payload))

        raise ValueError(f"Unsupported topic: {topic}")

    async def handle_message(self, topic: str, payload: str) -> NormalizedEvent:
        normalized = await self.process_message(topic, payload)
        self.producer.produce(
            NORMALIZED_EVENTS_TOPIC, key=normalized.event_id, value=normalized.model_dump_json()
        )
        self.producer.poll(0)
        return normalized

    async def run_forever(self) -> None:
        self.consumer.subscribe([RAW_WEATHER_TOPIC, RAW_AIRQUALITY_TOPIC, RAW_EARTHQUAKE_TOPIC])

        while True:
            message = self.consumer.poll(1.0)
            if message is None or message.error() is not None:
                await asyncio.sleep(0)
                continue

            await self.handle_message(message.topic(), message.value().decode("utf-8"))

    def _normalize_weather(self, raw: RawWeatherEvent) -> NormalizedEvent:
        return NormalizedEvent(
            event_id=f"weather:{raw.city_id}:{raw.observed_at.isoformat()}",
            kind=EventKind.WEATHER,
            source_topic=RAW_WEATHER_TOPIC,
            city_ids=[raw.city_id],
            observed_at=raw.observed_at,
            ingested_at=raw.ingested_at,
            metrics={"temperature_c": raw.temperature_c},
            summary=f"{raw.city_id} temperature {raw.temperature_c:.1f}°C",
            location=EventLocation(latitude=raw.latitude, longitude=raw.longitude),
        )

    def _normalize_airquality(self, raw: RawAirQualityEvent) -> NormalizedEvent:
        metrics = {"aqi_us": raw.aqi_us}
        if raw.pm2_5 is not None:
            metrics["pm2_5"] = raw.pm2_5

        return NormalizedEvent(
            event_id=f"airquality:{raw.city_id}:{raw.observed_at.isoformat()}",
            kind=EventKind.AIR_QUALITY,
            source_topic=RAW_AIRQUALITY_TOPIC,
            city_ids=[raw.city_id],
            observed_at=raw.observed_at,
            ingested_at=raw.ingested_at,
            metrics=metrics,
            summary=f"{raw.city_id} AQI {raw.aqi_us:.0f}",
            location=EventLocation(latitude=raw.latitude, longitude=raw.longitude),
        )

    async def _normalize_earthquake(self, raw: RawEarthquakeEvent) -> NormalizedEvent:
        cities = await self._load_cities()
        matched_city_ids = [
            city.city_id
            for city in cities
            if haversine_km(
                raw.location.latitude, raw.location.longitude, city.latitude, city.longitude
            )
            <= EARTHQUAKE_CITY_RADIUS_KM
        ]

        return NormalizedEvent(
            event_id=raw.event_id,
            kind=EventKind.EARTHQUAKE,
            source_topic=RAW_EARTHQUAKE_TOPIC,
            city_ids=matched_city_ids,
            observed_at=raw.observed_at,
            ingested_at=raw.ingested_at,
            metrics={"earthquake_magnitude": raw.magnitude},
            summary=f"M{raw.magnitude:.1f} {raw.location.place or 'earthquake'}",
            location=raw.location,
        )

    async def _load_cities(self) -> list[CityRecord]:
        city_ids = sorted(await self.redis.smembers("cities:index"))
        if not city_ids:
            return []

        items = await self.redis.mget([f"city:{city_id}" for city_id in city_ids])
        return [CityRecord.model_validate_json(item) for item in items if item]


async def _main() -> None:
    settings = ServiceSettings.from_env("processor")
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    consumer = Consumer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "group.id": CONSUMER_GROUP_NORMALIZATION,
            "auto.offset.reset": "earliest",
        }
    )
    producer = Producer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "client.id": settings.service_name,
        }
    )
    processor = EventProcessor(settings, redis, consumer, producer)

    try:
        await processor.run_forever()
    finally:
        consumer.close()
        await redis.aclose()
        producer.flush(5.0)


def main() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    main()
