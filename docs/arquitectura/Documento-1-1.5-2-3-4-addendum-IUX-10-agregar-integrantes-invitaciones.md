# Addendum IUX-10 a Documentos 1, 1.5, 2, 3 y 4 — Agregar integrantes e Invitaciones

## 1. Estado y precedencia

- **Estado:** `ADOPTADO POR D5-080 — REQUIERE AUTORIZACIÓN SEPARADA PARA IMPLEMENTAR`.
- **Fecha:** 17 de noviembre de 2026.
- **Ámbito:** Cuenta, Persona, Grupo, Solicitud, Invitación, Membresía y Temporada.
- **Ficha vinculada:** `IUX-10 — Agregar integrantes: búsqueda e invitaciones`.

Este addendum amplía los Documentos 1, 1.5, 2, 3 y 4 sólo en los puntos enumerados. Conserva sus límites de Agregado, autorización contextual, privacidad, idempotencia y separación Cuenta–Persona. No autoriza código, índices, Rules, datos, migraciones, commit, push ni despliegue.

## 2. Motivación

Los documentos vigentes contemplan Solicitud applicant-driven y alta de Membresía por decisión Owner, pero no una propuesta iniciada por el Owner que requiera consentimiento del destinatario. Tampoco definen localización voluntaria de Persona, exposición condicionada del correo de contacto ni exclusión entre Solicitud e Invitación pendientes.

IUX-10 incorpora esos contratos sin convertir correo en identidad, Invitación en pertenencia ni Grupo en contenedor de Personas/Membresías.

## 3. Ampliación de Documento 1 — producto y dominio

### 3.1 Invitación de ingreso

**Invitación de ingreso a Grupo** es la propuesta que el Owner vigente envía a una Persona localizable para una Temporada abierta determinada. Es un Aggregate Root separado de Grupo, Persona, Solicitud, Membresía y Temporada.

Responsabilidades:

- conservar Persona destinataria, Grupo y Temporada original;
- registrar `invitedBy` como auditoría;
- recibir aceptación o declinación de la Cuenta vinculada a la Persona;
- admitir cancelación por el Owner vigente antes de aceptación adquirida;
- coordinar de forma recuperable la única Membresía resultante;
- terminalizar sin eliminar historia.

No administra identidad, pertenencia, ownership ni ciclo de Temporada.

### 3.2 Localización voluntaria

Persona puede consentir ser encontrada por Owners de Grupos activos con Temporada abierta. El consentimiento está desactivado por defecto, es revocable y expone conjuntamente nombre, apellido y correo de contacto. No expone correo de acceso ni autoriza por correo.

### 3.3 Reglas de producto

- Persona destinataria y Temporada original son inmutables.
- Invitación nunca cambia de Temporada.
- Invitación sobrevive transferencia de ownership; la gestiona el Owner vigente.
- Aceptar exige Cuenta–Persona destinataria válida y Temporada original abierta.
- Invitación pendiente y Solicitud pendiente se excluyen para Persona–Grupo.
- Una aceptación confirmada produce una sola Membresía canónica.
- Correo exacto y notificaciones externas quedan fuera del primer corte.
- Owner no necesita Persona propia para buscar/invitar/cancelar.

## 4. Ampliación de Documento 1.5 — modelo conceptual

```text
Cuenta --vínculo válido--> Persona
Persona --consentimiento--> Directorio privado derivado
Owner vigente --crea/cancela--> InvitaciónIngresoGrupo
InvitaciónIngresoGrupo --destinataria--> Persona
InvitaciónIngresoGrupo --contexto inmutable--> Grupo + Temporada original
Solicitud | Invitación --reserva--> IngresoPendiente(Persona, Grupo)
Invitación aceptada --coordina--> Membresía
```

El directorio es proyección privada; el consentimiento es autoridad de visibilidad. El guard de ingreso es control de unicidad, no Aggregate Root ni fuente de decisión. Membresía sigue siendo la única fuente de pertenencia.

### 4.1 Estados e invariantes

Invitación admite `pendiente`, `aceptada`, `declinada`, `cancelada` y `expirada`. Los cuatro últimos son terminales. `ACCEPTANCE_IN_PROGRESS` es coordinación técnica, no estado de dominio.

1. Persona, Grupo y Temporada original no cambian.
2. `aceptada` exige Membresía correlacionada confirmada.
3. Terminal no conserva guard pendiente.
4. Pendiente conserva exactamente un guard correlacionado.
5. Cancelación no gana después de adquirida aceptación.
6. Expiración no crea/modifica Membresía.
7. Transferencia sólo cambia autorización Owner contextual.

## 5. Ampliación de Documento 2 — funcionalidad

### 5.1 Casos incorporados

- configurar localización propia;
- buscar Personas localizables por prefijo como Owner;
- crear/listar/consultar/cancelar Invitación como Owner vigente;
- listar/consultar/aceptar/declinar Invitación propia;
- consultar resultado de aceptación;
- expirar/liberar Invitación cuando cerró su Temporada.

### 5.2 Autorización

Buscar/invitar exige Cuenta canónica, ownership vigente, Grupo activo y Temporada abierta; no Persona Owner. Cancelar/listar Owner exige ownership vigente; cancelar no exige Temporada abierta.

Responder exige Cuenta–Persona válida y Persona igual a destinataria. Conocer correo, Grupo, Invitación o referencia opaca no autoriza. Roles globales, Membresía, arrays legacy e `invitedBy` no autorizan gestión Owner.

### 5.3 Cierre

Invitación pendiente no bloquea cierre. Aceptación con coordinación adquirida sí. Si cierre gana, Invitación queda efectivamente expirada, su guard se libera idempotentemente y un ingreso posterior compite normalmente.

## 6. Ampliación de Documento 3 — arquitectura funcional

### 6.1 Responsabilidades modulares

- Identidad/Persona posee consentimiento y capacidad mínima de presentación.
- Directorio privado materializa sólo opt-ins válidos.
- Organización posee Invitación y coordinación de admisión.
- Solicitud e Invitación comparten autoridad física de exclusión Persona–Grupo.
- Membresías conserva el único escritor de alta/reactivación/renovación.
- Temporada conserva open-season guard y cierre; no hace fan-out.

### 6.2 Coordinación y recuperación

Invitación decide consentimiento; Membresía materializa pertenencia. La aceptación usa commits recuperables y no declara `aceptada` antes de confirmar Membresía.

La expiración/liberación y el ingreso sucesor ocurren en dos transacciones: primero terminalizar/liberar; luego competir por guard. Un fallo intermedio deja estado seguro y reintentable.

### 6.3 Guard compatible

La colección física `pendingGroupJoinRequestGuards` y su ID hash Persona–Grupo se conservan:

- schema v1 representa Solicitud existente;
- schema v2 representa Invitación con `kind=GROUP_INVITATION` y `resourceId`.

Son variantes de una autoridad conceptual y nunca coexisten. Rollout vuelve primero a Solicitudes tolerante a v1/v2 y después habilita Invitaciones. Código viejo encuentra el mismo documento y falla cerrado; no existe ventana con dos colecciones.

### 6.4 Directorio

Consentimiento y fila se crean/retiran atómicamente. Ausencia = false. Cada opt-in obtiene referencia aleatoria opaca de 128 bits; retirar borra fila y reactivar genera otra. Backend revalida ownership, Temporada, fila, consentimiento, Persona y guards al invitar. No se exige firma del identificador; el cursor sí protege integridad/contexto.

Persona sin correo de contacto no es elegible ni se publica. Reconciliación no fabrica consentimiento.

## 7. Ampliación de Documento 4 — diseño técnico

### 7.1 Familias de contratos

- `get/setMyPersonDiscoverability`;
- `searchDiscoverablePeopleForOwnedGroup`;
- `create/list/get/cancelGroupInvitation` Owner;
- `list/get/accept/declineMyGroupInvitation` destinatario;
- `getMyGroupInvitationDecisionResult`;
- capacidad interna generalizada de activación por admisión.

Payloads son cerrados. Persona, Owner, Temporada, estado y timestamps se derivan/releen. Firestore cliente conserva deny-all.

### 7.2 Writer único de Membresía

La capacidad canónica recibe origen `JOIN_REQUEST_APPROVAL` o `GROUP_INVITATION_ACCEPTANCE` y conserva las mismas ramas de alta, reactivación y renovación. En el commit canónico mantiene active/lifecycle guards, Períodos, contador, contribución de padrón, índice de búsqueda y outbox. Invitación no replica efectos.

### 7.3 Cancelación y concurrencia

Cancelar y aceptar compiten por coordinación. Si cancelar terminaliza primero, aceptar recibe terminal. Si aceptar adquiere coordinación, cancelar devuelve `ACCEPTANCE_IN_PROGRESS`. Membresía confirmada nunca se revierte por cancelación tardía.

Cliente descarta respuestas cuya generación no coincida con Cuenta, Grupo, Temporada, recurso y acción actuales.

### 7.4 Límites

- búsqueda: 3–40 caracteres, página máxima 10, cursor TTL 10 minutos;
- 30 búsquedas/minuto por Cuenta, 60/minuto por Grupo, burst 10;
- 20 invitaciones/hora por Cuenta–Grupo y 100/día por Grupo;
- techo conservador 95 lecturas lógicas por página máxima; retries aparte;
- invitaciones propias/Owner: default 5, máximo 20.

Rendimiento/facturación se mide antes de habilitar. Rate limit no es vacío.

## 8. Privacidad, seguridad y observabilidad

- opt-in explícito/revocable; no backfill `true`;
- correo de contacto no identifica ni autoriza;
- referencias opacas no contienen PII y no son permisos;
- PII no se registra en logs, analytics, URL o cursores decodificables;
- observabilidad sólo operación, etapa, outcome/reason, duración y retry;
- corrupción falla cerrada y no se oculta mediante prioridad visual.

## 9. Exclusiones

- alta de Persona sin vínculo, corrección de correo, reclamo o fusión;
- invitación por correo exacto y notificaciones externas;
- segundo writer de Membresía, traslado de Temporada o aceptación automática;
- acceso cliente, migración masiva, datos reales, publicación y despliegue.

## 10. Criterios normativos de salida

La implementación deberá demostrar:

1. exclusión v1/v2 sin ventana ni doble guard;
2. liberación segura de expiradas e ingreso posterior;
3. único writer de Membresía con contador/padrón/reactivación/renovación;
4. opt-in y retiro inmediato; Persona sin correo nunca publicada;
5. transferencia y cancelación por Owner vigente;
6. carreras aceptar/cancelar/cerrar y recuperación;
7. límites, presupuesto y ausencia de PII;
8. Owner sin Persona puede buscar/invitar y destinatario requiere Persona válida.
