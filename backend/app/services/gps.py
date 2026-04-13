"""
gps.py
------
Handles real-time GPS logic using Redis for live positions
and MongoDB for the persistent tracking trail.

Redis stores the latest position only (fast reads for the map).
MongoDB stores the full history (for trip replay / proof).

Redis key format:
    driver:location:{driver_id}  →  JSON { lon, lat, timestamp }
    trip:tracking:{trip_id}      →  same (for clients watching a trip)
"""

import json
from datetime import datetime, timezone
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings
from app.database import db
from app.websocket.manager import manager


# ─────────────────────────────────────────────
#  Redis connection  (lazy singleton)
# ─────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return _redis


# ─────────────────────────────────────────────
#  Write — called by the driver's app
# ─────────────────────────────────────────────

async def update_driver_location(
    driver_id: str,
    trip_id: str,
    longitude: float,
    latitude: float
):
    """
    1. Save latest position in Redis (TTL = 5 minutes)
    2. Append point to MongoDB trip tracking array
    3. Push live update via WebSocket to the client watching this trip
    """
    now = datetime.now(timezone.utc).isoformat()
    point = {
        "type": "Point",
        "coordinates": [longitude, latitude]
    }
    payload = {"lon": longitude, "lat": latitude, "ts": now}

    # ── Redis ─────────────────────────────────────────────────────────────
    r = await get_redis()
    await r.setex(
        f"driver:location:{driver_id}",
        300,                        # expire after 5 min of inactivity
        json.dumps(payload)
    )
    await r.setex(
        f"trip:tracking:{trip_id}",
        300,
        json.dumps(payload)
    )

    # ── MongoDB — append to tracking history ─────────────────────────────
    await db["trajets"].update_one(
        {"_id": trip_id},
        {"$push": {"tracking": point}}
    )

    # ── WebSocket — push to client and driver ─────────────────────────────
    trip = await db["trajets"].find_one({"_id": trip_id}, {"clientId": 1})
    if trip:
        ws_message = {
            "event": "location_update",
            "trip_id": trip_id,
            "driver_id": driver_id,
            "lon": longitude,
            "lat": latitude,
            "ts": now
        }
        await manager.send_to(trip["clientId"], ws_message)


# ─────────────────────────────────────────────
#  Read — called by the client's app
# ─────────────────────────────────────────────

async def get_driver_location(driver_id: str) -> Optional[dict]:
    """Get the last known position of a driver from Redis."""
    r = await get_redis()
    raw = await r.get(f"driver:location:{driver_id}")
    if raw:
        return json.loads(raw)
    return None


async def get_trip_location(trip_id: str) -> Optional[dict]:
    """Get the current position associated with an active trip."""
    r = await get_redis()
    raw = await r.get(f"trip:tracking:{trip_id}")
    if raw:
        return json.loads(raw)
    return None


# ─────────────────────────────────────────────
#  Cleanup — called when a trip ends
# ─────────────────────────────────────────────

async def clear_trip_location(driver_id: str, trip_id: str):
    r = await get_redis()
    await r.delete(
        f"driver:location:{driver_id}",
        f"trip:tracking:{trip_id}"
    )