"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  ProfileTournamentEntry,
  Tournament,
  TournamentEntrySource,
  TournamentMatch,
  TournamentPhase,
  TournamentPhaseStatus,
  TournamentPhaseType,
  TournamentRegistration,
  TournamentRegistrationStatus,
  TournamentStanding,
} from "@/types/tournaments";
import {
  toTournament,
  toTournamentMatch,
  toTournamentPhase,
  toTournamentRegistration,
  toTournamentStanding,
  toTournamentTeam,
} from "@/services/tournaments/tournamentAdapters";
import { getUserTournamentState, type UserTournamentState } from "@/services/tournaments/tournamentViewModels";

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

export type TournamentProgressMetrics = {
  acceptedTeamsCount: number;
  maxTeams: number;
  occupancyPercent: number;
  matchesCount: number;
  completedMatchesCount: number;
  standingsCount: number;
  qualifiedTeamsCount: number;
  groupedTeamsCount: number;
};

export type TournamentPhaseSnapshot = {
  id: string;
  type: TournamentPhaseType;
  status: TournamentPhaseStatus;
  order: number;
  hasActivePhase: boolean;
};

export type PublicTournamentListItem = {
  tournament: Tournament;
  currentPhase: TournamentPhase | null;
  acceptedTeamsCount: number;
  metrics: TournamentProgressMetrics;
  phaseSnapshot: TournamentPhaseSnapshot | null;
  winnerTeamNames: string[];
};

export type PublicTournamentTeamSummary = {
  id: string;
  name: string;
  groupLabel: string | null;
};

export type PublicTournamentStandingRow = TournamentStanding & {
  teamName: string;
};

export type PublicTournamentDetailView = {
  tournament: Tournament;
  currentPhase: TournamentPhase | null;
  teams: PublicTournamentTeamSummary[];
  matches: TournamentMatch[];
  matchesCount: number;
  standings: PublicTournamentStandingRow[];
  metrics: TournamentProgressMetrics;
  phaseSnapshot: TournamentPhaseSnapshot | null;
  topStanding: PublicTournamentStandingRow | null;
  winnerTeamNames: string[];
};

export type ProfileTournamentListRow = {
  id: string;
  tournament: Tournament;
  nameTeam: string;
  registrationStatus: TournamentRegistrationStatus;
  source: TournamentEntrySource;
  entryId: string;
  currentPhase: TournamentPhase | null;
  metrics: TournamentProgressMetrics;
  phaseSnapshot: TournamentPhaseSnapshot | null;
  userState: UserTournamentState;
  winnerTeamNames: string[];
  isWinnerTeam: boolean;
};

export type ProfileTournamentDetailView = {
  tournament: Tournament;
  teams: TournamentTeamRow[];
  registrations: TournamentRegistration[];
  myGroupIds: string[];
};

export type AdminTournamentRegistrationsView = {
  registrations: TournamentRegistration[];
  acceptedTeams: TournamentRegistration[];
};

function buildTournamentProgressMetrics(params: {
  tournament: Tournament;
  teams: TournamentTeamRow[];
  matches: TournamentMatch[];
  standings: TournamentStanding[];
}): TournamentProgressMetrics {
  const acceptedTeamsCount = params.tournament.acceptedTeamsCount || 0;
  const maxTeams = Number(params.tournament.maxTeams || 0);
  const safeMaxTeams = maxTeams > 0 ? maxTeams : acceptedTeamsCount || 1;
  const groupedTeamsCount = params.teams.filter((team) => Boolean(team.groupId || team.groupLabel)).length;
  const completedMatchesCount = params.matches.filter((match) => match.status === "completed").length;

  return {
    acceptedTeamsCount,
    maxTeams,
    occupancyPercent: Math.min(100, Math.round((acceptedTeamsCount / safeMaxTeams) * 100)),
    matchesCount: params.matches.length,
    completedMatchesCount,
    standingsCount: params.standings.length,
    qualifiedTeamsCount: params.standings.filter((standing) => standing.qualified).length,
    groupedTeamsCount,
  };
}

function toPhaseSnapshot(currentPhase: TournamentPhase | null): TournamentPhaseSnapshot | null {
  if (!currentPhase) return null;

  return {
    id: currentPhase.id,
    type: currentPhase.type,
    status: currentPhase.status,
    order: currentPhase.order,
    hasActivePhase: currentPhase.status === "active",
  };
}

function getWinnerTeamNames(params: {
  tournament: Tournament;
  teams: TournamentTeamRow[];
  standings: TournamentStanding[];
}): string[] {
  const teamNamesById = new Map(
    params.teams.map((team) => [team.id, team.nameTeam || team.name || team.id])
  );

  const podiumTeamIds = Array.isArray(params.tournament.podiumTeamIds)
    ? params.tournament.podiumTeamIds.filter(Boolean)
    : [];

  const winnerIdsFromPodium = podiumTeamIds.length > 0 ? [podiumTeamIds[0]] : [];
  if (winnerIdsFromPodium.length > 0) {
    return winnerIdsFromPodium.map((teamId) => teamNamesById.get(teamId) || teamId);
  }

  const winnersFromStandings = params.standings.filter((standing) => standing.position === 1);
  return winnersFromStandings.map((standing) => teamNamesById.get(standing.teamId) || standing.teamId);
}

async function getTournamentPhaseContext(tournament: Tournament): Promise<{
  currentPhase: TournamentPhase | null;
  teams: TournamentTeamRow[];
  matches: TournamentMatch[];
  standings: TournamentStanding[];
}> {
  const [currentPhase, teams] = await Promise.all([
    getCurrentTournamentPhase(tournament),
    getTournamentTeams(tournament.id),
  ]);

  if (!currentPhase) {
    return {
      currentPhase: null,
      teams,
      matches: [],
      standings: [],
    };
  }

  const [matches, standings] = await Promise.all([
    getTournamentMatches({ tournamentId: tournament.id, phaseId: currentPhase.id }),
    getTournamentStandings({ tournamentId: tournament.id, phaseId: currentPhase.id }),
  ]);

  return {
    currentPhase,
    teams,
    matches,
    standings,
  };
}

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
    where("status", "in", ["inscripciones_abiertas", "activo", "finalizado"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((tournamentDoc) => toTournament(tournamentDoc.id, tournamentDoc.data() as Omit<Tournament, "id">));
}

export async function getPublicTournamentListView(): Promise<PublicTournamentListItem[]> {
  const tournaments = await getPublicActiveTournaments();

  const rows = await Promise.all(
    tournaments.map(async (tournament) => {
      const { currentPhase, teams, matches, standings } = await getTournamentPhaseContext(tournament);

      return {
        tournament,
        currentPhase,
        acceptedTeamsCount: tournament.acceptedTeamsCount || 0,
        metrics: buildTournamentProgressMetrics({
          tournament,
          teams,
          matches,
          standings,
        }),
        phaseSnapshot: toPhaseSnapshot(currentPhase),
        winnerTeamNames: getWinnerTeamNames({ tournament, teams, standings }),
      };
    })
  );

  return rows;
}

export async function getPublicTournamentDetailView(tournamentId: string): Promise<PublicTournamentDetailView | null> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return null;

  const { currentPhase, teams, matches, standings } = await getTournamentPhaseContext(tournament);
  const teamNames = new Map(teams.map((team) => [team.id, team.nameTeam || team.name || team.id]));
  const normalizedTeams = teams.map((team) => ({
    id: team.id,
    name: team.nameTeam || team.name || team.id,
    groupLabel: team.groupLabel || null,
  }));
  const normalizedStandings = standings
    .filter((standing) => Number(standing.position || 0) > 0)
    .sort((a, b) => a.position - b.position)
    .map((standing) => ({
      ...standing,
      teamName: teamNames.get(standing.teamId) || standing.teamId,
    }));

  return {
    tournament,
    currentPhase,
    teams: normalizedTeams,
    matches: matches
      .sort((a, b) =>
        Number(a.roundCycle || 1) - Number(b.roundCycle || 1)
        || Number(a.matchdayNumber || a.round || 0) - Number(b.matchdayNumber || b.round || 0)
        || Number(a.sequence || 0) - Number(b.sequence || 0)
      ),
    matchesCount: matches.length,
    standings: normalizedStandings,
    metrics: buildTournamentProgressMetrics({
      tournament,
      teams,
      matches,
      standings,
    }),
    phaseSnapshot: toPhaseSnapshot(currentPhase),
    topStanding: normalizedStandings[0] || null,
    winnerTeamNames: getWinnerTeamNames({ tournament, teams, standings }),
  };
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

export async function getAdminTournamentRegistrationsView(tournamentId: string): Promise<AdminTournamentRegistrationsView> {
  const [registrations, tournamentTeams] = await Promise.all([
    getTournamentRegistrations(tournamentId),
    getTournamentTeams(tournamentId),
  ]);

  const acceptedTeams = tournamentTeams.map((teamData) => ({
    ...teamData,
    source: "team" as const,
    status: (teamData.status as TournamentRegistrationStatus | undefined) || "aceptado",
    registrationId: teamData.registrationId || teamData.id,
    nameTeam: teamData.nameTeam || teamData.name,
  }));

  return {
    registrations,
    acceptedTeams,
  };
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

export async function getProfileTournamentListView(
  userId: string,
  role?: string
): Promise<ProfileTournamentListRow[]> {
  const records = await getProfileTournamentEntries(userId, role);
  const tournamentIds = Array.from(new Set(records.map((record) => record.tournamentId).filter(Boolean)));

  const tournaments = await Promise.all(tournamentIds.map((tournamentId) => getTournamentById(tournamentId)));
  const tournamentsById = new Map(
    tournaments.filter((tournament): tournament is Tournament => Boolean(tournament)).map((tournament) => [tournament.id, tournament])
  );

  const acceptedTeamKeys = new Set(
    records
      .filter((record) => record.source === "team")
      .map((record) => `${record.tournamentId}::${record.groupId}`)
  );

  const registrationByTournamentGroup = new Map<string, ProfileTournamentEntry>(
    records
      .filter((record) => record.source === "registration")
      .map((record) => [`${record.tournamentId}::${record.groupId}`, record])
  );

  const teamByTournamentGroup = new Map<string, ProfileTournamentEntry>(
    records
      .filter((record) => record.source === "team")
      .map((record) => [`${record.tournamentId}::${record.groupId}`, record])
  );

  const visibleRecords = records.filter((record) => {
    if (record.source !== "registration") return true;
    const status = record.status || "pendiente";
    if (status !== "aceptado") return true;

    return !acceptedTeamKeys.has(`${record.tournamentId}::${record.groupId}`);
  });

  const metricsByTournamentId = new Map(
    await Promise.all(
      Array.from(tournamentsById.values()).map(async (tournament) => {
        const { currentPhase, teams, matches, standings } = await getTournamentPhaseContext(tournament);
        return [
          tournament.id,
          {
            currentPhase,
            teams,
            standings,
            metrics: buildTournamentProgressMetrics({
              tournament,
              teams,
              matches,
              standings,
            }),
            phaseSnapshot: toPhaseSnapshot(currentPhase),
          },
        ] as const;
      })
    )
  );

  return visibleRecords
    .map((record) => {
      const tournament = tournamentsById.get(record.tournamentId);
      if (!tournament) return null;
      const tournamentMetrics = metricsByTournamentId.get(tournament.id);

      const relationKey = `${record.tournamentId}::${record.groupId}`;
      const registration = registrationByTournamentGroup.get(relationKey) || null;
      const team = teamByTournamentGroup.get(relationKey) || null;
      const teamDisplayName = record.nameTeam || record.name || team?.nameTeam || registration?.nameTeam || "Equipo sin nombre";
      const winnerTeamNames = tournamentMetrics?.teams && tournamentMetrics?.standings
        ? getWinnerTeamNames({
          tournament,
          teams: tournamentMetrics.teams,
          standings: tournamentMetrics.standings,
        })
        : [];

      return {
        id: `${record.source}-${record.id}`,
        tournament,
        nameTeam: teamDisplayName,
        registrationStatus: record.status || "pendiente",
        source: record.source,
        entryId: record.id,
        currentPhase: tournamentMetrics?.currentPhase || null,
        metrics: tournamentMetrics?.metrics || buildTournamentProgressMetrics({
          tournament,
          teams: [],
          matches: [],
          standings: [],
        }),
        phaseSnapshot: tournamentMetrics?.phaseSnapshot || null,
        winnerTeamNames,
        isWinnerTeam: winnerTeamNames.includes(teamDisplayName),
        userState: getUserTournamentState({
          tournament,
          registration,
          team,
        }),
      };
    })
    .filter((row): row is ProfileTournamentListRow => Boolean(row));
}

export async function getProfileTournamentDetailView(
  tournamentId: string,
  userId: string
): Promise<ProfileTournamentDetailView | null> {
  const [myGroupIds, tournament, teams, registrations] = await Promise.all([
    getUserTournamentGroupIds(userId),
    getTournamentById(tournamentId),
    getTournamentTeams(tournamentId),
    getTournamentRegistrations(tournamentId),
  ]);

  if (!tournament) return null;

  return {
    tournament,
    myGroupIds,
    teams: teams.filter((team) => team.groupId && myGroupIds.includes(team.groupId)),
    registrations: registrations.filter((registration) => registration.groupId && myGroupIds.includes(registration.groupId)),
  };
}
