"""
tracking.py
-----------
WebSocket endpoints for real-time features:

  WS /ws/{user_id}            — general purpose connection (notifications, trip updates)
  GET /api/v1/tracking/{trip_id}  — REST fallback: get last known position of a trip
  GET /api/v1/tracking/driver/{driver_id} — get last known position of a driver
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status

from app.websocket.manager import manager
from app.services.gps import get_driver_location, get_trip_location
from app.services.notification import get_user_notifications, mark_as_read, mark_all_as_read
from app.dependencies import get_current_user

router = APIRouter(tags=["Tracking & WebSocket"])


# ─────────────────────────────────────────────
#  WebSocket — persistent connection per user
# ─────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(user_id: str, websocket: WebSocket):
    """
    Client connects once and stays connected.
    Server pushes:
      - GPS location updates  (event: location_update)
      - Trip status changes   (event: trip_status_update)
      - Notifications         (event: notification)

    Client can send:
      - { "ping": true }  →  server replies { "pong": true }
    """
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("ping"):
                await websocket.send_json({"pong": True})
    except WebSocketDisconnect:
        manager.disconnect(user_id)


# ─────────────────────────────────────────────
#  REST fallback — last known positions
# ─────────────────────────────────────────────

@router.get(
    "/api/v1/tracking/trip/{trip_id}",
    summary="Dernière position connue d'un trajet"
)
async def trip_location(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    location = await get_trip_location(trip_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune position disponible pour ce trajet."
        )
    return {"trip_id": trip_id, "location": location}


@router.get(
    "/api/v1/tracking/driver/{driver_id}",
    summary="Dernière position connue d'un chauffeur"
)
async def driver_location(
    driver_id: str,
    current_user: dict = Depends(get_current_user)
):
    location = await get_driver_location(driver_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chauffeur hors ligne ou position inconnue."
        )
    return {"driver_id": driver_id, "location": location}


# ─────────────────────────────────────────────
#  Notifications inbox (REST)
# ─────────────────────────────────────────────

@router.get(
    "/api/v1/notifications",
    summary="Mes notifications"
)
async def my_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    notifs = await get_user_notifications(current_user["_id"], unread_only)
    return {"notifications": notifs}


@router.post(
    "/api/v1/notifications/{notif_id}/read",
    summary="Marquer une notification comme lue"
)
async def read_notification(
    notif_id: str,
    current_user: dict = Depends(get_current_user)
):
    await mark_as_read(notif_id, current_user["_id"])
    return {"message": "Notification marquée comme lue."}


@router.post(
    "/api/v1/notifications/read-all",
    summary="Tout marquer comme lu"
)
async def read_all_notifications(
    current_user: dict = Depends(get_current_user)
):
    await mark_all_as_read(current_user["_id"])
    return {"message": "Toutes les notifications sont marquées comme lues."}