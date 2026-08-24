# E1-02 - Cierre formal

## 1. Identificacion

- Incremento: E1-02 - Alta de Persona propia y vinculacion inicial.
- Etapa: Etapa 1 - Usuario, Persona y autorizacion contextual.
- Fecha de cierre: 2026-08-24.
- Rama: `feat/e1-02-persona-vinculacion-inicial`.
- Commit de implementacion: `dc433dfa6c8827f129a327b2eddc71a0a51eb951`.
- Ficha normativa: `docs/implementacion/etapa-1/E1-02-ficha.md`.
- Informe de implementacion: `docs/implementacion/etapa-1/E1-02-informe-implementacion.md`.

Este documento cierra unicamente E1-02. No declara cerrada la Etapa 1 ni define el alcance de E1-03.

## 2. Alcance cerrado

E1-02 implemento exclusivamente:

- alta de Persona propia por el Usuario autenticado;
- consulta de Persona propia;
- vinculo inicial `Usuario.personaId`;
- Persona independiente de Usuario;
- documento Persona con los campos exactos `nombre`, `apellido`, `emailContacto` y `createdAt`;
- backend como unico escritor de Persona y del vinculo;
- operacion transaccional e idempotente;
- presentacion de Persona existente en modo de solo lectura.

La identidad y el objetivo funcional se derivan del Usuario autenticado. El cliente no selecciona Usuario, Persona ni vinculo objetivo.

## 3. Persistencia y ownership

La persistencia final es:

```text
personas/{personaId}
users/{firebaseUid}.personaId
```

Persona permanece separada del Agregado Usuario. El vinculo no crea una referencia inversa ni copia datos personales en Usuario. El alta y el vinculo se realizan como una operacion atomica; no se admite Persona nueva huerfana ni vinculo nuevo roto.

## 4. Exclusiones preservadas

E1-02 no incorporo:

- edicion de Persona;
- invitaciones;
- Solicitudes;
- busqueda de coincidencias;
- vinculacion iniciada por administrador;
- fusion;
- desvinculacion;
- foto de cuenta;
- preferencias;
- Membresias;
- Grupos;
- roles deportivos;
- Plan o Suscripcion;
- capacidades comerciales.

Se preserva la distincion:

`autorizacion funcional != habilitacion comercial != validez de dominio`

CU-006 queda atendido solo parcialmente, respecto del alta propia y su vinculacion en el mismo acto. CU-007 permanece excluido. No se declara implementable E1-03 ni se le asigna alcance: requiere evaluacion y su propia Ficha de Incremento Implementable.

## 5. Evidencia automatizada

Los resultados confirmados son:

| Verificacion | Resultado |
|---|---|
| Prueba especifica del callable `selfPersonCallable.test.js` | 4/4 aprobadas |
| Pruebas unitarias/tooling/arquitectura segun gate | 67/67 aprobadas |
| Emulator Suite | 43/43 aprobadas |
| Reglas de mantenimiento | 7/7 aprobadas |
| Build frontend | 19/19 paginas aprobadas |

La baseline previa de Emulator Suite era `32/32`. Los 10 escenarios E1-02 registrados en el informe son una agrupacion funcional de comportamientos, no diez pruebas individuales. El runner incorporo 11 pruebas automatizadas adicionales y el resultado final observado fue `43/43`. No se afirma una correspondencia uno a uno entre los escenarios funcionales y esas pruebas.

La evidencia persistente utilizo el proyecto de prueba `demo-sportexa-e0-02`, Auth, Firestore y Functions Emulator en hosts loopback, con datos sinteticos descartables. Firebase remoto permanecio sin cambios y fuera de alcance. No hubo despliegues remotos.

## 6. Correccion de revision E1-02-MED-01

Se identifico el hallazgo `E1-02-MED-01`: el callable registraba un objeto de error interno. La correccion elimino ese objeto del log y lo sustituyo por el mensaje constante sanitizado `Person callable failed`.

La prueba de regresion especifica verifica que el log no expone stacks, codigos, detalles internos, payload ni datos personales, y que el mapeo publico conserva `PERSON_PERSISTENCE_FAILED`. La prueba paso `4/4`.

La reverificacion independiente fue satisfactoria. El hallazgo queda registrado como:

`E1-02-MED-01 CORREGIDO`

## 7. UAT manual

| Identificador | Resultado | Evidencia observada |
|---|---|---|
| UAT-01 | APROBADO | Sesion y dashboard disponibles sin Persona vinculada; formulario accesible. |
| UAT-02 | APROBADO | Alta correcta y mensaje de exito observado. |
| UAT-03 | APROBADO | Recarga con la misma Persona, sin duplicacion. |
| UAT-04 | APROBADO | Persona con `nombre`, `apellido`, `emailContacto` y `createdAt`; vista de solo lectura. |
| UAT-05 | APROBADO | Sin controles de edicion ni escrituras directas desde la interfaz. |
| UAT-06 | APROBADO | Vinculo persistente despues de cerrar y abrir sesion. |
| UAT-07 | APROBADO | Reejecucion idempotente: misma Persona y mismo `personaId`. |

Veredicto UAT:

`UAT E1-02 APROBADA`

## 8. Seguridad y autorizacion

- El cliente no tiene escritura directa sobre `personas`.
- El cliente no puede escribir `users.personaId`.
- El backend es el unico escritor de Persona y del vinculo.
- Los roles globales no derivan privilegios adicionales para este flujo.
- El cliente no elige otro Usuario ni otra Persona.
- Las reglas de Firestore deniegan lectura y escritura cliente de `personas`.
- El proyecto remoto permanecio bajo `deny-all` y sin cambios.
- No se realizaron despliegues remotos.

## 9. Riesgo externo: `matches`

Durante la UAT se observaron errores `permission-denied` en listeners legados de `matches`. No afectaron el alta, consulta, vinculo ni persistencia de Persona y no se corrigieron en E1-02 por estar fuera del alcance autorizado.

La incidencia requiere caracterizacion posterior. No se presume que sea inocua: debera determinarse si corresponde retirar, condicionar o adaptar esos listeners a la politica de lectura vigente. Este cierre no declara resuelto ese problema.

## 10. Deuda preservada y rollback

Se conservan los consumidores deportivos legados de datos de Usuario y la redireccion legada de `MatchCard` a `/onboarding`. No se reinterpretaron esos flujos mediante `personaId`.

El rollback de E1-02 consiste en revertir exclusivamente el commit de implementacion `dc433dfa6c8827f129a327b2eddc71a0a51eb951`, reinicializar los emuladores con datos sinteticos y repetir los gates locales. No existen datos ni despliegues remotos que revertir.

## 11. Estado final

E1-02 queda cerrado en su alcance aprobado, con implementacion versionada, gates automatizados aprobados y UAT manual aprobada. Este cierre no declara integrada la rama, no realiza push, merge ni deploy, y no habilita un alcance concreto para E1-03.

## 12. Veredicto final

`E1-02 CERRADO — SIGUIENTE INCREMENTO HABILITADO PARA DEFINICIÓN`
