# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — Expo dev server (also `npm run android` / `ios` / `web`)
- `npm run lint` — ESLint (flat config, `eslint-config-expo`)
- `npx tsc --noEmit` — TypeScript check (strict mode, no test runner configured)
- `npm run reset-project` — moves starter `app/` to `app-example/` and scaffolds blank `app/`
- Deploy via EAS Update on push to `dev` / `main` (`.github/workflows/expo_update_*.yml`); requires `EXPO_TOKEN` and `EXPO_PUBLIC_FIREBASE_*` / `EXPO_PUBLIC_GRAPHQL_API_URL` repo secrets

## Architecture

**Two parallel source trees** — be careful which you edit:

- `app/`, `components/`, `hooks/`, `constants/` (repo root) — Expo starter scaffolding (file-based routing entry, themed components, color-scheme hooks). `app/` is the expo-router root.
- `src/` — actual product code, organized by **atomic design**: `components/{atoms,molecules,organisms,templates,charts}`. Business code lives here.

Path aliases (see `tsconfig.json`): `@/*` → repo root, `@/src/*`, `@/components/*` → `src/components/*`, plus `@/hooks`, `@/services`, `@/stores`, `@/theme`, `@/types`, `@/utils`.

**State & data:**
- TanStack Query for async data (`src/hooks/queries/`, client in `src/config/query-client.ts`, keys centralized in `query-keys.ts`). Per `SKILL.md`, financial data uses `staleTime: 5min`.
- Zustand for client state (`src/stores/auth.store.ts`, `filters.store.ts`).
- Services layer in `src/services/` — currently mock-only (`mock/mock-adapter.ts`, `data.mock.ts`).

**Theme:** design tokens, gradients, and shadows in `src/theme/`. Root-level `constants/theme.ts` and `themed-*.tsx` components belong to the Expo starter.

## Project conventions (from SKILL.md)

- **Never call QuickBooks / Power BI / Notion APIs from the client.** Proxy through Supabase Edge Functions that verify the user's Supabase JWT.
- QuickBooks `refresh_tokens` are stored in the `starcorp_vault` table; Power BI uses Azure `embedTokens` rendered in `WebView`.
- All API responses must have TypeScript types defined (see `src/types/api.types.ts`).
- Components must have skeleton loading states (`src/components/atoms/skeleton.tsx`).
- **Styling:** NativeWind 5.0 (preview) is installed and in active use. Components mix Tailwind `className` (via the wrappers at `@/src/tw` — `View`, `Pressable`, etc.) with inline `style={{ ... }}` for values not expressible in Tailwind (custom colors, shadows, dynamic values). Prefer design tokens from `src/theme/tokens.ts` over magic numbers. Match the existing styling mechanism of the file you're editing — don't migrate between `className` and `StyleSheet` opportunistically.
