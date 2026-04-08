from datetime import UTC, datetime

import pytest

from kafka_link_processor.main import EventProcessor
from kafka_link_shared.models import (
    CityRecord,
    RawAirQualityEvent,
    RawEarthquakeEvent,
    RawWeatherEvent,
)
from kafka_link_shared.models.events import EventKind, EventLocation
from kafka_link_shared.settings import ServiceSettings
from kafka_link_shared.topics import RAW_AIRQUALITY_TOPIC, RAW_EARTHQUAKE_TOPIC, RAW_WEATHER_TOPIC


class FakeRedis:
    async def smembers(self, _key: str) -> set[str]:
        return {"tokyo"}

    async def mget(self, _keys: list[str]) -> list[str]:
        return [
            CityRecord(
                city_id="tokyo",
                name="东京",
                country_code="JP",
                admin1="东京",
                latitude=35.6762,
                longitude=139.6503,
                timezone="Asia/Tokyo",
                created_at=datetime.now(UTC),
            ).model_dump_json()
        ]


class FakeConsumer:
    def subscribe(self, topics: list[str]) -> None:
        return None

    def poll(self, timeout: float):
        return None

    def close(self) -> None:
        return None


class FakeProducer:
    def produce(self, topic: str, value: str, key: str | None = None) -> None:
        return None

    def poll(self, timeout: float) -> None:
        return None

    def flush(self, timeout: float | None = None) -> int:
        return 0


@pytest.mark.anyio
async def test_processor_normalizes_weather_event() -> None:
    processor = EventProcessor(
        ServiceSettings.from_env("processor-test"), FakeRedis(), FakeConsumer(), FakeProducer()
    )
    raw = RawWeatherEvent(
        city_id="tokyo",
        observed_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
        latitude=35.6762,
        longitude=139.6503,
        temperature_c=24.0,
        weather_code=1,
    )

    normalized = await processor.process_message(RAW_WEATHER_TOPIC, raw.model_dump_json())

    assert normalized.kind is EventKind.WEATHER
    assert normalized.city_ids == ["tokyo"]
    assert normalized.metrics["temperature_c"] == 24.0


@pytest.mark.anyio
async def test_processor_normalizes_airquality_event() -> None:
    processor = EventProcessor(
        ServiceSettings.from_env("processor-test"), FakeRedis(), FakeConsumer(), FakeProducer()
    )
    raw = RawAirQualityEvent(
        city_id="tokyo",
        observed_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
        latitude=35.6762,
        longitude=139.6503,
        aqi_us=82,
        pm2_5=35.0,
    )

    normalized = await processor.process_message(RAW_AIRQUALITY_TOPIC, raw.model_dump_json())

    assert normalized.kind is EventKind.AIR_QUALITY
    assert normalized.metrics["aqi_us"] == 82.0
    assert normalized.metrics["pm2_5"] == 35.0


@pytest.mark.anyio
async def test_processor_enriches_earthquake_with_nearby_city() -> None:
    processor = EventProcessor(
        ServiceSettings.from_env("processor-test"), FakeRedis(), FakeConsumer(), FakeProducer()
    )
    raw = RawEarthquakeEvent(
        event_id="quake-1",
        observed_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
        magnitude=5.1,
        location=EventLocation(latitude=35.7, longitude=139.7, depth_km=10.0, place="Tokyo Bay"),
    )

    normalized = await processor.process_message(RAW_EARTHQUAKE_TOPIC, raw.model_dump_json())

    assert normalized.kind is EventKind.EARTHQUAKE
    assert normalized.city_ids == ["tokyo"]
    assert normalized.metrics["earthquake_magnitude"] == 5.1
