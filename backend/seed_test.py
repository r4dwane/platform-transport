import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from bson import ObjectId
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME   = "freight_platform"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db     = client[DB_NAME]

    # ── Clean previous test data ─────────────────────
    print("🧹 Cleaning previous test data...")
    await db["users"].delete_many({"telephone": {"$in": ["0550000001", "0550000002"]}})
    await db["vehicules"].delete_many({"plaqueImmatriculation": "TEST-001"})
    await db["charges"].delete_many({"description": "TEST_LOAD"})
    await db["trajets"].delete_many({"proofOfDelivery": "TEST_TRIP"})

    # ── Create CLIENT ────────────────────────────────
    client_id = str(ObjectId())
    await db["users"].insert_one({
        "_id":        client_id,
        "nom":        "Karim Boudiaf",
        "telephone":  "0550000001",
        "email":      "karim@test.dz",
        "motDePasse": pwd_context.hash("password123"),
        "role":       "CLIENT",
        "note":       5.0,
        "nbRatings":  1,
        "estVerifie": True,
        "employeurId":None,
        "createdAt":  datetime.utcnow()
    })
    print(f"✅ CLIENT created     → id: {client_id}")

    # ── Create DRIVER ────────────────────────────────
    driver_id = str(ObjectId())
    await db["users"].insert_one({
        "_id":        driver_id,
        "nom":        "Yacine Hamidi",
        "telephone":  "0550000002",
        "email":      "yacine@test.dz",
        "motDePasse": pwd_context.hash("password123"),
        "role":       "CHAUFFEUR_IND",
        "note":       4.8,
        "nbRatings":  5,
        "estVerifie": True,
        "employeurId":None,
        "createdAt":  datetime.utcnow()
    })
    print(f"✅ DRIVER created     → id: {driver_id}")

    # ── Create VEHICLE ───────────────────────────────
    vehicle_id = str(ObjectId())
    await db["vehicules"].insert_one({
        "_id":                   vehicle_id,
        "proprietaireId":        driver_id,
        "assignedDriverId":      None,
        "type":                  "MARAICHER",
        "capaciteKg":            5000.0,
        "capaciteM3":            20.0,
        "plaqueImmatriculation": "TEST-001",
        "position":              {"type": "Point", "coordinates": [3.0588, 36.7538]},
        "status":                "DISPONIBLE",
        "createdAt":             datetime.utcnow()
    })
    print(f"✅ VEHICLE created    → id: {vehicle_id}")

    # ── Create LOAD ──────────────────────────────────
    load_id = str(ObjectId())
    await db["charges"].insert_one({
        "_id":              load_id,
        "clientId":         client_id,
        "poidsKg":          1200.0,
        "typeMarchandises": "GENERAL",
        "marche":           "OUVERT",
        "description":      "TEST_LOAD",
        "adressEnlev":      "Rue Larbi Ben M'hidi, Alger",
        "coordEnlev":       {"type": "Point", "coordinates": [3.0588, 36.7538]},
        "adressLivr":       "Boulevard Zighoud Youcef, Oran",
        "coordLivr":        {"type": "Point", "coordinates": [0.6411, 35.6976]},
        "prixPropose":      15000.0,
        "status":           "LIVREE",
        "createdAt":        datetime.utcnow() - timedelta(days=2),
        "updatedAt":        datetime.utcnow()
    })
    print(f"✅ LOAD created       → id: {load_id}")

    # ── Create completed TRIP ────────────────────────
    trip_id = str(ObjectId())
    await db["trajets"].insert_one({
        "_id":             trip_id,
        "chargeId":        load_id,
        "chauffeurId":     driver_id,
        "vehiculeId":      vehicle_id,
        "clientId":        client_id,
        "assignedByFleet": False,
        "fleetOwnerId":    None,
        "status":          "LIVRE",
        "tracking":        [],
        "debutAt":         datetime.utcnow() - timedelta(days=1),
        "finAt":           datetime.utcnow() - timedelta(hours=2),
        "infoPaiement": {
            "montant":       15000.0,
            "methode":       "CASH",
            "status":        "PAYE",
            "transactionId": None,
            "createdAt":     datetime.utcnow() - timedelta(days=1),
            "paidAt":        datetime.utcnow() - timedelta(hours=2)
        },
        "proofOfDelivery": "TEST_TRIP",
        "createdAt":       datetime.utcnow() - timedelta(days=2)
    })
    print(f"✅ TRIP created       → id: {trip_id}")

    # ── Summary ──────────────────────────────────────
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  Test credentials:")
    print("  CLIENT  → 0550000001 / password123")
    print("  DRIVER  → 0550000002 / password123")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  Login as either user to see the LIVRE")
    print("  trip in Historique and test the invoice.")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    client.close()

asyncio.run(main())