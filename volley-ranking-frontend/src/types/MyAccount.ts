export type MyAccount = {
  userId: string;
  displayName: string;
  accessEmail: string;
  accountPhotoUrl: string | null;
  /** ISO-8601 from users.createdAt; null when that persisted value is absent or invalid. */
  accountCreatedAt: string | null;
};
