from collections.abc import Iterable

from fastapi import WebSocket


class ConnectionHub:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast_json(self, payload: dict[str, object]) -> None:
        stale_connections: list[WebSocket] = []

        for websocket in self._connections:
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(websocket)

    def connections(self) -> Iterable[WebSocket]:
        return tuple(self._connections)
