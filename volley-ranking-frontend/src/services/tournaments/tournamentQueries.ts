"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tournament, TournamentPhase } from "@/types/tournament";
import { TournamentMatch } from "@/types/tournamentMatch";
import { TournamentStanding } from "@/types/tournamentStanding";
import {
  toTournament,
  toTournamentMatch,
  toTournamentPhase,
  toTournamentStanding,
} from "@/services/tournaments/tournamentAdapters";

export async function getTournamentById(tournamentId: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(db, "tournaments", tournamentId));
  if (!snap.exists()) return null;
  return toTournament(snap.id, snap.data() as Omit<Tournament, "id">);
}

export async function getTournamentPhases(tournamentId: string): Promise<TournamentPhase[]> {
  const snap = await getDocs(query(collection(db, "tournamentPhases"), where("tournamentId", "==", tournamentId)));

  return snap.docs
    .map((phaseDoc) => toTournamentPhase(phaseDoc.id, phaseDoc.data() as Omit<TournamentPhase, "id">))
    .sort((a, b) => a.order - b.order);
}

export async function getTournamentMatches(params: {
  tournamentId: string;
  phaseId?: string;
}): Promise<TournamentMatch[]> {
  const constraints = [where("tournamentId", "==", params.tournamentId)];
  if (params.phaseId) constraints.push(where("phaseId", "==", params.phaseId));
  const snap = await getDocs(query(collection(db, "tournamentMatches"), ...constraints));
  return snap.docs.map((matchDoc) => toTournamentMatch(matchDoc.id, matchDoc.data()));
}

export async function getTournamentStandings(params: {
  tournamentId: string;
  phaseId?: string;
}): Promise<TournamentStanding[]> {
  const constraints = [where("tournamentId", "==", params.tournamentId)];
  if (params.phaseId) constraints.push(where("phaseId", "==", params.phaseId));
  const snap = await getDocs(query(collection(db, "tournamentStandings"), ...constraints));
  return snap.docs.map((standingDoc) => toTournamentStanding(standingDoc.id, standingDoc.data()));
}
