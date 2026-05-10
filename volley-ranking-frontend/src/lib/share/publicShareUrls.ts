function buildPublicUrl(path: string) {
  if (typeof window === "undefined") return path;

  return new URL(path, window.location.origin).toString();
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

export function getPublicTournamentDetailUrl(tournamentId: string) {
  return buildPublicUrl(`/tournaments/${encodePathSegment(tournamentId)}`);
}

export function getPublicGroupDetailUrl(groupId: string) {
  return buildPublicUrl(`/groups/${encodePathSegment(groupId)}`);
}

export function getPublicMatchDetailUrl(groupId: string, matchId: string) {
  return buildPublicUrl(
    `/groups/${encodePathSegment(groupId)}/matches/${encodePathSegment(matchId)}`
  );
}
