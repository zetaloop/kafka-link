from datetime import UTC, datetime

import pytest

from kafka_link_collector_weather.main import WeatherCollector
from kafka_link_shared.models import CityRecord
from kafka_link_shared.settings import ServiceSettings


class FakeRedis:
    async def smembers(self, _key: str) -> set[str]:
        return {"beijing", "tokyo"}

    async def mget(self, _keys: list[str]) -> list[str]:
        return [
            CityRecord(
                city_id="beijing",
                name="北京",
                country_code="CN",
                admin1="北京",
                latitude=39.9042,
                longitude=116.4074,
                timezone="Asia/Shanghai",
                created_at=datetime.now(UTC),
            ).model_dump_json(),
            CityRecord(
                city_id="tokyo",
                name="东京",
                country_code="JP",
                admin1="东京",
                latitude=35.6762,
                longitude=139.6503,
                timezone="Asia/Tokyo",
                created_at=datetime.now(UTC),
            ).model_dump_json(),
        ]


class FakeResponse:
    def __init__(self, payload: list[dict[str, object]]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> list[dict[str, object]]:
        return self._payload


class FakeHttpClient:
    async def get(self, _url: str, params: dict[str, object]) -> FakeResponse:
        assert params["latitude"] == "39.9042,35.6762"
        assert params["longitude"] == "116.4074,139.6503"
        return FakeResponse(
            [
                {
                    "current": {
                        "time": "2026-04-08T18:00",
                        "temperature_2m": 24.4,
                        "weather_code": 1,
                        "is_day": 1,
                        "wind_speed_10m": 3.1,
                    }
                },
                {
                    "current": {
                        "time": "2026-04-08T19:00",
                        "temperature_2m": 21.0,
                        "weather_code": 3,
                        "is_day": 0,
                        "wind_speed_10m": 4.8,
                    }
                },
            ]
        )


class FakeProducer:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str, str | None]] = []
        self.poll_calls = 0

    def produce(self, topic: str, value: str, key: str | None = None) -> None:
        self.messages.append((topic, value, key))

    def poll(self, timeout: float) -> None:
        self.poll_calls += 1

    def flush(self, timeout: float | None = None) -> int:
        return 0


@pytest.mark.anyio
async def test_weather_collector_batches_city_requests() -> None:
    collector = WeatherCollector(
        settings=ServiceSettings.from_env("collector-weather-test"),
        redis=FakeRedis(),
        http_client=FakeHttpClient(),
        producer=FakeProducer(),
    )

    produced = await collector.collect_once()

    assert produced == 2
    assert len(collector.producer.messages) == 2
    assert collector.producer.messages[0][2] == "beijing"
    assert collector.producer.poll_calls == 2
