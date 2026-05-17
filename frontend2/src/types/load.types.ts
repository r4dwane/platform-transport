export enum StatutCharge {
  DISPONIBLE = "DISPONIBLE",
  RESERVEE   = "RESERVEE",
  EN_MISSION = "EN_MISSION",
  LIVREE     = "LIVREE",
  ANNULEE    = "ANNULEE",
}

export enum TypeMarchandise {
  GENERAL    = "GENERAL",
  PERISSABLE = "PERISSABLE",
  DANGEREUX  = "DANGEREUX",
  FRAGILE    = "FRAGILE",
  VOLUMINEUX = "VOLUMINEUX",
  LIQUIDE    = "LIQUIDE",
}

// NEW
export enum TypeMarche {
  OUVERT = "OUVERT",
  FLOTTE = "FLOTTE",
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Load {
  id: string;
  clientId: string;
  poidsKg: number;
  typeMarchandises: TypeMarchandise;
  marche: TypeMarche;          // NEW
  description?: string;
  adressEnlev: string;
  coordEnlev: GeoPoint;
  adressLivr: string;
  coordLivr: GeoPoint;
  prixPropose: number;
  status: StatutCharge;
  createdAt: string;
}

export interface CreateLoadPayload {
  poidsKg: number;
  typeMarchandises: TypeMarchandise;
  marche: TypeMarche;          // NEW
  description?: string;
  adressEnlev: string;
  coordEnlev: GeoPoint;
  adressLivr: string;
  coordLivr: GeoPoint;
  prixPropose: number;
}