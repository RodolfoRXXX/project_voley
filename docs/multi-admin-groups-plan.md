# Soporte de múltiples admins por grupo

## Estado actual del proyecto

Hoy el proyecto maneja **un único admin por grupo** usando `group.adminId`:

- Frontend al crear grupo guarda `adminId = firebaseUser.uid`.
- Pantalla de detalle de grupo valida `data.adminId === firebaseUser.uid`.
- Cloud Functions valida permisos de grupo comparando `group.adminId` con el uid autenticado.

## Objetivo

Permitir varios admins por grupo con orden y ownership:

```json
admins: [
  { "userId": "uid1", "role": "owner", "order": 0 },
  { "userId": "uid2", "role": "admin", "order": 1 },
  { "userId": "uid3", "role": "admin", "order": 2 }
]
```

Reglas de negocio:

- `order: 0` es el owner.
- Solo owner (`order: 0`) puede:
  - agregar admins,
  - reordenar admins,
  - transferir ownership.
- Si se elimina owner, el `order: 1` pasa a `order: 0` y se reindexa.

## Cambios recomendados en base de datos (Firestore)

### 1) Estructura de `groups`

Agregar campos en cada documento de `groups`:

- `admins: GroupAdmin[]`
- `ownerId: string` (derivado de `admins[0].userId`, útil para queries y reglas)
- `adminIds: string[]` (derivado, útil para filtros simples)

Tipo sugerido:

```ts
type GroupAdmin = {
  userId: string;
  role: "owner" | "admin";
  order: number;
  addedAt?: Timestamp;
  addedBy?: string;
};
```

> Recomendación: mantener `adminId` temporalmente durante migración para backward compatibility.

### 2) Índices

Si van a listar “mis grupos administrados” desde cliente, usar:

- Query `where("adminIds", "array-contains", uid)`.

En ese caso, agregar/validar índice compuesto si luego combinan con `orderBy` (depende de cada query).

### 3) Migración de datos

Script de migración para grupos existentes:

- Leer cada grupo con `adminId`.
- Setear:
  - `admins = [{ userId: adminId, role: "owner", order: 0 }]`
  - `ownerId = adminId`
  - `adminIds = [adminId]`
- No borrar `adminId` en la primera etapa.

## Cambios recomendados en backend (Cloud Functions)

### 1) `assertGroupAdmin`

Reemplazar validación actual (`group.adminId === uid`) por:

- `isAdmin = group.admins.some(a => a.userId === uid)`
- denegar si no pertenece a `admins`.

### 2) Helpers de autorización

Agregar helpers:

- `assertGroupOwner(groupId, uid)` → valida `ownerId === uid` o `admins[0].userId === uid`.
- `getGroupAdminEntry(group, uid)` → devuelve rol/order para permisos finos.

### 3) Nuevas callables para gestión de admins

- `addGroupAdmin({ groupId, userId })` (solo owner)
- `removeGroupAdmin({ groupId, userId })` (solo owner; no permitir dejar grupo sin admins)
- `reorderGroupAdmins({ groupId, orderedUserIds })` (solo owner)
- `transferGroupOwnership({ groupId, newOwnerUserId })` (solo owner)

Todas deben:

- usar transacción,
- recalcular `order` secuencial,
- recalcular `ownerId` y `adminIds`,
- guardar auditoría mínima (`updatedAt`, `updatedBy`).

### 4) Compatibilidad en matches

Actualmente `match.adminId` existe y se usa para permisos en algunos flujos. Mantenerlo como “admin creador del match”, pero permisos de gestión deberían aceptar también cualquier admin del grupo (según regla de negocio deseada).

## Cambios recomendados en frontend

### 1) Alta de grupo

Al crear grupo, guardar:

- `admins: [{ userId: uidActual, role: "owner", order: 0 }]`
- `ownerId: uidActual`
- `adminIds: [uidActual]`
- (opcional temporal) `adminId: uidActual`

### 2) Guardas de acceso

Donde hoy se valida `group.adminId === firebaseUser.uid`, cambiar a:

- `group.adminIds.includes(firebaseUser.uid)` para acceso admin general.
- Acciones sensibles (agregar/reordenar/transferir) solo si `group.ownerId === firebaseUser.uid`.

### 3) UI de administración de admins

En pantalla de grupo admin:

- sección “Admins del grupo”,
- badge de owner,
- acciones de agregar/remover,
- acción de transferir ownership,
- drag/drop o botones para reordenar.

## Reglas de seguridad (cuando cierren reglas)

Cuando dejen de usar reglas abiertas, incorporar:

- write de `groups/{id}` solo si auth en `adminIds` (o idealmente solo vía Functions para operaciones sensibles),
- operaciones de ownership únicamente por Functions con validación server-side,
- validación de integridad: `ownerId` debe coincidir con `admins[0].userId`.

## Plan por fases recomendado

1. **Fase 1 (compatibilidad):** agregar nuevos campos y migrar datos.
2. **Fase 2:** actualizar backend (`assertGroupAdmin`, nuevas callables owner-only).
3. **Fase 3:** actualizar frontend para consumir `admins/ownerId/adminIds`.
4. **Fase 4:** eliminar `adminId` legado y endurecer reglas.

## Conclusión

Sí, tu modelo es correcto y escalable. La clave para que sea robusto en este proyecto es:

- modelar `admins + ownerId + adminIds`,
- centralizar permisos sensibles en Cloud Functions,
- migrar de forma compatible antes de remover `adminId`.
