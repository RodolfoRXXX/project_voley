

export type UserDoc = {
  nombre: string;
  email: string;
  photoURL: string;
  roles?: "player" | "admin" | null;
  posicionesPreferidas?: string[];
  estadoCompromiso?: number;
  onboarded?: boolean;
  createdAt?: unknown;
};
