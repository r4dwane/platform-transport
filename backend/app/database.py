from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"

# 3. Use the translator to connect to that address (The Client)
client = AsyncIOMotorClient(MONGO_URI)


db = client.transport_db
#users_collection = db.get_collection("utilisateurs")