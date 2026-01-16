
// Seed emulator

process.env.GCLOUD_PROJECT = 'project-groupvolley';
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const admin = require("firebase-admin");
require("../firebase");

const { db } = require("../firebase");

async function seed() {
  console.log("🌱 Seedeando datos en Firestore Emulator...");

  console.log('PROJECT:', process.env.GCLOUD_PROJECT);
console.log('EMULATOR:', process.env.FIRESTORE_EMULATOR_HOST);

  /* =========================
     GROUP
  ========================= */

  await db.collection("groups").doc("group1").set({
    nombre: "Vóley Miércoles",
    partidosTotales: 12
  });

  console.log("✅ group creado");

  /* =========================
     MATCH
  ========================= */

  const ahora = admin.firestore.Timestamp.now();

  // match empieza en 2 horas (para que el deadline ya esté vencido)
  const horaInicio = admin.firestore.Timestamp.fromMillis(
    ahora.toMillis() + 2 * 60 * 60 * 1000
  );

  await db.collection("matches").doc("match1").set({
    groupId: "group1",
    estado: "abierto",
    deadlineProcesado: false,
    horaInicio,
    posicionesObjetivo: {
      central: 2,
      armador: 1,
      opuesto: 1,
      punta: 2
    }
  });

  console.log("✅ match creado");

  /* =========================
     USERS
  ========================= */

  const users = [
    {
      id: "user1",
      data: {
        estadoCompromiso: 3,
        posicionesPreferidas: ["central", "punta"]
      },
      partidosJugadosGrupo: 2
    },
    {
      id: "user2",
      data: {
        estadoCompromiso: 2,
        posicionesPreferidas: ["armador"]
      },
      partidosJugadosGrupo: 6
    },
    {
      id: "user3",
      data: {
        estadoCompromiso: 3,
        posicionesPreferidas: ["opuesto"]
      },
      partidosJugadosGrupo: 1
    },
    {
      id: "user4",
      data: {
        estadoCompromiso: 1,
        posicionesPreferidas: ["punta", "central"]
      },
      partidosJugadosGrupo: 0
    }
  ];

  for (const user of users) {
    await db.collection("users").doc(user.id).set({
      estadoCompromiso: user.data.estadoCompromiso,
      posicionesPreferidas: user.data.posicionesPreferidas
    });

    await db
      .collection("groupStats")
      .doc(`group1_${user.id}`)
      .set({
        partidosJugados: user.partidosJugadosGrupo
      });
  }

  console.log("✅ users + groupStats creados");

  /* =========================
     PARTICIPATIONS
  ========================= */

  for (const user of users) {
    await db.collection("participations").add({
      userId: user.id,
      matchId: "match1",
      estado: "pendiente"
    });
  }

  console.log("✅ participations creadas");

  console.log("🎉 SEED COMPLETADO");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});

//const snap = await db.collection("groups").get();
//console.log("📂 groups docs:", snap.docs.map(d => d.id));
