# E2-16 — Cierre del historial canónico de Temporadas

## Estado

`CERRADO — CU-019 IMPLEMENTADO, VALIDADO Y CON UAT APROBADA`

Este cierre alcanza exclusivamente E2-16. E2-14 y Etapa 2 permanecen abiertas, E3 continúa deshabilitada y E2-17 no fue iniciado.

## Resultado funcional

- CU-019 quedó implementado mediante `listSeasonsForOwnedGroup` y su integración en el detalle Owner-scoped del Grupo.
- La Temporada actual se presenta separada del historial y no consume el tamaño de página.
- El historial se compone únicamente de Temporadas cerradas canónicas v2.
- La Temporada abierta canónica v1 continúa siendo compatible; abierta v2 y cerrada v1 fallan cerradas.
- La paginación es determinista por `fechaInicio DESC` y document ID descendente, usa lookahead y ancla el cursor en la última fila entregada.
- El cursor es contextual para Grupo, actor, actual y ancla; usa JSON UTF-8 canónico y base64url, sin secretos ni material de autorización reutilizable.
- Cada página revalida Cuenta, ownership vigente, Grupo, abierta y ancla dentro de una transacción de sólo lectura.
- La operación realiza cero escrituras: no crea receipts, proyecciones, marcas de lectura, migraciones ni reparaciones.

## UAT y validación

UAT-01 a UAT-08 y UAT-11 a UAT-16 fueron aprobadas manualmente. UAT-09 y UAT-10 no pudieron recorrerse manualmente y están cubiertas por pruebas frontend/Emulator E2-16. UAT-17 a UAT-19 no son recorribles manualmente y están cubiertas por Emulator E2-16. UAT-20 está cubierta por Emulator, pruebas e inspección. No se atribuye ejecución manual a esos casos automatizados.

La evidencia técnica preservada es:

| Gate | Resultado |
|---|---:|
| Unitarias focales E2-16 | 13/13 |
| Emulator focal E2-16 | 7/7 |
| Suite unitaria completa | 301/301 |
| Emulator Suite completa | 180/180, 20 suites superiores |
| Mantenimiento y Rules | 7/7 |
| Helpers del runner | 9/9 |
| Sintaxis Functions | 282/282 |
| Lint baseline | sin regresiones; conserva 36 errores y 9 warnings conocidos y 9 hallazgos resueltos |
| Typecheck | aprobado |
| Build | aprobado, 21/21 |
| `git diff --check` | aprobado |
| Higiene documental/técnica | aprobada |
| Puertos Emulator al cierre | cero listeners |

## Incidente local UAT

La preparación mostró un fallo de inicialización de Cuenta con respuestas `401` y mensajes CORS entre Auth/Functions Emulator. La UAT luego pudo ejecutarse, pero no hay evidencia suficiente para atribuir la resolución a una única causa operativa. Se registra como causa no demostrada, sin cambio versionable: el inventario se mantuvo en las 24 entradas originales, no se incorporaron `firebase.ts` ni `authService.ts`, no se relajó Auth/CORS/autorización y la rama Auth/UAT continúa aislada. La ruta local canónica con project ID explícito `demo-*` y Auth/Firestore/Functions Emulator permanece disponible, por lo que la limitación no bloquea el cierre.

## Límites y riesgos conocidos

- El índice compuesto queda versionado, pero no fue desplegado. Emulator no demuestra su despliegue ni disponibilidad en Firebase remoto.
- No existe snapshot multipágina. Cambios concurrentes distintos de la abierta o del ancla pueden reordenar cerradas y producir duplicados u omisiones; el frontend reinicia ante IDs duplicados.
- Documentos físicamente corruptos sin campos indexables pueden no aparecer en la consulta; CU-019 no realiza scan global ni reparación.
- CU-017, CU-018 y CU-029 están fuera del alcance de este incremento; sus implementaciones y cierres previos no se modifican.
- No hubo deploy, acceso a Firebase remoto ni modificación de Rules permisiva.

## Preservaciones y continuidad

- La ficha E2-16 permanece idéntica a `dev`.
- E2-14, Documento 5, arquitectura, E2-15 y la rama Auth/UAT permanecen intactos.
- `chore/preserve-auth-emulator-uat-changes` se conserva en `fc7135e358902a17372d44f20df50883603520ce`, sin integración.
- E2-14 y Etapa 2 continúan abiertas.
- E3 no queda habilitada.
- E2-17 y E2-18 no fueron iniciados.
