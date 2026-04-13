"""
notification.py
---------------
Sends in-app notifications to users via WebSocket.
Persists notifications in MongoDB so users can retrieve
them when they come back online.

Notification types:
    - NEW_OFFER        → client receives a new bid on their load
    - OFFER_ACCEPTED   → driver's offer was accepted
    - OFFER_REJECTED   → driver's offer was rejected
    - TRIP_STATUS      → trip moved to a new status
    - PAYMENT_CONFIRMED→ client confirmed payment
    - NEW_MESSAGE      → (future: chat feature)
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.database import db
from app.websocket.manager import manager


# ─────────────────────────────────────────────
#  Core : save + push
# ─────────────────────────────────────────────

async def send_notification(
    user_id: str,
    notif_type: str,
    title: str,
    body: str,
    data: Optional[dict] = None
):
    """
    1. Persist the notification in MongoDB (inbox)
    2. Push it live via WebSocket if the user is connected
    """
    doc = {
        "_id":       str(ObjectId()),
        "userId":    user_id,
        "type":      notif_type,
        "title":     title,
        "body":      body,
        "data":      data or {},
        "isRead":    False,
        "createdAt": datetime.now(timezone.utc)
    }

    await db["notifications"].insert_one(doc)

    if manager.is_connected(user_id):
        await manager.send_to(user_id, {
            "event":   "notification",
            "id":      doc["_id"],
            "type":    notif_type,
            "title":   title,
            "body":    body,
            "data":    data or {},
            "createdAt": doc["createdAt"].isoformat()
        })


# ─────────────────────────────────────────────
#  Typed helpers — call these from routers
# ─────────────────────────────────────────────

async def notify_new_offer(client_id: str, load_id: str, driver_name: str, prix: float):
    await send_notification(
        user_id    = client_id,
        notif_type = "NEW_OFFER",
        title      = "Nouvelle offre reçue",
        body       = f"{driver_name} a proposé {prix:,.0f} DA pour votre charge.",
        data       = {"load_id": load_id}
    )

async def notify_offer_accepted(driver_id: str, load_id: str, trip_id: str):
    await send_notification(
        user_id    = driver_id,
        notif_type = "OFFER_ACCEPTED",
        title      = "Offre acceptée !",
        body       = "Votre offre a été acceptée. Préparez-vous pour la mission.",
        data       = {"load_id": load_id, "trip_id": trip_id}
    )

async def notify_offer_rejected(driver_id: str, load_id: str):
    await send_notification(
        user_id    = driver_id,
        notif_type = "OFFER_REJECTED",
        title      = "Offre refusée",
        body       = "Votre offre n'a pas été retenue pour cette charge.",
        data       = {"load_id": load_id}
    )

async def notify_trip_status(client_id: str, driver_id: str, trip_id: str, new_status: str):
    STATUS_MESSAGES = {
        "EN_ROUTE_RAMASSAGE":  "Le chauffeur est en route pour le ramassage.",
        "CHARGEMENT":          "Le chargement est en cours.",
        "EN_ROUTE_LIVRAISON":  "Votre marchandise est en route vers la destination.",
        "LIVRE":               "Livraison effectuée avec succès !",
    }
    body = STATUS_MESSAGES.get(new_status, f"Statut mis à jour : {new_status}")

    # Notify client
    await send_notification(
        user_id    = client_id,
        notif_type = "TRIP_STATUS",
        title      = "Mise à jour du trajet",
        body       = body,
        data       = {"trip_id": trip_id, "status": new_status}
    )
    # Also push a WS event to the driver for UI sync
    await manager.send_to(driver_id, {
        "event":   "trip_status_update",
        "trip_id": trip_id,
        "status":  new_status
    })

async def notify_payment_confirmed(driver_id: str, trip_id: str, montant: float):
    await send_notification(
        user_id    = driver_id,
        notif_type = "PAYMENT_CONFIRMED",
        title      = "Paiement confirmé",
        body       = f"Le paiement de {montant:,.0f} DA a été confirmé.",
        data       = {"trip_id": trip_id}
    )


# ─────────────────────────────────────────────
#  Inbox — fetch unread notifications for a user
# ─────────────────────────────────────────────

async def get_user_notifications(user_id: str, unread_only: bool = False) -> list:
    query = {"userId": user_id}
    if unread_only:
        query["isRead"] = False

    cursor = db["notifications"].find(query).sort("createdAt", -1).limit(50)
    notifs = await cursor.to_list(length=50)
    for n in notifs:
        n["id"] = n.pop("_id")
    return notifs


async def mark_as_read(notification_id: str, user_id: str):
    await db["notifications"].update_one(
        {"_id": notification_id, "userId": user_id},
        {"$set": {"isRead": True}}
    )


async def mark_all_as_read(user_id: str):
    await db["notifications"].update_many(
        {"userId": user_id, "isRead": False},
        {"$set": {"isRead": True}}
    )