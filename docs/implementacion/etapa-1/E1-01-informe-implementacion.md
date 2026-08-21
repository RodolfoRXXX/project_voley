# E1-01 — Informe de implementación

## 1. Identificación y condición inicial

- Rama: `feat/e1-01-cuenta-usuario`.
- HEAD inicial: `a34e8832d9a1b8bc25522c7960536dfdbc3b3647`.
- Estado Git inicial: limpio.
- Estado Git final: cambios locales de E1-01 sin commit; no se cambió de rama.
- Runtime: Node.js `20.20.0` mediante la instalación de `fnm`, npm `10.8.2`, Firebase CLI `15.18.0`.
- HEAD contenía la ficha aprobada y los runners portables antes de iniciar.
- Preflight: lint sin regresiones sobre 41 errores/13 warnings conocidos, typecheck aprobado, sintaxis Functions 97/97 y unitarios/tooling 18/18.

No se realizó commit, push, deploy, consulta de datos remotos ni modificación de `dev`.

## 2. Resultado funcional

El flujo autenticado ahora:

1. centraliza Google Sign-In en `authService.ts`;
2. observa la sesión Firebase;
3. ejecuta `ensureMyAccount` con payload `{}`;
4. crea o recupera idempotentemente `users/{firebaseUid}`;
5. recibe sólo `MyAccountDto`;
6. habilita `/dashboard` sin exigir rol, posiciones u `onboarded`;
7. permite reintentar un bootstrap fallido;
8. centraliza `signOut`, limpia estado privado y vuelve a `/`.

`getMyAccount` quedó disponible como consulta propia sin efectos. `/onboarding` y `/profile/info` redirigen neutralmente a `/dashboard`; el formulario deportivo de alta fue retirado.

## 3. Diseño físico efectivo

Ruta final:

```text
users/{firebaseUid}
```

Documento creado una sola vez:

```javascript
{
  nombre: string,
  email: string,
  photoURL: string,
  createdAt: serverTimestamp()
}
```

Firebase UID sólo es ID documental. No se persisten UID duplicado, proveedor, provider subject, `emailVerified`, `updatedAt`, estado de cuenta, preferencias, configuración, `personaId`, roles, posiciones, permisos, compromiso, estadísticas ni `onboarded`.

## 4. Contratos finales

### `ensureMyAccount`

- Callable Function v1, región por defecto existente.
- Exige `context.auth` y payload ausente, nulo o `{}`; rechaza propiedades adicionales.
- Obtiene UID, email, display name y fotografía exclusivamente de `context.auth`.
- Exige UID y email; nombre y fotografía pueden estar vacíos.
- Usa `DocumentReference.create()`.
- Ante `ALREADY_EXISTS`, lee el documento por UID y devuelve el mismo DTO semántico.
- Nunca sincroniza ni actualiza un documento existente.

### `getMyAccount`

- Callable Function v1 autenticada y de sólo lectura.
- No acepta `userId` ni otro payload funcional.
- Deriva el objetivo de `context.auth.uid`.
- Devuelve `not-found` si Auth existe pero Usuario aún no fue materializado.

### DTO

```typescript
type MyAccountDto = {
  userId: string;
  displayName: string;
  accessEmail: string;
  accountPhotoUrl: string | null;
};
```

Errores contractuales: `unauthenticated`, `invalid-argument`, `failed-precondition`, `not-found` e `internal`. No se exponen documentos, timestamps ni tipos Firebase.

## 5. Idempotencia, concurrencia y recuperación

La exclusión mutua depende de la precondición atómica de `DocumentReference.create()`: una llamada crea y una concurrente recibe `ALREADY_EXISTS`. La segunda recupera por el mismo UID. Un reintento posterior a una respuesta perdida sigue el mismo camino y no actualiza datos existentes. No se usa transacción ni `set(..., {merge:true})`.

## 6. Reglas Firestore locales

Para `users/{uid}`:

- visitante: sin lectura;
- lectura propia: conservada transitoriamente;
- lectura administrativa global: conservada para consumidores legados comprobados;
- lectura ajena ordinaria: denegada;
- create/update/delete cliente: siempre denegados;
- Admin SDK local: único escritor del flujo nuevo;
- `pendingAlerts`: conserva su política aprobada.

El ruleset remoto no se consultó, restauró ni desplegó.

## 7. Autoridades y estructuras retiradas

- Trigger y export `onUserCreate`.
- Callable y export `completeOnboarding`.
- Trigger y export `onUserPendingAlertsSync`.
- Formulario `onboardingForm.tsx`.
- Productor, sincronizador y backfill de la alerta `complete_profile` dependiente de `onboarded`.
- Login duplicado en Home, Navbar y Dashboard.
- Gate de cuenta basado en `onboarded`.

El sistema general de alertas y sus demás productores se conservaron.

## 8. Cambios frontend

- `AuthProvider` modela `checkingSession`, `initializingAccount`, `ready` y `accountError`.
- El bootstrap se ejecuta una vez por UID/reintento, cancela actualizaciones tras desmontaje y ofrece reintento.
- El flujo de cuenta no importa Firestore ni usa snapshot de `users`.
- La lectura propia Firestore restante quedó aislada en `legacyUserService.ts`, después de que la cuenta ya está lista, exclusivamente para roles/datos deportivos de consumidores todavía no migrados. No inicializa cuenta ni concede autoridad ante ausencia.
- El layout protegido no muestra contenido privado hasta tener sesión y DTO.
- El layout administrativo conserva el gate global legado y falla cerrado si falta rol.
- Dashboard muestra identidad digital mínima y degrada la ficha deportiva como no disponible.
- Navbar y Sidebar usan login/logout centralizados; logout exitoso vuelve a `/` y el fallo es recuperable.

## 9. Pruebas agregadas

### Unitarias y de arquitectura — 23 casos E1-01

- Dominio: Usuario mínimo, correo obligatorio, nombre/foto vacíos, ausencia de campos deportivos y DTO sin timestamp.
- Aplicación: creación, existente, concurrencia, respuesta perdida, get, identidad ausente/incompleta, fallos de repositorio y recuperación de `ALREADY_EXISTS`.
- Transporte/infraestructura: payload exacto, actor desde contexto, DTO y errores estables.
- Arquitectura: AuthProvider sin lectura directa, frontend sin escritor de `users`, bootstrap sin campos deportivos, DTO sin Firebase y ausencia de autoridades legadas.

### Emuladores — 5 casos E1-01

- Auth existente sin Usuario y `getMyAccount` en `not-found`.
- Visitante/payload con `userId` rechazados.
- Dos bootstrap concurrentes y un único documento mínimo.
- Consulta/reintento sin sincronización del existente.
- lectura propia transitoria y create/update/delete cliente denegados.

Las suites E0 adaptaron sólo su preparación de fixtures: las cuentas se materializan explícitamente y los campos deportivos/administrativos legados se siembran con Admin SDK sintético cuando el escenario los necesita.

## 10. Gate final

Todos los comandos usaron Node.js 20.20.0.

| Comando | Resultado | Evidencia |
|---|---|---|
| `npm run quality:lint` | Aprobado | 39 errores y 10 warnings históricos; 0 regresiones; 5 hallazgos del baseline resueltos |
| `npm run quality:typecheck` | Aprobado | TypeScript sin errores |
| `npm run quality:functions:syntax` | Aprobado | 108/108 JavaScript |
| `npm run quality:build` | Aprobado | Next.js compiló y generó 18/18 páginas |
| `npm run quality:test` | Aprobado | 47/47 unitarios/tooling/arquitectura + 32/32 emuladores |
| `npm run test:infra:emulators` desde Functions | Aprobado | 32/32; incluye 5 E1-01 y 27 regresiones E0/reglas |
| `npm run test:maintenance` desde Functions | Aprobado | 7/7 |
| `npm run quality:stage0` | Aprobado | lint, typecheck, sintaxis, tests, build y diff completos |
| `git diff --check` | Aprobado | sin errores de whitespace |

El build sólo informó la advertencia no bloqueante de datos `caniuse-lite` antiguos. El emulador informó que `firebase-functions` 4.9.0 no incluye las funciones más nuevas de Extensions; E1-01 no usa Extensions.

## 11. Evidencia de emuladores y ausencia de remoto

- Proyecto exclusivo: `demo-sportexa-e0-02`.
- Hosts loopback: Auth `127.0.0.1:19099`, Firestore `127.0.0.1:18080`, Functions `127.0.0.1:15001`; websocket `18150`.
- Firebase CLI confirmó que los servicios eran emulados y que un proyecto `demo-*` falla ante servicios no emulados.
- Guardas unitarias fallan cerrado ante project ID remoto, hosts no locales, credenciales de aplicación o `FIREBASE_CONFIG` remoto.
- El intento informativo de Firebase CLI de obtener MOTD/configuración remota fue bloqueado y reportado como no fatal; no hubo acceso a datos ni APIs de un proyecto remoto.
- No se ejecutaron deploy, restore, Firebase Admin contra remoto ni comandos Git remotos.

## 12. Deuda preservada y diferida

- `roles`, posiciones, compromiso, ranking y `onboarded` siguen siendo campos opcionales legados para consumidores deportivos no migrados.
- Participación, Grupo, Partido y Torneo conservan sus validaciones/lectores anteriores; una cuenta nueva sin datos deportivos falla conservadoramente.
- El rol administrativo global sigue temporalmente como gate de pantallas administrativas; ausencia de rol nunca autoriza.
- La lectura propia directa de `users` se conserva sólo en el adaptador legado aislado y en consumidores fuera del flujo de cuenta.
- Persona, Membresía, autorización contextual de Grupo, Solicitud y Comercial quedan para incrementos posteriores.
- Tipos/componentes deportivos históricos no fueron limpiados globalmente.

## 13. Riesgos y limitaciones reales

- No hay test automatizado de navegador; se entrega una secuencia manual reproducible.
- Probar el popup Google real requiere configuración local autorizada del proveedor. Las capas posteriores al login quedaron verificadas con Auth Emulator.
- Los consumidores deportivos pueden ocultar o rechazar acciones para cuentas nuevas sin `onboarded`/posiciones; es el fallo conservador solicitado, no una concesión implícita.
- La lectura legacy asíncrona no bloquea la cuenta válida, pero la administración espera a que finalice para decidir su gate.

## 14. Prueba manual reproducible

1. Configurar el frontend para Auth, Firestore y Functions Emulator del proyecto `demo-sportexa-e0-02` y arrancar los tres emuladores.
2. Abrir `/` en viewport móvil y escritorio; confirmar botón `Ingresar con Google`/`Empezar ahora`.
3. Iniciar el popup: verificar texto `Autenticando…` y botón deshabilitado tanto en escritorio como en móvil; intentar una segunda activación y confirmar que sólo se abre un popup; cancelar y confirmar mensaje recuperable.
4. Completar login con una identidad sintética del Auth Emulator: confirmar estado `Inicializando tu cuenta…` o skeleton y posterior acceso a `/dashboard`.
5. En Firestore Emulator, inspeccionar `users/{uid}` y confirmar exactamente `nombre`, `email`, `photoURL`, `createdAt`.
6. Recargar y volver a ingresar: confirmar el mismo documento y ausencia de actualización automática.
7. Simular Functions no disponible, recargar `/dashboard` y una ruta `/admin/*`, confirmar error de inicialización accesible, contenido privado oculto y botón `Reintentar`; restaurar Functions y reintentar.
8. Abrir `/onboarding` y `/profile/info`; ambas deben terminar en `/dashboard` sin formulario deportivo.
9. Confirmar que Dashboard no exige rol/posición y muestra la ficha deportiva como no disponible.
10. Cerrar sesión desde Navbar y Sidebar: confirmar navegación a `/`, limpieza del contenido privado y documento persistido intacto.
11. Repetir puntos 2–10 en ancho aproximado de 375 px y 1280 px, comprobando que botones, mensajes y navegación sean utilizables.

## 15. Archivos

### Creados

- `volley-ranking-frontend/src/services/accountService.ts`
- `volley-ranking-frontend/src/services/legacyUserService.ts`
- `volley-ranking-frontend/src/components/account/AccountInitializationError.tsx`
- `volley-ranking-frontend/src/types/MyAccount.ts`
- `volley-ranking-system/functions/callables/ensureMyAccount.js`
- `volley-ranking-system/functions/callables/getMyAccount.js`
- `volley-ranking-system/functions/src/users/domain/user.js`
- `volley-ranking-system/functions/src/users/application/accountService.js`
- `volley-ranking-system/functions/src/users/application/accountDto.js`
- `volley-ranking-system/functions/src/users/application/accountErrors.js`
- `volley-ranking-system/functions/src/users/infrastructure/callableAuthenticatedIdentity.js`
- `volley-ranking-system/functions/src/users/infrastructure/firestoreUserRepository.js`
- `volley-ranking-system/functions/src/users/infrastructure/accountCallable.js`
- `volley-ranking-system/functions/test/unit/accountDomain.test.js`
- `volley-ranking-system/functions/test/unit/accountService.test.js`
- `volley-ranking-system/functions/test/unit/accountInfrastructure.test.js`
- `volley-ranking-system/functions/test/unit/accountArchitecture.test.js`
- `volley-ranking-system/functions/test/emulator/accountE1.test.js`
- este informe.

### Modificados

- `docs/implementacion/etapa-1/E1-01-ficha-cuenta-usuario.md`
- `volley-ranking-frontend/src/app/(admin)/layout.tsx`
- `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx`
- `volley-ranking-frontend/src/app/(protected)/layout.tsx`
- `volley-ranking-frontend/src/app/(protected)/profile/info/page.tsx`
- `volley-ranking-frontend/src/app/(protected)/profile/layout.tsx`
- `volley-ranking-frontend/src/app/(protected)/profile/tournaments/page.tsx`
- `volley-ranking-frontend/src/app/onboarding/page.tsx`
- `volley-ranking-frontend/src/app/page.tsx`
- `volley-ranking-frontend/src/components/layout/AppSidebar.tsx`
- `volley-ranking-frontend/src/components/layout/Navbar.tsx`
- `volley-ranking-frontend/src/components/providers/AuthProvider.tsx`
- `volley-ranking-frontend/src/services/authService.ts`
- `volley-ranking-frontend/src/types/UserDoc.ts`
- `volley-ranking-system/firestore.rules`
- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/src/scripts/backfillPendingAlerts.js`
- `volley-ranking-system/functions/src/services/pendingAlertsService.js`
- `volley-ranking-system/functions/test/emulator/autopromotionSecurity.test.js`
- `volley-ranking-system/functions/test/emulator/minimumReadPolicy.test.js`
- `volley-ranking-system/functions/test/emulator/priorityAssetCharacterization.test.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`

### Retirados

- `functions/callables/completeOnboarding.js`
- `functions/src/triggers/onUserCreate.js`
- `functions/src/triggers/onUserPendingAlertsSync.js`
- `src/components/onboarding/onboardingForm.tsx`

## 16. Rollback

Como no hay commits ni datos remotos, el rollback consiste en descartar únicamente el diff local de E1-01, limpiar/reiniciar los emuladores y volver a ejecutar la suite E0 desde HEAD inicial. No se debe desplegar ni restaurar el onboarding inseguro como solución definitiva.

## 17. Diff resumido

El cambio incorpora el módulo de cuenta y sus contratos, endurece escrituras de `users`, elimina autoridades/onboarding anteriores, adapta autenticación y navegación, agrega 34 casos E1-01 (29 unitarios/arquitectura + 5 emulador) y preserva consumidores deportivos como deuda explícita. El detalle mecánico final se obtiene con `git diff --stat` y `git status --short`.

## 18. Correcciones E1-01-C01 y E1-01-C02

La verificación independiente detectó dos defectos frontend acotados y ambos fueron corregidos sin modificar backend, persistencia, DTO, reglas, autorización legada, dependencias ni lockfiles:

- **E1-01-C01:** el layout administrativo trataba `accountError` como espera y mantenía el skeleton. Ahora usa `AccountInitializationError`, compartido con el layout protegido, muestra un mensaje accesible sin detalles internos, mantiene oculto el contenido administrativo e invoca `retryAccount` mediante `Reintentar`.
- **E1-01-C02:** el botón móvil no reflejaba `authenticating` y el servicio admitía llamadas concurrentes. Navbar móvil ahora presenta el mismo feedback y bloqueo que desktop; `authService` conserva una única promesa de login en vuelo y libera la guarda tras éxito, cancelación o error.

Se agregaron seis pruebas de arquitectura/comportamiento para cubrir ambos hallazgos, la concurrencia, la liberación de la guarda y la preservación del logout. El gate posterior aprobó 47/47 pruebas unitarias, 32/32 pruebas con emuladores, 7/7 de mantenimiento, build de 18/18 páginas y baseline lint sin regresiones. La validación visual con navegador y proveedor real continúa pendiente como UAT manual.

## 19. Veredicto

`E1-01 IMPLEMENTADO — CORRECCIONES C01/C02 APLICADAS — UAT PENDIENTE`
