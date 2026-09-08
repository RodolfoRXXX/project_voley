# E2-07 — Cierre de decisión de Solicitud de ingreso

## 1. Estado del incremento

- Incremento: `E2-07 — Decisión de Solicitud de ingreso y coordinación con Membresía`.
- Fecha de cierre: 2026-09-08.
- Estado: cerrado e integrado en `dev`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-07-ficha-decision-solicitud-ingreso.md`.
- Informe: `docs/implementacion/etapa-2/E2-07-informe-implementacion.md`.

Este documento cierra exclusivamente E2-07. No cierra la Etapa 2, no define ni implementa E2-08 y no autoriza despliegues ni operaciones sobre Firebase remoto.

## 2. Alcance cerrado

E2-07 incorporó:

- aprobación y rechazo owner-scoped de Solicitudes pendientes;
- consulta autoritativa del resultado y evolución mínima del listado Owner;
- coordinación recuperable `claim → Membresía confirmada → Solicitud aprobada`;
- compatibilidad candidata y Owner con `APPROVAL_IN_PROGRESS`;
- recuperación idempotente ante concurrencia, fallo parcial o respuesta perdida;
- frontend Owner para aprobar, rechazar, recuperar y consultar;
- hidratación estricta, reglas deny-all, observabilidad y pruebas conductuales.

Solicitud y Membresía permanecen como Aggregate Roots independientes. La Solicitud sólo pasa a `aprobada` después de confirmar la Membresía correlacionada. Rechazo y cancelación no crean Membresía; una Membresía activa ajena no se adopta y un lifecycle finalizado requiere reactivación fuera de alcance.

## 3. Gates finales

La evidencia final consolidada es:

- Emulator Suite completa posterior al ajuste de cleanup: `124/124`;
- unitarias completas: `240/240`;
- sintaxis Functions: `246/246`;
- mantenimiento y reglas: `7/7`;
- unitarias focales E2-07: `28/28`;
- Emulator focal E2-07: `11/11` y complementarias `6/6`;
- secuencia causal E2-07, Membresía y Temporada: `40/40`;
- typecheck, lint baseline, build y `git diff --check`: aprobados.

La única Emulator Suite completa de la validación de cierre finalizó con código 0. No se repitieron los demás gates ya acreditados.

## 4. UAT

La UAT de E2-07 fue aprobada con observación de entorno. Se validaron los recorridos Owner y candidata, persistencia de aprobación y rechazo, recuperación sin duplicados, ownership vigente, fallo sin Temporada abierta, teclado, foco, anuncios accesibles y responsive.

La observación fue que las fixtures Auth auxiliares usaban password mientras la interfaz local ofrecía únicamente entrada Google. Por esa incompatibilidad de proveedor, UAT-10 y UAT-12 no se recorrieron manualmente y se aceptaron mediante la evidencia automatizada existente. La limitación pertenece a la preparación del entorno sintético y no constituye un defecto funcional de E2-07.

La UAT utilizó exclusivamente Auth, Firestore y Functions Emulator con proyecto `demo-sportexa-e2-07-uat`. No hubo acceso Firebase remoto.

## 5. Versionado e integración

- Base original: `762c830545be05d15091155e51502a4f6955a207`.
- Commit de implementación: `3cd2572fdbac19e5c52da7812383cde3363dd449` — `feat(e2-07): implementar decisión de solicitud de ingreso`.
- Merge no fast-forward en `dev`: `eec1d26f9c28631c3466be21d58c858357eb4701` — `merge: integrar E2-07`.

El merge tiene como padres la base original y el commit E2-07. Su árbol es idéntico al árbol del commit probado. La feature y `dev` fueron publicadas sin force push.

## 6. Reglas, índices y efectos colaterales

Las colecciones técnicas de decisión y coordinación permanecen inaccesibles al cliente. El frontend no usa Firestore. No se agregaron índices, dependencias o lockfiles, ni se modificaron APIs o arrays legacy.

No se observaron efectos colaterales sobre Grupo, Persona, Usuario, Temporada, Actividad, notificaciones, invitaciones, pagos, roles o estructuras legacy. No se realizó deploy.

## 7. Exclusiones preservadas

Permanecen fuera de E2-07:

- notificaciones, Actividad, invitaciones, pagos y roles posteriores;
- reactivación, renovación o reparación automática de Membresías;
- cierre o reapertura de Temporadas;
- migraciones, backfills, doble escritura o adopción de datos legacy;
- jobs, colas, TTL o cleanup automático de intents;
- cualquier capacidad de E2-08 o posterior.

## 8. Riesgos residuales

- Una coordinación incierta converge por consulta o retry del Owner; no existe worker automático.
- Los decision intents son durables y no tienen TTL.
- El listado conserva el costo técnico acotado por página y no ofrece snapshot entre páginas.
- Reactivación y reparación de corrupción requieren incrementos independientes.
- La observación Auth de UAT debe considerarse al preparar futuras identidades sintéticas, sin reinterpretarla como defecto del flujo.

## 9. Siguiente incremento

Conforme al gobierno incremental del Documento 5, queda habilitado **E2-08 únicamente para definición** mediante su propia Ficha de Incremento Implementable, revisión y decisión de entrada. Este cierre no fija anticipadamente su alcance, no autoriza su implementación y no crea todavía su rama.

## Veredicto

**E2-07 CERRADO E INTEGRADO**
