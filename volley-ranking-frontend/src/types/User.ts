import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "player";

export type UserDoc = {

  nombre: string;
  email: string;
  photoURL?: string;

  roles: UserRole;

  posicionesPreferidas: string[];

  estadoCompromiso: number;

  onboarded: boolean;

  createdAt: Timestamp;
};
