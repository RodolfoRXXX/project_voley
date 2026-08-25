# Ficha de Incremento Implementable E1-03 — Retiro del consumo global legado de matches en dashboard

## Estado de la ficha

- **Estado:** `LISTO PARA IMPLEMENTAR`
- **Responsable:** Rodolfo
- **Fecha:** 2026-08-24
- **Rama de trabajo:** `fix/e1-03-dashboard-matches-listener`
- **Rama de partida:** `dev`
- **HEAD base:** `1693014a53da1f99b1e1f6fea891fd0073772175`
- **Fecha de cierre:** pendiente
- **Commit de implementación:** pendiente
- **Etapa del roadmap:** Etapa 1 — Usuario, Persona y autorización contextual
- **Ambiente autorizado para la implementación:** Firebase Emulator Suite con proyecto `demo-*`, hosts loopback y datos sintéticos descartables
- **Ambiente remoto:** fuera de alcance; no se autoriza despliegue ni cambios remotos
- **Cierre documental:** este documento no reabre E1-01 ni E1-02; sólo define el alcance de E1-03.

---

## 1. Identificación

- **ID del incremento:** E1-03
- **Nombre:** Retiro del consumo global legado de matches en dashboard
- **Naturaleza del incremento:**
  - no incorpora un caso de uso deportivo nuevo;
  - es un incremento correctivo de transición técnica;
  - identifica el problema del dashboard como consumidor prematuro y no autorizable de `matches`;
  - restaura un dashboard coherente con la política mínima de lectura;
  - no reabre E1-01 ni E1-02.
- **Identificador interno sugerido:** `CT-E1-03-01 — Retirar consulta global no autorizable de matches`
- **Casos de uso incluidos:**
  - retiro del consumidor global de `matches` del dashboard;
  - neutralización estructural de la UI alimentada exclusivamente por esa consulta;
  - recuperación de un dashboard usable sin `permission-denied`, loading perpetuo ni falsa representación de partidos consultados;
  - verificación de regresión arquitectónica y de render del dashboard.
- **Casos de uso excluidos:**
  - cualquier nueva lectura de partidos;
  - alta, edición, detalle o gestión de partidos;
  - habilitación deportiva, grupal o comercial;
  - autorización contextual de Grupo/Membresía;
  - backend de partidos o callables para partidos;
  - `ProfileMatches`, detalle de partido, páginas administrativas de partidos y páginas públicas de Grupo.
- **Documentos y decisiones normativas relacionadas:**
  - `docs/implementacion/etapa-1/E1-01-ficha-cuenta-usuario.md`
  - `docs/implementacion/etapa-1/E1-02-ficha.md`
  - `docs/implementacion/etapa-1/E1-02-cierre.md`
  - Documento 5 — Plantilla de Ficha de Incremento Implementable y decisiones de alcance de etapa 1
  - decisiones límite del presente documento y reglas actuales como estado técnico

---

## 2. Decisiones normativas ya aprobadas

No se reinterpretan ni se amplían estas decisiones.

1. El dashboard monta una consulta global equivalente a:

```ts
query(
  collection(db, "matches"),
  where("estado", "in", [...])
)
```

2. Esa consulta no puede demostrar autorización por Grupo y es incompatible con las reglas actuales.
3. Firestore Rules no filtra posteriormente resultados prohibidos; la consulta debe ser autorizable como conjunto.
4. No existe actualmente un caso de uso aprobado que habilite lectura global de partidos.
5. La solución no es:
   - abrir reglas;
   - silenciar `permission-denied`;
   - agregar solamente un error handler;
   - esperar a que exista un Usuario autenticado;
   - consultar todos los partidos y filtrarlos en cliente;
   - crear un callable provisional;
   - introducir Grupo o Membresía;
   - diseñar anticipadamente el futuro acceso a partidos.
6. La solución aprobada es retirar del dashboard:
   - el listener global automático;
   - sus estados, efectos, filtros e imports exclusivos;
   - la sección visual alimentada exclusivamente por esa consulta.
7. No debe mostrarse una falsa lista vacía de partidos como si se hubiera realizado una consulta válida.
8. El futuro acceso a partidos se definirá en otro incremento con autorización funcional y contexto de Grupo/Membresía.
9. Preservar: `autorización funcional ≠ habilitación comercial ≠ validez de dominio`

---

## 3. Naturaleza del incremento y alcance

### 3.1 Naturaleza

Este incremento no introduce un caso de uso deportivo nuevo. Es una corrección de transición técnica para quitar un consumidor prematuro y no autorizable de `matches` del dashboard, conforme a la política mínima de lectura y sin reabrir decisiones de E1-01 o E1-02.

### 3.2 Objetivo funcional

El Usuario autenticado debe poder cargar y utilizar el dashboard sin que la interfaz intente consultar globalmente `matches` ni produzca `permission-denied`, estados de carga perpetuos o una representación engañosa de datos no consultados.

### 3.3 Alcance incluido

Definir exactamente:

1. retirar el `onSnapshot` global de `matches` del dashboard;
2. retirar la query y filtros locales asociados;
3. retirar estados y efectos utilizados exclusivamente por ese listener;
4. retirar imports, constantes y tipos que queden sin uso;
5. retirar o neutralizar estructuralmente la sección visual cuyo único origen era esa consulta;
6. preservar el resto del dashboard;
7. preservar `AuthProvider`, `PersonProvider`, cuenta y Persona;
8. asegurar que cargar el dashboard no inicia lecturas directas de `matches`;
9. incorporar pruebas de regresión relevantes;
10. ejecutar build, lint, typecheck, pruebas y Emulator Suite con guardas locales.

### 3.4 Alcance excluido

Queda expresamente excluido:

- cambios en `firestore.rules`;
- índices;
- Functions;
- callables;
- backend de partidos;
- nuevas consultas de partidos;
- lectura pública;
- permisos de Grupo;
- Membresía;
- roles deportivos;
- `ProfileMatches`;
- detalle de partido;
- páginas administrativas de partidos;
- páginas públicas de Grupo;
- escritura o edición de partidos;
- rediseño general del dashboard;
- cambios sobre Persona o Usuario;
- Comercial, Plan o Suscripción;
- despliegue remoto.

### 3.5 Superficie principal

La superficie principal es:

- `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx`

Las pruebas podrán ubicarse en la suite arquitectónica/frontend existente más apropiada.

No se autoriza modificar otros consumidores de `matches` salvo que una dependencia directa retirada del dashboard lo exija y quede demostrada.

---

## 4. Invariantes obligatorias

Registrar explícitamente:

- las reglas permanecen sin cambios;
- el proyecto remoto continúa bajo `deny-all`;
- no se amplía autorización;
- no se sustituye la consulta directa por otra consulta no autorizable;
- no se agrega filtrado cliente como mecanismo de seguridad;
- cuenta y Persona siguen operativas;
- ausencia de partidos en el dashboard no se interpreta como dominio vacío;
- no se agrega un placeholder “sin partidos” ni una falsa lista vacía que sugiera lectura exitosa;
- `groupsMap`, estados o imports sólo pueden retirarse si son exclusivos del flujo global de partidos;
- no se introduce autorización futura de Grupo/Membresía;
- el retiro no declara obsoletos Partido ni `matches` como conceptos;
- sólo se retira un consumidor prematuro;
- no se autoriza modificar `ProfileMatches`, ni páginas administrativas, públicas ni de detalle de partidos.

---

## 5. Requisito de solución y comportamiento esperado

### 5.1 Eliminación técnica

El dashboard debe dejar de montar o mantener cualquier lectura de `matches` vinculada al montaje del dashboard, especialmente si se reintroduce:

- un listener de `matches`;
- una lectura directa o indirecta de `matches`;
- una consulta global equivalente sobre `matches`;
- un wrapper, alias o repositorio cliente que consulte `matches` desde el montaje del dashboard.

Esto implica:

- retirar la consulta del montaje cuando su dataflow o comportamiento lo lea desde `matches`;
- retirar estados y efectos usados exclusivamente por ese flujo de lectura;
- retirar filtros y ordenamientos locales que dependan de dicho consumo;
- retirar imports, constantes y tipos que sean exclusivos del flujo global de partidos;
- no reemplazar la lectura por otra consulta no autorizable del mismo conjunto bajo alias, wrapper o composición equivalente.

No se prohíbe automáticamente cualquier `onSnapshot` en el dashboard. Otros listeners sobre colecciones distintas permanecen permitidos si no son dependencias exclusivas del consumidor global de partidos; la prueba debe seguir el dataflow de lectura de `matches` y no solo el símbolo `onSnapshot`.

### 5.2 Comportamiento visual

La sección visual alimentada sólo por `matches` debe retirarse o neutralizarse estructuralmente para no sugerir una consulta exitosa ni un estado de dominio vacío. La interfaz restante debe seguir siendo coherente y operativa.

### 5.3 Política de seguridad

Ningún cambio de E1-03 puede:

- abrir reglas;
- silenciar errores;
- interpretar falta de datos como “sin partidos”;
- reemplazar la consulta por un flujo client-side que filtre datos globales;
- crear lógica de autorización por Grupo y Membresía en este incremento.

---

## 6. Criterios de aceptación

Como mínimo:

1. al montar dashboard no existe una lectura de `matches`, ni un listener, ni una suscripción a ese conjunto que se active desde el montaje;
2. no aparece `permission-denied` originado por un consumo de `matches`;
3. no queda loading asociado a partidos;
4. no se muestra una lista vacía ni un placeholder que sugiera una consulta exitosa de partidos;
5. no quedan imports, estados, constantes o tipos muertos relacionados exclusivamente con ese consumo de `matches`;
6. navegación, cuenta y Persona siguen funcionando;
7. `/onboarding` y `/profile/info` conservan sus redirecciones;
8. no se modifican reglas, índices, dependencias o lockfiles;
9. las suites de E1-01 y E1-02 continúan pasando;
10. build, lint y typecheck pasan;
11. Emulator Suite utiliza proyecto `demo-*`;
12. Firebase remoto no cambia.

### Criterios adicionales de calidad

- La comprobación no puede depender sólo de una búsqueda textual aislada, porque puede eludirse mediante alias, wrapper o reexport;
- la prueba debe seguir el dataflow de lectura de `matches` desde el montaje del dashboard o demostrar comportamiento observable del render y del montaje;
- la prueba debe fallar si se reintroduce un listener de `matches`, una consulta global equivalente, una lectura directa o indirecta de `matches` o un wrapper/repo cliente que consulte ese conjunto en montaje del dashboard;
- otros listeners del dashboard sobre colecciones distintas no quedan prohibidos automáticamente; sólo deben retirarse si eran dependencias exclusivas del flujo global de partidos;
- las verificaciones deben distinguir el consumo prematuro de `matches` del uso contextual de otras colecciones o datos válidos del dashboard.

---

## 7. Pruebas mínimas exigidas

### 7.1 Requerimientos de pruebas

Exigir:

- prueba arquitectónica o de dataflow que falle si el dashboard vuelve a montar un listener de `matches`, una lectura directa o indirecta de `matches`, una consulta global equivalente o un wrapper/repo cliente que consulte `matches` desde el montaje;
- prueba que compruebe la ausencia de los estados y efectos exclusivos del flujo global de partidos;
- regresión de render o build del dashboard;
- regresión de E1-01 y E1-02;
- reglas existentes sin cambios y pruebas de mínima lectura preservadas;
- UAT de dashboard autenticado sin errores `matches`;
- UAT de cuenta y Persona accesibles desde navegación;
- verificación escritorio y móvil.

### 7.2 Prueba mínima recomendada

La prueba debe validar la superficie real con un nivel suficiente para hacer falla el código si se reintroduce el consumo global de `matches`:

- inspeccionar el render de la página y el dataflow del montaje;
- verificar que el dashboard no dispara un listener, query o acceso a `matches` desde la carga inicial;
- verificar que no existen rutas de lectura de `matches` por alias, wrapper o repositorio cliente en el montaje del dashboard;
- verificar que no existen estados como `matchesLoading`, `matches` o `groupsMap` asociados exclusivamente al flujo global de partidos;
- verificar que el dashboard carga sin invocar lectura directa ni indirecta de `matches`.

La prueba textual aislada puede complementar, pero no sustituye una prueba de comportamiento o arquitectura. Debe seguir el dataflow de lectura de `matches` y detectar reintroducciones por alias, helper o composición modular.

---

## 8. UAT (prueba de aceptación de usuario)

Definir una UAT breve y verificable:

1. iniciar emuladores y frontend local;
2. autenticar Usuario sintético;
3. cargar dashboard;
4. comprobar ausencia de consultas y errores de `matches`;
5. comprobar que el dashboard no queda cargando;
6. comprobar que no aparece una sección engañosa de partidos;
7. navegar a Cuenta;
8. navegar a Persona;
9. cerrar y volver a abrir sesión;
10. repetir en vista móvil.

Resultado esperado: dashboard operativo, sin `permission-denied`, sin loading de partidos, sin consulta directa ni representación vacía engañosa, con navegación y contexto de cuenta/persona intactos.

---

## 9. Riesgos

Registrar explícitamente:

- eliminación accidental de UI compartida;
- dejar código muerto;
- silenciar el error sin retirar la consulta;
- introducir anticipadamente autorización deportiva;
- confundir retiro del consumidor con eliminación del concepto Partido;
- afectar consumidores contextuales válidos fuera del dashboard;
- tests demasiado textuales y fáciles de evadir.

---

## 10. Rollback

El rollback debe limitarse a revertir E1-03. No existe rollback automático hacia el consumidor global de `matches` conocido como inválido.

La política es la siguiente:

- si la modificación rompe otra parte del dashboard, se corrige o revierte únicamente la porción defectuosa sin restaurar la consulta global de `matches`;
- si técnicamente fuera imprescindible revertir todo el commit, E1-03 se considera reabierto y el `permission-denied` vuelve a ser un riesgo activo; no puede declararse el incremento cerrado;
- nunca se abren reglas como mecanismo de rollback;
- cuenta, Persona y reglas permanecen intactas;
- no se restaura ni reintroduce la lectura global de partidos como recuperación aceptable.

No existe autorización para desplegar ni tocar el proyecto remoto como parte del rollback.

---

## 11. Evidencia y cierre

La evidencia debe almacenarse en:

- `docs/implementacion/etapa-1/`

La ficha debe exigir:

- informe de implementación;
- inventario Git;
- gates automatizados;
- revisión independiente;
- UAT;
- cierre formal.

### Evidencia mínima esperada

- rama/HEAD verificado;
- archivo de ficha creado;
- `git diff --check` ejecutado y revisado;
- `git status --short` revisado;
- `git diff --stat` revisado;
- `git diff --name-status` revisado;
- `git ls-files --others --exclude-standard` revisado;
- evidencia del resultado de build/lint/typecheck/tests con guardas locales;
- evidencia de ausencia de lectura de `matches` en el dataflow real del dashboard, no sólo ausencia textual del símbolo `onSnapshot`;
- evidencia de que el consumo global no se reintrodujo ni por alias, wrapper o repositorio cliente.

---

## 12. Estado documental

- **estado:** `LISTO PARA IMPLEMENTAR`
- **fecha de cierre:** pendiente
- **commit de implementación:** pendiente
- **despliegue remoto:** no autorizado

---

## 13. Verificación final requerida

Ejecutar y revisar íntegramente:

```bash
git diff --check
git status --short
git diff --stat
git diff --name-status
git ls-files --others --exclude-standard
```

No se debe afirmar que `git diff --check` cubre el archivo no rastreado. Se revisa íntegramente el resultado y se documenta el estado Git real.

### Entrega requerida

1. rama y HEAD
2. archivo creado
3. resumen de frontera
4. criterios de aceptación
5. estado Git final

No se realiza commit ni push.

---

E1-03 FICHA LISTA PARA IMPLEMENTAR
