# E0-07B — Contención remota prioritaria

**Proyecto:** SPORTEXA

**Fecha:** 17 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `ad0957b1dccce7b0f82011d6ff4d0e0f3b3a481e`

**Proyecto remoto:** `project-groupvolley` (`211711925841`)

**Alcance remoto autorizado:** retirar exclusivamente `updateUserRole` en `us-central1` y desplegar exclusivamente las reglas Firestore versionadas.

**Veredicto:** **COMPLETADO CON OBSERVACIÓN — contención remota aplicada y verificada**

## 1. Preflight

| Control | Evidencia | Resultado |
| --- | --- | --- |
| E0-07A versionado | HEAD `ad0957b` (`docs(etapa-0): consolidar decisiones y contencion remota E0-07A`) | Cumplido |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| Estado inicial | Git limpio | Cumplido |
| Secreto local | `.secret.local` ignorado y no versionado | Cumplido |
| Emuladores previos | Puertos libres | Cumplido |
| Sesión Firebase | Una sesión autorizada existente; no se solicitó login | Cumplido |
| Proyecto | Un único match para `project-groupvolley`, número `211711925841`, estado activo | Cumplido |
| Function objetivo | Un único `updateUserRole`, callable, activa, `us-central1` | Cumplido |
| Otras diferencias Functions | Ninguna Function remota adicional | Cumplido |
| Hash local de reglas | `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` | Coincide con autorización |
| Ventana | El propietario confirmó ventana completa de mantenimiento | Cumplido |

Las precondiciones se revalidaron inmediatamente antes de la primera escritura. No hubo cambios de rama, commit, Git, proyecto, número, región, estado del target ni hash.

## 2. Gate previo

Se ejecutó desde la raíz:

```bash
npm run quality:stage0
```

| Verificación | Resultado |
| --- | --- |
| Baseline lint | Aprueba: 41 errores y 13 warnings conocidos; 0 nuevos |
| Typecheck | Aprueba |
| Sintaxis Functions | Aprueba 92/92 |
| Guardas de aislamiento | Aprueban 9/9 |
| Suite de emuladores | Aprueba 26/26 |
| Build | Aprueba; 18 páginas |
| Diff | Aprueba |
| Project ID de pruebas | `demo-sportexa-e0-02` |
| Emuladores posteriores | Cerrados; sin procesos huérfanos |

El gate no accedió al proyecto remoto. Firebase CLI confirmó que los servicios de la suite usaron configuración demo y hosts locales.

## 3. Estado remoto previo

### 3.1 Functions

- Functions remotas: 55;
- Functions exportadas localmente: 54;
- única Function remota ausente de la rama: `updateUserRole`;
- estado: activa;
- tipo: callable;
- región: `us-central1`.

### 3.2 Reglas

| Control | Reglas remotas previas | Reglas locales autorizadas |
| --- | --- | --- |
| SHA-256 normalizado | `2f46201d8b5fb00bba75a88c4c6e073830d9704db611760a4780fbc5dd9049c1` | `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` |
| Coincidencia | No | — |
| Lecturas `if true` | Presentes | Ausentes |
| Guarda al crear Usuario | Ausente | Presente |
| Acceso contextual de Grupo | Ausente | Presente |

El archivo local era idéntico al ruleset versionado por E0-04 en `3df3fab` y acababa de aprobar la suite que incluye E0-03/E0-04.

## 4. Autorización inmediata

Después de presentar comandos, impacto, verificación y recuperación segura, el propietario confirmó expresamente:

- ventana completa de mantenimiento abierta;
- eliminación exclusiva de `updateUserRole` en `us-central1`;
- despliegue exclusivo del ruleset con hash local autorizado;
- verificaciones posteriores de sólo lectura;
- creación de este informe.

La autorización excluyó datos Firestore, Authentication, Storage, suscripciones, secretos, otras Functions, Hosting e índices.

## 5. Eliminación de la Function insegura

Comando ejecutado desde `volley-ranking-system/`:

```bash
firebase functions:delete updateUserRole \
  --region us-central1 \
  --project project-groupvolley \
  --force
```

Resultado:

- exit 0;
- una única operación de eliminación;
- target exacto `updateUserRole` en `us-central1`;
- operación remota finalizada correctamente.

La verificación posterior por listado produjo:

- Functions remotas: 54;
- `updateUserRole`: ausente;
- Functions remotas ausentes de la rama: 0;
- Functions locales ausentes remotamente: 0.

No se invocó el callable antes ni después de retirarlo.

## 6. Despliegue exclusivo de reglas

Antes del despliegue se volvió a confirmar:

- `updateUserRole` ausente;
- Git limpio;
- hash local todavía igual a `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9`.

Comando ejecutado desde `volley-ranking-system/`:

```bash
firebase deploy \
  --only firestore:rules \
  --project project-groupvolley \
  --config firebase.json \
  --non-interactive
```

Resultado:

- exit 0;
- reglas compiladas correctamente;
- ruleset cargado y liberado a `cloud.firestore`;
- timestamp de actualización del release: `2026-08-17T22:10:24.251314Z`;
- no se desplegaron Functions, Hosting o datos;
- la CLI leyó `firestore.indexes.json` como parte de la configuración, pero no desplegó índices porque el target fue exclusivamente `firestore:rules`;
- la API Firestore ya estaba habilitada; no se habilitó una API nueva.

## 7. Verificación del estado remoto final

### 7.1 Hash y semántica

| Control | Resultado remoto final |
| --- | --- |
| SHA-256 normalizado | `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` |
| Coincidencia exacta con local | Sí |
| `allow read: if true` | Ausente |
| Guarda de privilegios al crear Usuario | Presente |
| Acceso contextual de Grupo | Presente |
| `updateUserRole` | Ausente |

El contenido remoto se recuperó mediante GET y se comparó en memoria; no se guardó una copia adicional.

### 7.2 Pruebas cliente anónimas de sólo lectura

Se utilizó el SDK Web con la configuración pública local, sin autenticación, sin emuladores y sin operaciones de escritura. Se solicitó como máximo un documento de cada colección.

| Colección | Resultado esperado | Resultado |
| --- | --- | --- |
| `users` | `permission-denied` | Rechazada |
| `groups` | `permission-denied` | Rechazada |
| `matches` | `permission-denied` | Rechazada |
| `tournaments` | `permission-denied` | Rechazada |

No se imprimieron ni conservaron documentos, IDs o valores.

### 7.3 Evidencia positiva segura

No se reutilizaron tokens de testers ni se solicitó una credencial individual. Tampoco se inició una sesión sintética remota porque habría creado o modificado metadata de Authentication fuera del alcance autorizado.

La evidencia positiva se establece mediante una cadena reproducible:

1. la suite de emuladores aprobó el acceso propio y contextual permitido por E0-03/E0-04;
2. el ruleset remoto coincide byte a byte con el ruleset probado;
3. los GET autenticados de metadata de Rules y Functions aprobaron después de la intervención;
4. los casos anónimos remotos fueron rechazados por el ruleset desplegado.

No se presenta esta cadena como un inicio de sesión real de tester. Una prueba manual de lectura propia puede realizarse al rehabilitar la plataforma, sin ser necesaria para reabrir el riesgo contenido.

## 8. Caminos de autopromoción

La evidencia conjunta permite afirmar:

- no existe `updateUserRole` en la superficie remota;
- no existe otra Function remota adicional respecto de la rama;
- el onboarding local no acepta roles privilegiados y su suite sigue aprobando;
- la creación cliente de `users/{uid}` no puede incorporar los campos globales protegidos;
- la actualización propia no puede modificar campos globales protegidos;
- las lecturas y autorizaciones deportivas usan la política contextual versionada;
- ocultar UI no es parte de la contención.

No se creó un endpoint equivalente ni se modificó código durante E0-07B.

## 9. Recuperación segura

No fue necesario ejecutar recuperación.

El plan vigente fue:

- nunca restaurar `updateUserRole`;
- nunca restaurar las reglas permisivas observadas en E0-07;
- mantener la ventana y el estado cerrado ante incompatibilidad;
- redeplegar únicamente el ruleset seguro del commit E0-04 y hash autorizado si la liberación no coincidía;
- no desplegar código de Functions durante esta intervención.

El release de reglas es atómico. La verificación de hash aprobó, por lo que no se activó ningún procedimiento adicional.

## 10. Incidente de salida diagnóstica local

El primer comando de eliminación heredó una variable local `DEBUG` y Firebase CLI emitió salida diagnóstica excesiva, incluyendo el identificador de la cuenta de sesión y metadata técnica de Functions. No imprimió valores de tokens ni secretos.

Mitigación aplicada:

- esa identidad y las URLs diagnósticas no se copiaron a este informe;
- las ejecuciones posteriores retiraron `DEBUG` y `FIREBASE_DEBUG_MODE` del entorno;
- no quedó `firebase-debug.log` en el repositorio;
- no se modificó la sesión ni se copiaron credenciales.

Esta observación no afectó el alcance remoto, pero debe mantenerse como aprendizaje operativo para futuras intervenciones Firebase.

## 11. Recursos no afectados

- documentos, colecciones y subcolecciones Firestore;
- seis cuentas Authentication;
- 111 objetos y dos buckets Storage;
- dos suscripciones push;
- cinco secretos conocidos y sus versiones;
- 54 Functions restantes;
- Hosting;
- índices Firestore;
- IAM;
- frontend y código productivo;
- datos de otros proyectos.

No se ejecutaron export, migración, seed, backfill, rotación o invocación funcional.

## 12. Archivos modificados

- `docs/implementacion/etapa-0/E0-07B-contencion-remota-prioritaria.md` — este informe.

No se modificaron reglas locales, Functions, frontend, configuración, dependencias, lockfiles, pruebas o secretos. No se hizo commit ni push.

## 13. Criterios de cierre

| Criterio | Estado |
| --- | --- |
| Proyecto y región inequívocos | Cumplido |
| Autorización inmediata registrada | Cumplido |
| `updateUserRole` retirada | Cumplido |
| Ninguna Function remota adicional | Cumplido |
| Reglas seguras desplegadas | Cumplido |
| Hash remoto igual al local | Cumplido |
| Lecturas anónimas privadas cerradas | Cumplido |
| Evidencia positiva sin escritura | Cumplido por suite + identidad exacta del ruleset; prueba manual diferida |
| Sin eliminación de datos u otros servicios | Cumplido |
| Recuperación insegura no utilizada | Cumplido |

## 14. Veredicto y siguiente incremento

**COMPLETADO CON OBSERVACIÓN — contención remota aplicada y verificada.**

Los dos riesgos remotos que motivaron E0-07B quedaron contenidos: la Function insegura fue retirada y las reglas permisivas fueron sustituidas por el ruleset seguro probado. La observación corresponde a la salida diagnóstica local y a que no se manejaron credenciales de testers para una lectura propia remota directa.

El siguiente incremento recomendado, sin ejecutarlo, es **E0-08 — Preparación destructiva**. Debe conservar la separación por servicio definida en E0-07A, respetar la decisión de no exportar Firestore/Auth y limitarse a preparar inventarios, comandos y puntos de autorización; no debe ejecutar eliminaciones.
