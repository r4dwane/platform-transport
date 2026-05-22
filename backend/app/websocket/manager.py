import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)
        print(f"WS connected: {user_id} ({len(self.active[user_id])})")

    def disconnect(self, user_id: str, websocket: WebSocket | None = None):
        if websocket is None:
            self.active.pop(user_id, None)
        else:
            sockets = self.active.get(user_id, [])
            remaining = [ws for ws in sockets if ws is not websocket]
            if remaining:
                self.active[user_id] = remaining
            else:
                self.active.pop(user_id, None)

        print(f"WS disconnected: {user_id}")

    async def send_to(self, user_id: str, data: dict):
        sockets = list(self.active.get(user_id, []))
        for ws in sockets:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, user_ids: list[str], data: dict):
        for uid in user_ids:
            await self.send_to(uid, data)

    def is_connected(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))

    def connected_count(self) -> int:
        return sum(len(sockets) for sockets in self.active.values())


manager = ConnectionManager()
