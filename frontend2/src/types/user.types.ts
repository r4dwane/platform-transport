export enum RoleUtilisateur {
  CLIENT = "CLIENT",
  CHAUFFEUR_IND = "CHAUFFEUR_IND",
  PROP_FLOTTE = "PROP_FLOTTE",
  CHAUFFEUR_FLOTTE = "CHAUFFEUR_FLOTTE",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  role: RoleUtilisateur;
  note: number;
  estVerifie: boolean;
  employeurId?: string;
  nbRatings?: number;
  createdAt?: string;
}

export interface RegisterPayload {
  nom: string;
  telephone: string;
  email: string;
  motDePasse: string;
  role: RoleUtilisateur;
  employeurId?: string;
}

export interface LoginPayload {
  telephone: string;
  motDePasse: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: RoleUtilisateur;
  user_id: string;
}