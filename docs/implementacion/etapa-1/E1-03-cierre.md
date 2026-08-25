# E1-03 — Cierre

## 1. Identificación

- Incremento: `E1-03 — Retiro del consumo global legado de matches en dashboard`
- Rama de implementación: `fix/e1-03-dashboard-matches-listener`
- Fecha: `2026-08-25`
- HEAD de partida: `1693014a53da1f99b1e1f6fea891fd0073772175`
- Estado: `E1-03 CERRADO — SIGUIENTE INCREMENTO HABILITADO PARA DEFINICIÓN`

## 2. Commits de implementación

- `d2b1634a7581925b18f5e4a07450bf94a526826b` — implementación principal: retiro del consumo global de `matches`.
- `42a7774b8d64e34e0271a1d2a1d0f7772c2bbffc` — corrección de desviación y preservación del baseline de torneos.
- Este cierre documental se incorpora mediante un commit separado.

## 3. Causa y alcance

El dashboard autenticado consumía globalmente `matches` mediante un listener, consultas, estados y UI asociados que no demostraban autorización contextual. E1-03 retiró ese consumidor prematuro sin abrir reglas, sin crear una consulta global sustituta y sin introducir autorización futura de partidos.

Se retiraron del dashboard la lectura global de `matches`, sus estados auxiliares, filtros, imports exclusivos y la representación de partidos globales. Se conservaron cuenta, Persona, grupos, alertas, acciones y el resto de la navegación del dashboard.

`UpcomingActivitiesSection` permanece como superficie de actividades válida, recibe la colección vacía de partidos, no inicia lecturas y no presenta una falsa sección global de “sin partidos”.

## 4. Exclusiones preservadas

No se modificaron reglas, índices, Functions de runtime, callables, otros consumidores de `matches`, dependencias, lockfiles, páginas de partidos, autorización de Grupo/Membresía ni Firebase remoto. No se diseñó ni corrigió el acceso futuro a torneos.

## 5. Desviación de torneos

Después del primer commit se detectó que un guard que limitaba la carga de torneos a administradores globales ampliaba indebidamente el alcance de E1-03. El commit `42a7774...` retiró exclusivamente ese guard y restauró la dependencia `[]` y el comportamiento legado del commit padre.

Esta restauración no declara correcto el diseño futuro del acceso a torneos. Los torneos quedan pendientes de su propio incremento funcional y de una ficha posterior.

## 6. Pruebas y gates

- Unitarias: `72/72` aprobadas.
- Sintaxis Functions: `126/126` archivos JavaScript.
- Emulator Suite: `43/43` aprobadas con proyecto `demo-sportexa-e0-02` y servicios locales.
- Build: `19/19` páginas generadas.
- Mantenimiento: `7/7` aprobadas, código `0`.
- `quality:stage0`: aprobado, código `0`.
- `git diff --check`: aprobado.

La política de lint conserva la deuda baseline conocida de `39` errores y `9` warnings; el gate distingue esa deuda histórica de regresiones y no detectó nuevos hallazgos de E1-03.

## 7. Revisión independiente y UAT

La revisión independiente originó `E1-03-DOC-001` y `E1-03-TEST-001`. Se completó el informe y se fortaleció la prueba arquitectónica con un grafo de dependencias locales alcanzables, incluyendo imports relativos, alias `@/`, extensiones, índices, ciclos, acceso directo/indirecto, `@/lib/firebase`, `pendingAlerts` y casos sintéticos permitidos.

La UAT completa anterior fue aprobada:

`UAT E1-03 APROBADA`

Cubrió dashboard autenticado, ausencia de loading y sección engañosa de partidos, ausencia de errores/lecturas globales de `matches`, alertas y actividad, Cuenta, Persona, nueva sesión, vista móvil y alcance Git.

El smoke posterior al commit correctivo fue incompleto únicamente porque Google Sign-In sintético no estaba disponible contra Auth Emulator. Sí fueron aprobados los emuladores locales, el frontend local, rama, HEAD y worktree; quedaron `NO EJECUTADO` las comprobaciones autenticadas posteriores. Esto no bloquea el cierre porque el commit correctivo solo eliminó el guard de torneos fuera de alcance, no restauró `matches`, y la UAT completa anterior y los gates posteriores permanecieron aprobados. No se inventa aprobación del smoke autenticado.

## 8. Seguridad y remoto

- Reglas Firestore: sin cambios.
- Índices: sin cambios.
- Dependencias y lockfiles: sin cambios.
- Firebase remoto: sin acceso, cambios ni despliegue.
- Push, merge y deploy de Firebase no forman parte de este cierre documental.

## 9. Riesgo residual

El detector estático no cubre completamente imports dinámicos arbitrarios ni comportamiento generado en runtime. Este riesgo se acepta para E1-03 porque el dashboard actual no usa imports dinámicos para acceder a `matches`. El acceso futuro a torneos queda explícitamente fuera de la decisión de este incremento.

## 10. Rollback y siguiente incremento

El rollback debe limitarse a revertir los commits de E1-03 mediante revisión explícita, sin abrir reglas ni restaurar deliberadamente el consumidor global no autorizable de `matches`. Cuenta, Persona, reglas e índices permanecen intactos.

El siguiente incremento queda habilitado únicamente para definición mediante su propia ficha aprobada. En particular, el acceso autorizado a torneos requiere una decisión funcional independiente y no queda resuelto por este cierre.

## Veredicto

`E1-03 CERRADO — SIGUIENTE INCREMENTO HABILITADO PARA DEFINICIÓN`

No se declara despliegue remoto.
