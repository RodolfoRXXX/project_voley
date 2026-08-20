"use strict";

const SYNTHETIC_DATA = Object.freeze({
  projectId: "demo-sportexa-e0-02",
  firestore: Object.freeze({
    collection: "e0_02_infrastructure_smoke",
    documentId: "deterministic-document",
    payload: Object.freeze({
      kind: "synthetic",
      sequence: 1,
      label: "E0-02 deterministic fixture",
    }),
  }),
  auth: Object.freeze({
    uid: "e0-02-synthetic-user",
    email: "e0-02@example.invalid",
    displayName: "E0-02 Synthetic User",
  }),
});

module.exports = { SYNTHETIC_DATA };
