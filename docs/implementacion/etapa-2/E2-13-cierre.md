# E2-13 — Cierre del incremento

## Objetivo y veredicto

Retirar la autoridad organizativa legacy sin alterar datos históricos ni quebrar los contratos canónicos E2 o la compatibilidad deportiva E4 aprobada.

Veredicto: **E2-13 aprobado, versionado e integrado técnicamente**. El cierre documental se integra por separado mediante merge no fast-forward.

## Alcance entregado

- Ocho tombstones HTTP y seis callable.
- Ocho BFF y superficies de escritura, UI, productores, backfills y scripts huérfanos retirados.
- Rules sin escrituras cliente sobre `groups`.
- GET públicos sanitizados y push sin lectura de `users`.
- Redirecciones únicas con aviso accesible y navegación UAT-01 corregida.
- Repositorio canónico E2 como único writer de Grupo v1.
- Cuatro consumidores frontend E4 y writers deportivos backend conscientemente conservados.

## UAT y gates finales

UAT-01, 02, 03, 04 y 06 fueron aprobadas manualmente. UAT-05 fue parcialmente manual y completada por automatización. UAT-07 quedó cubierta por Rules y Emulator E2-13; UAT-08 por pruebas e inspección.

Los resultados finales son: E2-03 `18/18`; Emulator focal E2-13 `7/7`; Emulator Suite fresca `168/168`; arquitectura y navegación `9/9`; mantenimiento `7/7`; sintaxis del runner y fixture exit 0; `git diff --check` exit 0.

El `163/168` anterior fue causado por contaminación del guard real del Owner desde la prueba diagnóstica de contención. La corrección se limitó a `membershipE2.test.js`, usa un guard sintético con teardown y verifica intacto el guard real. No cambió producción ni se relajaron aserciones.

## Trazabilidad

- Base inicial: `f10fb69e94a0cbef4ce945f17cb9ae00839fa169`.
- Commit de implementación: `417955275d6fdd6696094fdbd7b7d4417631bdee` (`refactor(e2-13): retirar autoridad organizativa legacy`).
- Merge no fast-forward de implementación: `ef9f9674806383b2d283e2a69c54bb27bd0384e9` (`merge: integrar E2-13`).
- Rama documental: `docs/e2-13-cierre`; commit `docs(e2-13): registrar UAT y cerrar incremento`.
- Integración documental prevista mediante merge no fast-forward `merge: cerrar E2-13`.

## Deuda E4 diferida

Permanecen sólo los cuatro consumidores frontend legacy allowlisted, lecturas/reglas de compatibilidad de Partido/Torneo y writers deportivos backend aprobados. Esta deuda se difiere conscientemente a Etapa 4.

## Estado de cierre

No hubo migraciones ni modificación de datos históricos, deploy ni acceso efectivo a Firebase remoto. La ficha E2-13 permanece idéntica. Auth/UAT sigue aislada en `chore/preserve-auth-emulator-uat-changes` (`fc7135e358902a17372d44f20df50883603520ce`) y no fue integrada. E3 no fue iniciada; Documento 5 y AUD-C05 siguen sin actualizar.

Este cierre no declara cerrada toda la Etapa 2. El siguiente paso recomendado es una auditoría consolidada de Etapa 2 para comprobar cobertura, deuda y habilitación de E3; esa auditoría no forma parte de esta ejecución.
