"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournaments/tournament";
import type { TournamentPhase } from "@/types/tournaments/tournamentPhase";
import type { TournamentMatch } from "@/types/tournaments/tournamentMatch";
import type {
  ProfileTournamentEntry,
  TournamentEntrySource,
  TournamentRegistration,
} from "@/types/tournaments/tournamentRegistration";
import type { TournamentStanding } from "@/types/tournaments/tournamentStanding";
import {
  toTournament,
  toTournamentMatch,
  toTournamentPhase,
  toTournamentRegistration,
  toTournamentStanding,
  toTournamentTeam,
} from "@/services/tournaments/tournamentAdapters";

export type TournamentTeamRow = {
  id: string;
  tournamentId: string;
  groupId?: string;
  groupLabel?: string;
  nameTeam?: string;
  name?: string;
  playerIds?: string[];
  points?: number;
  stats?: { points?: number; matchesPlayed?: number };
  registrationId?: string;
  status?: string;
};

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

export async function getCurrentTournamentPhase(tournament: Tournament): Promise<TournamentPhase | null> {
  if (!tournament.currentPhaseId) return null;
  const phases = await getTournamentPhases(tournament.id);
  return phases.find((phase) => phase.id === tournament.currentPhaseId) || null;
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

export async function getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
  const snap = await getDocs(query(collection(db, "tournamentRegistrations"), where("tournamentId", "==", tournamentId)));
  return snap.docs.map((registrationDoc) => toTournamentRegistration(registrationDoc.id, registrationDoc.data(), "registration"));
}

export async function getTournamentRegistrationById(
  entryId: string,
  source: TournamentEntrySource = "registration"
): Promise<TournamentRegistration | null> {
  const collectionName = source === "registration" ? "tournamentRegistrations" : "tournamentTeams";
  const snap = await getDoc(doc(db, collectionName, entryId));
  if (!snap.exists()) return null;
  return source === "registration"
    ? toTournamentRegistration(snap.id, snap.data(), "registration")
    : toTournamentTeam(snap.id, snap.data());
}

export async function getTournamentTeams(tournamentId: string): Promise<TournamentTeamRow[]> {
  const snap = await getDocs(query(collection(db, "tournamentTeams"), where("tournamentId", "==", tournamentId)));
  return snap.docs.map((teamDoc) => {
    const data = teamDoc.data() as Omit<TournamentTeamRow, "id">;
    return {
      id: teamDoc.id,
      ...data,
    };
  });
}

export async function getPublicActiveTournaments(): Promise<Tournament[]> {
  const q = query(
    collection(db, "tournaments"),
    where("status", "in", ["inscripciones_abiertas", "activo"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((tournamentDoc) => toTournament(tournamentDoc.id, tournamentDoc.data() as Omit<Tournament, "id">));
}

export async function getAdminTournaments(adminUserId: string): Promise<Tournament[]> {
  const q = query(
    collection(db, "tournaments"),
    where("adminIds", "array-contains", adminUserId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((tournamentDoc) => toTournament(tournamentDoc.id, tournamentDoc.data() as Omit<Tournament, "id">));
}

export async function getUserManagedGroups(userId: string): Promise<Array<{ id: string; nombre?: string; memberIds?: string[]; adminIds?: string[] }>> {
  const snap = await getDocs(query(collection(db, "groups"), where("adminIds", "array-contains", userId)));
  return snap.docs.map((groupDoc) => ({ id: groupDoc.id, ...(groupDoc.data() as Omit<{ id: string; nombre?: string; memberIds?: string[]; adminIds?: string[] }, "id">) }));
}


export async function getGroupById(groupId: string): Promise<{ id: string; nombre?: string; descripcion?: string; memberIds?: string[]; adminIds?: string[] } | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<{ id: string; nombre?: string; descripcion?: string; memberIds?: string[]; adminIds?: string[] }, "id">) };
}

export async function getUsersByIds(userIds: string[]): Promise<Array<{ id: string; nombre?: string; photoURL?: string; posicionesPreferidas?: string[] }>> {
  return Promise.all(
    userIds.map(async (uid) => {
      const userSnap = await getDoc(doc(db, "users", uid));
      return {
        id: uid,
        ...(userSnap.exists() ? (userSnap.data() as Omit<{ id: string; nombre?: string; photoURL?: string; posicionesPreferidas?: string[] }, "id">) : {}),
      };
    })
  );
}
export async function getUserTournamentGroupIds(userId: string): Promise<string[]> {
  const [memberSnap, adminSnap] = await Promise.all([
    getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", userId))),
    getDocs(query(collection(db, "groups"), where("adminIds", "array-contains", userId))),
  ]);

  return Array.from(new Set([...memberSnap.docs, ...adminSnap.docs].map((item) => item.id)));
}

export async function getProfileTournamentEntries(
  userId: string,
  role?: string
): Promise<ProfileTournamentEntry[]> {
  const records: ProfileTournamentEntry[] = [];

  if (role === "admin") {
    const managedGroups = await getUserManagedGroups(userId);

    await Promise.all(
      managedGroups.map(async (group) => {
        const [registrationSnap, teamsSnap] = await Promise.all([
          getDocs(query(collection(db, "tournamentRegistrations"), where("groupId", "==", group.id))),
          getDocs(query(collection(db, "tournamentTeams"), where("groupId", "==", group.id))),
        ]);

        registrationSnap.docs.forEach((item) => {
          records.push({
            id: item.id,
            ...(item.data() as Omit<ProfileTournamentEntry, "id" | "source">),
            source: "registration",
          });
        });

        teamsSnap.docs.forEach((item) => {
          const data = item.data() as Omit<ProfileTournamentEntry, "id" | "source">;
          records.push({
            id: item.id,
            ...data,
            source: "team",
            status: data.status || "aceptado",
          });
        });
      })
    );

    return records;
  }

  const [registrationSnap, teamsSnap] = await Promise.all([
    getDocs(query(collection(db, "tournamentRegistrations"), where("playerIds", "array-contains", userId))),
    getDocs(query(collection(db, "tournamentTeams"), where("playerIds", "array-contains", userId))),
  ]);

  registrationSnap.docs.forEach((item) => {
    records.push({
      id: item.id,
      ...(item.data() as Omit<ProfileTournamentEntry, "id" | "source">),
      source: "registration",
    });
  });

  teamsSnap.docs.forEach((item) => {
    const data = item.data() as Omit<ProfileTournamentEntry, "id" | "source">;
    records.push({
      id: item.id,
      ...data,
      source: "team",
      status: data.status || "aceptado",
    });
  });

  return records;
}
