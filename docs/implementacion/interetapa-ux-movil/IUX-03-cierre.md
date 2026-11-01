# IUX-03 — Cierre local

## Veredicto

**IUX-03 CERRADO EN SU ALCANCE LOCAL — UAT HUMANA APROBADA**

Este cierre acredita implementación, pruebas, evidencia responsive y aprobación humana de “Mis
grupos” y “Mi participación” en el entorno local demo. No acredita despliegue, rendimiento
productivo, Android real ni habilitación productiva de IUX-02. No cierra globalmente IUX o E3 y no
habilita E4.

## Fuentes

- [Ficha IUX-03](./IUX-03-ficha-mis-grupos-mobile-first.md).
- [Relevamiento IUX-03](./IUX-03-relevamiento-mis-grupos-mobile-first.md).
- [Informe de implementación](./IUX-03-informe-implementacion-mis-grupos-mobile-first.md).
- [Guía local](./IUX-guia-entorno-local-emuladores.md).
- Documento 5, D5-062 y D5-063.

## Alcance cerrado

- listado unificado por `groupId`, filtros y orden español estable;
- cargas independientes, cobertura parcial y descarte por sesión;
- tarjetas compactas con destino único por autorización;
- Owner sin Persona como estado normal y administración no bloqueada;
- historial plegado, lazy, paginado y cronológico por `rowKey`;
- ruta member-safe “Mi participación”, contexto propio read-only y salida vigente;
- obligaciones personales independientes de capabilities administrativas;
- capabilities económicas resueltas al abrir y revalidadas en destino;
- resúmenes de administración/participación sin ceros ficticios;
- badges N20/N31 positivos por tarjeta mediante `groupTaskCounts`, sin N+1 ni nueva proyección;
- paginación contractual máxima 20 y continuidad de cursores.

## Evidencia y UAT

Los gates finales incluyen unitarias Functions, Emulator canónico/focal IUX-02B, typecheck, ESLint
focal, build Next.js y `git diff --check`. La evidencia visual cubre 360/390 px, tablet, escritorio y
zoom 200% sin overflow en el alcance registrado.

El usuario aprobó la UAT el 1 de noviembre de 2026. Confirmó además mejor velocidad con el frontend
compilado y, en la sesión local observada, 4.7 GiB disponibles, swap estable y actividad `si/so`
prácticamente nula. Esa observación no constituye benchmark productivo ni prueba de ausencia de una
fuga de larga duración.

No existe evidencia de ejecución en Android real. El selector nativo de fecha conserva esa
validación física como pendiente no bloqueante para este cierre local.

## IUX-02 preservado

La inicialización del demo acreditó generación `live-v1`, cobertura `N20_N31_V1` READY y contadores
contextuales correctos después del procedimiento canónico. Esto sólo valida el entorno UAT. IUX-02
completo continúa abierto respecto de seguridad/operación, rendimiento, backfill y rollout
productivos, verificación remota y habilitación coordinada.

## Rollback y siguiente paso

El rollback de IUX-03 consiste en revertir conjuntamente sus commits de frontend, lector contextual,
pruebas y documentación. El lector es read-only y el corte no requiere migración de datos.

El siguiente paso recomendado es preservar el cierre integrado en `dev` y, bajo autorización
separada, completar los gates productivos de IUX-02 antes de cualquier rollout. No corresponde
iniciar E4 por efecto de este cierre.
