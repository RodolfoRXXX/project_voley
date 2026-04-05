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
      title: "🎉 ¡Tenés grupo nuevo en Sportexa!",
      body: `Te sumaron a ${groupName || "un grupo"} en Sportexa. Entrá y fijate qué partidos se están armando 🏐`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.GROUP_USER_REMOVED, async ({ userId, groupId, groupName }) => {
    await sendToUser(userId, {
      title: "👋 Cambios en tus grupos de Sportexa",
      body: `Ya no formás parte de ${groupName || "un grupo"} en Sportexa. Revisá tus grupos activos cuando puedas.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.MATCH_CREATED, async ({ groupId, groupName, memberIds = [] }) => {
    await sendToManyUsers(memberIds, {
      title: "🏐 ¡Nuevo partido en tu grupo!",
      body: `En Sportexa se creó un partido para ${groupName || "tu grupo"}. Sumate antes de quedarte sin lugar 😉`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.MATCH_DELETED, async ({ groupId, groupName, memberIds = [] }) => {
    await sendToManyUsers(memberIds, {
      title: "🛑 Partido cancelado",
      body: `Se canceló un partido de ${groupName || "tu grupo"} en Sportexa. Mirá el grupo para ver novedades.`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.GROUP_ADMIN_ADDED, async ({ userId, groupId, groupName }) => {
    await sendToUser(userId, {
      title: "👑 ¡Subiste de nivel: admin de grupo!",
      body: `Ahora administrás ${groupName || "tu grupo"} en Sportexa. Te toca organizar la magia 💪`,
      url: `/groups/${groupId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_ADMIN_ADDED, async ({ userId, tournamentId, tournamentName }) => {
    await sendToUser(userId, {
      title: "🏆 Ahora sos admin del torneo",
      body: `Te dieron permisos de admin en ${tournamentName || "este torneo"} dentro de Sportexa. ¡A romperla!`,
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.GROUP_ACCEPTED_INTO_TOURNAMENT, async ({ groupId, tournamentId, tournamentName }) => {
    const groupAdmins = await getGroupAdminIds(groupId);
    await sendToManyUsers(groupAdmins, {
      title: "✅ ¡Grupo aceptado en torneo!",
      body: `Buenas noticias: ${tournamentName || "el torneo"} aceptó a tu grupo en Sportexa. Ya podés revisar el detalle.`,
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_PLAYER_ADDED, async ({ userId, tournamentId }) => {
    await sendToUser(userId, {
      title: "🙌 Estás dentro del torneo",
      body: "Te agregaron a un torneo en Sportexa. Entrá para ver el estado, fixture y próximos partidos.",
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_PLAYER_REMOVED, async ({ userId, tournamentId }) => {
    await sendToUser(userId, {
      title: "📣 Actualización de torneo",
      body: "Tu participación en un torneo de Sportexa cambió y ya no figurás en la lista actual.",
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_STARTED, async ({ tournamentId, tournamentName }) => {
    const recipients = await getTournamentParticipantGroupAdminIds(tournamentId);
    await sendToManyUsers(recipients, {
      title: "🚀 ¡Arrancó el torneo!",
      body: `${tournamentName || "El torneo"} ya empezó en Sportexa. Revisá cruces, horarios y próximos pasos.`,
      url: `/tournaments/${tournamentId}`,
    });
  });

  onDomainEvent(DOMAIN_EVENTS.TOURNAMENT_FIXTURE_CONFIRMED, async ({ tournamentId, tournamentName }) => {
    const recipients = await getTournamentParticipantGroupAdminIds(tournamentId);
    await sendToManyUsers(recipients, {
      title: "📅 Fixture confirmado",
      body: `${tournamentName || "El torneo"} ya tiene fixture confirmado en Sportexa. Pegale una mirada a tus partidos.`,
      url: `/tournaments/${tournamentId}`,
    });
  });
}

module.exports = {
  registerNotificationHandlers,
};
