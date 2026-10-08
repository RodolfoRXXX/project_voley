"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { hydrateSeason, InvalidSeasonStateError } = require("../../groups/domain/season");
const { hydrateMembership, hasPeriodMetadata, InvalidMembershipStateError } = require("../domain/membership");
const { hydrateMembershipValidityPeriod, InvalidMembershipValidityPeriodError } = require("../domain/membershipValidityPeriod");
const { membershipValidityPeriodId } = require("../application/membershipHashing");

function monthBounds(periodKey) {
  const [year, month] = periodKey.split("-").map(Number); const nextYear = month === 12 ? year + 1 : year; const nextMonth = month === 12 ? 1 : month + 1;
  return { start: new Date(`${periodKey}-01T00:00:00-03:00`), next: new Date(`${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01T00:00:00-03:00`) };
}

function createMembershipObligationEligibilityCapability({ db }) {
  if (!db) throw new TypeError("db is required");

  async function evaluate(unitOfWork, { membershipId, groupId, kind, periodKey }) {
    const rootSnapshot = await unitOfWork.get(db.collection("memberships").doc(membershipId));
    let membership; try { membership = rootSnapshot.exists ? hydrateMembership(rootSnapshot.id, rootSnapshot.data()) : null; } catch (cause) { if (cause instanceof InvalidMembershipStateError) return { outcome: "UNPROVABLE" }; throw cause; }
    if (!membership || membership.groupId !== groupId) return { outcome: "UNPROVABLE" };
    const seasonSnapshot = await unitOfWork.get(db.collection("seasons").doc(membership.seasonId)); let season;
    try { season = seasonSnapshot.exists ? hydrateSeason(seasonSnapshot.id, seasonSnapshot.data()) : null; } catch (cause) { if (cause instanceof InvalidSeasonStateError) return { outcome: "UNPROVABLE" }; throw cause; }
    if (!season || season.groupId !== groupId) return { outcome: "UNPROVABLE" }; if (season.estado !== "abierta") return { outcome: "SEASON_CLOSED" };
    const eligible = { outcome: "ELIGIBLE", membershipId, personId: membership.personId, groupId, seasonId: membership.seasonId, membershipState: membership.estado };
    const legacy = membership.schemaVersion === 1 || membership.schemaVersion === 2 || (membership.schemaVersion === 5 && !hasPeriodMetadata(membership));
    if (legacy) {
      const unexpected = await unitOfWork.get(db.collection("memberships").doc(membershipId).collection("validityPeriods").limit(1)); if (!unexpected.empty) return { outcome: "UNPROVABLE" };
      if (kind === "ONE_TIME") return membership.estado === "activa" ? eligible : { outcome: "NOT_ACTIVE" };
      const bounds = monthBounds(periodKey); const start = membership.fechaIngreso.toDate(); const end = membership.fechaEgreso?.toDate?.(); return start < bounds.next && (!end || end > bounds.start) ? eligible : { outcome: "NOT_OVERLAPPING" };
    }
    try {
      if (!hasPeriodMetadata(membership) || membership.latestPeriodId !== membershipValidityPeriodId(membershipId, membership.periodCount)) return { outcome: "UNPROVABLE" };
      const periods = db.collection("memberships").doc(membershipId).collection("validityPeriods"); const firstRef = periods.doc(membershipValidityPeriodId(membershipId, 1)); const latestRef = periods.doc(membership.latestPeriodId);
      const firstSnap = await unitOfWork.get(firstRef); const latestSnap = firstRef.path === latestRef.path ? firstSnap : await unitOfWork.get(latestRef); const openSnapshot = await unitOfWork.get(periods.where("estado", "==", "abierto").limit(2)); const first = firstSnap.exists ? hydrateMembershipValidityPeriod(firstSnap.id, firstSnap.data()) : null; const latest = latestSnap.exists ? hydrateMembershipValidityPeriod(latestSnap.id, latestSnap.data()) : null;
      if (!first || !latest || first.ordinal !== 1 || first.startedAt.toDate().getTime() !== membership.fechaIngreso.toDate().getTime() || latest.ordinal !== membership.periodCount) return { outcome: "UNPROVABLE" };
      if (membership.estado === "activa" && latest.estado !== "abierto") return { outcome: "UNPROVABLE" }; if (membership.estado === "finalizada" && (latest.estado !== "cerrado" || latest.endedAt.toDate().getTime() !== membership.fechaEgreso.toDate().getTime())) return { outcome: "UNPROVABLE" };
      if ((membership.estado === "activa" && (openSnapshot.size !== 1 || openSnapshot.docs[0].id !== membership.latestPeriodId)) || (membership.estado === "finalizada" && !openSnapshot.empty)) return { outcome: "UNPROVABLE" };
      if (kind === "ONE_TIME") return membership.estado === "activa" ? eligible : { outcome: "NOT_ACTIVE" };
      const bounds = monthBounds(periodKey); const query = periods.where("startedAt", "<", Timestamp.fromDate(bounds.next)).orderBy("startedAt", "desc").orderBy("__name__", "desc"); let seen = 0; let last = null;
      for (;;) {
        const page = await unitOfWork.get((last ? query.startAfter(last) : query).limit(20));
        for (const doc of page.docs) { const period = hydrateMembershipValidityPeriod(doc.id, doc.data()); seen += 1; if (period.ordinal > membership.periodCount || doc.id !== membershipValidityPeriodId(membershipId, period.ordinal)) return { outcome: "UNPROVABLE" }; const start = period.startedAt.toDate(); const end = period.endedAt?.toDate?.(); if (start.getTime() === end?.getTime()) continue; if (!end || end > bounds.start) return eligible; }
        if (page.size < 20) break; last = page.docs.at(-1);
      }
      return seen ? { outcome: "NOT_OVERLAPPING" } : { outcome: "UNPROVABLE" };
    } catch (cause) { if (cause instanceof InvalidMembershipValidityPeriodError) return { outcome: "UNPROVABLE" }; throw cause; }
  }

  function candidateFromSnapshot(snapshot) {
    try { const membership = hydrateMembership(snapshot.id, snapshot.data()); return Object.freeze({ membershipId: membership.membershipId, personId: membership.personId, membershipState: membership.estado === "activa" ? "ACTIVE" : "FINALIZED", joinedAt: membership.fechaIngreso.toDate().toISOString(), ...(membership.fechaEgreso ? { leftAt: membership.fechaEgreso.toDate().toISOString() } : {}) }); }
    catch (cause) { if (cause instanceof InvalidMembershipStateError) return Object.freeze({ membershipId: snapshot.id, outcome: "UNPROVABLE" }); throw cause; }
  }

  return Object.freeze({ evaluate, candidateFromSnapshot });
}

module.exports = { createMembershipObligationEligibilityCapability };
