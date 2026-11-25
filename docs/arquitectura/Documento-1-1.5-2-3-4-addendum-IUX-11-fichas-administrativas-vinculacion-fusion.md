# Addendum IUX-11 a Documentos 1, 1.5, 2, 3 y 4 — Fichas administrativas, vinculación y fusión

## 1. Estado y precedencia

- **Estado:** `ADOPTADO DOCUMENTALMENTE POR D5-083; IUX-11A LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA; IUX-11B/C NO LISTOS`.
- **Fecha:** 24 de noviembre de 2026.
- **Ámbito:** Cuenta, Identidad, Persona, Grupo, Temporada, Membresía, Solicitud, Invitación, capabilities y economía.
- **Ficha:** `IUX-11 — Fichas administrativas, vinculación y fusión`.

Este addendum amplía los documentos sólo en los puntos enumerados. IUX-10 continúa gobernando localización e Invitaciones de ingreso. IUX-11 usa correo verificado para presentar candidaturas privadas de fichas administrativas, no para localizar Personas por un Owner, identificar unívocamente una Persona ni autorizar pertenencia.

## 2. Documento 1 — producto y dominio

### 2.1 Persona administrativa

Persona administrativa es una Persona creada por el Owner vigente desde Integrantes antes de que exista una Cuenta titular. Tiene nombre, apellido, correo de contacto opcional y procedencia auditable. Puede ser sujeto de Membresía, obligaciones y Pagos.

La ausencia de Cuenta no reduce la validez de Persona, Membresía ni economía. La ausencia de correo sólo impide candidatura de vinculación.

La custodia corresponde al Owner vigente del Grupo custodio mientras la Persona no esté vinculada. Transferir ownership transfiere custodia; `createdByAccountId` sólo audita. Archivo conserva custodia y futura vinculación.

### 2.2 Identidad de Cuenta

Identidad de Cuenta es la autoridad que:

- designa una única Persona principal vigente para presentación y edición personal;
- conserva asignaciones a las Personas originales reconocidas;
- autoriza acceso a registros SUBJECT que siguen referenciando esas Personas;
- impide que una Persona quede asignada a dos Cuentas.

Cuenta, Identidad y Persona siguen siendo conceptos separados. Una Cuenta puede controlar varias raíces Persona consolidadas, pero presenta una sola ficha principal vigente.

### 2.3 Candidatura de vinculación

Una ficha administrativa con correo vigente origina una candidatura privada para cualquier Cuenta autenticada que acredite un correo verificado coincidente. La candidatura:

- aparece dentro de Ficha personal, incluso si la Cuenta nació después;
- exige reconocer o rechazar explícitamente;
- se retira al corregir/quitar el correo;
- se revalida al aceptar;
- no depende del estado de Grupo, Temporada o Membresía;
- no requiere ni se autoriza mediante enlace de correo.

Varias Personas pueden compartir correo. No existe unicidad de Persona por correo.

### 2.4 Fusión de fichas

Fusión es una coordinación de identidad, no una reescritura de Agregados. Conserva las Personas originales y designa una principal. Las raíces históricas dejan de ser fichas vigentes editables, pero continúan identificando Membresías y economía.

Si existen dos Membresías activas del mismo Grupo y Temporada, el titular elige cuál continúa. La otra se finaliza canónicamente con motivo **Fusión de fichas**. Principal y Membresía ganadora se eligen por separado.

## 3. Documento 1.5 — modelo conceptual

```text
Cuenta --posee--> IdentidadCuenta --principal--> Persona
IdentidadCuenta --asigna/traza--> Persona original 1..N
Persona administrativa --correo vigente--> Candidatura privada
Cuenta --correo verificado + decisión--> Reconocimiento
Reconocimiento --crea--> Asignación Persona–Identidad
Fusión --elige--> Persona principal
Fusión --resuelve conflicto--> Membresía activa ganadora
Membresía/Pago/Auditoría --conservan--> personId original
```

### 3.1 Invariantes

1. Una Identidad tiene exactamente una principal cuando está `READY`.
2. Una Persona se asigna como máximo a una Cuenta.
3. `users.personaId` puede proyectar la principal, pero no acredita el conjunto completo.
4. Correo coincidente habilita candidatura; sólo una decisión confirmada crea asignación.
5. Corregir correo incrementa revisión y vuelve inválida toda decisión en vuelo anterior.
6. Fusión no cambia referencias de Membresía, Pago, Período o auditoría.
7. Una Membresía finalizada por fusión conserva deuda y aplicaciones económicas.
8. Una capability no se mueve de Membresía; permanece o caduca según su anchor original.
9. Estado `MERGING` impide writers incompatibles y es recuperable.
10. Principal y Membresía activa ganadora son elecciones independientes.

## 4. Documento 2 — funcionalidad

### 4.1 Casos de uso

- crear ficha administrativa e incorporarla a Temporada abierta;
- consultar/corregir ficha no vinculada;
- listar candidaturas propias por correo verificado;
- rechazar o reconocer una candidatura;
- adoptar ficha cuando no existe Persona propia;
- preparar y confirmar fusión cuando existe Persona;
- elegir principal;
- elegir Membresía ganadora por conflicto Grupo/Temporada;
- consultar y recuperar resultado;
- acceder a economía histórica de Personas asignadas.

### 4.2 Autorización

- Alta exige Cuenta canónica, Owner vigente, Grupo activo y Temporada abierta. Corrección exige Owner vigente del Grupo custodio, Persona no vinculada y revisión exacta, pero admite Grupo activo o archivado y no requiere Temporada/Membresía activa. No se autoriza por `createdBy` histórico.
- Listar/decidir candidaturas exige Cuenta autenticada y correo verificado derivado en servidor.
- Editar ficha personal exige ser Cuenta de la Identidad y que la Persona sea principal.
- Leer/operar historia y economía exige que el sujeto original esté asignado a la Identidad.
- Elegir principal no concede ownership, pertenencia ni capabilities.
- La coordinación de fusión autoriza sólo las finalizaciones exactas aceptadas en el manifest.
- Las prohibiciones sobre operar la economía propia consideran todas las Personas asignadas a la Identidad, no sólo la principal.

### 4.3 Experiencia

- IUX-11A agrega **Crear ficha** como alternativa a búsqueda/invitación, sin reemplazar IUX-10.
- B/C viven en `/profile/person`.
- Preview muestra procedencia, consecuencias y economía preservada antes de confirmar.
- Al concluir se muestra una sola ficha vigente; historia/economía siguen navegables por sus raíces.
- Aviso externo es opcional y su fallo no cambia la experiencia autoritativa interna.

## 5. Documento 3 — arquitectura funcional

### 5.1 Responsabilidades

- Persona mantiene datos nominales y procedencia.
- Custodia mantiene autoridad administrativa de la ficha no vinculada.
- Identidad mantiene principal y assignments.
- Candidaturas proyectan coincidencia privada por correo vigente.
- Membresía conserva único writer de activación/finalización y sus efectos.
- Economía conserva sus raíces sin operaciones implícitas de consolidación.
- Proyectores actualizan padrón nominal y búsquedas sin cambiar correlaciones originales.

E2-24 continúa impidiendo eliminar un Grupo con cualquier Membresía y prohíbe eliminar archivados. Custodia se agrega como referencia defensiva. Por ello una ficha IUX-11A no admite eliminación válida de su Grupo custodio. Si la raíz falta de forma incompatible, queda `ORPHANED_CUSTODY`: ninguna autoridad histórica puede corregir; ficha e historia se conservan y sólo reparación operacional correlacionada o vínculo futuro recuperan edición.

### 5.2 Identidad compatible

Se introducen `accountIdentities` y `personIdentityAssignments`. Lectores nuevos migran por compatibilidad:

1. assignment/identity válido es autoridad;
2. durante transición, un `users.personaId` legacy sin assignment puede adoptarse de manera idempotente y auditable;
3. divergencia entre proyección y autoridad falla cerrada;
4. después del rollout, `users.personaId` queda como proyección de principal.

### 5.3 Candidatura

La proyección usa HMAC de correo normalizado y admite varias filas por lookup. Crear/corregir/quitar correo mantiene revisión e índice. No consulta el directorio opt-in IUX-10 ni Firebase Auth para decidir si materializar una ficha. La Cuenta consulta con correos verificados derivados al momento de leer.

### 5.4 Fusión recuperable

Fusión usa manifest sellado, coordinación, receipts por Membresía y resultado consultable. Cambia la Identidad a `MERGING`, finaliza duplicados elegidos con origen `PROFILE_MERGE`, confirma assignments/principal, emite outbox y vuelve a `READY`.

No existe rollback de hechos de Membresía ya confirmados. Un fallo parcial mantiene coordinación y recovery obligatorio; no abre otro plan sobre las mismas Personas.

## 6. Documento 4 — diseño técnico

### 6.1 Familias de contratos

- alta/consulta/corrección administrativa y resultado;
- listado/decisión de candidaturas propias;
- identidad principal y conjunto autorizado;
- preparación/confirmación/resultado de fusión;
- finalización interna por fusión;
- reproyección/reconciliación de presentación nominal.

Payloads son cerrados. Cuenta, correos verificados, Persona, Grupo, Temporada, revisions y estados se derivan/releen. Firestore cliente conserva deny-all.

### 6.2 Evolución de Persona

El esquema versionado admite `emailContacto` ausente en una Persona administrativa. Lectores distinguen versiones válidas de corrupción histórica. `ensureMyPerson` puede seguir exigiendo correo en su caso de uso mientras el dominio general admite ausencia; no debe fabricar correo ni reutilizar el correo de acceso sin confirmación.

### 6.3 Writer único de Membresía

- Activación administrativa agrega origen `ADMINISTRATIVE_PROFILE_CREATION`.
- Finalización por fusión agrega origen `PROFILE_MERGE`, motivo auditable, `mergeId` y receipt.
- Ambos reutilizan dominio, Períodos, active/lifecycle guards, contribuciones, contador, búsqueda y outbox.
- Ningún coordinador escribe directamente estado/contador/proyección para simular esos efectos.

El alta A usa intent determinista y un commit que crea Persona, custodia, Membresía, Período, guards, contribución, contador, búsqueda y receipt. Respuesta perdida relee receipt; estado parcial falla cerrado. La corrección usa expected revision, ownership/custodia revalidados y receipt en un único commit nominal/proyección.

### 6.4 Autorización multi-Persona

Los contratos SUBJECT resuelven el sujeto original y verifican assignment. `getPrincipalPerson` se usa sólo cuando el concepto funcional es la ficha vigente. Capabilities revalidan Cuenta, assignment, `grant.personId`, Membresía, validity anchor, slot, ownership revision, Grupo y Temporada. Un anchor finalizado caduca. Todas las Personas asignadas cuentan como identidad propia para impedir auto-revisión, auto-validación o registro como tercero mediante otra ficha.

### 6.5 Concurrencia

Debe probarse:

- alta propia vs adopción;
- corrección vs listado/aceptación;
- dos Cuentas vs misma ficha;
- dos fusiones solapadas;
- fusión vs admisión, finalización, cierre y capabilities;
- retry antes/después de cada commit y respuesta perdida;
- reproyección duplicada/fuera de orden;
- cambio de Cuenta durante preview/confirmación.

## 7. Correo y notificación

El correo externo no es parte del protocolo de vinculación. Un corte futuro puede registrar outbox después de crear/corregir candidatura. Entrega, retry o fallo no crean, extienden ni restauran candidatura; tampoco revelan al Owner si existe Cuenta destinataria.

El adaptador Gmail vigente no constituye garantía operacional. Antes de IUX-11D se requieren proveedor/configuración, secretos, idempotencia, rate limit, rebotes, observabilidad sin PII y política de retención.

## 8. Cortes normativos

| Corte | Estado normativo |
| --- | --- |
| IUX-11A | `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA` |
| IUX-11B | `DEFINIDO PARCIALMENTE; NO LISTO` |
| IUX-11C | `DEFINIDO PARCIALMENTE; NO LISTO` |
| IUX-11D | `DIFERIDO` |

Autorizar A no autoriza B/C/D, schema de identidad, migración de vínculos, correo ni fusión.

## 9. Decisiones adoptadas, propuestas y pendientes

### 9.1 Adoptadas para IUX-11A

- custodia por Owner vigente, transferible con ownership y conservada al archivar;
- creación con Grupo activo/Temporada abierta; corrección de no vinculada en activo o archivado;
- delete bloqueado por Membresía/custodia; ausencia anómala `ORPHANED_CUSTODY` sin autoridad residual;
- recuperación atómica/idempotente de creación y corrección;
- economía sin ampliación de permisos o estados vigentes.

### 9.2 Propuestas B/C no adoptadas

- B-R1 rechazo por Cuenta + Persona + revisión hasta cambio de correo, frente a B-R2 rechazo reversible manual/permanente;
- C-N1 nombre principal en vistas actuales y original en historia, frente a C-N2 nombre original por registro;
- C-F1 fusiones sucesivas 1..N, frente a C-F2 límite inicial de dos Personas;
- C-A1 resolver admisiones redundantes en preview con elección explícita, frente a C-A2 bloquear hasta resolución original;
- C-C1 conservar capabilities que revaliden íntegramente, frente a C-C2 caducarlas todas.

### 9.3 Pendientes

- adoptar una alternativa de cada par anterior;
- aviso al Owner por `PROFILE_MERGE`;
- retención y eliminación de evidencia.

B/C continúan no implementables hasta cerrar estos contratos.

## 10. Criterios de salida

1. correo opcional sin unicidad ni inferencia de Cuenta;
2. Persona/Membresía/economía administrativas correlacionadas y recuperables;
3. candidatura interna visible a Cuenta creada posteriormente;
4. corrección retira candidatura anterior y aceptación relee revisión;
5. archivo/cierre/finalización no bloquean reconocimiento;
6. una principal visible con raíces originales trazables;
7. duplicate active resuelto sólo por elección y finalización canónica;
8. obligaciones/Pagos intactos y accesibles;
9. contador, búsqueda, Solicitudes, Invitaciones y capabilities compatibles;
10. carreras y fallos parciales acreditados sin segunda autoridad.
11. custodia contextual, archivo, bloqueo de delete y `ORPHANED_CUSTODY` acreditados antes de autorizar A.

No se autoriza implementación, índices, Rules, datos, backfill, migración, commit, push, despliegue ni producción.
