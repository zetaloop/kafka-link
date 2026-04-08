from dataclasses import dataclass

from httpx import AsyncClient
from redis.asyncio import Redis

from kafka_link_shared.settings import ServiceSettings

from .services.geocoder import GeocoderService
from .services.kafka_status import KafkaStatusService
from .services.redis_store import RedisStore
from .services.websocket_hub import ConnectionHub


@dataclass(slots=True)
class ApiRuntime:
    settings: ServiceSettings
    redis: Redis
    http_client: AsyncClient
    store: RedisStore
    geocoder: GeocoderService
    kafka_status: KafkaStatusService
    hub: ConnectionHub
