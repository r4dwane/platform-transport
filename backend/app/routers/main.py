from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.database import client  # Motor client for lifecycle management

# ── Routers ──────────────────────────────────
from app.routers.auth     import router as auth_router
from app.routers.loads    import router as loads_router
from app.routers.offers   import router as offers_router
from app.routers.trips    import router as trips_router
from app.routers.payments import router as payments_router
from app.routers.users    import router as users_router
from app.routers.fleet    import router as fleet_router


# ─────────────────────────────────────────────
#  App factory
# ─────────────────────────────────────────────

app = FastAPI(
    title="TransportDZ API",
    description=(
        "Plateforme de mise en relation entre expéditeurs et transporteurs en Algérie. "
        "Gérez vos charges, offres, trajets et paiements via cette API."
    ),
    version="1.0.0",
    contact={
        "name": "TransportDZ",
        "email": "support@transportdz.dz"
    }
)


# ─────────────────────────────────────────────
#  CORS  (adjust origins for production)
# ─────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
#  Database lifecycle (open/close connection)
# ─────────────────────────────────────────────

@app.on_event("startup")
async def startup_db():
    """Verify the MongoDB connection is alive on startup."""
    try:
        await client.admin.command("ping")
        print("✅  MongoDB connected successfully.")
    except Exception as e:
        print(f"❌  MongoDB connection failed: {e}")


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
    print("🔌  MongoDB connection closed.")


# ─────────────────────────────────────────────
#  Register routers
# ─────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(loads_router)
app.include_router(offers_router)
app.include_router(trips_router)
app.include_router(payments_router)
app.include_router(users_router)
app.include_router(fleet_router)


# ─────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "TransportDZ API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
async def health():
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"api": "ok", "database": db_status}
