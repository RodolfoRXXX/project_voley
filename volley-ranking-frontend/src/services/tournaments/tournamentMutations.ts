"use client";

import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type { TournamentGroup } from "@/types/tournaments";
import type { TournamentMatch } from "@/types/tournaments";
import type { TournamentEntrySource, TournamentPaymentStatus } from "@/types/tournaments";

const openRegistrationsFn = httpsCallable(functions, "openTournamentRegistrations");
const closeRegistrationsFn = httpsCallable(functions, "closeTournamentRegistrations");
const previewGroupsFn = httpsCallable(functions, "previewGroups");
const confirmGroupsFn = httpsCallable(functions, "confirmGroups");
const previewFixtureFn = httpsCallable(functions, "previewFixture");
const confirmFixtureFn = httpsCallable(functions, "confirmFixture");
const addTournamentAdminFn = httpsCallable(functions, "addTournamentAdmin");
const editTournamentFn = httpsCallable(functions, "editTournament");
const createTournamentFn = httpsCallable(functions, "createTournament");

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

export async function editTournament(params: Record<string, unknown> & { tournamentId: string }) {
  return editTournamentFn(params);
}

export async function createTournament(params: Record<string, unknown>) {
  const response = await createTournamentFn(params);
  return response.data as { tournamentId: string };
}

export async function updateTournamentEntryPlayers(params: {
  source: TournamentEntrySource;
  entryId: string;
  playerIds: string[];
  paymentForPlayer: number;
  paidAmount?: number;
}) {
  const collectionName = params.source === "registration" ? "tournamentRegistrations" : "tournamentTeams";
  const expectedAmount = params.playerIds.length * Number(params.paymentForPlayer || 0);
  const paidAmount = Number(params.paidAmount ?? 0);
  const pendingAmount = Math.max(expectedAmount - paidAmount, 0);

  let paymentStatus: TournamentPaymentStatus = paidAmount <= 0 ? "pendiente" : pendingAmount === 0 ? "pagado" : "parcial";
  if (expectedAmount > paidAmount) {
    paymentStatus = "pendiente";
  }

  await updateDoc(doc(db, collectionName, params.entryId), {
    playerIds: params.playerIds,
    playersIds: params.playerIds,
    expectedAmount,
    pendingAmount,
    paymentStatus,
    updatedAt: serverTimestamp(),
  });

  return { expectedAmount, pendingAmount, paymentStatus };
}
