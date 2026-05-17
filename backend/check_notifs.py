# check_db.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
    db = client["freight_platform"]
    
    users  = await db["users"].count_documents({})
    loads  = await db["charges"].count_documents({})
    offers = await db["offres"].count_documents({})
    trips  = await db["trajets"].count_documents({})
    notifs = await db["notifications"].count_documents({})

    print(f"Users:         {users}")
    print(f"Loads:         {loads}")
    print(f"Offers:        {offers}")
    print(f"Trips:         {trips}")
    print(f"Notifications: {notifs}")

asyncio.run(main())