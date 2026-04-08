from dataclasses import dataclass
from datetime import UTC, datetime
from os import getenv


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_timestamp(value: datetime | None = None) -> str:
    actual = value or utc_now()
    return actual.isoformat(timespec="seconds").replace("+00:00", "Z")


@dataclass(frozen=True, slots=True)
class ServiceSettings:
    service_name: str
    kafka_bootstrap_servers: str
    redis_url: str
    poll_interval_seconds: int
    request_timeout_seconds: float

    @classmethod
    def from_env(
        cls,
        service_name: str,
        *,
        default_poll_interval_seconds: int = 300,
        default_request_timeout_seconds: float = 10.0,
    ) -> ServiceSettings:
        poll_interval_seconds = int(
            getenv("POLL_INTERVAL_SECONDS", str(default_poll_interval_seconds))
        )
        request_timeout_seconds = float(
            getenv("REQUEST_TIMEOUT_SECONDS", str(default_request_timeout_seconds))
        )

        return cls(
            service_name=service_name,
            kafka_bootstrap_servers=getenv(
                "KAFKA_BOOTSTRAP_SERVERS",
                "kafka-1:19092,kafka-2:19092,kafka-3:19092",
            ),
            redis_url=getenv("REDIS_URL", "redis://redis:6379/0"),
            poll_interval_seconds=poll_interval_seconds,
            request_timeout_seconds=request_timeout_seconds,
        )


class RedisKeys:
    @staticmethod
    def cities_index() -> str:
        return "cities:index"

    @staticmethod
    def city(city_id: str) -> str:
        return f"city:{city_id}"

    @staticmethod
    def rules_index() -> str:
        return "rules:index"

    @staticmethod
    def rule(rule_id: str) -> str:
        return f"rule:{rule_id}"

    @staticmethod
    def city_latest(city_id: str) -> str:
        return f"view:city:{city_id}:latest"

    @staticmethod
    def city_history(city_id: str, source: str) -> str:
        return f"view:city:{city_id}:history:{source}"

    @staticmethod
    def overview() -> str:
        return "view:overview"

    @staticmethod
    def earthquakes_feed() -> str:
        return "view:earthquakes:feed"

    @staticmethod
    def alerts_feed() -> str:
        return "view:alerts:feed"

    @staticmethod
    def websocket_channel() -> str:
        return "events:websocket"
