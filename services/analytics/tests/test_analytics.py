import json
from datetime import UTC, datetime

import pytest

from kafka_link_analytics.main import AnalyticsProjector
from kafka_link_shared.models import AlertEvent, NormalizedEvent
from kafka_link_shared.models.events import EventKind
from kafka_link_shared.settings import ServiceSettings


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.lists: dict[str, list[str]] = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str) -> None:
        self.values[key] = value

    async def lpush(self, key: str, value: str) -> None:
        self.lists.setdefault(key, []).insert(0, value)

    async def ltrim(self, key: str, start: int, end: int) -> None:
        self.lists[key] = self.lists.get(key, [])[start : end + 1]


class FakeConsumer:
    def subscribe(self, topics: list[str]) -> None:
        return None

    def poll(self, timeout: float):
        return None

    def close(self) -> None:
        return None


@pytest.mark.anyio
async def test_analytics_projects_city_event_and_alert_feed() -> None:
    redis = FakeRedis()
    projector = AnalyticsProjector(
        settings=ServiceSettings.from_env("analytics-test"),
        redis=redis,
        consumer=FakeConsumer(),
    )
    normalized = NormalizedEvent(
        event_id="weather:tokyo:1",
        kind=EventKind.WEATHER,
        source_topic="raw.weather",
        city_ids=["tokyo"],
        observed_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
        metrics={"temperature_c": 31.0},
        summary="tokyo temperature 31.0°C",
    )
    alert = AlertEvent(
        event_id="alert:rule-1:weather:tokyo:1",
        rule_id="rule-1",
        city_id="tokyo",
        metric="temperature_c",
        actual_value=31.0,
        threshold=30.0,
        source_event_id="weather:tokyo:1",
        triggered_at=datetime.now(UTC),
        summary="Tokyo heat hit with temperature_c=31.0",
    )

    await projector.project_normalized_event(normalized.model_dump_json())
    await projector.project_alert_event(alert.model_dump_json())

    latest = json.loads(redis.values["view:city:tokyo:latest"])
    alert_item = json.loads(redis.lists["view:alerts:feed"][0])

    assert latest["weather"]["metrics"]["temperature_c"] == 31.0
    assert alert_item["city_id"] == "tokyo"
