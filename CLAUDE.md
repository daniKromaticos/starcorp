# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — Expo dev server (also `npm run android` / `ios` / `web`)
- `npm run lint` — ESLint (flat config, `eslint-config-expo`)
- `npx tsc --noEmit` — TypeScript check (strict mode, no test runner configured)
- Deploy via EAS Update on push to `dev` / `main` (`.github/workflows/expo_update_*.yml`); the only GitHub secret is `EXPO_TOKEN` — app env vars come from EAS environments (`development` / `production`). Local vars: see `.env.example`. `EXPO_PUBLIC_USE_MOCKS` must be exactly `false` or several informes silently use mocks.
- Full project docs live in `docs/` (start at `docs/README.md`). When changing a sync, RPC or calculation rule, update `docs/05-linaje-de-datos.md` / `docs/06-reglas-de-negocio.md` in the same change.

## Architecture

- `app/` (repo root) — expo-router routes; screens are thin and mount `Tm*` templates.
- `components/`, `hooks/`, `constants/` (repo root) — leftover Expo starter scaffolding, **dead code** (nothing in `app/` or `src/` imports it). Don't edit or import it.
- `src/` — actual product code, organized by **atomic design**: `components/{atoms,molecules,organisms,templates,charts}`. Business code lives here.

Path aliases (see `tsconfig.json`): `@/*` → repo root, `@/src/*`, `@/components/*` → `src/components/*`, plus `@/hooks`, `@/services`, `@/stores`, `@/theme`, `@/types`, `@/utils`.

**State & data:**
- TanStack Query for async data (`src/hooks/queries/`, client in `src/config/query-client.ts`, keys centralized in `query-keys.ts`). Per `SKILL.md`, financial data uses `staleTime: 5min`.
- Zustand for client state (`src/stores/`: auth, filters, qb, global-search, toast).
- Services layer in `src/services/` — real data from Supabase RPCs/tables (Power BI data staged by `pbi-sync-*` edge functions on pg_cron) and live proxies (`qb-query`, `notion-query`, `powerbi-execute-query`, `nexiatask-proxy`). Some services wrap calls in `withMock()` (`mock/mock-adapter.ts`).
- Backend in `supabase/functions/` (Deno) and `supabase/migrations/`. The repo is NOT a faithful copy of the live DB (migrations applied without files, functions deployed without code) — read `pg_get_functiondef` for the real RPC before changing it.

**Theme:** design tokens, gradients, and shadows in `src/theme/`. Root-level `constants/theme.ts` and `themed-*.tsx` are dead starter code.

## Project conventions (from SKILL.md)

- **Never call QuickBooks / Power BI / Notion APIs from the client.** Proxy through Supabase Edge Functions that verify the user's Supabase JWT.
- Server secrets live in the `starcorp_vault` table (service-role only). QuickBooks OAuth tokens live in `qb_user_tokens` under the vault's `ADMIN_USER_ID`. Power BI is read via DAX `executeQueries` with a service principal (embedTokens/WebView are unused).
- All API responses must have TypeScript types defined (see `src/types/`).
- Components must have skeleton loading states (`AtSkeleton`, `src/components/atoms/at-skeleton.tsx`). Use the prefixed `At*/Ml*/Or*/Tm*` components; unprefixed ones are legacy.
- **Styling:** NativeWind 5.0 (preview) is installed and in active use. Components mix Tailwind `className` (via the wrappers at `@/src/tw` — `View`, `Pressable`, etc.) with inline `style={{ ... }}` for values not expressible in Tailwind (custom colors, shadows, dynamic values). Prefer design tokens from `src/theme/tokens.ts` over magic numbers. Match the existing styling mechanism of the file you're editing — don't migrate between `className` and `StyleSheet` opportunistically.
