import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { ownerPaymentReviewAccessRequests } from "../src/services/paymentReviewAccessRequests.mjs";

function reason(error) {
  return error && typeof error === "object" && error.details && typeof error.details === "object"
    ? String(error.details.reason || "UNKNOWN") : "UNKNOWN";
}

export async function exerciseOwnerReviewAccessWire({ projectId, authHost, functionsHost, email, password, groupId }) {
  const app = initializeApp({ apiKey: "e3-03-callable-key", projectId }, `e3-03-frontend-wire-${Date.now()}`);
  const auth = getAuth(app); connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const functions = getFunctions(app, "us-central1"); const [host, port] = functionsHost.split(":"); connectFunctionsEmulator(functions, host, Number(port));
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const rosterCall = httpsCallable(functions, "listActiveGroupMembersForOwnedGroup");
    const historyCall = httpsCallable(functions, "listGroupPaymentNoticeReviewGrantsForOwner");
    let invalidReason = "NONE";
    try { await rosterCall({ groupId, pageSize: 50 }); } catch (error) { invalidReason = reason(error); }
    const requests = ownerPaymentReviewAccessRequests(groupId);
    const [roster, history] = await Promise.all([rosterCall(requests.roster), historyCall(requests.history)]);
    return Object.freeze({
      invalidReason,
      rosterRequest: JSON.parse(JSON.stringify(requests.roster)),
      historyRequest: JSON.parse(JSON.stringify(requests.history)),
      rosterCount: Array.isArray(roster.data?.items) ? roster.data.items.length : -1,
      historyCount: Array.isArray(history.data?.items) ? history.data.items.length : -1,
    });
  } finally {
    await signOut(auth).catch(() => {});
    await deleteApp(app);
  }
}
