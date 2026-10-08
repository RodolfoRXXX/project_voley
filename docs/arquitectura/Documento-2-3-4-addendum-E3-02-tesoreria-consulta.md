# Addendum a Documentos 2, 3 y 4 — E3-02 / Tesorería de consulta

## Estado

- **Contenido funcional y normativo:** `APROBADO POR EL USUARIO`.
- **Estado del artefacto:** `FORMALIZADO LOCALMENTE`.
- **Fecha de preparación:** 2026-10-08.
- **Base:** `dev` en `31a59fb4e648822dcc1722d5306bacb8d95c9e8c`.
- **Ficha fuente:** [E3-02](../implementacion/etapa-3/E3-02-ficha-delegacion-tesoreria-consulta-economica.md).
- **Decisión asociada:** [DEC-E3-02 / D5-047](../implementacion/etapa-3/DEC-E3-02-tesoreria-consulta.md).

Este addendum complementa prospectivamente los Documentos 2, 3 y 4 para E3-02. Prevalece dentro de
este corte sin reescribir retrospectivamente los PDFs. Su aprobación normativa no autoriza
implementación, configuración, pruebas o deploy.

## 1. Complemento funcional para Documento 2

### 1.1 Capacidad delegable

`GROUP_TREASURY` es una capacidad estable, privada y contextual a un Grupo. Permite exclusivamente
consultar conceptos, ocurrencias y obligaciones económicas E3-01 de todo ese Grupo, incluida la
historia de exintegrantes y la presentación mínima ya autorizada.

No es cargo, rol deportivo, ownership, perfil configurable ni habilitación comercial. Su nombre no
autoriza operaciones no enumeradas. Toda capacidad futura de escritura necesita definición,
aprobación y concesión explícitas propias; no puede incorporarse ampliando silenciosamente
`GROUP_TREASURY`.

Quedan excluidos roster, candidatos mensuales, creación o edición de conceptos, ocurrencias u
obligaciones, generación, avisos, ingresos, validación/rechazo, corrección, condonación, reversión,
devolución, Caja, balance, intents, receipts, hashes y demás información técnica.

### 1.2 Relación con CU-034–CU-038

- CU-034 y CU-035 no se implementan: no existe creación o edición de roles/perfiles.
- CU-036 obtiene cobertura focal mediante concesión de la capacidad fija.
- CU-037 obtiene cobertura focal mediante revocación individual.
- CU-038 obtiene cobertura parcial al fijar normativamente el permiso; no existe configuración en
  runtime.

Esta precisión satisface la reapertura D5-043 sólo para la primera capacidad real delegable. No
declara resueltos todos los CU-034–CU-038 ni crea un RBAC general.

### 1.3 Actores y cardinalidad

Sólo el Owner vigente puede conceder y revocar. Un Grupo puede tener cero o varios tesoreros. Cada
concesión y revocación es individual; no existe reemplazo implícito.

El destinatario debe poseer:

1. una Membresía activa e íntegra del mismo Grupo;
2. una activación vigente acreditada por la capacidad pública de Membresía: Período de Vigencia
   abierto real para formas period-aware o ancla legacy compatible derivada de fechas autoritativas;
3. la Temporada exacta abierta;
4. exactamente una Cuenta canónica vinculada a la Persona de esa Membresía.

Ausencia, multiplicidad o incompatibilidad del vínculo Cuenta–Persona bloquea la concesión. Una
Membresía legacy activa compatible no debe materializar Períodos para recibirla: no hay migración,
evolución o reparación de Membresía. El cliente no selecciona Cuenta, Persona, capacidad, estado,
vigencia, Owner ni timestamps.

### 1.4 Concesión, revocación y lifecycle

La concesión fija Cuenta, Persona, Membresía, Grupo, vigencia exacta y contexto de ownership. La
revocación conserva el hecho histórico y bloquea toda consulta nueva. Una nueva concesión crea otro
hecho; nunca reactiva el anterior.

- Finalizar Membresía invalida la concesión.
- Reactivar la misma Membresía abre otra vigencia y no revive la concesión.
- Renovar crea otra Membresía y no hereda la concesión.
- Cambiar Owner invalida todas las concesiones anteriores.
- Volver al Owner original tampoco las revive.
- Archivar Grupo elimina toda eficacia delegada; no existe acceso histórico para ex-tesoreros.

El cierre canónico de Temporada exige cero Membresías activas. Cada Membresía se finaliza antes y
`closeSeason` no ejecuta cascadas. Por ello la finalización ya invalida la concesión. Una Temporada
cerrada con Membresía activa canónica no es un caso funcional prometido; toda combinación
incoherente falla cerrado.

### 1.5 Privacidad y superficies

El Owner puede consultar concesiones vigentes e históricas con presentación mínima de Persona. Un
tesorero sólo acredita su propio acceso y no conoce grants de terceros. Otros integrantes no ven
navegación, estados, contadores ni datos económicos del Grupo.

Cargo descriptivo y acceso de Tesorería se presentan separadamente. Ningún texto de cargo concede,
impide, modifica o revoca la capacidad.

## 2. Complemento de dominio para Documento 3

### 2.1 Fuente de verdad y fronteras

La concesión durable es la fuente de verdad de autorización. No se embebe en Membresía ni Pago:

- Grupo es dueño de estado, Owner y revisión de ownership;
- Cuenta/Persona es dueña del vínculo canónico;
- Membresía es dueña de estado, relación y Períodos de Vigencia;
- Temporada es dueña de su estado;
- Pago es dueño de la información económica;
- autorización es dueña del hecho de concesión/revocación.

La concesión posee identidad, invariantes y unidad de consistencia focal. No se crea un Agregado de
roles ni se transfieren reglas entre Agregados. Las referencias y consultas de acreditación no
permiten modificar o reparar las fuentes consultadas.

### 2.2 Identidad de vigencia

Membresía entrega mediante capacidad pública un `validityAnchor` opaco que identifica la activación
vigente: referencia el Período abierto real en formas period-aware o se deriva de fechas autoritativas
en una forma legacy activa compatible. Conceder no materializa Períodos, no migra y no repara. Una
finalización invalida el ancla; una reactivación acredita otra, incluso sobre la misma
`membershipId`; una renovación produce otra Membresía. Autorización no interpreta ni escribe
Períodos directamente.

### 2.3 Identidad de ownership

El `ownerId` aislado no identifica un contexto irrepetible: A → B → A volvería a igualarlo. Grupo
debe conservar `ownershipRevision`, entero positivo monotónico. La revisión inicial se materializa
idempotentemente por una capacidad pública propiedad de Grupo; una futura transferencia canónica
deberá cambiar Owner e incrementar la revisión en la misma unidad de consistencia de Grupo.

No se crea historial de ownership ni se implementa transferencia. La revisión nunca retrocede ni se
reutiliza. Cada grant fija `ownerIdAtGrant` y `ownershipRevisionAtGrant`; ambos deben coincidir al
consultar. Una forma que exige revisión y no la contiene válidamente falla cerrado.

Todos los writers canónicos existentes de Grupo deben preservar una `ownershipRevision` ya
materializada. Renombre, archivo y cualquier edición ordinaria no pueden borrarla, reiniciarla ni
incrementarla. Sólo una futura transferencia canónica puede incrementarla, atómicamente con el
cambio de `ownerId`. Este addendum no implementa esa evolución ni la transferencia.

### 2.4 Invariantes

1. `GROUP_TREASURY` sólo lee el alcance enumerado.
2. Sólo Owner vigente concede/revoca sobre Grupo activo.
3. La concesión correlaciona una Cuenta–Persona única, Membresía, vigencia, Temporada, Grupo y
   revisión de ownership.
4. Cero o más destinatarios pueden estar autorizados; cada Cuenta posee como máximo un grant
   efectivo de esta capacidad por Grupo.
5. Revocación, lifecycle y ownership no borran historia ni reviven grants.
6. Grupo archivado nunca acredita acceso delegado.
7. Cargo y roles globales no participan en autorización.
8. Pago no registra dinero ni cambia por efecto de E3-02.

## 3. Complemento técnico para Documento 4

### 3.1 Capacidades públicas mínimas

Los módulos exponen contratos estrechos:

- Grupo: asegurar/leer `{ groupId, ownerId, estado, ownershipRevision }`;
- Cuenta/Persona: resolver una única Cuenta para Persona y derivar la Persona de la Cuenta propia;
- Membresía: acreditar `{ membershipId, personId, groupId, seasonId, validityAnchor }` para una
  activación vigente, usando Período real period-aware o ancla legacy de fechas autoritativas;
- Grupo/Temporada: acreditar la Temporada exacta abierta;
- Pagos: ejecutar los readers E3-01 con autorización contextual extendida.

Ningún módulo consumidor importa repositorios internos. La materialización inicial de
`ownershipRevision` es una evolución técnica de Grupo que termina antes de conceder. La concesión
posterior relee todas las fuentes y sólo confirma autorización.

### 3.2 Persistencia y consistencia

La implementación posterior podrá materializar:

- grants durables;
- slots deterministas por Grupo/capacidad/Cuenta;
- receipts privados por comando idempotente.

Grant, slot y receipt del mismo comando se confirman en una única unidad de consistencia. Revocar
marca el grant y libera el slot sólo si todavía apunta a ese grant. Un grant ineficaz por lifecycle
puede ser sustituido por otro `grantId`; el slot cambia de puntero y el documento histórico no se
reactiva.

Grupo, Membresía, Temporada, Cuenta/Persona y Pago no son escritos en esa transacción. La evolución
previa de Grupo para establecer la revisión pertenece al módulo Grupo y no representa una segunda
transición funcional.

### 3.3 Idempotencia y concurrencia

- conceder y revocar poseen claves distintas y receipts por hash;
- la clave cruda no se persiste;
- mismo payload/key recupera el outcome; otro payload conflictúa;
- fallos inciertos se reconcilian contra grant, slot y receipt;
- conceder relee ownership/revisión, Grupo, Cuenta–Persona, Membresía/vigencia y Temporada;
- revocar relee ownership/revisión, Grupo y grant;
- cada consulta y página relee el contexto completo;
- cursores nunca constituyen autorización;
- carreras con finalización, reactivación, renovación, archivo, cierre, revocación o cambio de Owner
  serializan por documentos comunes o fallan cerrado.

### 3.4 Consultas, DTOs y cursores

Se reutilizan `listGroupChargeConcepts`, `listChargeOccurrences` y `listGroupObligations`, sus DTOs,
queries, paginación y presentación mínima E3-01. Se extiende exclusivamente la política backend a
`Owner vigente OR GROUP_TREASURY efectivo`.

No se crean fuentes o DTOs económicos paralelos. `listOwnerMonthlyMembershipCandidates` y todas las
mutaciones permanecen Owner-only. `listMyObligations` conserva su autorización propia.

Los grants Owner se ordenan por `grantedAt DESC, grantId DESC`, página por defecto 20 y máximo 50.
El cursor opaco queda ligado a contrato, actor, Grupo, capacidad y tamaño. La página siguiente
revalida revocación y lifecycle antes de devolver datos.

### 3.5 Índices y acceso

La implementación podrá requerir índices compuestos para:

- grants por `groupId + grantedAt`;
- grants por `accountId + capabilityId + grantedAt`.

Slots, grants por ID y receipts usan lectura documental. No se aprueba aquí configuración ejecutable
ni índices adicionales. Todas las rutas de autorización y economía son deny-all para cliente; sólo
backend accede mediante contratos cerrados.

## 4. Pruebas normativas mínimas

La evidencia futura deberá cubrir:

1. Owner/no Owner, destinatario/tercero/anónimo y cargo sin efecto;
2. vínculo Cuenta–Persona inexistente, múltiple, incompatible y correcto;
3. varias concesiones independientes sin duplicado por destinatario/contexto;
4. revocación antes/después de consulta y entre páginas;
5. finalización, reactivación de misma raíz y renovación;
6. forma period-aware con Período real y forma legacy compatible con ancla de fechas autoritativas,
   comprobando que conceder no materializa Períodos, migra ni repara;
7. cierre sólo tras cero activas e incoherencia cerrada + activa como error cerrado;
8. cambio A → B → A con revisiones distintas y sin revival;
9. preservación exacta de la revisión por renombre, archivo y writers ordinarios;
10. sustitución del slot por nuevo grant conservando historia;
11. archivo sin acceso delegado;
12. conceptos, ocurrencias y obligaciones visibles; roster, candidatos, mutaciones y datos técnicos
    inaccesibles;
13. idempotencia, recovery, cursores, Rules deny-all y ausencia de repositorios cruzados.

## 5. No efectos

Este addendum no:

- aprueba o integra normativa;
- autoriza código, Rules, índices, configuración, pruebas, Emulator o deploy;
- implementa transferencia de ownership o historial general;
- resuelve todos los CU-034–CU-038;
- implementa E3-03, validación de dinero o liquidación prearchivo;
- modifica D5-044 o D5-045;
- integra Auth/UAT ni cierra Etapa 3.

## Resultado

`ADDENDUM E3-02 APROBADO — D5-047 — IMPLEMENTACIÓN REQUIERE AUTORIZACIÓN SEPARADA`
