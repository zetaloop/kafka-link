from datetime import UTC, datetime

import pytest

from kafka_link_alert_engine.main import AlertEngine
from kafka_link_shared.models import AlertRule, NormalizedEvent
from kafka_link_shared.models.events import EventKind
from kafka_link_shared.settings import ServiceSettings


class FakeRedis:
    def __init__(self) -> None:
        self.published: list[tuple[str, str]] = []
        self.values: dict[str, str] = {}

    async def smembers(self, _key: str) -> set[str]:
        return {"rule-1"}

    async def mget(self, _keys: list[str]) -> list[str]:
        return [
            AlertRule(
                rule_id="rule-1",
                name="Tokyo heat",
                city_id="tokyo",
                source="weather",
                metric="temperature_c",
                operator="gte",
                threshold=30,
                created_at=datetime.now(UTC),
            ).model_dump_json()
        ]

    async def publish(self, channel: str, message: str) -> None:
        self.published.append((channel, message))

    async def set(self, key: str, value: str, ex: int | None = None, nx: bool = False) -> bool:
        if nx and key in self.values:
            return False
        self.values[key] = value
        return True


class FakeConsumer:
    def subscribe(self, topics: list[str]) -> None:
        return None

    def poll(self, timeout: float):
        return None

    def close(self) -> None:
        return None


class FakeProducer:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str, str | None]] = []

    def produce(self, topic: str, value: str, key: str | None = None) -> None:
        self.messages.append((topic, value, key))

    def poll(self, timeout: float) -> None:
        return None

    def flush(self, timeout: float | None = None) -> int:
        return 0


@pytest.mark.anyio
async def test_alert_engine_emits_and_deduplicates_alert() -> None:
    producer = FakeProducer()
    redis = FakeRedis()
    engine = AlertEngine(
        settings=ServiceSettings.from_env("alert-engine-test"),
        redis=redis,
        consumer=FakeConsumer(),
        producer=producer,
    )
    event = NormalizedEvent(
        event_id="weather:tokyo:1",
        kind=EventKind.WEATHER,
        source_topic="raw.weather",
        city_ids=["tokyo"],
        observed_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
        metrics={"temperature_c": 33.5},
        summary="tokyo temperature 33.5°C",
    )

    first_count = await engine.handle_message(event.model_dump_json())
    second_count = await engine.handle_message(event.model_dump_json())

    assert first_count == 1
    assert second_count == 0
    assert producer.messages[0][2] == "tokyo"
    assert redis.published[0][0] == "events:websocket"


@pytest.mark.anyio
async def test_alert_engine_dedupes_across_instance_restart() -> None:
    redis = FakeRedis()
    producer = FakeProducer()
    event = NormalizedEvent(
        event_id="weather:tokyo:1",
        kind=EventKind.WEATHER,
        source_topic="raw.weather",
        city_ids=["tokyo"],
        observed_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
        metrics={"temperature_c": 33.5},
        summary="tokyo temperature 33.5°C",
    )

    first_engine = AlertEngine(
        ServiceSettings.from_env("alert-engine-test"), redis, FakeConsumer(), producer
    )
    second_engine = AlertEngine(
        ServiceSettings.from_env("alert-engine-test"), redis, FakeConsumer(), producer
    )

    assert await first_engine.handle_message(event.model_dump_json()) == 1
    assert await second_engine.handle_message(event.model_dump_json()) == 0
