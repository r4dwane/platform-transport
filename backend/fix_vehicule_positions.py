# fix_vehicle_positions.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
    db = client["transport_db"]

    # Algerian cities coordinates [lon, lat]
    positions = [
        [3.0588,  36.7538],   # Alger
        [2.9170,  36.7762],   # Blida
        [6.6147,  36.3650],   # Annaba
        [0.6411,  35.6976],   # Oran
        [5.5668,  36.4650],   # Bejaia
    ]

    vehicles = await db["vehicules"].find({}).to_list(50)
    for i, v in enumerate(vehicles):
        pos = positions[i % len(positions)]
        await db["vehicules"].update_one(
            {"_id": v["_id"]},
            {"$set": {"position": {"type": "Point", "coordinates": pos}}}
        )
        print(f"Updated {v['plaqueImmatriculation']} → {pos}")

asyncio.run(main())