const firebaseUser = {
  uid: "iux-07-admin",
  displayName: "Cuenta administradora",
  photoURL: null,
};

const account = {
  userId: "iux-07-admin",
  displayName: "Cuenta administradora",
  accessEmail: "admin@example.invalid",
  accountPhotoUrl: "",
};

const state = {
  firebaseUser,
  account,
  userDoc: {
    nombre: "Cuenta administradora",
    email: "admin@example.invalid",
    photoURL: "",
    roles: "admin",
  },
  accountStatus: "ready" as const,
  accountError: null,
  authError: null,
  authenticating: false,
  legacyUserLoading: false,
  loading: false,
  retryAccount: () => undefined,
  login: async () => undefined,
  logout: async () => undefined,
};

export const useAuth = () => state;
