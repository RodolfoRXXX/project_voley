# E2-12 — Cierre

## Declaración

E2-12 queda cerrado a partir de la implementación integrada, los gates canónicos aprobados y la UAT manual definitiva UAT-01 a UAT-12.

Este cierre identifica como fuentes de trazabilidad:

- ficha: `E2-12-ficha-finalizacion-administrativa-membership-owner.md`, originalmente versionada en `158a79250a36978ca32f1f9a0b4fd19c8a51d28a` e integrada en `4c0f16c73ab5e93e5422e6be064c12377a8ad7d5`;
- implementación: commit `9624e1b` e integración no fast-forward `75f33cc`;
- informe: `E2-12-informe-implementacion.md`.

## Corrección normativa posterior a la UAT

El hallazgo inicial de UAT-03 fue tratado primero como un problema de mensaje `PERSON_REQUIRED`. Esa corrección limitada mejoró el texto, pero una revisión normativa posterior identificó la causa raíz: E2-12 había acoplado incorrectamente la autoridad administrativa del Owner a una Persona propia.

La corrección final establece que la autoridad deriva de la Cuenta autenticada y del ownership vigente; ownership, Persona y Membresía permanecen independientes. La Persona propia es opcional y, si existe, se usa para detectar `TARGET_IS_SELF`. Su ausencia no produce `PERSON_REQUIRED`, no crea Persona ni Membresía y admite `actorPersonId: null` en el intent cerrado. `activationRef` y request hash no dependen de la Persona mutable del actor. La creación concurrente de una Persona coincidente entre `prepare` y `finalize` se revalida transaccionalmente. El reason y mensaje genéricos `PERSON_REQUIRED` se preservan para los flujos que sí requieren Persona.

El retest manual fue satisfactorio: A continuó como Owner sin Persona ni Membresía y fuera del roster; cancelar sobre B no produjo escrituras; confirmar finalizó únicamente la Membresía activa de B y actualizó el roster. No se observaron efectos colaterales.

## Evidencia de cierre

- Unitarias, contratos y arquitectura: `279/279`, 0 fallos.
- Emulator Suite completa: `167/167`, 0 fallos, proyecto `demo-sportexa-e0-02`, loopback y red externa bloqueada.
- Mantenimiento y rules: `7/7`, 0 fallos.
- Sintaxis Functions: `270/270` archivos.
- Lint baseline: aprobado con `39` errores y `9` warnings conocidos; `6` hallazgos resueltos.
- Typecheck y build: exit code 0; build con `21/21` páginas estáticas.
- `git diff --check` e higiene UTF-8/BOM/whitespace/newline: aprobados.
- UAT-01 a UAT-12: aprobadas manualmente; UAT-03, aprobada después de la corrección normativa y su retest.

No hubo deploy ni acceso a datos o servicios Firebase remotos. El intento del Firebase CLI de consultar MOTD/config quedó bloqueado y no afectó los gates locales.

## Continuidad y exclusiones

Se conserva la trazabilidad con E2-09 (reactivación e historia v3), E2-10 (salida voluntaria e idempotencia) y E2-11 (roster activo del Owner). Permanecen fuera de alcance los writers y superficies legacy, disciplina, CU-029, archivo/tombstone de intents y cierre real de Temporada. Documento 5, AUD-C05, documentos arquitectónicos y cierres anteriores no fueron modificados.

Auth/UAT permanece aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`, y no fue integrada.

Este cierre no inicia, habilita ni define automáticamente E2-13.
