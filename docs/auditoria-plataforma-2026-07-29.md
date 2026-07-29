# Auditoría integral de Sportexa / Project Voley

**Fecha:** 29 de julio de 2026  
**Alcance:** revisión estática del frontend Next.js, Cloud Functions, reglas Firestore, documentación y comprobaciones de compilación. No se ejecutaron flujos contra Firebase/producción ni pruebas con usuarios reales; los hallazgos de UX son evaluaciones de la implementación disponible.

## Resumen ejecutivo

La plataforma tiene un producto de alcance considerable y una base funcional bien encaminada: autenticación con Google, onboarding, grupos públicos/privados, partidos con ranking y pagos, armado de equipos, torneos por fases, paneles administrativos, alertas pendientes y notificaciones push. La separación entre frontend, funciones y reglas Firestore es clara, y la compilación de producción del frontend termina correctamente.

Sin embargo, hoy no conviene ampliar funcionalidades ni exponer masivamente el sistema sin resolver primero cuatro problemas: escalamiento de privilegios, exposición pública de datos operativos/personales, ausencia de pruebas de regresión y calidad estática fallida. El primer problema permite que un usuario común pase a ser administrador desde el cliente y, por extensión, acceda a acciones administrativas.

**Decisión recomendada:** congelar nuevas funciones de administración hasta cerrar los P0/P1 de seguridad y contar con pruebas mínimas de autorización y flujos de negocio.

| Severidad | Cantidad | Estado |
|---|---:|---|
| P0 — crítica | 1 | Bloquea expansión y despliegues de cambios sensibles |
| P1 — alta | 5 | Resolver en el siguiente ciclo |
| P2 — media | 9 | Planificar tras P0/P1 |
| P3 — mejora | 8 | Mejoras de producto, UX y mantenibilidad |

## Alcance funcional actual

### Jugadores

- Inicio de sesión con Google y creación automática de perfil.
- Onboarding con rol y posiciones preferidas.
- Dashboard de actividad, próximos partidos, torneos y alertas pendientes.
- Exploración y adhesión a grupos; soporte para grupos públicos, privados y con aprobación.
- Inscripción/salida de partidos, visualización de ranking, pagos, equipos e historial.
- Perfil, posiciones preferidas, grupos y torneos propios.
- Tema claro/oscuro y notificaciones push.

### Administradores

- Creación, edición, activación y gestión de grupos, miembros y admins.
- Creación/edición de partidos, control de cupos/participaciones, pagos, cierre, reapertura y equipos.
- Gestión de torneos: creación, inscripciones, pagos, equipos, grupos, fixture, resultados, avance, finalización y cancelación.
- Panel de alertas operativas y acciones rápidas.

### Automatizaciones

- Ranking y reemplazos alrededor de participaciones.
- Jobs de deadline/inicio/cierre de partidos y actualización de estadísticas.
- Sincronización, caducidad y limpieza de alertas pendientes.
- E-mail/push como respuesta a eventos de dominio.

## Hallazgos prioritarios

### P0 — cualquier usuario puede escalar a administrador

**Evidencia:** `completeOnboarding` toma `roles` del payload y lo persiste sin catálogo, validación ni autorización; `updateUserRole` hace lo mismo para el usuario invocador. El formulario ofrece explícitamente la opción “Administrador”. Véanse [completeOnboarding.js](../volley-ranking-system/functions/callables/completeOnboarding.js), [updateUserRole.js](../volley-ranking-system/functions/callables/updateUserRole.js) y [onboardingForm.tsx](../volley-ranking-frontend/src/components/onboarding/onboardingForm.tsx).

**Impacto:** un titular de una cuenta puede convertirse en admin, crear y administrar recursos, cambiar pagos, gestionar participantes y operar torneos. Las comprobaciones posteriores de `assertIsAdmin` no mitigan el problema porque leen el rol que el propio usuario pudo elevar.

**Corrección requerida:**

1. Eliminar la elección de rol del onboarding público; crear siempre `player`.
2. Restringir la asignación/revocación de roles a una función administrativa, protegida por custom claims o una lista de superadmins fuera del documento editable del usuario.
3. Validar en servidor las posiciones y hacer el onboarding idempotente.
4. Auditar retrospectivamente `users.roles` y los recursos modificados por admins no autorizados.
5. Incorporar pruebas de que player no puede crear partido/torneo, cambiar pagos ni promoverse.

### P1 — datos personales y de dominio son públicos por reglas Firestore

**Evidencia:** [firestore.rules](../volley-ranking-system/firestore.rules) permite `read: if true` en `users`, `groups`, `matches`, `participations`, `teams`, `groupStats`, torneos, registros, equipos y standings. El perfil de usuario contiene email, foto, nombre, posiciones, estado de compromiso y metadatos.

**Impacto:** usuarios anónimos pueden consultar o enumerar documentos si conocen/obtienen IDs; se exponen identidad, datos de pagos/participación y datos internos de torneos. El riesgo está reconocido como pendiente en [bugs-fix.md](bugs-fix.md).

**Corrección requerida:** dividir datos públicos de privados (`publicProfiles`, proyecciones públicas de grupos/torneos/partidos), denegar lectura por defecto y autorizar por pertenencia/rol. No exponer e-mail en vistas públicas. Añadir tests de reglas con emulador.

### P1 — operaciones directas de torneo eluden el patrón de backend único

**Evidencia:** las reglas permiten a admins de grupo actualizar directamente campos de `tournamentRegistrations` y `tournamentTeams` —incluyendo `playerIds`, importes y estado de pago—, mientras otras transiciones pasan por callables. 

**Impacto:** hay dos caminos de mutación, con reglas de validación diferentes. Puede romper invariantes de cupos, montos, estado de inscripción y alertas/eventos que dependen de Functions.

**Corrección requerida:** centralizar mutaciones de inscripción/equipo/pago en callables transaccionales; si se mantiene el write directo, limitarlo estrictamente a una lista de jugadores y recalcular importes/estado desde backend.

### P1 — suite de pruebas inexistente

**Evidencia:** `functions/package.json` define `npm test` para fallar intencionalmente; no se encontraron pruebas unitarias, de integración ni de reglas. 

**Impacto:** ranking, permisos, pagos, fixtures, triggers programados y transiciones de torneo carecen de red de seguridad ante cambios.

**Corrección requerida:** Vitest/Jest para servicios puros; Firebase Emulator para callables, reglas y transacciones; E2E Playwright para los caminos esenciales. Establecer CI obligatorio.

### P1 — lint del frontend no aprueba

**Evidencia:** ejecución 29-07-2026: `npm run lint` terminó con **41 errores y 13 advertencias**. Hay tipos `any`, hooks condicionales, actualizaciones de estado dentro de efectos y dependencias incompletas. El caso más serio es [pagoModal.tsx](../volley-ranking-frontend/src/components/pagoModal/pagoModal.tsx), que llama `useState` después de un retorno condicional y viola las reglas de hooks.

**Impacto:** riesgo de fallos de render, estados inconsistentes y regresiones ocultas; el build puede compilar aunque el lint falle.

**Corrección requerida:** hacer obligatorio el lint en CI y arreglar primero el modal de pagos, las dependencias de efectos y los tipos de modelo compartidos. Sustituir `any` por tipos de Firestore/DTO y validar entradas.

### P1 — consultas sin paginación y patrón N+1

**Evidencia:** el listado público llama a `buildGroupPayload` por grupo, que hace un `count()` de matches por cada uno. El detalle de grupo trae todo el historial de partidos. El envío push aplica `Promise.all` a todos los usuarios. Véanse [httpApi.js](../volley-ranking-system/functions/src/httpApi.js) y [pushService.js](../volley-ranking-system/functions/src/services/pushService.js).

**Impacto:** latencia, costos Firestore y posible timeout/limitación de proveedores al crecer los grupos o las notificaciones.

**Corrección requerida:** contador desnormalizado, cursor + `limit`, carga diferida de historial y fan-out con lotes/concurrencia limitada o Cloud Tasks.

## Seguridad y privacidad

| Riesgo | Severidad | Recomendación |
|---|---|---|
| Promoción arbitraria a admin | P0 | Quitar rol del cliente y gobernar privilegios mediante superadmin/custom claim. |
| Lectura pública de usuarios y operaciones | P1 | Proyecciones públicas mínimas + reglas por pertenencia. |
| Datos sensibles en respuesta HTTP | P1 | No devolver `email` fuera de administración autorizada. |
| Falta de App Check/rate limit | P2 | Activar Firebase App Check; límites por IP/UID para API, login y push. |
| CORS basado en origen | P2 | La allowlist actual es una mejora correcta, pero CORS no sustituye autenticación ni App Check. |
| Logs con UID y datos operativos | P2 | Reducir logs de producción y usar logging estructurado sin PII innecesaria. |
| Suscripciones push | P2 | La colección está bloqueada y tiene retención: correcto. Agregar métricas y concurrencia limitada. |

## Calidad técnica y arquitectura

### Fortalezas

- Firestore bloquea escrituras directas para la mayoría de las colecciones críticas; la lógica central está en callables.
- Las operaciones de match/torneo usan validaciones de dominio y varias transacciones; el registro de torneo usa un ID determinístico.
- Hay eventos de dominio y triggers separados de servicios, una buena base para desacoplar notificaciones.
- CORS tiene allowlist, los proxies codifican parámetros y el push normaliza URLs de navegación.
- `npm run build` de frontend finalizó correctamente: compilación, TypeScript y generación de 18 rutas estáticas/dinámicas.

### Debilidades

- Backend JavaScript sin lint, tipado ni tests; frontend TypeScript con uso extenso de `any`.
- Dos implementaciones de onboarding: el callable usado no reutiliza [onboardingService.js](../volley-ranking-system/functions/src/services/onboardingService.js), que contiene más validaciones. Hay deriva de reglas.
- Autorización de UI basada en layout cliente: adecuada para experiencia, pero nunca debe tratarse como control de seguridad.
- Configuración de Firebase con región implícita para varias Functions; conviene declarar una región única para reducir latencia y errores de endpoint.
- No hay pipeline CI/CD versionado, política de cobertura, migraciones formalizadas ni estrategia de rollback visible.
- `AuthProvider` registra UID y project ID en consola del navegador; eliminar antes de producción.

## Auditoría funcional y de experiencia

### Recorridos cubiertos por diseño

| Recorrido | Evaluación | Observación |
|---|---|---|
| Alta/login/onboarding | Parcial | Login Google y onboarding son claros, pero el rol no debe elegirse libremente. El texto dice “hasta 3” posiciones, mientras una capa de servicio exige exactamente 3: unificar la regla. |
| Descubrir grupos | Bueno | Listado, búsqueda, estado de ingreso y cards con dueño/estadísticas. Falta paginación, filtros robustos y estados vacíos orientados a acción. |
| Unirse y jugar | Parcial | Hay estados/ranking/pagos/equipos. Falta evidencia de pruebas E2E para carrera de cupo, baja tardía, deadline y mal conectividad. |
| Gestión de grupos | Bueno | Solicitudes, integrantes y admins están contemplados. Definir con precisión el modelo: “admin global”, owner y admin de grupo. |
| Torneos | Ambicioso pero complejo | Cubre el ciclo completo. Requiere un mapa de estados visible para admins, guardado de borrador, validación progresiva y pruebas de transiciones. |
| Alertas y push | Bueno | Pendientes con sincronización y limpieza. Evitar sobrecarga: agrupación, preferencias y centro histórico. |
| Perfil/historial | Parcial | Está presente; falta claridad de qué datos son públicos, exportación/borrado y manejo de cuenta. |

### Diseño visual y usabilidad

**Lo que funciona:** lenguaje visual coherente (naranja como acento, cards, pills de estado, skeletons, sidebar desktop y drawer mobile), tema oscuro y componentes reutilizables (`ActionButton`, toasts, confirmaciones). El contenido está organizado por tareas y no por entidades técnicas.

**Mejoras necesarias:**

1. **Accesibilidad (P2):** añadir etiquetas accesibles al botón de menú mobile, foco visible uniforme, cierre por Escape y foco atrapado/devolución en modales. Validar contraste real de naranja/grises en ambos temas y navegación por teclado.
2. **Consistencia de iconos/idioma (P2):** hay mojibake visible en fuentes (por ejemplo `Â¿`, `ðŸ…`) y emojis como iconos. Guardar archivos UTF-8, usar iconos de la librería instalada y texto semántico.
3. **Jerarquía de administración (P2):** “Mi gestión” solo aparece tras ser admin; añadir onboarding contextual, permisos explicados y empty states con próximos pasos.
4. **Densidad y escalabilidad (P2):** tablas y listados deberían ofrecer filtros persistentes, orden, paginación y búsqueda del servidor. Evitar cargar todo y luego filtrar en cliente.
5. **Estados de error/offline (P2):** existen skeletons y toasts, pero faltan reintentos explícitos, indicador de datos desactualizados y prevención de doble envío en todos los formularios.
6. **Formularios de torneo (P3):** la página de alta supera 900 líneas; dividir en pasos con resumen final, validación por sección y persistencia de borrador.
7. **Responsive (P3):** validar físicamente 320 px, tablets y landscape: navbar/sidebar cambian de paradigma y las cards con múltiples badges pueden desbordar.

## Rendimiento y operación

- Aplicar límites y paginación a matches, grupos, participaciones, equipos y alertas.
- Convertir agregados frecuentes en campos mantenidos por evento (`matchesCount`, cupos, conteos de participantes), con reparación/backfill idempotente.
- Enviar push/email mediante cola para evitar que una escritura de negocio quede ligada a múltiples llamadas externas.
- Medir: latencia p50/p95 de callables, lecturas Firestore por pantalla, errores de autorización, jobs repetidos, push enviado/fallido y edad de alertas.
- Añadir alertas operativas para errores de scheduler, cambios de estado inválidos y elevaciones de rol.
- Definir backups, restore probado, entorno staging separado, rotación de secrets y runbooks de incidente.

## Plan propuesto

### Fase 0 — contención (inmediata)

1. Desplegar corrección de escalamiento de rol y revisar roles existentes.
2. Retirar `email` y demás PII de lecturas públicas; negar lecturas sensibles.
3. Eliminar logs de UID del cliente y verificar secrets/configuración por entorno.
4. Comunicar cambio de permisos y, si corresponde, invalidar sesiones/tokens de administradores creados indebidamente.

### Fase 1 — confiabilidad (1–2 sprints)

1. Resolver los 41 errores de lint; bloquear merges que no pasen lint/build.
2. Crear pruebas de reglas y de los 10 flujos críticos: onboarding, rol, grupo privado, join/leave match, pago, cierre, torneo, fixture, resultado y alertas.
3. Unificar servicios de onboarding/roles y documentar la matriz de permisos.
4. Centralizar las mutaciones de registros/equipos de torneo.

### Fase 2 — escala y UX (2–3 sprints)

1. Paginación/cursors, contadores desnormalizados y concurrencia acotada en push.
2. Accesibilidad de navegación y modales; corrección completa de codificación UTF-8.
3. Formularios de torneo por pasos y estados vacíos/errores con recuperación.
4. Instrumentación, dashboard operativo, staging y CI/CD.

## Criterios de salida antes de sumar cambios grandes

- Ningún usuario puede obtener/administra roles desde cliente.
- Reglas Firestore tienen pruebas automáticas y no exponen PII ni datos de pago públicamente.
- Lint y build pasan; funciones tienen lint/test reales.
- Cobertura automatizada de permisos y transiciones de match/torneo.
- Consultas de listados tienen límites/cursor y notificaciones tienen control de concurrencia.
- QA manual completa en móvil/desktop, claro/oscuro, teclado y usuarios player/admin/owner.

## Comprobaciones realizadas

- Inventario de rutas, componentes, callables, triggers, servicios, reglas e índices.
- Revisión de documentación existente y backlog técnico.
- `npm run build` en `volley-ranking-frontend`: **correcto**.
- `npm run lint` en `volley-ranking-frontend`: **fallido**, 41 errores y 13 advertencias.
- No se modificó código de la plataforma durante esta auditoría; se agregó únicamente este informe.
