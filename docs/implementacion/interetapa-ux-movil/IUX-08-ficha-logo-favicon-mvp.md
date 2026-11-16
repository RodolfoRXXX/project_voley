# IUX-08 — Logo y favicon del MVP

## Estado

- **Estado:** `CERRADO — UAT HUMANA APROBADA — SIN DESPLIEGUE NI CAMBIOS DE DATOS UAT`.
- **Fecha:** 16 de noviembre de 2026.
- **Base verificada:** `dev@5aa0806f86fbbade1dc9883b96adce8cb0caccc3`, alineada con `origin/dev` al iniciar.
- **Rama:** `feat/iux-08-logo-favicon`.
- **Referencia visual aprobada:** variante `Recomendado` de
  `visuals/iux-08-logo-comparativa.html`.
- **Implementación:** `fa9c6b75efafe0402cb275785502b12a390c2ef8`.
- **Aprobación humana:** el Product Owner aprobó expresamente la propuesta y, después, la UAT del
  logo y favicon implementados en el BUILD_ID `dnj8IFSPvltjJWJUtg7ah`.
- **Publicación autorizada:** commits e integración mediante push normal; sin despliegue.

## Objetivo y alcance

Aplicar en todas las apariciones de la Navbar el wordmark aprobado `SPORTEXA`, con una única familia
sans-serif y la `X` naranja del mismo tamaño, peso y línea base que las demás letras. Reemplazar el
favicon por la `X` naranja aprobada sobre azul noche, con imágenes nativas de 16, 32, 48 y 256 px.

Se conservan sin cambios:

- el enlace del logo a `/`;
- la posición centrada en escritorio y la composición en flujo a 360/390 px;
- la Navbar pública y autenticada, sus controles de sesión y el drawer móvil;
- las variables de tema claro/oscuro y el resto de la identidad visual;
- `Mi perfil`, `Agregar integrantes`, rutas, datos y permisos.

Quedan fuera del incremento cualquier rediseño adicional de marca, cambios de navegación,
autenticación o contenido, y la edición o versionado de `visuals/`.

## Implementación comprobada

| Archivo | Aplicación |
| --- | --- |
| `volley-ranking-frontend/src/components/layout/SportexaLogo.tsx` | Wordmark único `SPORTEXA`, `X` de acento, enlace `/` y nombre accesible `SPORTEXA — Ir al inicio` |
| `volley-ranking-frontend/src/app/globals.css` | Pila sans, 20 px, peso 500, tracking `0.075em`, línea base común, colores por tema y foco naranja visible |
| `volley-ranking-frontend/src/app/layout.tsx` | Variable `--font-brand` con una única pila sans-serif para todo el wordmark |
| `volley-ranking-frontend/src/app/favicon.ico` | ICO PNG multirresolución con entradas 16×16, 32×32, 48×48 y 256×256 |

### Especificación aplicada

- Texto: `SPORTEXA`, en mayúsculas.
- Familia: `Inter, "Segoe UI", Roboto, Arial, sans-serif`.
- Tamaño/peso: `20 px / 500` para todas las letras, incluida la `X`.
- Tracking y línea: `0.075em / 1`.
- Color de la `X`: `#ff6a00`.
- Texto en tema claro: variable vigente `--logo-text` (`#0b1120`).
- Texto en tema oscuro: variable vigente `--logo-text` (`#ffffff`).
- Favicon: `X` naranja `#ff6a00` sobre azul noche `#0b1120`, replicando la propuesta aprobada.
- Foco del enlace: contorno naranja de 2 px con separación de 4 px.

`SportexaLogo` continúa siendo el único componente de marca de la Navbar global. Por eso la misma
implementación se usa tanto en Inicio público como en la barra autenticada; el sidebar no presenta
una segunda copia del logo.

## Criterios de aceptación

1. La Navbar muestra `SPORTEXA` con una sola familia sans-serif y sin tratamiento manuscrito.
2. La `X` es naranja y comparte tamaño, peso, altura y alineación con el resto del nombre.
3. El logo conserva su destino `/` y ofrece foco visible por teclado.
4. A 1440×900, 360×800 y 390×844 no se superpone con login, cuenta ni menú, ni genera overflow
   horizontal.
5. La marca mantiene contraste y legibilidad en tema claro y oscuro, tanto sin sesión como con
   sesión.
6. La Navbar autenticada conserva cuenta, sidebar/drawer y comportamiento responsive.
7. `favicon.ico` contiene representaciones 16, 32, 48 y 256 px; la `X` sigue siendo reconocible a
   16 y 32 px.
8. La implementación no introduce cambios fuera de logo, favicon y documentación IUX-08.

## Validación técnica

| Verificación | Resultado local |
| --- | --- |
| `npm run typecheck` | PASS |
| `npx eslint src/components/layout/SportexaLogo.tsx src/app/layout.tsx` | PASS |
| `npm run build` | PASS — Next.js 16.1.3; reconstrucción final `TnpH5WxHR0BoSibefP99-` |
| `git diff --check` | PASS |
| Estructura ICO | PASS — entradas 16/32/48/256 px, 32 bpp, comprimidas como PNG |
| Inspección favicon 16/32 | PASS — `X` naranja centrada y legible sobre azul noche |
| Cuenta administradora, 1440×900 | PASS — Navbar/sidebar sin overflow ni regresión de navegación |
| Cuenta administradora, 360×800 | PASS — marca/control sin solapamiento, drawer abre/cierra y sin overflow |
| Cuenta administradora, 390×844 | PASS — marca/control sin solapamiento, drawer abre/cierra y sin overflow |
| Navbar pública, temas claro/oscuro, 1440/360/390 | PASS — seis escenarios con viewport exacto, contraste y sin solapamiento/overflow |

**BUILD_ID aprobado en UAT:** `dnj8IFSPvltjJWJUtg7ah`.

**BUILD_ID de reconstrucción final:** `TnpH5WxHR0BoSibefP99-`.

La prueba autenticada reutiliza el fixture de navegador de IUX-07, que monta los componentes reales
`Navbar`, `AppSidebar`, `SportexaLogo` y estilos actuales con una cuenta administradora sintética.
No usa ni modifica datos UAT. Las verificaciones de logo agregan inspección visual del build real y
de los recursos 16/32 px.

El runner heredado de IUX-07 pasó en escritorio, pero su selector original del botón móvil agotó el
tiempo de espera a 360 px. Se aisló como fragilidad del harness: un verificador temporal fuera del
repositorio, con selector DOM robusto y las mismas piezas reales, pasó a 360×800 y 390×844 todas las
aserciones de logo, tema, foco, apertura/cierre del drawer, navegación y overflow. No se modificó la
prueba de IUX-07 porque queda fuera del diff autorizado.

El build aprobado quedó servido para UAT en `http://127.0.0.1:3000`. Las capturas del build público, en los
seis cruces de tema y viewport, y las extracciones 16/32 del favicon se guardaron fuera del repo en
`C:\Users\Rodolfo\AppData\Local\Temp\sportexa-iux-08-evidencia\`. El banner inferior visible en
las capturas corresponde al modo emulador del entorno local y no forma parte de IUX-08.

## Aprobación humana y clasificación de evidencia

El 16 de noviembre de 2026 el Product Owner confirmó la UAT del logo y favicon de SPORTEXA en el
BUILD_ID `dnj8IFSPvltjJWJUtg7ah` y autorizó el cierre, versionado, integración en `dev` y push
normal. Esta confirmación acredita humanamente el resultado general del logo y del favicon del
incremento.

La aprobación no enumeró resultados humanos independientes para cada cruce de sesión, viewport y
tema. La evidencia individual de 1440×900, 360×800, 390×844, temas claro/oscuro, cuenta
administradora, foco, overflow y favicon 16/32 corresponde a las verificaciones técnicas y capturas
registradas arriba. La reconstrucción final `TnpH5WxHR0BoSibefP99-` acredita las mismas fuentes
versionadas después de la UAT; no se presenta como un segundo recorrido humano.

## Matriz de UAT solicitada

| Sesión | Viewport | Tema | Comprobar |
| --- | --- | --- | --- |
| Pública | 1440×900 | claro/oscuro | centrado, contraste, foco, login sin solapamiento |
| Pública | 360×800 y 390×844 | claro/oscuro | marca completa, menú accesible y sin overflow |
| Administradora | 1440×900 | claro/oscuro | centrado frente a controles de cuenta y sidebar |
| Administradora | 360×800 y 390×844 | claro/oscuro | marca, botón de menú, drawer y cambio de tema |
| Cualquiera | favicon 16/32 | no aplica | forma, color, centrado y reconocimiento de la `X` |

## Evidencia, rollback y pendientes

- La comparativa aprobada se preserva en `visuals/iux-08-logo-comparativa.html`, deliberadamente
  fuera del seguimiento de Git y fuera del diff implementable.
- Las capturas técnicas, si se generan, se guardan fuera del árbol versionable.
- El rollback de código consiste en restaurar los cuatro archivos de aplicación listados; no hay
  migraciones ni datos que revertir.
- No queda una decisión funcional ni una UAT pendiente dentro de IUX-08. No se ejecutaron
  despliegue, seeds, migraciones, limpieza ni cambios de datos UAT.
