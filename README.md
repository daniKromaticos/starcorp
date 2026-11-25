<p align="right"><img src="docs/assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# 5core (Starcorp)

App móvil de reportería ejecutiva del grupo 5 Stars: consolidado contable, financiero por empresa, bancos, cartera, asociados, pagos, presupuesto, seguros y tareas, en un solo lugar.

Expo SDK 54 (development build) · React Native · expo-router · TanStack Query · Supabase (Postgres, Edge Functions, Auth) · Power BI · QuickBooks Online · Notion.

## Inicio rápido

```bash
npm install
cp .env.example .env   # o pide el .env al responsable; ver docs/02-setup-y-deploy.md
npm start              # requiere el dev client instalado (no Expo Go)
```

Chequeos: `npx tsc --noEmit` y `npm run lint`.

Push a `dev` → OTA al canal de desarrollo. Push a `main` → producción.

## Documentación

Toda la documentación está en [`docs/`](docs/README.md):

- [Arquitectura](docs/01-arquitectura.md)
- [Setup y deploy](docs/02-setup-y-deploy.md)
- [App (frontend)](docs/03-app-frontend.md)
- [Backend Supabase](docs/04-backend-supabase.md)
- [Linaje de datos por informe](docs/05-linaje-de-datos.md)
- [Reglas de negocio](docs/06-reglas-de-negocio.md)
- [Runbook de operación](docs/07-runbook-operacion.md)
