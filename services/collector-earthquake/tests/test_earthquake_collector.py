import pytest

from kafka_link_collector_earthquake.main import EarthquakeCollector
from kafka_link_shared.settings import ServiceSettings


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


class FakeHttpClient:
    def __init__(self) -> None:
        self.calls = 0

    async def get(self, _url: str) -> FakeResponse:
        self.calls += 1
        if self.calls == 1:
            return FakeResponse(
                {
                    "features": [
                        {
                            "id": "us7000demo",
                            "properties": {
                                "time": 1_744_134_400_000,
                                "updated": 1_744_134_460_000,
                                "mag": 5.2,
                                "place": "100 km SE of City",
                                "url": "https://earthquake.usgs.gov/example",
                            },
                            "geometry": {"coordinates": [140.0, 35.0, 10.0]},
                        }
                    ]
                }
            )

        return FakeResponse(
            {
                "features": [
                    {
                        "id": "us7000demo",
                        "properties": {
                            "time": 1_744_134_400_000,
                            "updated": 1_744_134_460_000,
                            "mag": 5.2,
                            "place": "100 km SE of City",
                            "url": "https://earthquake.usgs.gov/example",
                        },
                        "geometry": {"coordinates": [140.0, 35.0, 10.0]},
                    },
                    {
                        "id": "us7000newer",
                        "properties": {
                            "time": 1_744_135_000_000,
                            "updated": 1_744_135_060_000,
                            "mag": 4.8,
                            "place": "Near Another City",
                            "url": "https://earthquake.usgs.gov/example-2",
                        },
                        "geometry": {"coordinates": [141.0, 36.0, 30.0]},
                    },
                ]
            }
        )


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
async def test_earthquake_collector_deduplicates_seen_events() -> None:
    producer = FakeProducer()
    collector = EarthquakeCollector(
        settings=ServiceSettings.from_env("collector-earthquake-test"),
        http_client=FakeHttpClient(),
        producer=producer,
    )

    initial_count = await collector.collect_once()
    next_count = await collector.collect_once()

    assert initial_count == 1
    assert next_count == 1
    assert [message[2] for message in producer.messages] == ["us7000demo", "us7000newer"]
