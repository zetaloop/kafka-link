import json
from dataclasses import dataclass
from uuid import uuid4

from redis.asyncio import Redis

from kafka_link_shared.models import AlertRule, CityRecord
from kafka_link_shared.settings import RedisKeys, utc_now, utc_timestamp


@dataclass(slots=True)
class RedisStore:
    redis: Redis

    async def list_cities(self) -> list[CityRecord]:
        city_ids = sorted(await self.redis.smembers(RedisKeys.cities_index()))
        items = (
            await self.redis.mget([RedisKeys.city(city_id) for city_id in city_ids])
            if city_ids
            else []
        )
        return [CityRecord.model_validate_json(item) for item in items if item]

    async def get_city(self, city_id: str) -> CityRecord | None:
        payload = await self.redis.get(RedisKeys.city(city_id))
        return CityRecord.model_validate_json(payload) if payload else None

    async def upsert_city(self, city: CityRecord) -> CityRecord:
        await self.redis.set(RedisKeys.city(city.city_id), city.model_dump_json())
        await self.redis.sadd(RedisKeys.cities_index(), city.city_id)
        return city

    async def delete_city(self, city_id: str) -> bool:
        deleted = await self.redis.delete(RedisKeys.city(city_id))
        await self.redis.srem(RedisKeys.cities_index(), city_id)
        return bool(deleted)

    async def list_rules(self) -> list[AlertRule]:
        rule_ids = sorted(await self.redis.smembers(RedisKeys.rules_index()))
        items = (
            await self.redis.mget([RedisKeys.rule(rule_id) for rule_id in rule_ids])
            if rule_ids
            else []
        )
        return [AlertRule.model_validate_json(item) for item in items if item]

    async def get_rule(self, rule_id: str) -> AlertRule | None:
        payload = await self.redis.get(RedisKeys.rule(rule_id))
        return AlertRule.model_validate_json(payload) if payload else None

    async def upsert_rule(self, rule: AlertRule) -> AlertRule:
        await self.redis.set(RedisKeys.rule(rule.rule_id), rule.model_dump_json())
        await self.redis.sadd(RedisKeys.rules_index(), rule.rule_id)
        return rule

    async def delete_rule(self, rule_id: str) -> bool:
        deleted = await self.redis.delete(RedisKeys.rule(rule_id))
        await self.redis.srem(RedisKeys.rules_index(), rule_id)
        return bool(deleted)

    async def load_demo_preset(self) -> dict[str, object]:
        cities = [
            CityRecord(
                city_id="demo-beijing",
                name="北京",
                country_code="CN",
                admin1="北京",
                latitude=39.9042,
                longitude=116.4074,
                timezone="Asia/Shanghai",
                created_at=utc_now(),
            ),
            CityRecord(
                city_id="demo-tokyo",
                name="东京",
                country_code="JP",
                admin1="东京",
                latitude=35.6762,
                longitude=139.6503,
                timezone="Asia/Tokyo",
                created_at=utc_now(),
            ),
            CityRecord(
                city_id="demo-san-francisco",
                name="San Francisco",
                country_code="US",
                admin1="California",
                latitude=37.7749,
                longitude=-122.4194,
                timezone="America/Los_Angeles",
                created_at=utc_now(),
            ),
        ]
        rules = [
            AlertRule(
                rule_id=f"rule-{uuid4().hex[:12]}",
                name="北京 PM2.5 预警",
                city_id="demo-beijing",
                source="airquality",
                metric="pm2_5",
                operator="gte",
                threshold=10,
                enabled=True,
                created_at=utc_now(),
            ),
            AlertRule(
                rule_id=f"rule-{uuid4().hex[:12]}",
                name="东京高温预警",
                city_id="demo-tokyo",
                source="weather",
                metric="temperature_c",
                operator="gte",
                threshold=15,
                enabled=True,
                created_at=utc_now(),
            ),
        ]

        for city in cities:
            await self.upsert_city(city)

        for rule in rules:
            await self.upsert_rule(rule)

        return {
            "inserted_city_ids": [city.city_id for city in cities],
            "inserted_rule_ids": [rule.rule_id for rule in rules],
        }

    async def read_overview(self) -> dict[str, object]:
        cities = await self.list_cities()
        rules = await self.list_rules()
        cached_payload = await self.redis.get(RedisKeys.overview())
        cached = json.loads(cached_payload) if cached_payload else {}

        return {
            "source": "redis",
            "summary": {
                "city_count": len(cities),
                "rule_count": len(rules),
                "earthquake_count": len(await self.read_earthquakes_feed()),
                "alert_count": len(await self.read_alerts_feed()),
                **cached.get("summary", {}),
            },
            "cities": [city.model_dump(mode="json") for city in cities],
            "updated_at": cached.get("updated_at", utc_timestamp()),
        }

    async def read_city_detail(self, city_id: str) -> dict[str, object]:
        city = await self.get_city(city_id)
        latest_payload = await self.redis.get(RedisKeys.city_latest(city_id))

        return {
            "city": city.model_dump(mode="json") if city else None,
            "latest": json.loads(latest_payload) if latest_payload else None,
            "weather_history": await self._read_json_list(
                RedisKeys.city_history(city_id, "weather")
            ),
            "airquality_history": await self._read_json_list(
                RedisKeys.city_history(city_id, "airquality")
            ),
            "alerts": [
                item for item in await self.read_alerts_feed() if item.get("city_id") == city_id
            ],
        }

    async def read_earthquakes_feed(self) -> list[dict[str, object]]:
        return await self._read_json_list(RedisKeys.earthquakes_feed())

    async def read_alerts_feed(self) -> list[dict[str, object]]:
        return await self._read_json_list(RedisKeys.alerts_feed())

    async def _read_json_list(self, key: str) -> list[dict[str, object]]:
        items = await self.redis.lrange(key, 0, 99)
        return [json.loads(item) for item in items]
