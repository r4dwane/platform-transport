export enum TypeVehicule {
  MARAICHER = "MARAICHER",
  CITERNE = "CITERNE",
  FRIGORIFIQUE = "FRIGORIFIQUE",
}
 
export interface Vehicle {
  id: string;
  proprietaireId: string;
  type: TypeVehicule;
  capaciteKg: number;
  capaciteM3?: number;
  plaqueImmatriculation: string;
  position: { type: "Point"; coordinates: [number, number] };
  status: "DISPONIBLE" | "EN_MISSION" | "MAINTENANCE";
}