import asyncio
import json
from dataclasses import dataclass
from typing import Protocol

from confluent_kafka import Consumer
from redis.asyncio import Redis

from kafka_link_shared.models import AlertEvent, NormalizedEvent
from kafka_link_shared.settings import RedisKeys, ServiceSettings, utc_timestamp
from kafka_link_shared.topics import ALERTS_TOPIC, CONSUMER_GROUP_ANALYTICS, NORMALIZED_EVENTS_TOPIC


class ConsumerLike(Protocol):
    def subscribe(self, topics: list[str]) -> None: ...

    def poll(self, timeout: float): ...

    def close(self) -> None: ...


@dataclass(slots=True)
class AnalyticsProjector:
    settings: ServiceSettings
    redis: Redis
    consumer: ConsumerLike

    async def project_normalized_event(self, payload: str) -> None:
        event = NormalizedEvent.model_validate_json(payload)

        if event.kind.value in {"weather", "airquality"}:
            await self._project_city_event(event)
        elif event.kind.value == "earthquake":
            await self._project_earthquake(event)

        await self.redis.set(
            RedisKeys.overview(),
            json.dumps({"updated_at": utc_timestamp(), "summary": {"last_kind": event.kind.value}}),
        )
        await self.redis.publish(
            RedisKeys.websocket_channel(),
            json.dumps({"type": "overview.updated", "kind": event.kind.value}),
        )

    async def project_alert_event(self, payload: str) -> None:
        alert = AlertEvent.model_validate_json(payload)
        await self._push_json(
            RedisKeys.alerts_feed(),
            {
                "event_id": alert.event_id,
                "rule_id": alert.rule_id,
                "city_id": alert.city_id,
                "metric": alert.metric,
                "actual_value": alert.actual_value,
                "threshold": alert.threshold,
                "source_event_id": alert.source_event_id,
                "triggered_at": alert.triggered_at.isoformat(),
                "summary": alert.summary,
            },
        )
        await self.redis.publish(
            RedisKeys.websocket_channel(),
            json.dumps(
                {"type": "alert.feed.updated", "city_id": alert.city_id, "event_id": alert.event_id}
            ),
        )

    async def run_forever(self) -> None:
        self.consumer.subscribe([NORMALIZED_EVENTS_TOPIC, ALERTS_TOPIC])

        while True:
            message = self.consumer.poll(1.0)
            if message is None or message.error() is not None:
                await asyncio.sleep(0)
                continue

            payload = message.value().decode("utf-8")
            if message.topic() == NORMALIZED_EVENTS_TOPIC:
                await self.project_normalized_event(payload)
            elif message.topic() == ALERTS_TOPIC:
                await self.project_alert_event(payload)

    async def _project_city_event(self, event: NormalizedEvent) -> None:
        for city_id in event.city_ids:
            latest_key = RedisKeys.city_latest(city_id)
            latest_payload = await self.redis.get(latest_key)
            latest = json.loads(latest_payload) if latest_payload else {}
            latest[event.kind.value] = {
                "event_id": event.event_id,
                "observed_at": event.observed_at.isoformat(),
                "metrics": event.metrics,
                "summary": event.summary,
            }
            latest["updated_at"] = utc_timestamp()
            await self.redis.set(latest_key, json.dumps(latest))
            await self._push_json(
                RedisKeys.city_history(city_id, event.kind.value),
                {
                    "event_id": event.event_id,
                    "observed_at": event.observed_at.isoformat(),
                    "metrics": event.metrics,
                    "summary": event.summary,
                },
            )
            await self.redis.publish(
                RedisKeys.websocket_channel(),
                json.dumps(
                    {
                        "type": "city.snapshot.updated",
                        "city_id": city_id,
                        "kind": event.kind.value,
                    }
                ),
            )

    async def _project_earthquake(self, event: NormalizedEvent) -> None:
        await self._push_json(
            RedisKeys.earthquakes_feed(),
            {
                "event_id": event.event_id,
                "observed_at": event.observed_at.isoformat(),
                "summary": event.summary,
                "city_ids": event.city_ids,
                "magnitude": event.metrics.get("earthquake_magnitude"),
                "location": event.location.model_dump(mode="json") if event.location else None,
            },
        )
        await self.redis.publish(
            RedisKeys.websocket_channel(),
            json.dumps({"type": "earthquakes.updated", "event_id": event.event_id}),
        )

    async def _push_json(self, key: str, payload: dict[str, object]) -> None:
        await self.redis.lpush(key, json.dumps(payload))
        await self.redis.ltrim(key, 0, 99)


async def _main() -> None:
    settings = ServiceSettings.from_env("analytics")
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    consumer = Consumer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "group.id": CONSUMER_GROUP_ANALYTICS,
            "auto.offset.reset": "earliest",
        }
    )
    projector = AnalyticsProjector(settings, redis, consumer)

    try:
        await projector.run_forever()
    finally:
        consumer.close()
        await redis.aclose()


def main() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    main()
