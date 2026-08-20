# E0-06 — Baseline de calidad y política de no regresión

**Proyecto:** SPORTEXA

**Fecha:** 16 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `d7244d8d4bc9ea08ff3f6bb514105ca9f9617d0f`

**Alcance:** tooling y documentación de calidad; no modifica funcionalidad, reglas, datos, dependencias ni configuración remota.

**Veredicto:** **COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado**

## 1. Precondiciones y aislamiento

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-05 versionado | HEAD `d7244d8` (`test(etapa-0): caracterizar activos prioritarios E0-05`) | Cumplido |
| Estado inicial | `git status --short --branch` sin cambios | Cumplido |
| Suite inicial | `npm test` en Functions: guardas 9/9 y emuladores 26/26 | Cumplido |
| Emuladores previos | Sin procesos ni puertos de emuladores ocupados | Cumplido |
| Secreto local | `.secret.local` presente localmente, ignorado y no versionado | Cumplido |
| Aislamiento | Proyecto `demo-sportexa-e0-02`, hosts loopback y secretos sintéticos del runner | Cumplido |

No se leyó ningún archivo de secretos ni de entorno. La suite conservó las guardas de E0-02: excluye el `.secret.local` real, bloquea credenciales y proxies no locales, no usa `.firebaserc` e inicia sólo Auth, Firestore y Functions Emulator para un project ID `demo-*`.

## 2. Inventario y clasificación

### 2.1 Estado de las verificaciones

| Verificación o señal | Estado inicial | Clasificación | Confiabilidad y decisión |
| --- | --- | --- | --- |
| Pruebas | Functions poseía el único `npm test`; 9 guardas y 26 casos con emuladores | seguridad / tooling | Confiable bajo el runner aislado; se incorpora al gate raíz |
| Typecheck | No había script explícito; se ejecutaba `tsc --noEmit` manualmente | tipado / tooling | Se crea `typecheck` con `--incremental false` para no depender del cache incremental |
| Build | `next build` aprobaba y generaba `.next` | funcional / tooling | Confiable como build, pero modifica sólo artefactos ignorados y puede consumir tipos generados |
| Sintaxis Functions | No existía un comando global explícito | tooling/configuración | Se agrega parseo de todos los `.js` de Functions sin ejecutarlos ni resolver servicios |
| Lint | `next lint` no aplica; `eslint .` termina con exit 1 por deuda histórica | tipado / funcional / código obsoleto / tooling | El exit binario no distinguía deuda conocida de regresión; se agrega comparación estructural |
| Diff | `git diff --check` era manual | editorial/estilo | Se incorpora como último control del comando consolidado |
| Frontend tests | No existe script de pruebas de componentes o UI | tooling/configuración | Ausencia documentada; no se introduce un runner nuevo en E0-06 |

El frontend y Functions continúan siendo árboles npm independientes, y el `package.json` raíz no es un workspace. E0-01 ya registró que el árbol instalado del frontend no coincide completamente con sus declaraciones (`lucide` ausente y paquetes extraneous) y que una instalación limpia puede depender de registry/cache. E0-06 no altera dependencias ni lockfiles.

### 2.2 Baseline de ESLint

El baseline contiene **54 hallazgos en 28 archivos: 41 errores y 13 warnings**.

| Regla | Cantidad | Clasificación | Tratamiento |
| --- | ---: | --- | --- |
| `@typescript-eslint/no-explicit-any` | 35 | tipado | Deuda histórica aceptada sólo como baseline cuantificado |
| `@typescript-eslint/no-unused-vars` | 10 | código obsoleto | Deuda histórica aceptada sólo como baseline cuantificado |
| `react-hooks/set-state-in-effect` | 5 | funcional o potencialmente funcional | Riesgo no aceptado; referencia `E0-06-FUNC-HOOK-STATE` |
| `react-hooks/exhaustive-deps` | 2 | funcional o potencialmente funcional | Riesgo no aceptado; referencia `E0-06-FUNC-HOOK-DEPS` |
| `react-hooks/rules-of-hooks` | 1 | funcional o potencialmente funcional | Riesgo no aceptado; referencia `E0-06-FUNC-HOOK-ORDER` |
| `@next/next/no-img-element` | 1 | tooling/configuración | Excepción histórica localizada |

No se identificó un hallazgo de lint clasificable como seguridad ni uno exclusivamente editorial/estilo. Esto no convierte los ocho hallazgos de Hooks en deuda segura: permanecen visibles, con `accepted: false`, y el validador impide que una categoría funcional o de seguridad sea aceptada en el baseline.

### 2.3 Scripts ambiguos, ausentes o sensibles

- `npm test` sólo existe en `volley-ranking-system/functions`; antes de este incremento no había un comando raíz de calidad.
- Functions declara comandos de migración y seed cuyos archivos objetivo no existen; no forman parte de las verificaciones.
- El backfill existente puede leer y escribir Firebase remoto, incluso cuando su nombre sugiera una ejecución controlada; queda excluido.
- `dev`, emuladores interactivos, migraciones, seeds, backfills y despliegues no son controles de calidad y no se invocan desde el gate.
- El build escribe `.next`; typecheck puede observar declaraciones bajo `.next/types` cuando existen. La evidencia incluye build y typecheck, pero no presenta `.next` como fuente versionada.
- La comprobación sintáctica de Functions valida parseo de JavaScript; no sustituye pruebas de imports, ejecución o comportamiento.
- La suite no emula Pub/Sub. Los triggers programados quedan fuera de su cobertura y los servicios no emulados deben fallar de forma cerrada.

## 3. Política mínima de no regresión

Para cerrar un incremento de Etapa 0 deben cumplirse estas reglas:

1. pruebas, typecheck, build y sintaxis de Functions terminan con exit 0;
2. ESLint no incorpora una nueva combinación de archivo, severidad, regla y mensaje, ni aumenta su multiplicidad;
3. todo archivo nuevo queda sujeto al mismo ESLint y, por tanto, no puede introducir deuda;
4. un archivo modificado puede conservar hallazgos ya registrados, pero no crear ni multiplicar deuda;
5. resolver deuda reduce la ejecución corriente y no hace fallar el gate;
6. actualizar el baseline es una operación separada, exige una razón y requiere revisar la clasificación;
7. ninguna excepción funcional o de seguridad puede marcarse como aceptada;
8. toda excepción no aceptada debe tener una referencia de seguimiento;
9. el diff debe estar libre de errores de whitespace.

El archivo baseline es una tolerancia temporal verificable, no una declaración de corrección del código listado.

## 4. Mecanismo elegido

`scripts/quality/lint-baseline.js` ejecuta la instalación local de ESLint y normaliza cada hallazgo por:

```text
ruta relativa + severidad + regla + primer párrafo del mensaje + multiplicidad
```

No conserva números de línea, rutas absolutas ni fragmentos multilínea dependientes de ubicación. La multiplicidad impide ocultar una infracción nueva idéntica dentro de un archivo ya afectado. El chequeo normal sólo lee `volley-ranking-frontend/eslint-baseline.json`; nunca lo actualiza.

La actualización explícita es:

```bash
npm --prefix volley-ranking-frontend run lint:baseline:update -- --reason "justificación revisada"
```

Luego deben clasificarse las reglas nuevas, revisar el diff del JSON y ejecutar nuevamente el gate. Una actualización sin `--reason` falla de forma cerrada. No se agregó ninguna dependencia: ambos controles nuevos usan módulos estándar de Node 20 y las instalaciones locales existentes.

## 5. Comandos

Desde la raíz del repositorio:

| Orden | Comando parcial | Resultado esperado |
| ---: | --- | --- |
| 1 | `npm run quality:lint` | Sin hallazgos nuevos respecto del baseline |
| 2 | `npm run quality:typecheck` | TypeScript exit 0 |
| 3 | `npm run quality:functions:syntax` | Todos los `.js` de Functions parsean |
| 4 | `npm run quality:test` | Guardas y suite aislada aprueban |
| 5 | `npm run quality:build` | Next.js build exit 0 |
| 6 | `npm run quality:diff` | Sin errores de whitespace en el diff versionado |

Comando consolidado:

```bash
npm run quality:stage0
```

El orden falla temprano en controles baratos y ejecuta una sola vez cada verificación costosa. No instala dependencias, no inicia servicios de desarrollo, no despliega y no ejecuta migraciones. `git diff --check` no inspecciona por sí solo archivos no rastreados; por eso éstos deben revisarse antes de versionar.

## 6. Prueba positiva y negativa del gate

1. El baseline actual aprobó con 41 errores y 13 warnings conocidos.
2. Se creó temporalmente `src/__e0_06_lint_probe__.ts` con una única infracción controlada de `no-explicit-any`.
3. El gate falló y reportó la ruta relativa, regla, mensaje y multiplicidad nueva `+1`.
4. El archivo temporal se retiró mediante la operación inversa.
5. El gate volvió a aprobar con 41/13 y la ruta temporal quedó ausente.

También se comprobó que `lint:baseline:update` sin justificación termina con exit 1. Ninguna de estas pruebas cargó configuración Firebase ni secretos.

## 7. Excepciones y deuda aceptada

Se toleran temporalmente las 35 ocurrencias de `no-explicit-any`, las 10 variables sin uso y el uso aislado de `img`, porque su corrección global excede E0-06. Todo aumento falla.

Los ocho hallazgos de Hooks no se aceptan como deuda inocua. Son riesgos funcionales conocidos que requieren análisis y corrección focalizada en un incremento posterior. Se registran para que el gate pueda distinguir el estado heredado, pero una actualización no puede aceptarlos como funcionalmente correctos.

También permanecen como deuda de tooling: ausencia de tests frontend, árboles npm no unificados, instalación local inconsistente ya observada, dependencia de artefactos generados y scripts sensibles o rotos fuera del gate.

## 8. Archivos modificados

- `package.json` — comandos parciales y consolidado de Etapa 0;
- `volley-ranking-frontend/package.json` — typecheck y comandos explícitos del baseline;
- `volley-ranking-frontend/eslint-baseline.json` — inventario normalizado y clasificado;
- `scripts/quality/lint-baseline.js` — comparación y actualización explícita del baseline;
- `scripts/quality/check-functions-syntax.js` — control sintáctico no ejecutable de Functions;
- `docs/implementacion/etapa-0/E0-06-baseline-calidad.md` — este informe.

No se modificaron reglas Firestore, código funcional, pruebas existentes, dependencias, lockfiles ni archivos de secretos.

## 9. Resultados

| Verificación | Resultado |
| --- | --- |
| Suite inicial y consolidada | **APRUEBA**: guardas 9/9 y emuladores 26/26 |
| Gate de lint | **APRUEBA**: 41 errores y 13 warnings conocidos; 0 nuevos |
| Prueba negativa del gate | **APRUEBA**: detectó `+1 no-explicit-any` y terminó con exit 1 |
| Recuperación del gate | **APRUEBA**: vuelve a 41/13 y no queda el archivo temporal |
| Typecheck | **APRUEBA**, exit 0 |
| Build | **APRUEBA**, 18 páginas; conserva el warning informativo de `caniuse-lite` |
| Sintaxis Functions | **APRUEBA**, 92/92 archivos JavaScript |
| Comando consolidado | **APRUEBA**, exit 0 |
| `git diff --check` | **APRUEBA** |
| Emuladores posteriores | Sin procesos huérfanos observados |

El mensaje de actualización disponible de `caniuse-lite` no es una regresión de código ni autorizó actualizar dependencias. Firebase CLI puede intentar obtener mensajes informativos propios; la suite bloquea acceso de aplicación a destinos no locales y nunca selecciona el alias remoto.

## 10. Señales todavía limitadas

- El baseline detecta deuda de ESLint, no equivalencia semántica del programa.
- La clave omite líneas deliberadamente; cambios en el primer párrafo del mensaje pueden aparecer como resolución más hallazgo nuevo y requieren revisión.
- Una reducción del baseline es permitida, pero sólo se consolida en el JSON mediante actualización explícita.
- El parseo con `vm.Script` no resuelve módulos ni carga Functions.
- El typecheck puede verse influido por tipos generados existentes; el build posterior verifica la generación completa.
- No existe todavía CI que haga obligatorio el comando fuera del proceso de revisión local.

## 11. Bloqueantes y criterios de cierre

No hay bloqueantes técnicos para cerrar E0-06. Los criterios se cumplen: hay baseline identificable por hallazgo, política implementada, actualización manual justificada, gate probado en positivo y negativo, comando consolidado reproducible, verificaciones aprobadas y ausencia de cambios funcionales o remotos.

Los riesgos funcionales de Hooks son observaciones explícitas y no se ocultan como deuda aceptable. Corregirlos no pertenece a este incremento. El único paso administrativo pendiente es revisar y versionar el diff; esta intervención no hace commit ni push.

## 12. Veredicto y siguiente incremento

**COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado.**

E0-06 puede cerrarse técnicamente porque el estado heredado está normalizado y clasificado, todo aumento de lint falla, el propio gate demostró su capacidad de detección y el comando `npm run quality:stage0` aprobó sin Firebase remoto.

El siguiente incremento recomendado, sin ejecutarlo, es **E0-07**, únicamente después de revisar y versionar E0-06 en la rama de Etapa 0. Su alcance debe tomar como precondición `npm run quality:stage0` y no convertir la deuda funcional identificada en una excepción silenciosa.
