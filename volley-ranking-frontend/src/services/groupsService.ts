import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { DashboardGroup, GroupErrorReason, GroupSport, OwnGroup, OwnGroupActive, OwnGroupArchived } from "@/types/OwnGroup";

export interface CreateOwnGroupInput {
  nombre: string;
  deporte: GroupSport;
  idempotencyKey: string;
}

export interface CreateOwnGroupCurrentResult {
  outcome: "created" | "existing";
  group: OwnGroup;
}
export interface CreateOwnGroupDeletedResult {
  outcome: "CREATED_THEN_DELETED";
  recovered: true;
  appliedEffect: { outcome: "CREATED" };
  subsequentEffect: { outcome: "DELETED"; deletedAt: string };
  currentGroup: null;
}
export type CreateOwnGroupResult = CreateOwnGroupCurrentResult | CreateOwnGroupDeletedResult;

export interface UpdateOwnGroupNameInput {
  groupId: string;
  nombre: string;
  expectedEditToken: string;
  idempotencyKey: string;
}
export interface GroupNameAppliedEffect { outcome: "UPDATED"; nombre: string; editToken: string; confirmedAt: string }
export interface UpdateOwnGroupNameCurrentResult {
  outcome: "UPDATED" | "NO_CHANGES";
  recovered: boolean;
  appliedEffect: GroupNameAppliedEffect | null;
  currentGroup: OwnGroup;
  currentEditToken: string | null;
}
export interface UpdateOwnGroupNameDeletedResult {
  outcome: "UPDATED_THEN_DELETED";
  recovered: true;
  appliedEffect: { outcome: "UPDATED"; confirmedAt: string };
  subsequentEffect: { outcome: "DELETED"; deletedAt: string };
  currentGroup: null;
  currentEditToken: null;
}
export type UpdateOwnGroupNameResult = UpdateOwnGroupNameCurrentResult | UpdateOwnGroupNameDeletedResult;
export type GroupArchiveBlocker = "ACTIVE_MEMBERSHIPS_EXIST" | "OPEN_SEASON_EXISTS" | "PENDING_REQUESTS_EXIST" | "APPROVAL_IN_PROGRESS";
export interface PrepareOwnGroupArchiveResult {
  group: OwnGroupActive;
  archiveToken: string;
  eligibility: { status: "ELIGIBLE"; blockers: [] } | { status: "BLOCKED"; blockers: GroupArchiveBlocker[] };
}
export interface ArchiveOwnGroupResult {
  outcome: "ARCHIVED" | "EXISTING_IDEMPOTENT";
  recovered: boolean;
  appliedEffect: { outcome: "ARCHIVED"; archivedAt: string };
  currentGroup: OwnGroupArchived;
}
export type GroupDeletionBlocker = "SEASONS_EXIST" | "MEMBERSHIPS_EXIST" | "REQUESTS_EXIST" | "FUNCTIONAL_REFERENCES_EXIST" | "OPERATION_IN_PROGRESS";
export interface PrepareOwnGroupDeletionResult {
  group: OwnGroupActive;
  deletionToken: string;
  eligibility: { status: "ELIGIBLE"; blockers: [] } | { status: "BLOCKED"; blockers: GroupDeletionBlocker[] };
}
export interface DeleteOwnGroupResult {
  outcome: "DELETED" | "EXISTING_IDEMPOTENT";
  recovered: boolean;
  appliedEffect: { outcome: "DELETED"; deletedAt: string };
}

const createCallable = httpsCallable<CreateOwnGroupInput, CreateOwnGroupResult>(functions, "createOwnGroup");
const listCallable = httpsCallable<Record<string, never>, { items: OwnGroup[] }>(functions, "listOwnGroups");
const getCallable = httpsCallable<{ groupId: string }, { group: OwnGroup; editToken: string | null }>(functions, "getOwnGroup");
const dashboardCallable = httpsCallable<Record<string, never>, { items: DashboardGroup[] }>(functions, "getOwnGroupsDashboard");
const updateNameCallable = httpsCallable<UpdateOwnGroupNameInput, UpdateOwnGroupNameResult>(functions, "updateOwnGroupName");
const prepareArchiveCallable = httpsCallable<{ groupId: string }, PrepareOwnGroupArchiveResult>(functions, "prepareOwnGroupArchive");
const archiveCallable = httpsCallable<{ groupId: string; expectedArchiveToken: string; idempotencyKey: string }, ArchiveOwnGroupResult>(functions, "archiveOwnGroup");
const prepareDeletionCallable = httpsCallable<{ groupId: string }, PrepareOwnGroupDeletionResult>(functions, "prepareOwnGroupDeletion");
const deleteCallable = httpsCallable<{ groupId: string; expectedDeletionToken: string; idempotencyKey: string }, DeleteOwnGroupResult>(functions, "deleteOwnGroup");

export async function createOwnGroup(input: CreateOwnGroupInput): Promise<CreateOwnGroupResult> {
  return (await createCallable(input)).data;
}

export async function listOwnGroups(): Promise<{ items: OwnGroup[] }> {
  return (await listCallable({})).data;
}

export async function getOwnGroup(groupId: string): Promise<{ group: OwnGroup; editToken: string | null }> {
  return (await getCallable({ groupId })).data;
}

export async function prepareOwnGroupArchive(groupId: string): Promise<PrepareOwnGroupArchiveResult> {
  return (await prepareArchiveCallable({ groupId })).data;
}

export async function archiveOwnGroup(input: { groupId: string; expectedArchiveToken: string; idempotencyKey: string }): Promise<ArchiveOwnGroupResult> {
  return (await archiveCallable(input)).data;
}

export async function prepareOwnGroupDeletion(groupId: string): Promise<PrepareOwnGroupDeletionResult> {
  return (await prepareDeletionCallable({ groupId })).data;
}

export async function deleteOwnGroup(input: { groupId: string; expectedDeletionToken: string; idempotencyKey: string }): Promise<DeleteOwnGroupResult> {
  return (await deleteCallable(input)).data;
}

export async function updateOwnGroupName(input: UpdateOwnGroupNameInput): Promise<UpdateOwnGroupNameResult> {
  return (await updateNameCallable(input)).data;
}

export async function getOwnGroupsDashboard(): Promise<{ items: DashboardGroup[] }> {
  return (await dashboardCallable({})).data;
}

export function getGroupErrorReason(error: unknown): GroupErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) {
      const reason = String((details as { reason?: unknown }).reason);
      const known: GroupErrorReason[] = ["UNAUTHENTICATED", "ACCOUNT_REQUIRED", "GROUP_NOT_ACCESSIBLE", "GROUP_INCOMPATIBLE", "NOT_AUTHORIZED", "NOT_FOUND", "VALIDATION_FAILED", "PROVISIONAL_LIMIT_REACHED", "STALE_UPDATE", "STALE_ARCHIVE", "GROUP_ALREADY_ARCHIVED", "GROUP_NOT_DELETABLE", "ACTIVE_MEMBERSHIPS_EXIST", "OPEN_SEASON_EXISTS", "PENDING_REQUESTS_EXIST", "APPROVAL_IN_PROGRESS", "STALE_DELETION", "SEASONS_EXIST", "MEMBERSHIPS_EXIST", "REQUESTS_EXIST", "FUNCTIONAL_REFERENCES_EXIST", "OPERATION_IN_PROGRESS", "IDEMPOTENCY_CONFLICT", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"];
      if (known.includes(reason as GroupErrorReason)) return reason as GroupErrorReason;
    }
  }
  return "INTERNAL_ERROR";
}

export function getGroupErrorMessage(reason: GroupErrorReason): string {
  const messages: Record<GroupErrorReason, string> = {
    UNAUTHENTICATED: "Tu sesión venció. Iniciá sesión nuevamente.",
    ACCOUNT_REQUIRED: "Tu cuenta todavía no está disponible. Reintentá su inicialización.",
    GROUP_NOT_ACCESSIBLE: "Ya no tenés acceso a este Grupo.",
    GROUP_INCOMPATIBLE: "El Grupo no tiene un formato compatible con esta operación.",
    NOT_AUTHORIZED: "No tenés acceso a este Grupo.",
    NOT_FOUND: "No encontramos el Grupo solicitado.",
    VALIDATION_FAILED: "Revisá los datos ingresados.",
    PROVISIONAL_LIMIT_REACHED: "Por el momento podés administrar un único Grupo propio.",
    STALE_UPDATE: "El Grupo cambió desde que abriste la edición. Revisá el nombre vigente antes de guardar nuevamente.",
    STALE_ARCHIVE: "El Grupo cambió desde la preparación. Volvé a revisar las condiciones antes de archivar.",
    GROUP_ALREADY_ARCHIVED: "El Grupo ya fue archivado por otra intención.",
    GROUP_NOT_DELETABLE: "Un Grupo archivado no se puede eliminar.",
    ACTIVE_MEMBERSHIPS_EXIST: "Finalizá todas las Membresías activas antes de archivar.",
    OPEN_SEASON_EXISTS: "Cerrá la Temporada abierta antes de archivar.",
    PENDING_REQUESTS_EXIST: "Decidí o esperá que se cancelen las Solicitudes pendientes antes de archivar.",
    APPROVAL_IN_PROGRESS: "Terminá la recuperación de la aprobación en curso antes de archivar.",
    STALE_DELETION: "El Grupo cambió desde la preparación. Volvé a revisar y confirmar la eliminación.",
    SEASONS_EXIST: "El Grupo tiene Temporadas y debe conservarse. Podés archivarlo cuando corresponda.",
    MEMBERSHIPS_EXIST: "El Grupo tiene historia de Membresías y no puede eliminarse.",
    REQUESTS_EXIST: "El Grupo tiene Solicitudes, incluso resultados anteriores, y no puede eliminarse.",
    FUNCTIONAL_REFERENCES_EXIST: "El Grupo tiene actividad funcional y no puede eliminarse.",
    OPERATION_IN_PROGRESS: "Hay una operación en curso. Esperá a que termine y volvé a verificar.",
    IDEMPOTENCY_CONFLICT: "Esta intención ya fue usada con otros datos. Iniciá una nueva edición.",
    CONFLICT: "La intención de creación entró en conflicto. Revisá los datos antes de reintentar.",
    DEPENDENCY_UNAVAILABLE: "No pudimos verificar el estado del Grupo. Reintentá en unos instantes.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá con la misma solicitud.",
  };
  return messages[reason];
}
