<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Documentación de 5core (Starcorp)

App móvil de reportería ejecutiva del grupo 5 Stars. Consolida contabilidad (Power BI), QuickBooks, Notion y NexiaTask sobre un backend Supabase.

**Última revisión completa:** 2026-11-25.

## Por dónde empezar

| Si eres… | Lee |
|---|---|
| Desarrollador nuevo | [01 Arquitectura](01-arquitectura.md) → [02 Setup y deploy](02-setup-y-deploy.md) → [03 App](03-app-frontend.md) → [04 Backend](04-backend-supabase.md) |
| Soporte de datos / operación | [05 Linaje de datos](05-linaje-de-datos.md) → [06 Reglas de negocio](06-reglas-de-negocio.md) → [07 Runbook](07-runbook-operacion.md) |

## Índice

| Documento | Contenido |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Stack, vista general, estructura del repo, navegación, auth y permisos |
| [02-setup-y-deploy.md](02-setup-y-deploy.md) | Variables de entorno, correr la app, ramas, EAS Update/Build, deploy de edge functions y migraciones |
| [03-app-frontend.md](03-app-frontend.md) | Pantallas y sus fuentes, estado, componentes, estilo, receta para un informe nuevo |
| [04-backend-supabase.md](04-backend-supabase.md) | Tablas, RPCs, pg_cron, edge functions, secretos, storage, drift repo↔BD |
| [05-linaje-de-datos.md](05-linaje-de-datos.md) | De dónde sale cada informe: origen → sync → tabla → RPC → hook, y qué tan fresco está |
| [06-reglas-de-negocio.md](06-reglas-de-negocio.md) | Convención de signos, períodos, exclusiones y demás reglas no obvias, con dónde están implementadas |
| [07-runbook-operacion.md](07-runbook-operacion.md) | Re-correr syncs, backfill, diagnosticar "no cuadra con PBI", conectar QuickBooks, invitar usuarios |

### Guías de integración — [`integraciones/`](integraciones/)

| Documento | Contenido |
|---|---|
| [power-bi.md](integraciones/power-bi.md) | Service principal de Azure, permisos del workspace, DAX `executeQueries` |
| [quickbooks.md](integraciones/quickbooks.md) | App de Intuit, OAuth 2.0, refresh de tokens, consultas |
| [quickbooks-costos-alcances.md](integraciones/quickbooks-costos-alcances.md) | Planes, límites y costos de la API de QuickBooks (documento para cliente) |
| [notion.md](integraciones/notion.md) | Integración de Notion y lectura de tableros |
| [nexiatask-api.md](integraciones/nexiatask-api.md) | Contrato de la API de NexiaTask |
| [auth-otp-setup.md](integraciones/auth-otp-setup.md) | Plantillas de correo de Supabase Auth (código OTP) |
| [por-que-supabase.md](integraciones/por-que-supabase.md) | Por qué Supabase hace de proxy y bóveda de secretos |

### Histórico — [`archive/`](archive/)

Documentos que describían estados anteriores del proyecto (estado de abril 2026, ventanas de período móviles, plan de escalabilidad de Power BI en vivo, pendientes con NexiaTask ya resueltos). Se conservan como registro de decisiones.

## Mantener esta documentación

- Si cambias una regla de cálculo, un RPC o un sync, actualiza [05](05-linaje-de-datos.md) y [06](06-reglas-de-negocio.md) en el mismo PR.
- La fuente de verdad de la BD es la BD (`pg_get_functiondef`, `list_tables`), no `supabase/migrations/`, hasta que se resuelva el drift.
- No escribas valores de secretos en estos documentos; solo nombres.
