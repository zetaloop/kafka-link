from fastapi.testclient import TestClient
from httpx import AsyncClient
from redis.asyncio import Redis

from kafka_link_api.main import create_app
from kafka_link_api.runtime import ApiRuntime
from kafka_link_api.services.geocoder import GeocodingNotFoundError
from kafka_link_api.services.websocket_hub import ConnectionHub
from kafka_link_shared.models import AlertRule, CityRecord
from kafka_link_shared.settings import ServiceSettings, utc_now


class FakeStore:
    def __init__(self) -> None:
        self.cities: dict[str, CityRecord] = {}
        self.rules: dict[str, AlertRule] = {}

    async def list_cities(self) -> list[CityRecord]:
        return list(self.cities.values())

    async def get_city(self, city_id: str) -> CityRecord | None:
        return self.cities.get(city_id)

    async def upsert_city(self, city: CityRecord) -> CityRecord:
        self.cities[city.city_id] = city
        return city

    async def delete_city(self, city_id: str) -> bool:
        return self.cities.pop(city_id, None) is not None

    async def list_rules(self) -> list[AlertRule]:
        return list(self.rules.values())

    async def get_rule(self, rule_id: str) -> AlertRule | None:
        return self.rules.get(rule_id)

    async def upsert_rule(self, rule: AlertRule) -> AlertRule:
        self.rules[rule.rule_id] = rule
        return rule

    async def delete_rule(self, rule_id: str) -> bool:
        return self.rules.pop(rule_id, None) is not None

    async def load_demo_preset(self) -> dict[str, object]:
        city = CityRecord(
            city_id="demo-beijing",
            name="北京",
            country_code="CN",
            admin1="北京",
            latitude=39.9042,
            longitude=116.4074,
            timezone="Asia/Shanghai",
            created_at=utc_now(),
        )
        rule = AlertRule(
            rule_id="rule-demo",
            name="北京 PM2.5 预警",
            city_id=city.city_id,
            source="airquality",
            metric="pm2_5",
            operator="gte",
            threshold=150,
            created_at=utc_now(),
        )
        await self.upsert_city(city)
        await self.upsert_rule(rule)
        return {"inserted_city_ids": [city.city_id], "inserted_rule_ids": [rule.rule_id]}

    async def read_overview(self) -> dict[str, object]:
        return {
            "source": "fake",
            "summary": {
                "city_count": len(self.cities),
                "rule_count": len(self.rules),
                "earthquake_count": 0,
                "alert_count": 0,
            },
            "cities": [city.model_dump(mode="json") for city in self.cities.values()],
        }

    async def read_city_detail(self, city_id: str) -> dict[str, object]:
        city = self.cities.get(city_id)
        return {
            "city": city.model_dump(mode="json") if city else None,
            "latest": None,
            "weather_history": [],
            "airquality_history": [],
            "alerts": [],
        }

    async def read_earthquakes_feed(self) -> list[dict[str, object]]:
        return []

    async def read_alerts_feed(self) -> list[dict[str, object]]:
        return []


class FakeGeocoder:
    async def search_city(self, query: str) -> CityRecord:
        if query != "Beijing":
            raise GeocodingNotFoundError(query)

        return CityRecord(
            city_id="openmeteo:1816670",
            name="Beijing",
            country_code="CN",
            admin1="Beijing",
            latitude=39.9042,
            longitude=116.4074,
            timezone="Asia/Shanghai",
            created_at=utc_now(),
        )


def create_test_client() -> TestClient:
    runtime = ApiRuntime(
        settings=ServiceSettings.from_env("api-test"),
        redis=Redis.from_url("redis://localhost:6379/15", decode_responses=True),
        http_client=AsyncClient(),
        store=FakeStore(),
        geocoder=FakeGeocoder(),
        hub=ConnectionHub(),
    )

    app = create_app(runtime)
    return TestClient(app)


def test_healthz() -> None:
    with create_test_client() as client:
        response = client.get("/api/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_city_uses_geocoder() -> None:
    with create_test_client() as client:
        response = client.post("/api/cities", json={"query": "Beijing"})
        cities = client.get("/api/cities")

    assert response.status_code == 201
    assert response.json()["city_id"] == "openmeteo:1816670"
    assert len(cities.json()) == 1


def test_demo_preset_populates_views() -> None:
    with create_test_client() as client:
        response = client.post("/api/preset/demo")
        overview = client.get("/api/views/overview")

    assert response.status_code == 201
    assert overview.status_code == 200
    assert overview.json()["summary"]["city_count"] == 1
    assert overview.json()["summary"]["rule_count"] == 1
