import { RoleUtilisateur } from "@/types/user.types";
 
export const ROLE_LABELS: Record<RoleUtilisateur, string> = {
  [RoleUtilisateur.CLIENT]:          "Expéditeur",
  [RoleUtilisateur.CHAUFFEUR_IND]:   "Chauffeur Indépendant",
  [RoleUtilisateur.PROP_FLOTTE]:     "Propriétaire de Flotte",
  [RoleUtilisateur.CHAUFFEUR_FLOTTE]:"Chauffeur de Flotte",
  [RoleUtilisateur.ADMIN]:           "Administrateur",
};

export const DRIVER_ROLES = [
  RoleUtilisateur.CHAUFFEUR_IND,
  RoleUtilisateur.CHAUFFEUR_FLOTTE,
];

export const isDriver = (role: RoleUtilisateur) => DRIVER_ROLES.includes(role);
export const isClient = (role: RoleUtilisateur) => role === RoleUtilisateur.CLIENT;
export const isFleetOwner = (role: RoleUtilisateur) => role === RoleUtilisateur.PROP_FLOTTE;