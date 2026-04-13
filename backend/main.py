from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import client
from app.services.matching import ensure_geo_index

from app.routers.auth     import router as auth_router
from app.routers.loads    import router as loads_router
from app.routers.offers   import router as offers_router
from app.routers.trips    import router as trips_router
from app.routers.payments import router as payments_router
from app.routers.users    import router as users_router
from app.routers.fleet    import router as fleet_router
from app.routers.tracking import router as tracking_router

app = FastAPI(
    title="TransportDZ API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await client.admin.command("ping")
        print("✅  MongoDB connected.")
    except Exception as e:
        print(f"❌  MongoDB failed: {e}")

    await ensure_geo_index()


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(auth_router)
app.include_router(loads_router)
app.include_router(offers_router)
app.include_router(trips_router)
app.include_router(payments_router)
app.include_router(users_router)
app.include_router(fleet_router)
app.include_router(tracking_router)


@app.get("/", tags=["Health"])
async def root():
    return {"service": "TransportDZ API", "version": "1.0.0", "status": "running"}


@app.get("/health", tags=["Health"])
async def health():
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"api": "ok", "database": db_status}