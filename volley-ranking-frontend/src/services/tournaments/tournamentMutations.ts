"use client";

import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type { TournamentEntrySource, TournamentGroup, TournamentMatch, TournamentMatchResult } from "@/types/tournaments";

const openRegistrationsFn = httpsCallable(functions, "openTournamentRegistrations");
const closeRegistrationsFn = httpsCallable(functions, "closeTournamentRegistrations");
const previewGroupsFn = httpsCallable(functions, "previewGroups");
const confirmGroupsFn = httpsCallable(functions, "confirmGroups");
const previewFixtureFn = httpsCallable(functions, "previewFixture");
const confirmFixtureFn = httpsCallable(functions, "confirmFixture");
const addTournamentAdminFn = httpsCallable(functions, "addTournamentAdmin");
const removeTournamentAdminFn = httpsCallable(functions, "removeTournamentAdmin");
const editTournamentFn = httpsCallable(functions, "editTournament");
const createTournamentFn = httpsCallable(functions, "createTournament");
const recordMatchResultFn = httpsCallable(functions, "recordMatchResult");
const startTournamentFn = httpsCallable(functions, "startTournament");
const finalizeTournamentFn = httpsCallable(functions, "finalizeTournament");
const cancelTournamentFn = httpsCallable(functions, "cancelTournament");

export async function openTournamentRegistrations(tournamentId: string) {
  return openRegistrationsFn({ tournamentId });
}

export async function closeTournamentRegistrations(tournamentId: string) {
  return closeRegistrationsFn({ tournamentId });
}

export async function previewTournamentGroups(params: {
  tournamentId: string;
  phaseId?: string;
  seed?: number;
}) {
  const response = await previewGroupsFn(params);
  return response.data as { seed: number; groups: TournamentGroup[] };
}

export async function confirmTournamentGroups(params: {
  tournamentId: string;
  phaseId?: string;
  groups: TournamentGroup[];
}) {
  return confirmGroupsFn(params);
}

export async function previewTournamentFixture(params: {
  tournamentId: string;
  phaseId?: string;
  seed?: number;
}) {
  const response = await previewFixtureFn(params);
  return response.data as { seed: number; matches: TournamentMatch[] };
}

export async function confirmTournamentFixture(params: {
  tournamentId: string;
  phaseId?: string;
  matches: TournamentMatch[];
}) {
  return confirmFixtureFn(params);
}

export async function addTournamentAdmin(params: { tournamentId: string; adminUserId: string }) {
  return addTournamentAdminFn(params);
}

export async function removeTournamentAdmin(params: { tournamentId: string; adminUserId: string }) {
  return removeTournamentAdminFn(params);
}

export async function editTournament(params: Record<string, unknown> & { tournamentId: string }) {
  return editTournamentFn(params);
}

export async function createTournament(params: Record<string, unknown>) {
  const response = await createTournamentFn(params);
  return response.data as { tournamentId: string };
}

export async function recordTournamentMatchResult(params: {
  matchId: string;
  result: NonNullable<TournamentMatchResult>;
}) {
  const response = await recordMatchResultFn(params);
  return response.data as { ok: true; phaseCompleted: boolean };
}

export async function startTournament(tournamentId: string) {
  return startTournamentFn({ tournamentId });
}

export async function finalizeTournament(tournamentId: string) {
  return finalizeTournamentFn({ tournamentId });
}

export async function cancelTournament(tournamentId: string) {
  return cancelTournamentFn({ tournamentId });
}

export async function updateTournamentEntryPlayers(params: {
  source: TournamentEntrySource;
  entryId: string;
  playerIds: string[];
}) {
  const collectionName = params.source === "registration" ? "tournamentRegistrations" : "tournamentTeams";

  await updateDoc(doc(db, collectionName, params.entryId), {
    playerIds: params.playerIds,
    teamMembersCount: params.playerIds.length,
    updatedAt: serverTimestamp(),
  });
}
