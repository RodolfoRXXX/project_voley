# E0-07A — Consolidación de decisiones y plan de contención remota

**Proyecto:** SPORTEXA

**Fecha:** 17 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `40c583095ae50080d344a8858e59c173d8622acf`

**Alcance:** resolución documental posterior a E0-07 y caracterización agregada de Storage; no ejecuta contención, export, rotación ni eliminación.

**Veredicto:** **COMPLETADO — decisiones consolidadas; contención remota pendiente de autorización inmediata**

## 1. Precondiciones y alcance ejecutado

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-07 versionado | HEAD `40c5830` (`docs(etapa-0): documentar verificacion remota E0-07`) | Cumplido |
| Estado inicial | Git limpio | Cumplido |
| Sesión Firebase | Una sesión autorizada existente; identidad y tokens filtrados | Cumplido |
| Secreto local | `.secret.local` ignorado y no versionado | Cumplido |
| Proyecto remoto | `project-groupvolley` | Confirmado por E0-07; no se consultaron otros proyectos |
| Escritura remota | Ninguna | Cumplido |

E0-07 no se modifica ni se reinterpreta retroactivamente. Sus observaciones técnicas continúan siendo evidencia válida. E0-07A registra decisiones posteriores del propietario y agrega sólo metadata agregada de Storage obtenida mediante GET con selección parcial. La consulta no solicitó nombres, rutas, URLs, ACL, propietarios ni contenido de objetos.

## 2. Hechos técnicos confirmados por E0-07

E0-07 comprobó, al 17 de agosto de 2026:

- proyecto Firebase activo `project-groupvolley`, con una aplicación Web;
- seis cuentas Authentication, todas con inicio de sesión dentro de los 90 días anteriores;
- seis documentos `users` correspondientes exactamente con esas seis cuentas;
- 44 documentos raíz en 12 colecciones y 4 documentos `pendingAlerts` en subcolecciones;
- cero referencias rotas en 21 relaciones conocidas;
- dos suscripciones push usadas dentro de los 90 días anteriores;
- 55 Functions activas, un sitio Hosting, dos buckets Storage y ninguna instancia RTDB;
- la Function remota `updateUserRole` activa, callable y ausente de la rama;
- reglas Firestore remotas coincidentes con una versión histórica anterior a E0-03/E0-04;
- lecturas públicas amplias y creación propia de Usuario con campos privilegiados todavía permitidas remotamente;
- correcciones de E0-03 y E0-04 versionadas y verificadas localmente, pero no desplegadas.

Nada de lo decidido en E0-07A invalida estos hechos.

## 3. Interpretación funcional confirmada por el propietario

El propietario confirma que las seis cuentas pertenecen exclusivamente a testers y que la actividad reciente corresponde a pruebas. No existen usuarios productivos que deban conservarse.

También confirma que:

- Firestore no contiene información con valor operativo, comercial, histórico o legal;
- Authentication no contiene identidades productivas;
- el frontend actualmente desplegado no requiere compatibilidad durante la transición;
- se acepta una interrupción completa;
- las suscripciones push pueden invalidarse;
- los testers podrán autenticarse y suscribirse nuevamente después de la rehabilitación.

Por tanto, “actividad reciente” y “usuario productivo” quedan diferenciados:

| Concepto | Evidencia o decisión |
| --- | --- |
| Actividad técnica | Existió y permanece registrada en E0-07 |
| Actor funcional | Testers exclusivamente, confirmado por el propietario |
| Obligación de continuidad | No existe para esas cuentas o datos |
| Valor de preservación | Rechazado expresamente para Firestore y Authentication |
| Riesgo de seguridad remoto | Permanece; no depende del carácter productivo de los usuarios |

## 4. Decisiones aprobadas

Queda aprobado documentalmente que, en una intervención futura con autorización inmediata propia:

1. las seis cuentas actuales de Authentication pueden eliminarse;
2. los documentos, colecciones, subcolecciones y campos actuales de Firestore pueden eliminarse o reinicializarse;
3. no se realizará migración documento por documento al nuevo modelo;
4. no se requiere doble escritura ni coexistencia prolongada;
5. el modelo remoto legado no será fuente de verdad de la nueva implementación;
6. no se conservará compatibilidad con el frontend desplegado;
7. puede existir interrupción completa durante la transición;
8. las dos suscripciones push actuales pueden descartarse;
9. los testers deberán autenticarse y registrar nuevamente suscripciones en el ambiente rehabilitado.

Estas decisiones **no autorizan todavía** ninguna operación remota. Cada servicio conserva alcance y autorización independientes.

## 5. Decisión explícita de no realizar export

El propietario decide:

- no exportar preventivamente Firestore;
- no exportar preventivamente Authentication;
- aceptar la pérdida definitiva de esos documentos y cuentas cuando su eliminación sea autorizada;
- conservar como evidencia sólo el inventario agregado de E0-07, esta resolución y la trazabilidad Git.

Esta decisión cierra la recomendación preventiva formulada por E0-07 para esos dos servicios. No se ejecutó ni preparó un export. La renuncia al respaldo no se extiende automáticamente a Storage, Hosting, Functions o Secret Manager.

Una futura eliminación deberá volver a comprobar inmediatamente antes de ejecutarse:

1. project ID y ambiente exactos;
2. alcance por servicio y cantidades esperadas;
3. comandos exactos y sus efectos irreversibles;
4. autorización explícita posterior a la presentación de esos comandos;
5. resultado agregado y ausencia de afectación a otros proyectos.

## 6. Caracterización agregada de Storage

Se consultó únicamente metadata parcial mediante operaciones GET. Los buckets se identifican en este informe por ubicación, no por nombre.

| Bucket técnico | Estado | Ubicación | Clase | Objetos activos | Tamaño aproximado | Tipo general |
| --- | --- | --- | --- | ---: | ---: | --- |
| Bucket 1 | Disponible | `SOUTHAMERICA-EAST1` | Standard | 9 | 1,1 MiB | `application/*`: 9 |
| Bucket 2 | Disponible | `US-CENTRAL1` | Standard | 102 | 14,4 MiB | `application/*`: 102 |
| **Total** | — | 2 ubicaciones | — | **111** | **15,5 MiB** | **`application/*`: 111** |

### 6.1 Distribución temporal aproximada

| Antigüedad desde creación | Bucket 1 | Bucket 2 | Total |
| --- | ---: | ---: | ---: |
| 0–30 días | 0 | 0 | 0 |
| 31–90 días | 8 | 101 | 109 |
| 91–365 días | 1 | 1 | 2 |
| Más de 365 días | 0 | 0 | 0 |
| Timestamp no disponible | 0 | 0 | 0 |

No se descargó ningún objeto y el API no devolvió nombres, rutas ni URLs porque la selección parcial solicitó sólo tamaño, tipo y timestamps.

### 6.2 Clasificación

El volumen pequeño, la concentración temporal, el tipo general homogéneo y el contexto de testers son **compatibles con material de prueba**. Sin inspeccionar contenido no puede demostrarse semánticamente que cada objeto sea prescindible. La clasificación aplicable es:

> **Probable material de prueba, con confianza suficiente para solicitar una decisión de descarte, pero no para extender automáticamente la autorización de Firestore.**

La posible eliminación de cada bucket y de sus objetos queda pendiente de una decisión expresa e independiente. No se consultaron generaciones no activas, contenido, ACL ni metadata personal.

## 7. Consecuencias arquitectónicas obligatorias

Los Documentos 1–4 y las correcciones de Etapa 0 ya determinan que:

- `updateUserRole` debe retirarse del ambiente remoto;
- ningún cliente puede concederse privilegios globales;
- las reglas permisivas deben sustituirse por las reglas seguras versionadas;
- la autorización deportiva debe ser contextual;
- la identidad privada debe quedar cerrada por defecto;
- el modelo legado remoto no será fuente de verdad;
- no se requiere migración de los documentos actuales, doble escritura ni coexistencia prolongada.

Estas conclusiones no vuelven a abrirse como decisiones arquitectónicas en E0-07B o E0-08. Sólo falta autorizar y ejecutar su materialización remota de manera controlada.

## 8. Plan de contención remota prioritaria

Se propone un incremento separado **E0-07B — Contención remota prioritaria**. No incluirá eliminación de datos, cuentas, objetos, secretos o Hosting.

### 8.1 Preparación y punto de autorización

1. confirmar rama, commit versionado de E0-07A y Git limpio;
2. ejecutar `npm run quality:stage0` exclusivamente con proyecto demo y emuladores;
3. comprobar que no queden emuladores huérfanos;
4. resolver nuevamente el project ID por alias local y metadata remota;
5. confirmar que el único objetivo sea `project-groupvolley`;
6. verificar por metadata que `updateUserRole` siga activa y que el hash remoto de reglas siga siendo el observado en E0-07;
7. abrir y registrar una ventana completa de mantenimiento;
8. presentar los comandos exactos, recursos alcanzados, orden, impacto y recuperación;
9. detenerse y obtener autorización explícita inmediatamente anterior a la primera escritura.

El prompt de inicio de E0-07B no constituye por sí mismo la autorización final para delete/deploy.

### 8.2 Secuencia autorizable

Después de esa segunda autorización:

1. retirar únicamente la Function `updateUserRole` de `us-central1`;
2. comprobar por listado que no permanezca desplegada ni exista otro endpoint remoto equivalente ausente de la rama;
3. desplegar exclusivamente las reglas Firestore versionadas y probadas, sin Functions, índices, Hosting o datos;
4. recuperar las reglas efectivamente desplegadas y comprobar que su hash coincida con la rama;
5. verificar mediante lecturas que un visitante no pueda leer identidad ni documentos privados;
6. verificar que una identidad propia pueda conservar el acceso mínimo previsto sin modificar datos remotos;
7. comprobar mediante metadata y suite local que no sobreviva un camino público de autopromoción;
8. registrar resultados y cerrar la ventana sólo si todos los controles aprueban.

No se invocará `updateUserRole`, ni siquiera como prueba negativa previa. Su ausencia se demostrará por inventario de Functions y, después del retiro, por inexistencia de la superficie desplegada.

### 8.3 Reversión segura

La versión vulnerable no es un rollback admisible:

- nunca se volverá a desplegar `updateUserRole`;
- nunca se restaurarán las reglas remotas permisivas de E0-07;
- si la política versionada produce incompatibilidad, se mantendrá la ventana y el estado cerrado;
- la recuperación deberá usar un ruleset previamente revisado que conserve privado por defecto y la contención de privilegios;
- cualquier rollback de código deberá partir de un commit que ya excluya `updateUserRole`;
- si no existe un artefacto de recuperación seguro y verificable, la primera escritura no debe comenzar.

### 8.4 Evidencia de cierre

- project ID y número confirmados;
- commit y gate aprobados;
- autorización inmediata registrada;
- `updateUserRole` ausente del inventario remoto;
- ninguna Function remota adicional ausente de la rama;
- hash remoto de reglas igual al local aprobado;
- lecturas privadas cerradas y acceso propio mínimo verificado sin escritura;
- ausencia de deploys o eliminaciones fuera de los dos recursos autorizados;
- Git limpio salvo el informe de la intervención;
- registro de la ventana y del resultado.

## 9. Separación entre seguridad y eliminación de datos

La contención de seguridad debe ejecutarse antes y separadamente porque:

- elimina exposición activa sin ampliar el alcance destructivo;
- puede verificarse sin borrar datos de testers;
- facilita atribuir cualquier fallo a reglas o Functions, no a una limpieza simultánea;
- exige su propia autorización de delete/deploy;
- la eliminación de Firestore y Authentication exige inventarios, comandos y autorizaciones diferentes.

E0-08 continuará siendo **preparación destructiva**, no ejecución. Deberá preparar checklists separados para:

1. Firestore;
2. Authentication;
3. cada bucket Storage;
4. Functions distintas de la contención ya resuelta;
5. Hosting;
6. versiones de Secret Manager.

La ejecución destructiva posterior deberá ser otro acto autorizado inmediatamente antes de realizarse. No se mezclará con E0-07B.

## 10. Plan VAPID y push, sin ejecución

1. identificar por metadata qué versiones están asociadas a Functions sin acceder a valores;
2. definir un mecanismo local/operativo ignorado por Git para generar el nuevo par;
3. registrar el par nuevo sólo en almacenamiento local seguro y Secret Manager;
4. coordinar el cambio de clave pública del frontend con el uso de la clave privada en Functions;
5. desplegar frontend y Functions dentro de una ventana propia;
6. verificar envío con testers y datos sintéticos controlados;
7. deshabilitar primero las versiones comprometidas, manteniendo una recuperación temporal segura;
8. destruir versiones anteriores sólo con una autorización posterior específica;
9. eliminar separadamente las dos suscripciones actuales y solicitar reinscripción a los testers;
10. comprobar que Git, logs e informes no contengan valores VAPID, tokens, endpoints o credenciales.

La rotación requiere escrituras en Secret Manager y despliegues; el descarte de suscripciones requiere escrituras Firestore. Ninguna de esas operaciones está autorizada por E0-07A ni debe mezclarse implícitamente con E0-07B.

## 11. Operaciones que todavía requieren autorización

| Operación | Servicio | Autorización pendiente |
| --- | --- | --- |
| Retirar `updateUserRole` | Functions | Inmediata, después de presentar comando e impacto |
| Desplegar reglas seguras | Firestore Rules | Inmediata, después de presentar comando, hash y recuperación |
| Eliminar documentos y subcolecciones | Firestore | Intervención destructiva independiente |
| Eliminar seis cuentas | Authentication | Intervención destructiva independiente |
| Eliminar 111 objetos o buckets | Storage | Decisión de descarte y autorización por bucket |
| Crear/deshabilitar/destruir versiones VAPID | Secret Manager | Intervención de rotación independiente |
| Descartar suscripciones push | Firestore | Autorización explícita de limpieza |
| Desplegar frontend/Functions para VAPID | Hosting/Functions | Ventana y autorización de deploy |
| Modificar Hosting restante | Hosting | No decidido |

La decisión de no exportar Firestore/Auth es expresa y no requiere nueva aprobación, pero tampoco autoriza sus borrados.

## 12. Siguiente incremento propuesto

El siguiente incremento recomendado es:

> **E0-07B — Contención remota prioritaria de autopromoción y reglas permisivas**

Su único cambio remoto autorizable será retirar `updateUserRole` y desplegar las reglas seguras ya versionadas. Debe presentar primero comandos exactos y detenerse para una autorización inmediata. No incluirá eliminación de datos, Authentication, Storage, suscripciones, rotación VAPID, Hosting, índices, otras Functions ni Etapa 1.

Después de E0-07B:

1. E0-08 preparará los alcances destructivos separados, sin ejecutarlos;
2. una intervención VAPID independiente preparará y ejecutará la rotación con su propia autorización;
3. las eliminaciones efectivas requerirán una autorización posterior inmediata por servicio.

## 13. Prompt exacto para iniciar E0-07B

El siguiente prompt inicia el preflight y exige un segundo punto de autorización antes de cualquier escritura:

```text
Quiero continuar la ejecución técnica controlada del Documento 5.

Ejecuta exclusivamente:

# E0-07B — CONTENCIÓN REMOTA PRIORITARIA DE AUTOPROMOCIÓN Y REGLAS PERMISIVAS

Utiliza como referencia los Documentos 1–5, la auditoría técnica y los informes E0-01 a E0-07A de la rama `chore/etapa-0-estabilizacion`.

Objetivo:

Contener en `project-groupvolley` los dos riesgos remotos confirmados: la Function callable activa `updateUserRole` y las reglas Firestore permisivas anteriores a E0-03/E0-04.

Esta solicitud autoriza únicamente el preflight de sólo lectura y la preparación exacta de la intervención. No constituye todavía autorización para ejecutar delete o deploy.

Preflight obligatorio:

1. confirma que E0-07A esté revisado y versionado;
2. confirma rama, commit y Git limpio;
3. ejecuta `npm run quality:stage0` y utiliza sólo emuladores con project ID `demo-*`;
4. confirma que `.secret.local` siga ignorado y no versionado;
5. comprueba que no existan emuladores huérfanos;
6. confirma la sesión Firebase sin mostrar identidad, tokens o credenciales;
7. resuelve nuevamente el alias, project ID, nombre y número del proyecto;
8. detente si el objetivo no es inequívocamente `project-groupvolley`;
9. verifica por metadata que `updateUserRole` continúe activa en `us-central1` y que no existan otras Functions remotas ausentes de la rama;
10. recupera las reglas desplegadas mediante GET, compara hashes y confirma que el archivo local es el ruleset seguro probado en E0-03/E0-04;
11. confirma que existe una ventana completa de mantenimiento;
12. prepara una recuperación segura que nunca restaure `updateUserRole` ni las reglas permisivas.

Antes de cualquier escritura remota:

1. presenta los comandos exactos, sin ejecutarlos;
2. explica el recurso exacto, región, proyecto, impacto y resultado esperado de cada comando;
3. delimita que sólo se retirará `updateUserRole` y sólo se desplegarán reglas Firestore;
4. presenta el plan de verificación y reversión segura;
5. detente y solicita mi autorización explícita inmediata.

Sólo después de una nueva autorización expresa podrás:

1. retirar exclusivamente `updateUserRole` de `us-central1`;
2. verificar que desapareció del inventario remoto;
3. desplegar exclusivamente `volley-ranking-system/firestore.rules` en `project-groupvolley`;
4. recuperar las reglas desplegadas y comprobar que su hash coincide con la versión local autorizada;
5. ejecutar verificaciones remotas de lectura positivas y negativas que no creen, modifiquen ni eliminen datos;
6. confirmar que las lecturas privadas están cerradas y que no queda una superficie remota de autopromoción;
7. crear `docs/implementacion/etapa-0/E0-07B-contencion-remota-prioritaria.md` con la evidencia agregada.

No debes eliminar datos Firestore, cuentas Authentication, objetos Storage, suscripciones, secretos, otras Functions ni Hosting. No debes modificar IAM, índices, código productivo o frontend. No debes exportar, migrar, ejecutar backfills, comenzar E0-08 o iniciar Etapa 1. No hagas commit ni push.

Si no existe una recuperación segura o cualquier comando abarca más de los dos recursos autorizables, detente sin escribir.
```

## 14. Archivos modificados y veredicto

- `docs/implementacion/etapa-0/E0-07A-decisiones-y-plan-contencion-remota.md` — este informe.

No se modificó E0-07, código productivo, reglas, pruebas, dependencias, lockfiles, configuración ni secretos. No se desplegó, eliminó, exportó, rotó, migró ni invocó ninguna Function. No se hizo commit ni push.

**COMPLETADO — decisiones consolidadas; contención remota pendiente de autorización inmediata.**
