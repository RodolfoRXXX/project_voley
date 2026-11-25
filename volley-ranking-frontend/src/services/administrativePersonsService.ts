import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type AdministrativePersonResult = { outcome: "CREATED" | "RECOVERED" | "UPDATED"; personId: string; membershipId?: string; groupId: string; seasonId?: string; revision: number };
export type AdministrativePersonInput = { groupId: string; firstName: string; lastName: string; contactEmail: string | null; idempotencyKey: string };
export type AdministrativePersonItem = { personId: string; firstName: string; lastName: string; contactEmail: string | null; revision: number; reincorporation: "CREATE" | "REACTIVATE" | "RENEW" };
const createCallable = httpsCallable<AdministrativePersonInput, AdministrativePersonResult>(functions, "createAdministrativePersonForOwnedGroup");
const updateCallable = httpsCallable<AdministrativePersonInput & { personId: string; expectedRevision: number }, AdministrativePersonResult>(functions, "updateAdministrativePersonForOwnedGroup");
const listCallable = httpsCallable<{ groupId: string; pageSize?: number; cursor?: string }, { items: AdministrativePersonItem[]; nextCursor?: string }>(functions, "listAdministrativePersonsForOwnedGroup");
const prepareReincorporationCallable = httpsCallable<{ groupId: string; personId: string }, { strategy: AdministrativePersonItem["reincorporation"]; destinationSeason: { seasonId: string; name: string }; previewToken: string }>(functions, "prepareAdministrativePersonReincorporation");
const confirmReincorporationCallable = httpsCallable<{ groupId: string; personId: string; previewToken: string; idempotencyKey: string }, { outcome: string; strategy: AdministrativePersonItem["reincorporation"]; membershipId: string }>(functions, "confirmAdministrativePersonReincorporation");
export const createAdministrativePerson = async (input: AdministrativePersonInput) => (await createCallable(input)).data;
export const updateAdministrativePerson = async (input: AdministrativePersonInput & { personId: string; expectedRevision: number }) => (await updateCallable(input)).data;
export const listAdministrativePersons = async (input: { groupId: string; pageSize?: number; cursor?: string }) => (await listCallable(input)).data;
export const prepareAdministrativePersonReincorporation = async (groupId: string, personId: string) => (await prepareReincorporationCallable({ groupId, personId })).data;
export const confirmAdministrativePersonReincorporation = async (input: { groupId: string; personId: string; previewToken: string; idempotencyKey: string }) => (await confirmReincorporationCallable(input)).data;
export const newAdministrativePersonKey = () => `iux-11a-${crypto.randomUUID()}`;
export function administrativePersonError(error: unknown): string {
  const details = typeof error === "object" && error !== null && "details" in error ? (error as { details?: { reason?: string } }).details : undefined;
  if (details?.reason === "OPEN_SEASON_REQUIRED") return "El Grupo necesita una Temporada abierta para incorporar la ficha.";
  if (details?.reason === "GROUP_NOT_ACTIVE") return "El Grupo debe estar activo para crear una ficha.";
  if (details?.reason === "CURSOR_INVALID") return "El listado cambió. Volvé a cargarlo desde el inicio.";
  if (details?.reason === "CONTEXT_CHANGED" || details?.reason === "ALREADY_ACTIVE") return "La situación de la ficha cambió. Actualizá el listado.";
  if (details?.reason === "NOT_AUTHORIZED") return "Sólo el Owner vigente puede gestionar esta ficha.";
  if (details?.reason === "STALE_REVISION") return "La ficha cambió. Actualizá los datos antes de corregirla.";
  return "No pudimos confirmar la operación. Reintentá la misma intención.";
}
