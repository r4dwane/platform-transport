"""
manager.py
----------
Manages active WebSocket connections.

Each connected user is registered by their user_id.
This allows the server to push messages to specific users at any time —
for live GPS tracking, offer notifications, trip status updates, etc.
"""

import json
from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # { user_id: WebSocket }
        self.active: Dict[str, WebSocket] = {}

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def connect(self, user_id: str, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active[user_id] = websocket
        print(f"🔌  WS connected  : {user_id}")

    def disconnect(self, user_id: str):
        """Remove a connection (called on disconnect or error)."""
        self.active.pop(user_id, None)
        print(f"🔌  WS disconnected: {user_id}")

    # ── Sending ───────────────────────────────────────────────────────────

    async def send_to(self, user_id: str, data: dict):
        """
        Send a JSON message to a specific user.
        Silently ignores if the user is not connected.
        """
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                # Connection dropped — clean up
                self.disconnect(user_id)

    async def broadcast(self, user_ids: list[str], data: dict):
        """Send the same message to multiple users at once."""
        for uid in user_ids:
            await self.send_to(uid, data)

    # ── Helpers ───────────────────────────────────────────────────────────

    def is_connected(self, user_id: str) -> bool:
        return user_id in self.active

    def connected_count(self) -> int:
        return len(self.active)


# Singleton — import this instance everywhere
manager = ConnectionManager()