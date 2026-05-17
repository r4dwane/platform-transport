# PLATFORM TRANSPORT — MASTER SYSTEM DOCUMENTATION

> **Version:** 2.0.0  
> **Last Updated:** May 2026  
> **Stack:** FastAPI 0.110 · MongoDB · React Native (Expo 54) · Redis · WebSocket  
> **Region:** Algeria 🇩🇿 — Expanding to North Africa  
> **Classification:** Internal — Engineering · Product · Operations

---

## ⚠️ DOCUMENT CONVENTIONS

Throughout this document, feature status is marked as:

| Badge          | Meaning                                      |
| -------------- | -------------------------------------------- |
| ✅ **DONE**    | Fully implemented, tested, in use            |
| ⚠️ **PARTIAL** | Code exists but incomplete or has known gaps |
| 🔲 **PLANNED** | Designed but not yet coded                   |
| ❌ **MISSING** | Required but not started                     |

This prevents mixing "what we built" with "what we want to build."

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Current Reality — Feature Status Matrix](#2-current-reality--feature-status-matrix)
3. [Features Implemented — Deep Detail](#3-features-implemented--deep-detail)
4. [Critical Missing Implementations](#4-critical-missing-implementations)
5. [Major Bugs Encountered & Solutions](#5-major-bugs-encountered--solutions)
6. [System Architecture](#6-system-architecture)
7. [Database Design](#7-database-design)
8. [Performance Strategy](#8-performance-strategy)
9. [Enterprise Features Roadmap](#9-enterprise-features-roadmap)
10. [Global TMS Benchmark](#10-global-tms-benchmark)
11. [Product Roadmap](#11-product-roadmap)
12. [Non-Negotiable Engineering Rules](#12-non-negotiable-engineering-rules)
13. [CTO Recommendations](#13-cto-recommendations)

---

# 1. PROJECT OVERVIEW

## 1.1 Purpose

**TransportDZ** is a full-stack freight logistics platform that digitizes the movement of goods across Algeria. It connects three market actors in real time:

- **Shippers (Clients)** who post freight loads
- **Independent Drivers** who compete for loads on an open market
- **Fleet Owners** who manage organized teams of drivers and company vehicles

The platform eliminates phone-call-based freight booking, removes information asymmetry, and introduces algorithmic load-to-truck assignment (VRP) to reduce deadhead mileage — the largest controllable cost in road freight.

## 1.2 User Roles

| Role               | Code               | Description                                                     |
| ------------------ | ------------------ | --------------------------------------------------------------- |
| Shipper            | `CLIENT`           | Posts loads, reviews offers, tracks delivery, pays              |
| Independent Driver | `CHAUFFEUR_IND`    | Browses open market, submits bids, executes delivery            |
| Fleet Owner        | `PROP_FLOTTE`      | Manages drivers + vehicles, assigns missions, runs optimization |
| Fleet Driver       | `CHAUFFEUR_FLOTTE` | Executes assigned missions only — no market browsing            |
| Admin              | `ADMIN`            | Internal TransportDZ team — platform oversight                  |

## 1.3 Core Business Logic: Market Separation

This is the most critical architectural decision in the platform:

```
OUVERT (Open Market)
─────────────────────────────────────────────────
Client posts load → marche = "OUVERT"
→ Visible to ALL CHAUFFEUR_IND on their map
→ Drivers compete by submitting price offers
→ Client reviews, selects best offer
→ Other offers auto-rejected
→ Trip created
→ VRP optimization: NOT applicable

FLOTTE (Fleet Dedicated)
─────────────────────────────────────────────────
Client posts load → marche = "FLOTTE"
→ INVISIBLE to independent drivers
→ Visible ONLY to PROP_FLOTTE on their map
→ Fleet owner assigns to a specific driver (manual)
  OR runs VRP optimization (auto-assign)
→ Trip created immediately — no bidding
→ VRP optimization: FULLY applicable (clean dataset)
```

**Why market separation is essential for optimization:**
The VRP engine can only produce valid, conflict-free assignments when it operates on loads guaranteed not to be claimed by concurrent independent driver offers. Market separation ensures this.

## 1.4 Revenue Model

| Stream                 | Model                          | Target Users         |
| ---------------------- | ------------------------------ | -------------------- |
| Trip commission        | 3–5% of trip value             | All                  |
| Fleet Pro SaaS         | 15,000 DA/month per 10 trucks  | Fleet owners         |
| Shipper Pro SaaS       | 5,000 DA/month unlimited loads | High-volume shippers |
| PDF invoice generation | Included Pro / add-on Free     | All                  |
| Document storage       | Pro only                       | Fleet owners         |
| Enterprise API         | Custom                         | National carriers    |

## 1.5 Competitive Position

| Feature                  | TransportDZ     | Convoy     | Samsara     | Oracle TMS | MercuryGate |
| ------------------------ | --------------- | ---------- | ----------- | ---------- | ----------- |
| Mobile-first native      | ✅              | ✅         | ⚠️          | ❌         | ❌          |
| Open market bidding      | ✅              | ✅         | ❌          | ❌         | ✅          |
| Fleet VRP optimization   | ✅              | ✅         | ⚠️          | ✅         | ✅          |
| Live GPS WebSocket       | ✅              | ✅         | ✅          | ❌         | ⚠️          |
| Algeria market           | ✅              | ❌         | ❌          | ❌         | ❌          |
| French UI + DA pricing   | ✅              | ❌         | ❌          | ❌         | ❌          |
| Offline routing fallback | ✅              | ❌         | ❌          | ❌         | ❌          |
| Invite code onboarding   | ✅              | ❌         | ❌          | ❌         | ❌          |
| PDF invoice + TVA 19%    | ⚠️ backend only | ✅         | ⚠️          | ✅         | ✅          |
| Price                    | Freemium        | Commission | $33/vehicle | $200k+     | $100k+      |

---

# 2. CURRENT REALITY — FEATURE STATUS MATRIX

## 2.1 Backend Status

| Feature                | Endpoint                                   | Status     | Notes                                                          |
| ---------------------- | ------------------------------------------ | ---------- | -------------------------------------------------------------- |
| User registration      | `POST /api/v1/auth/register`               | ✅ DONE    | Invite code flow for fleet drivers                             |
| User login + JWT       | `POST /api/v1/auth/login`                  | ✅ DONE    |                                                                |
| Profile fetch          | `GET /api/v1/auth/me`                      | ✅ DONE    | Fixed: now uses Depends                                        |
| Load create            | `POST /api/v1/loads`                       | ✅ DONE    | marche field exists in code but **NOT in DB yet**              |
| Load list (open)       | `GET /api/v1/loads`                        | ⚠️ PARTIAL | marche=OUVERT filter **not applied** in current file           |
| Load edit              | `PUT /api/v1/loads/{id}`                   | ✅ DONE    | DISPONIBLE only                                                |
| Load cancel            | `DELETE /api/v1/loads/{id}`                | ✅ DONE    |                                                                |
| Submit offer           | `POST /api/v1/offers`                      | ⚠️ PARTIAL | FLOTTE load block **not implemented**                          |
| Accept offer           | `POST /api/v1/offers/{id}/accept`          | ✅ DONE    |                                                                |
| Reject offer           | `POST /api/v1/offers/{id}/reject`          | ✅ DONE    |                                                                |
| Advance trip status    | `POST /api/v1/trips/{id}/advance`          | ✅ DONE    |                                                                |
| GPS location push      | `POST /api/v1/trips/{id}/location`         | ✅ DONE    |                                                                |
| Fleet stats            | `GET /api/v1/fleet/stats`                  | ✅ DONE    |                                                                |
| Fleet available loads  | `GET /api/v1/fleet/available-loads`        | ⚠️ PARTIAL | marche=FLOTTE filter **not applied**                           |
| Fleet assign mission   | `POST /api/v1/fleet/assign`                | ⚠️ PARTIAL | Does NOT enforce assigned vehicle to driver                    |
| Fleet VRP optimize     | `POST /api/v1/fleet/optimize`              | ⚠️ PARTIAL | Does NOT filter FLOTTE only; ignores vehicle-driver assignment |
| Invite code generate   | `POST /api/v1/fleet/invite`                | ✅ DONE    |                                                                |
| Invite code list       | `GET /api/v1/fleet/invites`                | ✅ DONE    |                                                                |
| Add vehicle to driver  | `POST /api/v1/fleet/drivers/{id}/vehicles` | 🔲 PLANNED | Written but not integrated in router                           |
| Payment confirm        | `POST /api/v1/payments/trip/{id}/confirm`  | ✅ DONE    |                                                                |
| Invoice PDF generate   | `GET /api/v1/payments/trip/{id}/invoice`   | ❌ MISSING | Service written, endpoint not created                          |
| WebSocket connection   | `WS /ws/{user_id}`                         | ✅ DONE    |                                                                |
| Notifications inbox    | `GET /api/v1/notifications`                | ✅ DONE    |                                                                |
| Mark notification read | `POST /api/v1/notifications/{id}/read`     | ✅ DONE    |                                                                |
| Admin dashboard        | All `/api/v1/admin/*`                      | ❌ MISSING | Not started                                                    |

## 2.2 Frontend Status

| Screen / Component                          | Status     | Notes                             |
| ------------------------------------------- | ---------- | --------------------------------- |
| Login screen                                | ✅ DONE    |                                   |
| Register screen (2-step)                    | ✅ DONE    | Invite code UI for fleet drivers  |
| Client home (load list + stats)             | ✅ DONE    |                                   |
| Load form with map picker                   | ✅ DONE    | Market type selector included     |
| Load edit form                              | ✅ DONE    |                                   |
| LoadCard with edit/cancel buttons           | ✅ DONE    | Event bubbling fixed              |
| Client offers screen                        | ✅ DONE    |                                   |
| Client tracking screen                      | ✅ DONE    | ETA card present                  |
| Client trips history                        | ✅ DONE    |                                   |
| Client profile                              | ✅ DONE    |                                   |
| Driver home — independent (map + offers)    | ✅ DONE    | Mission lock banner present       |
| Driver home — fleet (assigned mission only) | ✅ DONE    |                                   |
| Driver active trip (map + ETA + advance)    | ✅ DONE    |                                   |
| Driver my-offers                            | ✅ DONE    |                                   |
| Driver trips history                        | ✅ DONE    |                                   |
| Driver profile (vehicle management)         | ✅ DONE    |                                   |
| Fleet dashboard (stats + assign + optimize) | ✅ DONE    |                                   |
| Fleet drivers list                          | ✅ DONE    |                                   |
| Fleet driver detail (profile + vehicles)    | ✅ DONE    | Add vehicle modal present         |
| Fleet loads map                             | ✅ DONE    |                                   |
| Fleet trips (read-only missions)            | ✅ DONE    |                                   |
| Fleet profile (invite codes)                | ✅ DONE    |                                   |
| Notifications screen                        | ✅ DONE    |                                   |
| NotificationBell                            | ✅ DONE    | Fixed: hook called in root layout |
| LeafletMap component                        | ✅ DONE    | WebView + Leaflet.js              |
| MapLocationPicker                           | ✅ DONE    | Nominatim geocoding               |
| Invoice download button                     | ❌ MISSING |                                   |
| Admin screens                               | ❌ MISSING |                                   |

---

# 3. FEATURES IMPLEMENTED — DEEP DETAIL

## 3.1 Authentication

**Stack:** FastAPI + JWT (python-jose) + bcrypt (passlib 1.7.4 + bcrypt 4.2.1) + expo-secure-store

### Flow

```
Register:
  POST /api/v1/auth/register
  → Phone uniqueness check (409 on duplicate)
  → CHAUFFEUR_FLOTTE: validate 6-char invite code
      → find in invite_codes: {code, used:false, expiresAt > now}
      → mark code used, link employeurId
  → Hash password: bcrypt rounds=12
  → Insert user document
  → Return {user_id, role}

Login:
  POST /api/v1/auth/login
  → Find user by telephone
  → bcrypt.checkpw(plaintext, hash)
  → JWT: {sub: user_id, role: role, exp: +24h}
  → Stored client-side in expo-secure-store (encrypted)

App boot:
  loadFromStorage() → get token from secure store
  → GET /api/v1/auth/me (Depends(get_current_user))
  → Role detected → router.replace() to correct tab group
```

### RBAC (Role-Based Access Control)

```python
# dependencies.py
def require_role(*roles: RoleUtilisateur):
    async def role_checker(current_user = Depends(get_current_user)):
        if current_user.get("role") not in [r.value for r in roles]:
            raise HTTPException(403, "Vous n'avez pas les permissions nécessaires.")
        return current_user
    return role_checker
```

All endpoints declare their role requirements explicitly. No endpoint relies on client-side role validation.

---

## 3.2 Load Posting System

### Market Type Selector (LoadForm.tsx)

```
Two large tappable cards:
  🌐 Marché Ouvert
     "Chauffeurs indépendants soumettent des offres"
     → marche = "OUVERT"

  🚛 Flotte Privée
     "Le propriétaire de flotte assigne directement"
     → marche = "FLOTTE"

Info banner changes based on selection:
  OUVERT → blue info: explains bidding process
  FLOTTE → orange warning: explains direct assignment
```

### Map-Based Location Picking (MapLocationPicker.tsx)

```
Full-screen modal:
  → Search bar → Nominatim API (countrycodes=dz, limit=5)
  → Suggestions list with address strings
  → OR tap anywhere on map → reverse geocoding
  → Confirmed location: {address, latitude, longitude}
  → Orange pin placed at selected point
  → Coordinates saved as GeoJSON: [longitude, latitude]
```

### ⚠️ KNOWN GAP: Market Filter Not Applied in Backend

The `marche` field is defined in the model and sent by the frontend, but `GET /api/v1/loads` does **not** filter by `marche=OUVERT`. This means FLOTTE loads currently appear on independent drivers' maps. **Fix required — see Section 4.1.**

---

## 3.3 Offer System

### Independent Driver Offer Flow

```
Driver taps load pin on map
  → Route calculated: driver → pickup → dropoff (ORS or Haversine)
  → Detail card shows: price, weight, addresses, distance, ETA
  → "Soumettre une offre" button

  Mission Lock (EN_ROUTE_RAMASSAGE | CHARGEMENT | EN_ROUTE_LIVRAISON):
    → Button replaced with yellow warning banner
    → Tap banner → navigates to active-trip screen
    → Cannot submit offer while on active mission

OfferForm:
  → Vehicle selector (auto-selects first vehicle)
  → useEffect: updates selectedVehicle when vehicles prop loads
  → Quick time buttons: Dans 1h, 2h, 4h, Demain, Dans 2j
  → Date parser handles DD/MM/YYYY HH:MM (Android safe)
  → Validation: vehicle required, price required, date required
```

### ⚠️ KNOWN GAP: FLOTTE Load Block Missing

`POST /api/v1/offers` does not check `load["marche"]`. Independent drivers can submit offers on FLOTTE loads. **Fix required — see Section 4.1.**

---

## 3.4 Trip Lifecycle

### Status Machine

```
PLANIFIE
  → [Driver taps "Démarrer vers le ramassage"]
EN_ROUTE_RAMASSAGE  (load: RESERVEE, debutAt set)
  → [Driver taps "Confirmer l'arrivée au ramassage"]
CHARGEMENT          (load: EN_MISSION)
  → [Driver taps "Chargement terminé — Partir"]
EN_ROUTE_LIVRAISON  (load: EN_MISSION)
  → [Driver taps "Confirmer la livraison"]
LIVRE               (load: LIVREE, finAt set)
```

### ETA Card (Active Trip Screen)

```
Recalculates on every GPS update:

EN_ROUTE_RAMASSAGE:
  route = getRoute([driverPos, pickup, dropoff])
  Shows: "Vers le ramassage" — distance + duration remaining

EN_ROUTE_LIVRAISON:
  route = getRoute([driverPos, dropoff])
  Shows: "Vers la livraison" — distance + duration remaining

Both cards show:
  ├── Remaining distance (km / m)
  └── Estimated time (min / h min)
```

### Notification Resilience

All `notify_*()` calls are wrapped in try/except. A notification failure never blocks trip status advancement.

---

## 3.5 Live GPS Tracking

### Data Flow

```
Driver device (expo-location, 5s / 10m):
  └─► useDriverTracking() → POST /api/v1/trips/{id}/location
          └─► update_driver_location():
                ├─► Redis: driver:location:{id} (TTL 300s)
                ├─► Redis: trip:tracking:{id}   (TTL 300s)
                ├─► MongoDB: $push tracking[]
                └─► WebSocket: send to client {event:"location_update"}

Client device (WebSocket listener):
  └─► useTracking() receives location_update
      └─► LeafletMap: "driver" marker repositioned
```

### LeafletMap Communication Protocol

```typescript
// React Native → WebView (commands)
{ action: "add_marker", id, latitude, longitude, color, title, popup, isDriver }
{ action: "clear_markers" }
{ action: "draw_route", points: LatLng[], color, dashed }
{ action: "fit_bounds", points: LatLng[] }
{ action: "set_pick_mode", enabled: boolean }

// WebView → React Native (events)
{ type: "map_ready" }
{ type: "map_tap", latitude, longitude }     // pick mode only
{ type: "marker_tap", id }
```

---

## 3.6 Route Calculation

### ORS Integration

```typescript
POST https://api.openrouteservice.org/v2/directions/driving-hgv
Headers: { Authorization: ORS_API_KEY }
Body: {
  coordinates: [[lon,lat], ...],  // ORS is [lon,lat] not [lat,lon]
  format: "geojson",
  units: "km",
  radiuses: [5000, 5000, ...]      // 5km snap radius for Algeria
}
Response: GeoJSON FeatureCollection
  → geometry.coordinates → LatLng[]
  → properties.summary.distance → km
  → properties.summary.duration → seconds → minutes
```

### Haversine Fallback

```typescript
// Triggered when: no API key, ORS fails, network offline
haversineDistance(a, b):
  R = 6371 km
  φ1, φ2 = radians(lat)
  Δφ = radians(Δlat), Δλ = radians(Δlon)
  a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
  c = 2·atan2(√a, √(1-a))
  d = R·c

Speed assumption: 70 km/h (Algerian highway average for trucks)
```

---

## 3.7 Fleet Optimization Engine (VRP)

### Algorithm (app/services/optimization.py)

```python
Algorithm: Greedy Nearest-Neighbor VRP
Complexity: O(N × M) — N loads, M drivers
No external dependencies — pure Python math

For each load (sorted by createdAt ASC — oldest = most urgent):
  1. Skip if load.coordEnlev.coordinates = [0,0] (no location)
  2. Filter drivers: not assigned + vehicle_capacity_kg >= load.poidsKg
  3. Score: empty_km = haversine(driver_pos, load_pickup)
  4. Select driver with minimum empty_km
  5. Record assignment with metrics:
       loaded_km = haversine(pickup, dropoff)
       efficiency_pct = loaded_km / (empty_km + loaded_km) * 100
       eta_pickup_min = (empty_km / 70) * 60

Output: List of assignments with full metrics + fleet_summary
```

### ⚠️ KNOWN GAPS

1. Engine does NOT filter `marche=FLOTTE` loads — processes all DISPONIBLE loads
2. Engine does NOT enforce that the assigned vehicle belongs to the assigned driver
3. Engine uses vehicle ownership (`proprietaireId`) not driver assignment (`assignedDriverId`)

**All three gaps fixed in Section 4.**

---

## 3.8 Invite Code System

### Code Generation

```python
chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
# Excludes: 0 (confused with O), O, I (confused with 1), 1
code = "".join(random.choices(chars, k=6))
# Uniqueness checked before saving
# TTL: 24 hours, single use
```

### Registration with Code

```python
POST /api/v1/auth/register { role: "CHAUFFEUR_FLOTTE", inviteCode: "ABC123" }
→ find invite_codes where code="ABC123" AND used=false
→ check expiresAt > now()
→ employeurId = invite.ownerId
→ mark code: used=true, usedAt=now, usedBy=telephone
→ create user linked to fleet
```

---

## 3.9 Notification System

### Backend Trigger Points

```python
# In offers.py
await notify_new_offer(client_id, load_id, driver_name, prix)
await notify_offer_accepted(driver_id, load_id, trip_id)
await notify_offer_rejected(driver_id, load_id)

# In trips.py (wrapped in try/except)
try:
    await notify_trip_status(client_id, driver_id, trip_id, new_status)
except Exception as e:
    print(f"Notification error: {e}")

# In payments.py
await notify_payment_confirmed(driver_id, trip_id, montant)
```

### Frontend Initialization

```typescript
// app/_layout.tsx — AppContent wrapper
function AppContent() {
  const { user } = useAuthStore();
  useNotifications(user?.id ?? null);  // Called here — runs for ALL roles
  return <Slot />;
}
```

### WebSocket Keep-Alive

```typescript
// Ping every 30 seconds to prevent connection timeout
const ping = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ping: true }));
  }
}, 30000);
```

---

## 3.10 PDF Invoice Generation

### Status: ⚠️ PARTIAL — Service written, endpoint missing

### Invoice Service (app/services/invoice.py)

```python
ReportLab A4 layout:
  Header: TransportDZ brand + invoice number + date + status badge
  Info block: Client info ‖ Driver info (side by side)
  Load details table: type, weight, addresses, dates
  Financial table:
    HT = TTC / 1.19
    TVA = TTC - HT  (19% Algeria rate)
    TTC row highlighted in orange
  Payment block: method, status, transaction ID, paid date
  Footer: legal mention + trip reference

Invoice number format: TDZ-YYYYMM-XXXXXX (last 6 of trip _id)
```

### Missing: Endpoint + Frontend Download

See Section 4.3 for complete implementation.

---

# 4. CRITICAL MISSING IMPLEMENTATIONS

## 4.1 Market Separation (Strict Enforcement)

**Priority: CRITICAL — Must fix before any production use**

### Backend Fixes Required

**File: `app/routers/loads.py` — `list_loads` endpoint**

```python
# CURRENT (broken):
filters: dict = {"status": StatutCharge.DISPONIBLE}

# CORRECT:
filters: dict = {
    "status": StatutCharge.DISPONIBLE,
    "marche": TypeMarche.OUVERT,      # ← ADD THIS
}
```

**File: `app/routers/offers.py` — `create_offer` endpoint**

```python
# ADD after load status check:
from app.models.load import TypeMarche
if load.get("marche") == TypeMarche.FLOTTE:
    raise HTTPException(
        status_code=400,
        detail="Cette charge est réservée aux flottes. "
               "Les chauffeurs indépendants ne peuvent pas soumettre d'offres."
    )
```

**File: `app/routers/fleet.py` — `get_available_loads` endpoint**

```python
# CURRENT (broken):
cursor = db["charges"].find({"status": StatutCharge.DISPONIBLE})

# CORRECT:
cursor = db["charges"].find({
    "status": StatutCharge.DISPONIBLE,
    "marche": "FLOTTE",               # ← ADD THIS
})
```

**File: `app/routers/fleet.py` — `optimize_fleet` endpoint**

```python
# CURRENT (broken):
load_cursor = db["charges"].find(
    {"status": StatutCharge.DISPONIBLE}
)

# CORRECT:
load_cursor = db["charges"].find(
    {"status": StatutCharge.DISPONIBLE, "marche": "FLOTTE"}  # ← ADD THIS
)
```

---

## 4.2 Driver-Assigned Vehicle Enforcement

**Priority: HIGH — Required for optimization correctness**

### The Problem

Currently vehicles are owned by fleet owner (`proprietaireId = owner_id`) but there is no reliable link between a vehicle and the driver who uses it for the assignment/optimization flow.

### Backend Fix: `app/routers/fleet.py`

**Add endpoint: `POST /api/v1/fleet/drivers/{driver_id}/vehicles`**

```python
class FleetVehiclePayload(BaseModel):
    type: str
    capaciteKg: float = Field(..., gt=0)
    capaciteM3: Optional[float] = None
    plaqueImmatriculation: str

@router.post("/drivers/{driver_id}/vehicles", status_code=201)
async def add_vehicle_to_driver(
    driver_id: str,
    payload: FleetVehiclePayload,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]
    # 1. Verify driver belongs to fleet
    driver = await db["users"].find_one({
        "_id": driver_id,
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    })
    if not driver:
        raise HTTPException(404, "Chauffeur introuvable dans votre flotte.")

    # 2. Create vehicle with assignedDriverId
    vehicle_doc = {
        "_id": str(ObjectId()),
        "proprietaireId": owner_id,       # Fleet owns it
        "assignedDriverId": driver_id,    # Driver uses it
        "type": payload.type,
        "capaciteKg": payload.capaciteKg,
        "capaciteM3": payload.capaciteM3,
        "plaqueImmatriculation": payload.plaqueImmatriculation,
        "position": {"type": "Point", "coordinates": [0, 0]},
        "status": "DISPONIBLE",
        "createdAt": datetime.utcnow()
    }
    await db["vehicules"].insert_one(vehicle_doc)
    return {"message": f"Véhicule assigné à {driver['nom']}.",
            "vehicule_id": vehicle_doc["_id"]}
```

**Add endpoint: `GET /api/v1/fleet/drivers/{driver_id}/vehicles`**

```python
@router.get("/drivers/{driver_id}/vehicles")
async def get_driver_vehicles(driver_id: str,
                               current_user: dict = Depends(require_role(FLEET_OWNER))):
    cursor = db["vehicules"].find({
        "proprietaireId": current_user["_id"],
        "assignedDriverId": driver_id
    })
    vehicles = await cursor.to_list(length=50)
    for v in vehicles:
        v["id"] = v.pop("_id")
    return {"vehicules": vehicles}
```

**Add endpoint: `DELETE /api/v1/fleet/drivers/{driver_id}/vehicles/{vehicle_id}`**

```python
@router.delete("/drivers/{driver_id}/vehicles/{vehicle_id}")
async def remove_vehicle_from_driver(driver_id: str, vehicle_id: str,
                                      current_user: dict = Depends(require_role(FLEET_OWNER))):
    vehicle = await db["vehicules"].find_one({
        "_id": vehicle_id,
        "proprietaireId": current_user["_id"],
        "assignedDriverId": driver_id
    })
    if not vehicle:
        raise HTTPException(404, "Véhicule introuvable.")
    if vehicle["status"] == "EN_MISSION":
        raise HTTPException(400, "Véhicule en mission — impossible de retirer.")
    await db["vehicules"].delete_one({"_id": vehicle_id})
    return {"message": "Véhicule retiré."}
```

### Fix Optimization Engine to Use assignedDriverId

**File: `app/services/optimization.py`**

```python
# When building available_drivers, fetch their ASSIGNED vehicle:
vehicle = await db["vehicules"].find_one({
    "proprietaireId": owner_id,
    "assignedDriverId": driver["_id"],   # ← Use assignedDriverId
    "status": "DISPONIBLE"
})
```

### Fix Assignment Validation

**File: `app/routers/fleet.py` — `assign_mission` endpoint**

```python
# Validate that vehicle is assigned to the selected driver
vehicle = await db["vehicules"].find_one({
    "_id": payload.vehicle_id,
    "proprietaireId": owner_id,
    "assignedDriverId": payload.driver_id   # ← ADD THIS CHECK
})
if not vehicle:
    raise HTTPException(400,
        "Ce véhicule n'est pas assigné à ce chauffeur.")
```

### Update fleet.service.ts (Frontend)

```typescript
// Add to fleet.service.ts:
addVehicleToDriver: (driverId: string, payload: {
  type: string;
  capaciteKg: number;
  capaciteM3?: number;
  plaqueImmatriculation: string;
}) => api.post(`/api/v1/fleet/drivers/${driverId}/vehicles`, payload),

getDriverVehicles: (driverId: string) =>
  api.get(`/api/v1/fleet/drivers/${driverId}/vehicles`),

removeVehicleFromDriver: (driverId: string, vehicleId: string) =>
  api.delete(`/api/v1/fleet/drivers/${driverId}/vehicles/${vehicleId}`),
```

---

## 4.3 Invoice Download (Complete Implementation)

### Backend: Add Endpoint to payments.py

```python
# Install first: uv pip install reportlab

from fastapi.responses import Response
from app.services.invoice import generate_invoice_pdf

@router.get(
    "/trip/{trip_id}/invoice",
    summary="Télécharger la facture PDF d'un trajet"
)
async def download_invoice(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    # 1. Fetch trip
    trip = await db["trajets"].find_one({"_id": trip_id})
    if not trip:
        raise HTTPException(404, "Trajet introuvable.")

    # 2. Access control: client or driver only
    uid = current_user["_id"]
    if uid not in [trip["clientId"], trip["chauffeurId"]]:
        raise HTTPException(403, "Accès refusé.")

    # 3. Only generate after delivery
    if trip["status"] != "LIVRE":
        raise HTTPException(400,
            "La facture n'est disponible qu'après la livraison.")

    # 4. Fetch related documents
    load   = await db["charges"].find_one({"_id": trip["chargeId"]})
    client = await db["users"].find_one({"_id": trip["clientId"]})
    driver = await db["users"].find_one({"_id": trip["chauffeurId"]})

    if not all([load, client, driver]):
        raise HTTPException(500, "Données incomplètes pour générer la facture.")

    # 5. Generate PDF
    pdf_bytes = generate_invoice_pdf(trip, load, client, driver)

    # 6. Return as downloadable PDF
    invoice_no = f"TDZ-{datetime.utcnow().strftime('%Y%m')}-{trip_id[-6:].upper()}"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="facture-{invoice_no}.pdf"'
        }
    )
```

### Frontend: Add Download Button

**In `app/(client)/trips.tsx` and `app/(driver)/trips.tsx`:**

```typescript
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const downloadInvoice = async (tripId: string) => {
  try {
    const token = await SecureStore.getItemAsync("access_token");
    const url = `${API_BASE_URL}/api/v1/payments/trip/${tripId}/invoice`;

    const result = await FileSystem.downloadAsync(
      url,
      FileSystem.documentDirectory + `facture-${tripId.slice(-6)}.pdf`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Télécharger la facture",
      });
    }
  } catch (e) {
    Alert.alert("Erreur", "Impossible de télécharger la facture.");
  }
};
```

**Install required packages:**

```bash
npx expo install expo-file-system expo-sharing
```

**Button (only for LIVRE trips):**

```tsx
{
  trip.status === "LIVRE" && (
    <TouchableOpacity
      onPress={() => downloadInvoice(trip.id)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primary + "15",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primary + "30",
      }}
    >
      <FileText size={16} color={Colors.primary} />
      <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 13 }}>
        Télécharger la facture PDF
      </Text>
    </TouchableOpacity>
  );
}
```

---

## 4.4 Admin Screens

**Priority: MEDIUM — Required for platform operations**

### Backend: Add Admin Router

```python
# app/routers/admin.py
router = APIRouter(prefix="/api/v1/admin", tags=["Administration"])
ADMIN_ONLY = require_role(RoleUtilisateur.ADMIN)

@router.get("/stats")           # Platform-wide statistics
@router.get("/users")           # All users with filters
@router.get("/loads")           # All loads (any status)
@router.get("/trips")           # All trips (any status)
@router.post("/users/{id}/verify")      # Mark user as verified
@router.post("/users/{id}/suspend")     # Suspend account
@router.post("/payments/{trip_id}/fail") # Mark payment failed (already exists)
@router.get("/logs")            # Activity logs
```

### Frontend: Admin Tab Group

```
app/(admin)/
  _layout.tsx     — Tab navigator
  dashboard.tsx   — Platform KPIs
  users.tsx       — User management (verify, suspend)
  loads.tsx       — All loads any status
  trips.tsx       — All trips monitoring
  payments.tsx    — Payment oversight
```

---

# 5. MAJOR BUGS ENCOUNTERED & SOLUTIONS

## 5.1 Python 3.14 Incompatibility

| Field          | Detail                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| **Symptom**    | `bcrypt`, `passlib` crash on import; pip install fails                     |
| **Root Cause** | Python 3.14 (pre-release) has no pre-built wheels for C-extension packages |
| **Fix**        | Downgraded to Python **3.12.13**                                           |
| **Prevention** | Pin in `.python-version`; never use pre-release Python in production       |

## 5.2 passlib + bcrypt Version Conflict

| Field          | Detail                                                                |
| -------------- | --------------------------------------------------------------------- |
| **Symptom**    | `ValueError: password cannot be longer than 72 bytes` at runtime      |
| **Root Cause** | `bcrypt 5.0.0` changed internal API incompatible with `passlib 1.7.4` |
| **Fix**        | Pin `passlib==1.7.4` + `bcrypt==4.2.1` in requirements.txt            |
| **Prevention** | Lock all security library versions; test upgrades in isolation        |

## 5.3 Expo 54 + Reanimated v4 TurboModule Crash

| Field          | Detail                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| **Symptom**    | `TurboModule method "installTurboModule" called with 1 arguments` — white screen     |
| **Root Cause** | Reanimated v4 requires New Architecture; Expo Go uses Legacy Architecture            |
| **Chain**      | `@gorhom/bottom-sheet → gesture-handler → reanimated → worklets → crash`             |
| **Fix**        | Removed Reanimated; replaced BottomSheet with custom Modal (`visible/onClose` props) |
| **Prevention** | Always check Expo Go compatibility before installing animation libraries             |

## 5.4 Backend Not Reachable from Phone

| Field          | Detail                                                                |
| -------------- | --------------------------------------------------------------------- |
| **Symptom**    | `Network Error` / "Erreur de connexion" on login                      |
| **Root Cause** | uvicorn listens on `127.0.0.1` only by default — not reachable on LAN |
| **Fix**        | `uvicorn main:app --reload --host 0.0.0.0 --port 8000`                |
| **Prevention** | Document this in README; add Windows Firewall rule for port 8000      |

## 5.5 JWT `/me` Endpoint 422 Error

| Field          | Detail                                                                                |
| -------------- | ------------------------------------------------------------------------------------- |
| **Symptom**    | Login succeeds (200) but `/me` returns 422 "Field required: token"                    |
| **Root Cause** | `/me` declared `token: str` as query param instead of reading Bearer header           |
| **Fix**        | Changed to `Depends(get_current_user)`                                                |
| **Prevention** | All protected endpoints must use `Depends(get_current_user)` — enforce in code review |

## 5.6 "Objects are not valid as React child" Crash

| Field          | Detail                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| **Symptom**    | App crashes on login; error mentions `{type, loc, msg, input, url}`               |
| **Root Cause** | Pydantic validation errors return array of objects; rendered directly in `<Text>` |
| **Fix**        | `extractError()` helper function handles string/array/object cases                |
| **Prevention** | Never render `e?.response?.data?.detail` directly; always `extractError()`        |

## 5.7 BottomSheet Event Bubbling

| Field          | Detail                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| **Symptom**    | Tapping "Modifier" or "Annuler" on LoadCard navigates to offers screen         |
| **Root Cause** | Entire card wrapped in `TouchableOpacity`; button taps bubble to card press    |
| **Fix**        | Card body in one `TouchableOpacity`; action buttons **outside** it as siblings |
| **Prevention** | Never wrap entire list items in pressable when they contain action buttons     |

## 5.8 Fleet Loads Visible to Independent Drivers

| Field          | Detail                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| **Symptom**    | FLOTTE loads appear on independent driver map                                     |
| **Root Cause** | `GET /api/v1/loads` has no `marche` filter                                        |
| **Fix**        | Add `"marche": TypeMarche.OUVERT` to query filters (**not yet done in codebase**) |
| **Status**     | ❌ **STILL MISSING** — Section 4.1                                                |

## 5.9 Fleet Driver Map Shows Stale Markers After Trip Ends

| Field          | Detail                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- |
| **Symptom**    | Fleet driver sees "Pas de mission" text but still sees pickup/dropoff pins and route        |
| **Root Cause** | `load` state + `routePoints` not cleared when `activeTrip` becomes null                     |
| **Fix**        | Added `setRoutePoints([])` when `!activeTrip`; added `activeTrip &&` guard to markers array |
| **Prevention** | Always clear dependent state when parent state becomes null                                 |

## 5.10 REDIS_URL AttributeError → 500 on Trip Advance

| Field          | Detail                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| **Symptom**    | Advancing trip status returns 500; `AttributeError: 'Settings' has no attribute 'REDIS_URL'` |
| **Root Cause** | `REDIS_URL` missing from `.env` and `config.py`                                              |
| **Fix**        | Added `REDIS_URL: str = "redis://localhost:6379"` with default in Settings                   |
| **Prevention** | All external service URLs must have defaults in Settings                                     |

## 5.11 Notification Bell Never Updates

| Field          | Detail                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Symptom**    | Bell always shows 0 despite offers/trips being created                                     |
| **Root Cause** | `useNotifications()` hook never called; bell only read from store but nothing populated it |
| **Fix**        | Added `AppContent` wrapper in `_layout.tsx` calling `useNotifications(user?.id)` post-auth |
| **Prevention** | Global side-effect hooks must live in root layout, not in individual screens               |

## 5.12 ORS Route Missing Algeria Roads

| Field          | Detail                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| **Symptom**    | Route calculation fails or returns wrong path for Algerian addresses                   |
| **Root Cause** | Default `radiuses: [1000]` too small — many Algerian addresses not on OSM road network |
| **Fix**        | Increased to `radiuses: [5000]` (5km snap tolerance)                                   |
| **Prevention** | Set generous radiuses for regions with sparse OSM coverage                             |

---

# 6. SYSTEM ARCHITECTURE

## 6.1 Frontend Architecture

```
app/                          ← Expo Router (file-based navigation)
  _layout.tsx                 ← Root: auth gate + notification init
  index.tsx                   ← Entry redirect based on role
  (auth)/                     ← Public screens
  (client)/                   ← CLIENT tab group
  (driver)/                   ← CHAUFFEUR tab group (shared IND + FLOTTE)
  (fleet)/                    ← PROP_FLOTTE tab group
  notifications.tsx           ← Global notifications screen

src/
  components/
    ui/                       ← Generic: Button, Input, Card, Badge, etc.
    loads/                    ← LoadCard, LoadForm, LoadEditForm, LoadStatusBadge
    offers/                   ← OfferCard, OfferForm
    trips/                    ← TripCard, TripStatusStepper
    map/                      ← LeafletMap, MapLocationPicker, DriverMarker
    notification/             ← NotificationBell
  hooks/                      ← useAuth, useLoads, useOffers, useTrips,
                                 useLocation, useTracking, useNotification
  services/                   ← API layer (axios instances per domain)
  store/                      ← Zustand global state
  types/                      ← TypeScript interfaces
  constants/                  ← Colors, API endpoints, roles
  utils/                      ← formatPrice, formatDate, getStatusColor
```

### State Management Strategy

```
Zustand stores (global, persisted in memory):
  auth.store.ts        → user, token, role, isAuthenticated
  loads.store.ts       → availableLoads, myLoads, filters
  trips.store.ts       → myTrips, activeTrip
  notifications.store.ts → notifications[], unreadCount

React useState (local, component-scoped):
  Form values, modal visibility, selected items, loading states

Decision rule:
  → Data needed across screens = Zustand
  → Data used only within one screen = useState
```

### Service Layer Pattern

```typescript
// Each domain has its own service file
// Services are thin wrappers around axios — no business logic
loadsService.getAvailable(params) → GET /api/v1/loads
loadsService.create(payload)      → POST /api/v1/loads
loadsService.update(id, payload)  → PUT /api/v1/loads/{id}

// Hooks wrap services with error handling and store updates
const handleCreate = async (payload) => {
  try {
    return await store.createLoad(payload);
  } catch (e: any) {
    setError(extractError(e, "Erreur"));
    throw e;
  }
};
```

## 6.2 Backend Architecture

```
main.py                    ← FastAPI app + router registration + startup
app/
  config.py                ← Pydantic Settings (reads .env)
  database.py              ← Motor AsyncIOMotorClient
  dependencies.py          ← get_current_user, require_role
  auth/
    jwt_handler.py         ← hash_password, verify_password, create/decode JWT
  models/                  ← Pydantic schemas (request validation)
  routers/                 ← HTTP endpoints (thin — delegates to services)
  services/
    notification.py        ← All notification logic + MongoDB persistence
    gps.py                 ← Redis GPS writes + WebSocket push
    optimization.py        ← VRP algorithm (pure Python)
    matching.py            ← Geo-search for nearby drivers
    auth_service.py        ← DB helpers for auth operations
  websocket/
    manager.py             ← ConnectionManager (active WebSocket registry)
```

### Request Lifecycle

```
HTTP Request
  → CORS Middleware
  → Route matched
  → Dependencies resolved (get_current_user → decode JWT → fetch user)
  → require_role() checks user.role
  → Endpoint function executes
  → Business logic: DB query + optional service calls
  → Notification triggered (async, non-blocking, try/except)
  → JSON Response
```

## 6.3 Security Model

```
Authentication:    JWT Bearer tokens (24h expiry)
Token storage:     expo-secure-store (encrypted native keychain)
Password hashing:  bcrypt rounds=12
Role enforcement:  Server-side ONLY via Depends(require_role())
Market isolation:  Server-side filter on marche field
Invite codes:      Single-use, 24h TTL, logged with usedBy phone
CORS:              allow_origins=["*"] (tighten for production)
```

## 6.4 Real-Time Architecture

```
WebSocket Server:  FastAPI WebSocket + ConnectionManager singleton
Connection:        ws://{ip}:8000/ws/{user_id}
Keep-alive:        Client pings every 30s; server responds to {ping:true}
Message types:
  → notification     (from backend to user)
  → location_update  (from backend to client watching a trip)
  → trip_status_update (from backend to driver UI sync)
  → pong             (keepalive response)
Cleanup:           disconnect() called on WebSocketDisconnect or send error
```

## 6.5 Scalability Model

```
Current (single-server, development):
  FastAPI (single Uvicorn worker)
  MongoDB (local instance)
  Redis (local instance)
  WebSocket (in-process ConnectionManager)

Phase 2 (production, single region):
  Gunicorn + multiple Uvicorn workers
  MongoDB Atlas (M10+, replica set)
  Redis Cloud (or ElastiCache)
  WebSocket: sticky sessions required (use nginx ip_hash)

Phase 3 (multi-region, Africa):
  Kubernetes pods (FastAPI stateless)
  MongoDB Atlas Global Clusters
  Redis Cluster
  WebSocket: move to dedicated service (Ably, Pusher, or custom)
  CDN: CloudFront for static assets
```

---

# 7. DATABASE DESIGN

## 7.1 Collections Overview

| Collection      | Purpose                     | Key Indexes                                                           |
| --------------- | --------------------------- | --------------------------------------------------------------------- |
| `users`         | All user accounts           | `telephone` (unique), `role`, `employeurId`                           |
| `charges`       | Freight loads               | `status`, `marche`, `coordEnlev` (2dsphere), `clientId`               |
| `offres`        | Driver bids on loads        | `chargeId`, `chauffeurId`, `status`                                   |
| `trajets`       | Active and completed trips  | `chauffeurId`, `clientId`, `status`, `chargeId`                       |
| `vehicules`     | Fleet and personal vehicles | `proprietaireId`, `assignedDriverId`, `status`, `position` (2dsphere) |
| `notifications` | User notification inbox     | `userId`, `isRead`, `createdAt`                                       |
| `invite_codes`  | Fleet driver invite codes   | `code`, `ownerId`, `used`, `expiresAt`                                |

## 7.2 Document Schemas

### users

```json
{
  "_id": "string",
  "nom": "string (2-100 chars)",
  "telephone": "string (unique, 9-20 chars)",
  "email": "string (email format)",
  "motDePasse": "string (bcrypt hash)",
  "role": "CLIENT|CHAUFFEUR_IND|PROP_FLOTTE|CHAUFFEUR_FLOTTE|ADMIN",
  "note": "float (0.0–5.0, rolling average)",
  "nbRatings": "integer",
  "estVerifie": "boolean",
  "employeurId": "string|null (only for CHAUFFEUR_FLOTTE)",
  "createdAt": "datetime"
}
```

### charges

```json
{
  "_id": "string",
  "clientId": "string (ref: users)",
  "poidsKg": "float > 0",
  "typeMarchandises": "GENERAL|PERISSABLE|DANGEREUX|FRAGILE|VOLUMINEUX|LIQUIDE",
  "marche": "OUVERT|FLOTTE",
  "description": "string|null",
  "adressEnlev": "string",
  "coordEnlev": {"type": "Point", "coordinates": [lon, lat]},
  "adressLivr": "string",
  "coordLivr": {"type": "Point", "coordinates": [lon, lat]},
  "prixPropose": "float > 0",
  "status": "DISPONIBLE|RESERVEE|EN_MISSION|LIVREE|ANNULEE",
  "createdAt": "datetime",
  "updatedAt": "datetime|null"
}
```

### offres

```json
{
  "_id": "string",
  "chargeId": "string (ref: charges)",
  "chauffeurId": "string (ref: users)",
  "vehiculeId": "string (ref: vehicules)",
  "prixPropose": "float > 0",
  "delaiRamassage": "datetime",
  "status": "EN_ATTENTE|ACCEPTEE|REFUSEE",
  "createdAt": "datetime"
}
```

### trajets

```json
{
  "_id": "string",
  "chargeId": "string (ref: charges)",
  "chauffeurId": "string (ref: users)",
  "vehiculeId": "string (ref: vehicules)",
  "clientId": "string (ref: users)",
  "assignedByFleet": "boolean",
  "fleetOwnerId": "string|null",
  "status": "PLANIFIE|EN_ROUTE_RAMASSAGE|CHARGEMENT|EN_ROUTE_LIVRAISON|LIVRE",
  "tracking": [{"type": "Point", "coordinates": [lon, lat]}],
  "debutAt": "datetime|null",
  "finAt": "datetime|null",
  "infoPaiement": {
    "montant": "float",
    "methode": "CASH|EDAHABIA|BARIDIMOB|VIREMENT",
    "status": "A_PAYER|PAYE|ECHOUE",
    "transactionId": "string|null",
    "createdAt": "datetime",
    "paidAt": "datetime|null"
  },
  "proofOfDelivery": "string|null (image URL)",
  "createdAt": "datetime"
}
```

### vehicules

```json
{
  "_id": "string",
  "proprietaireId": "string (fleet owner or independent driver)",
  "assignedDriverId": "string|null (fleet driver this vehicle belongs to)",
  "type": "MARAICHER|CITERNE|FRIGORIFIQUE",
  "capaciteKg": "float > 0",
  "capaciteM3": "float|null",
  "plaqueImmatriculation": "string",
  "position": {"type": "Point", "coordinates": [lon, lat]},
  "status": "DISPONIBLE|EN_MISSION|MAINTENANCE",
  "createdAt": "datetime"
}
```

### notifications

```json
{
  "_id": "string",
  "userId": "string (ref: users)",
  "type": "NEW_OFFER|OFFER_ACCEPTED|OFFER_REJECTED|TRIP_STATUS|PAYMENT_CONFIRMED",
  "title": "string",
  "body": "string",
  "data": { "load_id": "...", "trip_id": "..." },
  "isRead": "boolean",
  "createdAt": "datetime"
}
```

### invite_codes

```json
{
  "_id": "string",
  "code": "string (6 chars, uppercase, no ambiguous chars)",
  "ownerId": "string (ref: users PROP_FLOTTE)",
  "ownerName": "string",
  "used": "boolean",
  "usedAt": "datetime|null",
  "usedBy": "string|null (telephone)",
  "createdAt": "datetime",
  "expiresAt": "datetime (createdAt + 24h)"
}
```

## 7.3 Required MongoDB Indexes

```javascript
// Run once on startup (or in a migration script)
db.users.createIndex({ telephone: 1 }, { unique: true });
db.users.createIndex({ role: 1, employeurId: 1 });

db.charges.createIndex({ status: 1, marche: 1 });
db.charges.createIndex({ clientId: 1, status: 1 });
db.charges.createIndex({ coordEnlev: "2dsphere" }); // For geo-matching
db.charges.createIndex({ coordLivr: "2dsphere" });

db.offres.createIndex({ chargeId: 1, status: 1 });
db.offres.createIndex({ chauffeurId: 1, status: 1 });

db.trajets.createIndex({ chauffeurId: 1, status: 1 });
db.trajets.createIndex({ clientId: 1, status: 1 });

db.vehicules.createIndex({ proprietaireId: 1, status: 1 });
db.vehicules.createIndex({ assignedDriverId: 1 });
db.vehicules.createIndex({ position: "2dsphere" }); // For proximity matching

db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
db.invite_codes.createIndex({ code: 1 }, { unique: true });
db.invite_codes.createIndex({ ownerId: 1, used: 1 });
db.invite_codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
```

---

# 8. PERFORMANCE STRATEGY

## 8.1 Current Performance Baseline

| Operation           | Current Approach        | Target Latency |
| ------------------- | ----------------------- | -------------- |
| Load list           | MongoDB query, no cache | < 200ms        |
| Trip status advance | DB write + notification | < 300ms        |
| GPS position update | Redis write + WS push   | < 50ms         |
| Route calculation   | ORS API call            | < 1500ms       |
| PDF generation      | ReportLab in-memory     | < 500ms        |
| WebSocket message   | Direct push             | < 10ms         |

## 8.2 Caching Strategy

```
Redis (already deployed for GPS):
  driver:location:{id}    → TTL 300s
  trip:tracking:{id}      → TTL 300s

Future caching:
  available_loads:{filters_hash}  → TTL 30s (loads don't change that fast)
  fleet_stats:{owner_id}          → TTL 60s
  route:{waypoints_hash}          → TTL 3600s (routes don't change)
```

## 8.3 Route Precomputation

For fleet optimization: precompute all driver→load distances before the algorithm runs, rather than calling ORS for each pair. Use Haversine for the optimization pass, ORS only for the final displayed route.

```python
# In optimize_fleet endpoint, before calling optimize_assignments:
# Pre-build distance matrix using Haversine (fast, no API calls)
# Only call ORS for the accepted assignments to display the route
```

## 8.4 Mobile-First Performance Rules

```
1. FlatList everywhere — never ScrollView for lists > 10 items
2. useMemo for marker arrays — prevent LeafletMap re-renders
3. useFocusEffect instead of useEffect for screen-level data fetch
4. Image lazy loading — proof of delivery photos loaded on demand
5. Zustand selectors — subscribe to specific state slices, not full store
6. API timeout: 8 seconds — fail fast, show error, don't hang
7. GPS battery: watch mode only during active trip statuses
8. WebSocket: single connection per user (not per screen)
```

## 8.5 Offline Fallback Strategy

```
GPS tracking fails (no internet):
  → Queue positions in memory
  → Retry POST /location every 10s
  → Max queue: 50 positions

Route calculation fails:
  → Haversine fallback activates automatically
  → User sees straight line with approximate distance/ETA
  → No user-visible error for this case

Backend unreachable:
  → Axios timeout: 8s
  → Show toast: "Connexion lente — réessayez"
  → Cached data from Zustand store shown (stale but better than blank)
```

---

# 9. ENTERPRISE FEATURES ROADMAP

## Priority Matrix

| Feature                           | Revenue Impact | User Demand | Complexity | Sprint   |
| --------------------------------- | -------------- | ----------- | ---------- | -------- |
| Invoice download (frontend)       | High           | High        | Low        | **Now**  |
| Market separation fix             | Critical       | Critical    | Low        | **Now**  |
| Vehicle-driver assignment fix     | High           | High        | Medium     | **Now**  |
| Admin screens                     | High           | Medium      | Medium     | Sprint 1 |
| Document storage (CMR, insurance) | High           | High        | Medium     | Sprint 2 |
| Customer tracking link (no login) | High           | High        | Low        | Sprint 2 |
| Multi-stop routes                 | High           | High        | High       | Sprint 3 |
| Analytics dashboard               | High           | High        | Medium     | Sprint 3 |
| Fleet maintenance module          | Medium         | High        | Medium     | Sprint 4 |
| AI pricing suggestions            | Medium         | Medium      | High       | Sprint 5 |
| Recurring shipments               | Medium         | Medium      | Medium     | Sprint 5 |
| Driver safety scoring             | Medium         | Low         | High       | Sprint 6 |
| OCR for CMR documents             | Low            | Medium      | Very High  | Sprint 7 |
| Customs/export docs               | Low            | Low         | High       | Sprint 8 |

## 9.1 Document Management (Priority 2)

```
CMR (Lettre de Voiture):
  → Client uploads before trip starts
  → Driver confirms receipt
  → Stored as URL reference in load document

Driver documents:
  → License, vehicle registration, insurance
  → Stored in users.documents[]
  → Expiry alerts 30 days before

Storage: AWS S3 or Cloudflare R2
  → Presigned URLs for upload
  → Time-limited URLs for download
  → File size limit: 10MB per document
```

## 9.2 Customer Tracking Link (Priority 3)

```
After trip created:
  → Generate UUID tracking token
  → Store in trip document
  → Client shares: https://track.transportdz.dz/{token}

Public tracking page (no login):
  → Shows: pickup city, dropoff city, current status, map
  → Auto-refreshes every 30s
  → Does NOT show: driver details, price, client info

Backend: GET /api/v1/tracking/public/{token}
  → No auth required
  → Returns: status, driver position, pickup/dropoff coords only
```

## 9.3 Analytics Dashboard (Priority 5)

```
Fleet Owner KPIs:
  ├── Total revenue this month
  ├── Revenue per driver
  ├── Average empty mileage %
  ├── On-time delivery rate
  ├── Trips per driver this week
  ├── Vehicle utilization rate
  └── Customer satisfaction avg

Client KPIs:
  ├── Total spent this month
  ├── Number of loads posted/completed
  ├── Average price per km
  └── Favorite routes

Charts: recharts library (already in Expo compatible packages)
Backend: Aggregation pipelines in MongoDB
```

## 9.4 Fleet Maintenance Module (Priority 5)

```
Vehicle record additions:
  lastServiceDate: datetime
  nextServiceKm: integer
  currentKm: integer
  maintenanceCosts: [{date, type, cost, description}]

Alerts:
  → Vehicle approaching service interval → notify fleet owner
  → Insurance expiry in 30 days → notify fleet owner
  → Vehicle in MAINTENANCE status → blocked from assignments
```

---

# 10. GLOBAL TMS BENCHMARK

## 10.1 Feature Comparison

| Feature Category    | TransportDZ  | MercuryGate   | Oracle TMS    | SAP TM        | McLeod   | Samsara          |
| ------------------- | ------------ | ------------- | ------------- | ------------- | -------- | ---------------- |
| **Load matching**   | ✅ Map + bid | ✅            | ✅            | ✅            | ✅       | ❌               |
| **Fleet dispatch**  | ✅ VRP       | ✅ Advanced   | ✅ Enterprise | ✅ Enterprise | ✅       | ⚠️               |
| **Live GPS**        | ✅ WebSocket | ⚠️            | ❌            | ❌            | ⚠️       | ✅ Best-in-class |
| **Mobile native**   | ✅ Expo      | ⚠️ Mobile web | ❌            | ❌            | ⚠️       | ✅               |
| **Invoice + TVA**   | ⚠️ Partial   | ✅            | ✅            | ✅            | ✅       | ❌               |
| **Document mgmt**   | 🔲 Planned   | ✅            | ✅            | ✅            | ✅       | ⚠️               |
| **Multi-stop**      | 🔲 Planned   | ✅            | ✅            | ✅            | ✅       | ❌               |
| **AI pricing**      | 🔲 Planned   | ✅            | ✅            | ✅            | ❌       | ❌               |
| **Maintenance**     | 🔲 Planned   | ❌            | ❌            | ❌            | ✅       | ✅               |
| **Algeria market**  | ✅           | ❌            | ❌            | ❌            | ❌       | ❌               |
| **Offline routing** | ✅           | ❌            | ❌            | ❌            | ❌       | ❌               |
| **Entry price**     | Free         | $50k+/yr      | $200k+/yr     | $500k+/yr     | $30k+/yr | $33/vehicle      |

## 10.2 Strategic Edge

TransportDZ has three defensible advantages no competitor can easily replicate:

1. **Algeria-first design** — French UI, DA currency, TVA 19%, Algerian road network optimizations, offline fallback for connectivity gaps
2. **Mobile-native architecture** — built for smartphone from day 1; competitors retrofit desktop software to mobile
3. **Invite code fleet onboarding** — frictionless driver recruitment; competitors require manual admin setup

---

# 11. PRODUCT ROADMAP

## Phase 1 — Foundation (Current)

```
✅ Authentication (all roles)
✅ Load posting (open + fleet)
✅ Offer system (bidding)
✅ Trip lifecycle (5 statuses)
✅ Live GPS tracking
✅ Route calculation (ORS + Haversine)
✅ Fleet management (drivers, vehicles, invite codes)
✅ VRP optimization engine
✅ PDF invoice generation (backend)
✅ Notifications (WebSocket + inbox)
⚠️ Market separation (backend filter missing)
⚠️ Vehicle-driver assignment (endpoint missing)
❌ Invoice download (frontend missing)
❌ Admin screens
```

## Phase 2 — TMS Core (Next 3 Months)

```
→ Fix all ⚠️ PARTIAL items
→ Invoice download (frontend + expo-file-system)
→ Admin screens (user management, platform stats)
→ Document management (CMR, license, insurance)
→ Customer tracking link (no-login public URL)
→ Driver rating system (post-trip rating flow)
→ Payment receipt improvements
→ Push notifications (FCM) — replace WebSocket for background delivery
```

## Phase 3 — Advanced Logistics (Months 4–8)

```
→ Multi-stop route planning
→ Time window constraints (deliver between X–Y)
→ Analytics dashboards (fleet owner + client KPIs)
→ Fleet maintenance module
→ Recurring shipment contracts
→ Carrier scorecard (on-time rate, rating, completion %)
→ AI price suggestions based on route + market data
```

## Phase 4 — National Scale (Months 9–18)

```
→ Coverage: all 48 wilayas with local routing data
→ B2B API for enterprise shippers (ERP integration)
→ White-label for large Algerian carriers
→ Accounting integration (export to local accounting software)
→ Customs document support (for national borders)
→ Driver safety scoring
→ Fuel consumption analytics
```

## Phase 5 — Africa Expansion (Year 2–3)

```
→ Morocco: Arabic/French UI, MAD currency, local regulations
→ Tunisia: French UI, TND currency
→ Libya: Arabic UI, LYD currency
→ Multi-currency support
→ Cross-border shipment tracking
→ International CMR document support
→ Pan-African fleet optimization
```

---

# 12. NON-NEGOTIABLE ENGINEERING RULES

## 12.1 Security

```
1. ALL role checks server-side — never trust client role claims
2. ALL load filtering by marche server-side — never client-side
3. JWT expiry: 24h maximum — require re-login after
4. Never return hashed password in any API response
5. Invite codes: single-use, 24h TTL, logged with phone number
6. Never expose MongoDB _id patterns that leak document count
```

## 12.2 Performance

```
1. Every list endpoint: pagination (skip + limit, max 100)
2. Every MongoDB query: explicit projection (only fetch needed fields)
3. Notification failures: NEVER block trip status advancement
4. GPS updates: write to Redis first (fast), MongoDB second (durable)
5. API timeout: 8 seconds — fail fast with clear error message
6. Route calculation: always fall back to Haversine — never crash on ORS failure
```

## 12.3 Frontend

```
1. FlatList for all lists > 5 items — never ScrollView
2. useFocusEffect for screen data refresh — not useEffect (misses tab switches)
3. Never render API error objects directly — always extractError()
4. Button action handlers: always stopPropagation equivalent (no nested Touchables)
5. Market type visible to user at all times — never hidden field
6. All numeric values in <Text> must be wrapped in String()
```

## 12.4 Backend Logic Placement

```
Business logic BELONGS in backend:
  ✅ Role checks
  ✅ Market separation (marche filter)
  ✅ Capacity validation
  ✅ Status transition validation
  ✅ Price/financial calculations
  ✅ VRP optimization

Business logic DOES NOT BELONG in frontend:
  ❌ Filtering loads by marche (done in backend query)
  ❌ Checking if driver can offer (done in backend)
  ❌ Calculating TVA (done in invoice service)
```

## 12.5 Error Handling Contract

```
All endpoints return:
  200/201: success with data
  400: business logic rejection (clear French message)
  401: token invalid/expired
  403: wrong role
  404: resource not found
  409: conflict (phone already registered, code already used)
  422: validation error (Pydantic) or missing required field
  500: unexpected server error (should never reach user in production)

Notification failures → logged, NOT 500
GPS write failures → logged, position queued for retry
ORS route failures → Haversine fallback, NO error shown to user
```

---

# 13. CTO RECOMMENDATIONS

## 13.1 Immediate Action Items (This Week)

**These are blocking production use:**

1. **Apply market separation filters** — 4 lines of code, Section 4.1. Without this, fleet loads appear to independent drivers and independent drivers can bid on fleet loads. This breaks the entire business model.

2. **Add FLOTTE load guard to offers endpoint** — 4 lines. Without this, a driver can bid on a fleet load and win it before the fleet owner assigns it.

3. **Add invoice download endpoint** — the PDF service is written, the endpoint just needs to be registered. 1 hour of work, massive user value.

4. **Fix vehicle-driver assignment** — the `assignedDriverId` field must be used in assignment and optimization. Without it, the VRP can assign a driver to a mission with a vehicle they don't have access to.

## 13.2 Architecture Decisions to Lock In Now

**Do not change these later — they affect everything:**

1. **Market separation via `marche` field** — committed. This is the correct design. Enforce it strictly server-side.

2. **`assignedDriverId` on vehicles** — committed. Every vehicle in a fleet must have this field. The optimization engine and assignment wizard must validate against it.

3. **WebSocket connection: one per user in root layout** — committed. Do not open WebSocket connections in individual screens. The root layout `AppContent` wrapper is the correct location.

4. **Haversine fallback always** — committed. ORS must never be a hard dependency. Fallback silently.

5. **Notification failures non-blocking** — committed. Business logic (trip status, payment) must never fail because a notification failed.

## 13.3 Technical Debt to Address Before Scale

| Debt Item                                     | Risk                        | Effort                        |
| --------------------------------------------- | --------------------------- | ----------------------------- |
| `allow_origins=["*"]` in CORS                 | Security                    | Low — restrict to app domain  |
| No request logging in production              | Debugging blind             | Low — middleware exists       |
| No rate limiting on auth endpoints            | Brute force                 | Medium                        |
| WebSocket connection manager in-process       | Won't scale to multi-worker | High                          |
| Tracking[] array grows unbounded in MongoDB   | Storage cost                | Medium — TTL or cap           |
| No MongoDB connection pooling config          | Performance at scale        | Low                           |
| `datetime.utcnow()` deprecated in Python 3.12 | Warning spam                | Low — use `datetime.now(UTC)` |

## 13.4 Strategic Recommendation

> **TransportDZ's competitive moat is not the individual features — it is the combination of being the only platform purpose-built for the Algerian freight market with a proper TMS architecture underneath.**

The path to market leadership is not feature parity with MercuryGate or Oracle TMS. That is a 10-year, $100M engineering effort. The path is:

1. **Nail the core loop** — post load → get offers → track delivery → get invoice. This must work flawlessly for every user, every time.

2. **Make fleet owners successful** — the VRP optimization that reduces their empty mileage by even 15% is worth more to them than any other feature. Quantify this in the UI: "You saved 247 km of empty mileage this month."

3. **Build the data moat** — every load posted, every route driven, every price accepted is training data for an Algeria-specific freight pricing model. No competitor has this data. Build the collection infrastructure now.

4. **Enterprise before consumer** — one fleet owner with 20 trucks generates more revenue and data than 100 independent drivers. Prioritize the fleet experience.

5. **The tracking link is underrated** — a shareable URL `track.transportdz.dz/abc123` that a shipper can send to their customer with no login required is a viral growth mechanism. Every tracking link is free marketing.

---

_Document maintained by: Engineering Team, TransportDZ_  
_Next review: Before Phase 2 launch_
