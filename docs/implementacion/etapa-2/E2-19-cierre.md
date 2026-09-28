# E2-19 — Cierre formal

## Alcance entregado

E2-19 entrega CU-010 como consulta read-only de la historia propia de grupos: una fila por raíz de Membresía, activas y finalizadas, ordenada por `fechaIngreso DESC, __name__ DESC`. Una reactivación dentro de la misma Temporada conserva la raíz y aumenta sus Períodos de Vigencia; una renovación intertemporada E2-18 crea otra raíz y, por lo tanto, otra fila.

La callable `listMyGroupMembershipHistory` deriva UID, Cuenta y Persona del contexto autenticado, revalida autoridad en cada página y devuelve un DTO cerrado. La UI “Historial de grupos” es informativa, está separada de “Grupos que integrás” y presenta por separado el origen de la raíz y su cantidad de Períodos.

## Exclusiones

- No existe consulta de historia ajena, autoridad por ownership/rol global ni acciones administrativas.
- No se implementan renovación, reactivación, finalización o modificación desde el historial.
- Los Períodos no son filas ni recursos navegables; no se recorre lineage ni se leen predecesoras.
- No hay receipts, intents, proyecciones, migraciones, backfills o reparaciones.
- No se modifican permisos de Partido/Torneo, deuda E4, E2-14 ni el estado de la Etapa 2.
- No se habilita E3, no se integra Auth/UAT y no se inicia otro incremento.
- No hubo deploy ni acceso a Firebase remoto.

## Contrato, autorización y compatibilidad

El payload sólo admite `pageSize?` y `cursor?`, con default/máximo 20. Cada página resuelve Cuenta y Persona propias dentro de una transacción explícitamente read-only. El cursor canónico está contextualizado al actor y Persona, relee el ancla y no concede autoridad.

La matriz admite v1 activa, v2 finalizada y v3/v4 activas o finalizadas. v1/v2 proyectan un Período normativo sin consultar subcolección; v3/v4 validan `periodCount`, primera y última frontera con IDs deterministas. v4 se clasifica como renovación sin recorrer lineage. Cualquier incompatibilidad alcanzada falla toda la página sin reparación ni resultados parciales.

## Consulta, composición y coste

La consulta implementa igualdad por Persona derivada, orden descendente por ingreso y `__name__`, `limit(pageSize + 1)` y `startAfter` exacto. El índice versionado contiene únicamente `personId ASC` y `fechaIngreso DESC`; el desempate por `__name__ DESC` es implícito en la configuración Firestore.

Grupo, Temporada y fronteras coincidentes se deduplican antes del I/O. El lookahead sólo se valida como raíz y no se compone. La instrumentación acredita 26 lecturas en la continuación mínima, 84 en el caso representativo, 104 en la continuación peor caso y 103 en la primera página peor caso, con cero lineage y cero escrituras.

## Evidencia técnica

- Sintaxis JavaScript completa: `297/297`.
- Unitarias/contratos/arquitectura completas: `328/328`.
- Focal E2-19: `14/14`; Emulator focal: `7/7`.
- Regresiones E2-04/E2-09/E2-16/E2-18: `25/25`.
- Emulator Suite completa fresca: `199/199`, exit code 0 y teardown completo.
- Rules/mantenimiento: `7/7`.
- Lint baseline conforme; typecheck y build verdes.
- Corrección de microcopy: focal `14/14`, lint baseline y typecheck verdes.
- `git diff --check`, UTF-8/BOM/whitespace/newline e inventario verificados antes de versionar.

La Emulator Suite completa no se repitió después de la corrección de microcopy porque el diff posterior fue exclusivamente de presentación y detector estático: no cambió backend, callable, DTO, cursor, contrato, schema, índice, Rules ni composición. Las focales y gates frontend fueron proporcionales al riesgo y quedaron verdes.

## Clasificación definitiva de UAT

- **Aprobada manualmente:** UAT-01 a UAT-07.
- **Aprobada manualmente después de la corrección:** UAT-08, verificando `Alta inicial` y `Renovación intertemporada` separados del conteo.
- **Aprobada manualmente:** UAT-09 a UAT-19 según el reporte recibido.
- **Pruebas/Emulator/inspección, no manual:** volumen 20/21, compatibilidad integral v1–v4, cursores inválidos u obsoletos, corrupción, concurrencia, transferencia, referencias ausentes, coste máximo y cero escrituras.

El retest confirmó que una reactivación intratemporada conserva una card, aumenta `Períodos de vigencia` y mantiene el origen `Renovación intertemporada`; tampoco aparecen cards por cada Período ni acciones nuevas, y E2-04 permanece operativo.

## Hallazgo UAT y corrección

UAT-05/UAT-08/UAT-10 expusieron que `2 vigencias · Renovación` mezclaba el origen de la raíz con su cantidad de Períodos. Se reemplazó por dos líneas accesibles: `Origen: Alta inicial` / `Origen: Renovación intertemporada` y `Período de vigencia: 1` / `Períodos de vigencia: N`. El retest manual fue satisfactorio.

## Deuda residual y riesgos

- El índice compuesto está versionado y probado localmente; su despliegue remoto pertenece a un flujo posterior autorizado y no fue realizado aquí.
- No existe snapshot multipágina; cada continuación revalida contexto y ancla según la ficha.
- Corrupción o referencias históricas eliminadas fallan cerradas y requieren reparación explícita fuera de E2-19.
- Persiste la deuda histórica del lint baseline y el warning de `caniuse-lite`; no se actualizaron dependencias.
- Detalle por episodio, exportación, reparación y optimizaciones adicionales permanecen fuera de alcance.

## Rollback

El rollback es lógico y no destructivo: revertir callable, reader, cursor, DTO histórico, índice configurado, sección frontend y pruebas E2-19. Como la capacidad es read-only, no existen datos E2-19 que restaurar ni migración inversa. No deben borrarse raíces, Períodos o lineage creados por incrementos operativos anteriores; E2-04 debe continuar disponible.

## Trazabilidad

- Ficha aprobada: `docs/implementacion/etapa-2/E2-19-ficha-historial-propio-grupos-memberships.md`, blob `ae15f64a8198978e1f37eb2e543508eb97698cba`.
- Base aprobada: `176d71626c31c54357af01e0cef900ec2b057a5f`.
- Implementación: callable, contrato/DTO/cursor/reader/capacidades, índice, UI y pruebas inventariadas en el informe.
- Commit técnico: `441d9e1ee38133a443c28e9615da9ef04ceeda9d` en `feat/e2-19-own-group-history`.
- Merge técnico no fast-forward: `8113091e0bd4248e0b946547918e1adec92167f3` en `dev`.
- Rama documental: `docs/e2-19-close`, creada desde el merge técnico para mantener informe/cierre en un commit separado.
- Informe: `docs/implementacion/etapa-2/E2-19-informe-implementacion.md`.

## Veredicto formal

E2-19 satisface la ficha aprobada, los gates técnicos y la UAT manual con la clasificación indicada. La Etapa 2 continúa abierta, E2-14 permanece abierta y E3 deshabilitada.

**E2-19 CERRADO E INTEGRADO — ETAPA 2 CONTINÚA ABIERTA**
