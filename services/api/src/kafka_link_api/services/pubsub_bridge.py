import asyncio
import json

from redis.asyncio.client import PubSub

from kafka_link_shared.settings import RedisKeys

from .websocket_hub import ConnectionHub


async def bridge_pubsub_messages(pubsub: PubSub, hub: ConnectionHub) -> None:
    await pubsub.subscribe(RedisKeys.websocket_channel())

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and isinstance(message.get("data"), str):
                try:
                    payload = json.loads(message["data"])
                except json.JSONDecodeError:
                    payload = None

                if isinstance(payload, dict):
                    await hub.broadcast_json(payload)

            await asyncio.sleep(0.1)
    finally:
        await pubsub.unsubscribe(RedisKeys.websocket_channel())
        await pubsub.aclose()
