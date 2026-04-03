const { db } = require("../firebase");
const { sendToManyUsers, sendToUser } = require("../services/pushService");
const { onDomainEvent } = require("./domainEventBus");
const { DOMAIN_EVENTS } = require("./domainEvents");

function uniqueStringArray(items = []) {
  return Array.from(new Set(items.filter(Boolean).map(String)));
}

async function getGroupAdminIds(groupId) {
  if (!groupId) return [];
  const groupSnap = await db.collection("groups").doc(String(groupId)).get();
  if (!groupSnap.exists) return [];
  const group = groupSnap.data() || {};
  return uniqueStringArray([
    ...(Array.isArray(group.adminIds) ? group.adminIds : []),
    ...(Array.isArray(group.admins) ? group.admins.map((a) => a?.userId) : []),
    group.ownerId,
  ]);
}

async function getTournamentParticipantGroupAdminIds(tournamentId) {
  const teamsSnap = await db
    .collection("tournamentTeams")
    .where("tournamentId", "==", String(tournamentId))
    .where("status", "==", "aceptado")
    .get();

  const groupIds = teamsSnap.docs.map((doc) => String(doc.data()?.groupId || "")).filter(Boolean);
  const nestedAdmins = await Promise.all(groupIds.map(getGroupAdminIds));
  return uniqueStringArray(nestedAdmins.flat());
}

function registerNotificationHandlers() {
  onDomainEvent(DOMAIN_EVENTS.GROUP_USER_ADDED, async ({ userId, groupId, groupName }) => {
    await sendToUser(userId, {
      title: "Te agregaron a un grupo",
      body: `Ahora formas parte de ${groupName || "un grupo"}.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.GROUP_USER_REMOVED, async ({ userId, groupId, groupName }) => {
    await sendToUser(userId, {
      title: "Fuiste eliminado de un grupo",
      body: `Ya no participás en ${groupName || "un grupo"}.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.MATCH_CREATED, async ({ groupId, groupName, memberIds = [] }) => {
    await sendToManyUsers(memberIds, {
      title: "Nuevo partido disponible",
      body: `Se creó un nuevo partido en ${groupName || "tu grupo"}.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.MATCH_DELETED, async ({ groupId, groupName, memberIds = [] }) => {
    await sendToManyUsers(memberIds, {
      title: "Se canceló un partido",
      body: `Un partido fue cancelado en ${groupName || "tu grupo"}.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.GROUP_ADMIN_ADDED, async ({ userId, groupId, groupName }) => {
    await sendToUser(userId, {
      title: "Ahora sos admin del grupo",
      body: `Tenés permisos administrativos en ${groupName || "tu grupo"}.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_ADMIN_ADDED, async ({ userId, tournamentId, tournamentName }) => {
    await sendToUser(userId, {
      title: "Ahora sos admin del torneo",
      body: `Tenés permisos administrativos en ${tournamentName || "este torneo"}.`,
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.GROUP_ACCEPTED_INTO_TOURNAMENT, async ({ groupId, tournamentId, tournamentName }) => {
    const groupAdmins = await getGroupAdminIds(groupId);
    await sendToManyUsers(groupAdmins, {
      title: "Tu equipo fue aceptado en el torneo",
      body: `${tournamentName || "El torneo"} aceptó a tu grupo.`,
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_PLAYER_ADDED, async ({ userId, tournamentId }) => {
    await sendToUser(userId, {
      title: "Fuiste agregado al torneo",
      body: "Revisá el estado y próximos partidos del torneo.",
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_PLAYER_REMOVED, async ({ userId, tournamentId }) => {
    await sendToUser(userId, {
      title: "Fuiste removido del torneo",
      body: "Tu participación fue actualizada por un administrador.",
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_STARTED, async ({ tournamentId, tournamentName }) => {
    const recipients = await getTournamentParticipantGroupAdminIds(tournamentId);
    await sendToManyUsers(recipients, {
      title: "El torneo comenzó",
      body: `${tournamentName || "El torneo"} ya está activo.`,
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_FIXTURE_CONFIRMED, async ({ tournamentId, tournamentName }) => {
    const recipients = await getTournamentParticipantGroupAdminIds(tournamentId);
    await sendToManyUsers(recipients, {
      title: "Fixture confirmado, revisá tus partidos",
      body: `${tournamentName || "El torneo"} confirmó su fixture.`,
      url: `/tournaments/${tournamentId}`,
    });
  });
}

module.exports = {
  registerNotificationHandlers,
};
