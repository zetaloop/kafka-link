from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..dependencies import RuntimeDep

router = APIRouter(tags=["ws"])


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, runtime: RuntimeDep) -> None:
    await runtime.hub.connect(websocket)
    await websocket.send_json(
        {
            "type": "connected",
            "service": runtime.settings.service_name,
            "connections": len(tuple(runtime.hub.connections())),
        }
    )

    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            await websocket.send_json({"type": "ack", "message": message})
    except WebSocketDisconnect:
        runtime.hub.disconnect(websocket)
