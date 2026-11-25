<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Setup local y deploy

## Requisitos

- Node LTS + npm.
- Cuenta Expo con acceso al proyecto (`eas login`) y EAS CLI (`npm i -g eas-cli`).
- Un **development build** instalado en el dispositivo o emulador. La app usa `expo-dev-client`; **Expo Go no sirve**.
- Acceso al proyecto de Supabase (Dashboard) para backend y operación.

## Variables de entorno

Archivo `.env` en la raíz (no se versiona). Solo nombres; pide los valores al responsable del proyecto.

| Variable | Obligatoria | Uso |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon) |
| `EXPO_PUBLIC_USE_MOCKS` | **Sí, poner `false`** | Si falta o vale otra cosa, Cartera, Asociados, Bancos, Presupuesto, Seguros, VAG y Reportes muestran **datos mock** sin avisar |
| `EXPO_PUBLIC_NOTION_DB_SEGUROS` | Sí | Id del tablero de pólizas en Notion |
| `EXPO_PUBLIC_NOTION_DB_LLC` | Sí | Id del tablero de LLCs en Notion |
| `EXPO_PUBLIC_PRESUPUESTO_DATASET_ID`, `EXPO_PUBLIC_PRESUPUESTO_GROUP_ID` | No | Sobrescriben el dataset de Power BI de Presupuesto (hay fallback en el código) |

Todo lo que lleva `EXPO_PUBLIC_` queda empaquetado dentro de la app: **nunca** pongas secretos de servidor con ese prefijo. Los secretos de servidor viven en `starcorp_vault` y en los secrets de Edge Functions (ver [04-backend-supabase.md](04-backend-supabase.md)).

En CI las variables no salen del `.env` sino de los **EAS environments** (`development` y `production`) configurados en expo.dev.

## Correr la app

```bash
npm install
npm start              # Metro + dev client
npm run android        # / ios / web
```

Chequeos (los mismos que corren en cada PR):

```bash
npx tsc --noEmit       # TypeScript estricto
npm run lint           # ESLint (ignora supabase/functions, que es Deno)
npx expo-doctor
```

No hay test runner configurado.

## Ramas y publicación

| Evento | Qué pasa |
|---|---|
| PR | GitHub Actions: `expo-doctor`, ESLint, `tsc` |
| Push a `dev` | `eas update --branch dev --environment development` (OTA al canal `dev`) |
| Push a `main` | `eas update --branch production --environment production` (OTA a producción) |

El único secret de GitHub es `EXPO_TOKEN`.

### Updates OTA vs builds nativos

- **OTA (EAS Update)** sirve para cambios de JS/TS y assets. La app busca updates al abrir y al volver a primer plano (máximo cada 5 min) y recarga sola (`src/config/ota-updates.ts`).
- **Build nuevo (EAS Build)** hace falta si cambias dependencias nativas, plugins o `app.json`.
- `runtimeVersion` sigue la **versión de la app** (`policy: appVersion`): si subes la versión en `app.json`, los binarios viejos dejan de recibir updates hasta que instalen el build nuevo.

Perfiles en `eas.json`:

| Perfil | Tipo | Canal |
|---|---|---|
| `dev` | Development client, APK interno | `dev` |
| `preview` | APK interno | `production` (⚠️ comparte canal con producción) |
| `production` | Tienda, `autoIncrement` | `production` |

```bash
eas build --profile dev --platform android
eas build --profile production --platform all
```

## Backend

### Edge functions

```bash
supabase functions deploy <nombre> --project-ref <ref>
```

O con el MCP de Supabase (`deploy_edge_function`). Al crear una función nueva, **guárdala también en `supabase/functions/`**: hoy hay funciones desplegadas sin código en el repo.

Las `pbi-sync-*`, `powerbi-*`, `nexiatask-proxy`, `qb-oauth-callback` y `qb-snapshot-bank-balances` se despliegan con `verify_jwt = false` porque validan dentro del código (secreto de cron o JWT).

### Migraciones

1. Escribe el archivo `supabase/migrations/NNNN_descripcion.sql` (siguiente número libre; hoy se llega a `0060`).
2. Aplícalo con `apply_migration` (MCP) o `supabase db push`, para que quede registrado en el historial.
3. **No apliques cambios de esquema con SQL directo** (`execute_sql`): no quedan en el historial y agrandan el drift.
