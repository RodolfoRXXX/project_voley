# Resumen técnico de `project_voley` para preparar producción

Este documento está pensado para pegarlo como **contexto base** en una charla con otra IA y que te ayude a cerrar el paso a producción.

---

## 1) Qué es el sistema (visión rápida)

Plataforma de gestión de partidos de vóley con:

- Login Google + onboarding de usuario.
- Roles `player` y `admin`.
- Gestión de grupos y partidos.
- Ranking automático de titulares/suplentes en base a compromiso, rotación y posiciones preferidas.
- Flujo de pagos previo al cierre.
- Generación de equipos una vez cerrado el partido.

Arquitectura actual:

- **Frontend**: Next.js (App Router) + React + Firebase Web SDK.
- **Backend**: Firebase Cloud Functions (callables + triggers + cron Pub/Sub).
- **Base de datos**: Cloud Firestore.
- **Auth**: Firebase Authentication (Google).

---

## 2) Monorepo y componentes

- `volley-ranking-frontend/`
  - App Next.js 16 con rutas públicas/protegidas/admin.
  - Cliente Firebase para Auth/Firestore/Functions.
- `volley-ranking-system/`
  - Proyecto Firebase con Functions Node 20.
  - Triggers de Firestore/Auth/Scheduler.
  - Callables para operaciones de negocio.
  - Reglas e índices de Firestore.

---

## 3) Frontend (estado técnico)

### 3.1 Stack

- Next `16.1.3`
- React `19.2.3`
- Firebase SDK web `12.8.0`
- Tailwind CSS 4

### 3.2 Ruteo funcional

- Público:
  - `/` (landing/login)
  - `/dashboard`
- Protegido:
  - `/onboarding`
  - `/profile`
  - `/groups/[groupId]/matches/[matchId]`
- Admin:
  - `/admin/groups`
  - `/admin/groups/new`
  - `/admin/groups/[groupId]`
  - `/admin/groups/[groupId]/matches/new`

### 3.3 Integración Firebase en cliente

- Usa Auth + Firestore + Functions.
- Consume callables como:
  - `completeOnboarding`, `getValidPositions`
  - `createMatch`, `editMatch`, `cerrarMatch`, `reabrirMatch`, `eliminarMatch`
  - `joinMatch`, `leaveMatch`, `updatePagoEstado`, `eliminarJugador`, `reincorporarJugador`
  - `getFormaciones`, `generarEquipos`, `updatePreferredPositions`

### 3.4 Riesgos front para producción

1. `src/lib/firebase.ts` está hardcodeado para emulador (`apiKey: fake-api-key`, `authDomain: localhost`) y la config de producción está comentada.
2. Algunas operaciones son directas a Firestore desde cliente (por ejemplo alta de `groups`), lo cual en producción depende críticamente de reglas robustas.
3. El proyecto usa intensivamente `onSnapshot`; requiere revisar costos/lecturas y cierres de subscripciones.

---

## 4) Backend (estado técnico)

### 4.1 Runtime y forma de exposición

- Runtime Functions: Node.js 20.
- Entrypoint: `functions/index.js` exportando triggers + callables.

### 4.2 Triggers principales

- `onUserCreate`: crea documento base en `users` al alta en Auth.
- `onParticipationCreate`: lock de match + recálculo de ranking.
- `onParticipationUpdate`: reemplazos/penalización/recálculo ante cambios de estado.
- `onMatchDeadline` (scheduler): pasa de `abierto` a `verificando` por deadline.
- `onMatchClose` (scheduler): procesa cierre/avance a `jugado` y actualiza `groupStats`.
- `onMatchStart` también está exportado y debe revisarse en conjunto para no superponer lógica temporal.

### 4.3 Callables principales

- Gestión onboarding/perfil:
  - `completeOnboarding`, `getValidPositions`, `updatePreferredPositions`.
- Gestión admin grupos:
  - `editGroup`, `toggleGroupActivo`.
- Gestión admin matches:
  - `createMatch`, `editMatch`, `cerrarMatch`, `reabrirMatch`, `eliminarMatch`, `generarEquipos`.
- Gestión participaciones:
  - `joinMatch`, `leaveMatch`, `updatePagoEstado`, `eliminarJugador`, `reincorporarJugador`.

### 4.4 Servicios de dominio

- `rankingService`: cálculo de puntaje y ranking completo.
- `adminMatchService`: orquestación de estados del match, deadlines, pagos y validaciones.
- `replacementService`: promoción de suplentes a titulares.
- `teamsService`: armado aleatorio de equipos por posición.
- `adminGroupService`, `userGameService`, `onboardingService`.

### 4.5 Riesgos backend detectados (importante antes de prod)

1. `firestore.rules` está en modo abierto temporal (`allow read, write` por fecha). Esto **no es apto producción**.
2. Hay mezcla de inicialización/admin SDK en varios archivos (a veces `admin.firestore()`, a veces `getFirestore()`, a veces módulo compartido). Conviene estandarizar para evitar dobles inicializaciones y bugs de entorno.
3. En `rankingService` hay señales de error potencial:
   - Se usa `functions.https.HttpsError` sin importar `functions`.
   - En cálculo de suplentes se pasa `posicionFallback` como key distinta a `posicion` esperada por `calcularPuntaje`.
4. En `replacementService` se evalúan `posicionesPreferidas` dentro de `participations`, pero esas preferencias viven en `users`; posible bug funcional si no se duplican datos.
5. Falta estrategia de testing automatizado (scripts de test casi vacíos y lógica crítica sin cobertura).

---

## 5) Modelo de datos operativo (Firestore)

Colecciones clave:

- `users`
  - perfil base, rol, onboarding, preferencias, compromiso.
- `groups`
  - metadatos del grupo, activo, acumulado de partidos.
- `matches`
  - estado del partido, horaInicio, configuración de cupos/formación, deadlines, lock.
- `participations`
  - vínculo usuario-partido, estado titular/suplente/eliminado, ranking, pago.
- `groupStats`
  - métricas agregadas por `groupId_userId` para rotación.
- `teams`
  - snapshot de equipos generados por match cerrado.

Estados típicos de `matches`:

- `abierto` → `verificando` → `cerrado` → `jugado`
- alternativas: `cancelado` / `eliminado` según procesos automáticos y decisiones admin.

---

## 6) Opción A de despliegue: **todo en Firebase** (recomendada para este proyecto)

### 6.1 Componentes

- Frontend Next desplegado en **Firebase App Hosting** (ideal para Next moderno) o alternativa Firebase Hosting + estrategia SSR compatible.
- Backend en **Cloud Functions** (ya implementado).
- Firestore + Auth + Scheduler.

### 6.2 Ventajas

- Menor complejidad operativa (un solo proveedor).
- Integración nativa con credenciales, IAM, secretos y observabilidad.
- Menos CORS/multi-origen.

### 6.3 Pasos de alto nivel

1. Crear proyecto Firebase `dev` y `prod` separados.
2. Configurar Auth Google en ambos.
3. Migrar frontend para usar variables `NEXT_PUBLIC_FIREBASE_*` reales por entorno.
4. Endurecer `firestore.rules` y versionarlas por etapas.
5. Revisar e implementar índices en `firestore.indexes.json` según queries reales.
6. Deploy Functions con secretos/config por entorno.
7. Deploy Front con dominio y HTTPS.
8. Activar logs/alertas y presupuestos.

---

## 7) Opción B de despliegue: **Frontend en Render + Backend Firebase**

### 7.1 Componentes

- Next.js en Render (Web Service).
- Firebase para Auth/Firestore/Functions.

### 7.2 Requisitos extra

- Configurar correctamente variables `NEXT_PUBLIC_FIREBASE_*` en Render.
- Configurar dominio autorizado en Firebase Auth para el dominio de Render.
- Verificar región/latencia de Functions vs región de Render.
- Revisar CORS/headers para callables si hubiera desalineaciones.

### 7.3 Cuándo conviene

- Si ya tienes pipeline/infra estandarizada en Render o necesitas colocalizar con otros servicios no-Firebase.

---

## 8) Variables y configuración mínima por entorno

### Frontend (`volley-ranking-frontend`)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Backend (`volley-ranking-system/functions`)

- Service account/IAM administrado por Firebase en deploy.
- Si introduces integraciones externas, mover secretos a Secret Manager.

### Entornos sugeridos

- `local` (emulators)
- `staging` (Firebase no productivo)
- `production`

---

## 9) Hardening obligatorio antes de producción

1. **Seguridad Firestore**
   - Reemplazar regla abierta por reglas por colección/rol/propiedad.
   - Evitar que clientes escriban campos críticos (`estado`, `lock`, `pagoEstado`, etc.) salvo vía callable/admin validado.
2. **Control de acceso en callables**
   - Estandarizar validación admin en todos los endpoints sensibles.
3. **Consistencia de negocio**
   - Auditar transiciones de estado de `match` para eliminar caminos ambiguos (`eliminado` vs `cancelado`).
4. **Idempotencia y concurrencia**
   - Revisar locks y transacciones para evitar carreras entre triggers scheduler y acciones admin.
5. **Calidad**
   - Agregar tests de integración con emulador para flujos críticos (join, recálculo, cierre, pagos, equipos).
6. **Observabilidad**
   - Logs estructurados con `matchId/groupId/userId`.
   - Alertas por error rate de functions y latencia.

---

## 10) Checklist de salida a producción (ejecutable)

1. Corregir `firebase.ts` del frontend para soportar `dev/staging/prod` sin hardcode.
2. Definir y probar reglas Firestore con `firebase emulators:exec`.
3. Revisar bugs funcionales detectados en `rankingService` y `replacementService`.
4. Crear smoke tests de callables clave.
5. Montar proyecto Firebase `staging` y correr UAT.
6. Deploy Functions + Front en staging.
7. Prueba E2E de flujo completo:
   - login → onboarding → crear grupo → crear partido → joins → cierre/pago → generar equipos.
8. Configurar monitoreo y presupuesto.
9. Congelar release, backup/export, deploy prod.
10. Ejecutar post-deploy checklist (Auth, cron, callables, dashboards, errores).

---

## 11) Prompt corto recomendado para abrir charla con otra IA

> Tengo un proyecto de vóley con frontend Next.js (App Router) y backend en Firebase Functions + Firestore + Auth.
> El dominio es: users, groups, matches, participations, groupStats, teams.
> Hay callables para onboarding, join/leave, admin de grupos/partidos, pagos y generación de equipos; y triggers/cron para ranking, deadlines y cierre.
> Quiero llevarlo a producción y necesito plan técnico detallado (arquitectura, seguridad Firestore, CI/CD, observabilidad, costos, rollback), priorizando opción todo-Firebase y comparando con frontend en Render.
> Considera que hoy las rules están abiertas temporalmente, hay hardcode de emulador en frontend, y debo validar consistencia de ranking/replacement.
> Dame roadmap por fases con tareas concretas, riesgos, criterios de aceptación y comandos.

