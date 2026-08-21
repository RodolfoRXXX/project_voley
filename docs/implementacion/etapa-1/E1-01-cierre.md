# E1-01 — Cierre consolidado

## 1. Identificación

- Incremento: E1-01 — Cuenta de Usuario autenticada y acceso propio.
- Etapa: Etapa 1 — Usuario, Persona y autorización contextual.
- Estado: `Cerrado`.
- Responsable de aprobación: Rodolfo.
- Fecha efectiva de cierre: 2026-08-21.

Este documento cierra únicamente E1-01. No declara cerrada la Etapa 1.

## 2. Rama y HEAD

- Rama: `feat/e1-01-cuenta-usuario`.
- Checkpoint anterior: `a34e8832d9a1b8bc25522c7960536dfdbc3b3647`.
- Implementación: `1cfade5e7d27301ee5e5acf088b11c4487cf0b01`.
- Correcciones E1-01-C01/C02 y HEAD final: `61452bdaa879688589914df3f6b3d3624656eb33`.
- Upstream al iniciar el cierre: alineado, `0/0`.
- Working tree inicial del cierre: limpio.

## 3. Objetivo del incremento

Permitir autenticación, materialización idempotente y consulta de una cuenta Usuario mínima, seguida de navegación protegida, sin crear Persona ni conceder roles, posiciones, permisos deportivos o habilitación comercial.

## 4. Casos de uso incluidos

- CU-001 — registro o primer acceso mediante el proveedor técnico.
- CU-002 — inicio de sesión de una cuenta existente.
- Consulta de cuenta propia autenticada.
- CU-003 — cierre de sesión y limpieza del estado privado.
- Bootstrap y recuperación idempotentes ante concurrencia o respuesta perdida.

## 5. Alcance implementado

- Cuenta digital Usuario separada de Persona y datos deportivos.
- Bootstrap explícito desde frontend mediante contrato backend.
- Consulta propia sin efectos.
- Estados de sesión, inicialización, éxito y error recuperable.
- Redirección del onboarding y perfil informativo legado.
- Dashboard utilizable sin rol, posiciones ni `onboarded`.
- Login/logout centralizados y navegación privada protegida.

## 6. Decisiones físicas finales

- Firebase UID es la identidad interna y el ID documental.
- `ensureMyAccount` es la única autoridad de materialización.
- Escritura atómica mediante `DocumentReference.create()`.
- `ALREADY_EXISTS` se recupera leyendo por el mismo UID.
- No se utiliza transacción, merge, doble escritura ni sincronización automática.
- Authentication permanece como infraestructura y no sustituye al Agregado Usuario.

## 7. Contratos finales

- `ensureMyAccount`: callable v1 autenticada, payload vacío, identidad derivada de `context.auth`, creación o recuperación idempotente.
- `getMyAccount`: callable v1 autenticada y de sólo lectura, actor objetivo derivado de `context.auth.uid`.
- DTO exacto: `userId`, `displayName`, `accessEmail`, `accountPhotoUrl`.
- Errores estables: `unauthenticated`, `invalid-argument`, `failed-precondition`, `not-found`, `internal`.
- Ningún contrato acepta el Usuario objetivo ni expone documentos, timestamps o tipos Firebase.

## 8. Persistencia

Ruta:

```text
users/{firebaseUid}
```

Documento exacto:

```javascript
{
  nombre,
  email,
  photoURL,
  createdAt
}
```

No contiene UID duplicado, proveedor, `emailVerified`, `updatedAt`, `personaId`, rol, posiciones, permisos, compromiso, estadísticas, Plan, Suscripción u `onboarded`. `createdAt` permanece inmutable y los accesos posteriores no actualizan el documento.

## 9. Autorización

- Contexto funcional: `self-account`.
- Actor y objetivo se derivan exclusivamente de la identidad autenticada.
- No existe selección cliente de otro Usuario.
- Ausencia de rol administrativo falla cerrada.
- Authentication autentica; Usuario representa la cuenta digital; Persona continúa fuera de alcance.

## 10. Reglas locales

- Visitante sin lectura privada.
- Lectura propia transitoria permitida.
- Lectura administrativa global sólo mediante el gate legado existente.
- Lectura ajena ordinaria denegada.
- Create, update y delete cliente siempre denegados.
- Backend como único escritor del flujo nuevo.
- `pendingAlerts` preservado sin regresión.
- Sin dependencia con Plan y sin posibilidad de autopromoción.

## 11. Autoridades retiradas

- Trigger/export `onUserCreate`.
- Callable/export `completeOnboarding`.
- Trigger/export `onUserPendingAlertsSync`.
- Formulario deportivo de onboarding.
- Productor, sincronizador y backfill de `complete_profile`.
- Writers de rol, posiciones u `onboarded` durante el alta.

Las referencias lectoras de compatibilidad no constituyen una autoridad de escritura.

## 12. Pruebas automatizadas

Gate final con Node.js 20.20.0:

| Verificación | Resultado |
|---|---|
| Lint | Aprobado; 39 errores y 10 warnings históricos, 0 regresiones |
| Typecheck | Aprobado |
| Sintaxis Functions | 108/108 |
| Unitarias/tooling/arquitectura | 47/47 |
| Emuladores | 32/32: 5 E1-01 y 27 E0/regresión |
| Mantenimiento | 7/7 |
| Build | 18/18 páginas |
| `quality:stage0` | Aprobado, 125,81 s en la verificación posterior a correcciones |
| `git diff --check` | Aprobado |

## 13. Verificación independiente

La revisión independiente confirmó arquitectura, contratos, esquema mínimo, idempotencia, reglas, autoridades retiradas y ausencia de regresión. Detectó dos defectos frontend acotados; por ello el primer veredicto fue `E1-01 REQUIERE CORRECCIONES` y no se ocultó esa secuencia histórica.

## 14. Correcciones C01 y C02

- **E1-01-C01:** reemplazó el skeleton administrativo indefinido por un error accesible compartido, mantuvo oculto el contenido administrativo y conectó `Reintentar` con `retryAccount`.
- **E1-01-C02:** añadió bloqueo y feedback móvil durante autenticación y una operación single-flight centralizada, liberada tras éxito, cancelación o error.

Las correcciones están versionadas en `61452bd` y cubiertas por seis pruebas nuevas. No modificaron backend de Usuario, persistencia, DTO, reglas, autorización legada, dependencias ni lockfiles.

## 15. UAT manual

- Responsable: Rodolfo.
- Fecha: 2026-08-21.
- Entorno: Firebase Emulator Suite, proyecto demo y datos sintéticos.
- Resultado: 17/17 puntos aprobados, sin defectos adicionales.

Se verificaron inicio desktop, popup emulado, estados de autenticación/bootstrap, dashboard, documento mínimo exacto, recarga idempotente, redirecciones, ausencia de dependencias deportivas, logout desde Navbar y Sidebar, viewport móvil, popup único ante doble activación, cancelación y reintento, error administrativo recuperable, ocultamiento de contenido, recuperación mediante `Reintentar` y denegación administrativa sin rol.

## 16. Criterios de aceptación

Cumplidos:

- Usuario es la fuente de verdad de la cuenta digital y Authentication no lo sustituye.
- Persona no fue implementada ni vinculada.
- Bootstrap idempotente, concurrente y recuperable.
- Consulta propia y autorización `self-account`.
- Frontend sin Firestore directo para inicializar cuenta.
- Onboarding deportivo retirado.
- Cuentas nuevas sin rol, posiciones ni `onboarded`.
- Escrituras cliente denegadas y backend como único escritor.
- Pruebas automatizadas y UAT aprobadas.
- C01 y C02 verificadas.
- Sin acceso a Firebase remoto.
- Rollback y evidencia reproducibles disponibles.
- Deuda restante inventariada y fail-closed.

Criterios incumplidos: `Ninguno`.

## 17. Deuda aceptada y etapa futura

| Deuda preservada | Condición de retiro |
|---|---|
| Roles administrativos globales legados | Sustituir cuando el incremento aprobado implemente autorización contextual completa |
| Posiciones y compromiso consumidos por flujos deportivos | Migrar al modelar Persona/Membresía y retirar consumidores del documento Usuario legado |
| Lectura propia directa en `legacyUserService` | Retirar cuando todos sus consumidores usen contratos de Aplicación o proyecciones contextuales |
| Compatibilidad lectora con `complete_profile` | Retirar cuando no existan alertas históricas compatibles pendientes |
| Grupo, Partido, Torneo y ranking no migrados | Tratar en sus incrementos funcionales; no migrarlos retroactivamente desde E1-01 |
| Baseline lint histórico | Reducir mediante incrementos de calidad explícitos, conservando el control de no regresión |
| `caniuse-lite` desactualizado | Actualizar sólo en una intervención de dependencias autorizada |
| Sin pruebas automatizadas de navegador | Incorporar cuando exista infraestructura frontend aprobada; hasta entonces conservar UAT reproducible |
| Persona y vínculo Usuario–Persona | Implementar en el incremento específico de Persona/vinculación |
| Autorización contextual de Grupo/Membresía | Implementar al introducir Membresía y permisos contextuales |

Ninguna deuda se declara resuelta por este cierre.

## 18. Rollback

Rollback definitivo de código:

1. revertir `61452bd`;
2. revertir `1cfade5`;
3. reinicializar Auth, Firestore y Functions Emulator;
4. repetir la suite E0 y comprobar el baseline;
5. no restaurar el onboarding inseguro ni recurrir a doble escritura.

Como alternativa antes de integración puede abandonarse la rama. No existen datos o despliegues remotos de E1-01 que deban revertirse.

## 19. Ausencia de despliegue remoto

Firebase remoto permaneció fuera de alcance, sin consultas o escrituras de datos, deploy, restore ni cambios de reglas. El proyecto remoto se conserva sin cambios y bajo `deny-all`. Toda evidencia funcional utilizó `demo-sportexa-e0-02`, hosts loopback y datos sintéticos.

## 20. Estado del entorno al cierre

- Frontend Next.js detenido.
- Auth, Firestore y Functions Emulator detenidos.
- Emulator UI detenida.
- Sin listeners en los puertos utilizados.
- Sin procesos Node/Java asociados a la UAT.
- Temporal preexistente `sportexa-e0-02-emulators-Q9d41V` preservado sin modificación ni eliminación.
- Datos sintéticos descartables al detener emuladores; ningún dato remoto afectado.

## 21. Condición habilitada para el próximo incremento

E1-01 deja disponible una cuenta Usuario mínima, contratos propios, bootstrap idempotente y navegación protegida sobre los que puede definirse E1-02. Queda habilitado iniciar E1-02 únicamente mediante su propia ficha, alcance y gate; este cierre no lo implementa ni cierra la Etapa 1.

## 22. Veredicto final

`E1-01 CERRADO — E1-02 HABILITADO`
