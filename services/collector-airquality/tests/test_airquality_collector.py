from datetime import UTC, datetime

import pytest

from kafka_link_collector_airquality.main import AirQualityCollector
from kafka_link_shared.models import CityRecord
from kafka_link_shared.settings import ServiceSettings


class FakeRedis:
    async def smembers(self, _key: str) -> set[str]:
        return {"beijing"}

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
            ).model_dump_json()
        ]


class FakeResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return {
            "current": {
                "time": "2026-04-08T18:00",
                "us_aqi": 81,
                "pm2_5": 28.1,
                "pm10": 42.5,
                "ozone": 61.0,
                "nitrogen_dioxide": 14.0,
            }
        }


class FakeHttpClient:
    async def get(self, _url: str, params: dict[str, object]) -> FakeResponse:
        assert params["latitude"] == "39.9042"
        return FakeResponse()


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
async def test_airquality_collector_emits_raw_event() -> None:
    producer = FakeProducer()
    collector = AirQualityCollector(
        settings=ServiceSettings.from_env("collector-airquality-test"),
        redis=FakeRedis(),
        http_client=FakeHttpClient(),
        producer=producer,
    )

    produced = await collector.collect_once()

    assert produced == 1
    assert producer.messages[0][2] == "beijing"
    assert '"aqi_us":81.0' in producer.messages[0][1]
