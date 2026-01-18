

export type UserDoc = {
  nombre: string;
  email: string;
  photoURL: string;
  roles: "player" | "admin";
  posicionesPreferidas: string[];
  estadoCompromiso: number;
  onboarded: boolean;
  createdAt: any;
};
