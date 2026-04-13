"""
auth_service.py
---------------
Business logic layer for authentication.
Keeps the auth router clean by moving all DB interactions here.
"""

from typing import Optional
from app.database import db
from app.models.user import RoleUtilisateur


async def get_user_by_phone(telephone: str) -> Optional[dict]:
    return await db["users"].find_one({"telephone": telephone})


async def get_user_by_id(user_id: str) -> Optional[dict]:
    return await db["users"].find_one({"_id": user_id})


async def phone_exists(telephone: str) -> bool:
    user = await db["users"].find_one({"telephone": telephone}, {"_id": 1})
    return user is not None


async def get_fleet_owner(employer_id: str) -> Optional[dict]:
    """Verify an employer exists and has the PROP_FLOTTE role."""
    return await db["users"].find_one({
        "_id": employer_id,
        "role": RoleUtilisateur.PROP_FLOTTE.value
    })


async def create_user(user_doc: dict) -> str:
    """Insert a user document and return its _id."""
    await db["users"].insert_one(user_doc)
    return user_doc["_id"]