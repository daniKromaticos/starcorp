<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Runbook de operación

Procedimientos para soporte de datos. Los comandos SQL se corren en el SQL Editor del Dashboard de Supabase (rol `postgres` / service role).

## 1. Ver el estado de los syncs

```sql
-- Últimas corridas de cada fuente
select source, status, rows_upserted, duration_ms, error_message, started_at
from pbi_sync_log
order by started_at desc
limit 50;

-- Corridas colgadas (casi siempre: el runtime cortó la función por CPU, status 546)
select * from pbi_sync_log
where status = 'running' and started_at < now() - interval '10 minutes'
order by started_at desc;
```

> Los nombres exactos de columnas pueden variar; si una no existe, `select * from pbi_sync_log limit 1` para ver el esquema.

`cron.job_run_details` con `succeeded` **no** garantiza que el sync haya funcionado: solo que se encoló el HTTP. Mira siempre `pbi_sync_log`.

## 2. Re-correr un sync a mano

```sql
select trigger_pbi_sync_auxiliar();   -- últimos 90 días
select trigger_pbi_sync_bancos();
select trigger_pbi_sync_bbm();
select trigger_pbi_sync_clientes();
select trigger_pbi_sync_empleados();
select trigger_pbi_sync_historico();
select trigger_pbi_sync_pagos();
select trigger_pbi_sync_vag();
```

La llamada HTTP sale **al hacer commit**, así que el resultado aparece en `pbi_sync_log` unos segundos/minutos después.

## 3. Backfill del Auxiliar contable

```sql
-- Un rango (semiabierto [from, to)); máximo ~1 trimestre por llamada
select pbi_sync_range('2026-07-01', '2026-10-01');

-- Historia completa, un sync por trimestre
select pbi_sync_backfill_quarters('2023-01-01');

-- Meses relativos al actual (ej. de hace 5 a hace 3 meses)
select pbi_sync_refresh_months(-5, -3);
```

Reglas:
- **No dispares 12–13 meses a la vez**: la BD no aguanta más de ~4 syncs en paralelo y da statement timeout. Usa tandas de 3–4 meses (por eso el refresco de los domingos va en 4 tandas).
- Si un trimestre muere por CPU (fila en `running` para siempre), pártelo en meses o quincenas.
- `pg_sleep` no sirve para espaciar llamadas en una misma transacción (los `http_post` salen todos juntos al commit).
- El límite real de una edge function es ~25–30 s de CPU; pasado eso el runtime la mata sin error visible (status 546). Paraleliza invocaciones cortas en vez de un loop largo.

## 4. "La app no cuadra con Power BI"

Revisa en este orden:

1. **Desfase horario.** El Auxiliar se sincroniza cada 8 h; Bancos cada 4 h; el resto a las 6:00. ¿Cuándo fue el último `success` en `pbi_sync_log`?
2. **Filas rezagadas.** Si una poda no corrió, la versión vieja de un asiento re-auditado sigue sumando:
   ```sql
   select date_trunc('month', fecha) mes,
          count(*) filter (where synced_at < now() - interval '1 day') rezagadas,
          count(*) total
   from accounting_entries
   where fecha >= now() - interval '120 days'
   group by 1 order by 1;
   ```
   Si hay rezagadas en meses dentro de la ventana de 90 días, re-corre `pbi_sync_range` sobre ese mes.
3. **Convención de signos.** Ingresos y Utilidad con signo; Costos y Gastos en valor absoluto; la Utilidad no es la resta de las tarjetas (a propósito). Ver [06-reglas-de-negocio.md](06-reglas-de-negocio.md).
4. **Período.** 1m/3m/12m son meses cerrados; mtd es el mes calendario completo. Compara con el mismo filtro en PBI.
5. **Cierre fiscal.** Está incluido en el dashboard.
6. **Nombre de centro partido.** Busca variantes del mismo `centro_costo_codigo` con distinto `centro_costo_nombre`.
7. **Lee el RPC real**: `select pg_get_functiondef('public.get_dashboard_summary'::regproc);` (no confíes en el archivo del repo).
8. Compara contra la fuente ejecutando el DAX equivalente (edge `powerbi-execute-query` con JWT).

Para **QuickBooks** (Financiero, Cartera): antes de buscar un bug, revisa las diferencias que son a propósito (bloques Other*, Accrual, exclusiones intercompañía) y que los libros de QB estén conciliados (la app muestra saldo de libro, no saldo de banco).

## 5. Conectar o reconectar una empresa de QuickBooks

1. Un usuario **super_admin** abre la app → pantalla de conexión → "Conectar QuickBooks" (`qb-oauth-init`).
2. Intuit redirige a `qb-oauth-callback`, que guarda los tokens en `qb_user_tokens` y vuelve a la app por `starcorp://oauth/quickbooks`.
3. Si `qb-companies` devuelve `reauthRequired = true` para una empresa, repetir el flujo.

Si cambia el super admin dueño de la conexión, hay que actualizar **los dos**: `starcorp_vault.ADMIN_USER_ID` y `qb_user_tokens.user_id`. Si no coinciden, `companies = []` y toda la app redirige a la pantalla de conexión.

## 6. Invitar un usuario

1. App → Usuarios → Crear. Se eligen los permisos (catálogo en `src/config/permissions.ts`); el invitado queda con rol `usuario`.
2. `admin-users` crea el usuario con contraseña temporal y manda el correo por **Resend** (remitente `INVITE_FROM_EMAIL`, dominio verificado 5starscorp.com).
3. Si el correo falla, la app muestra `emailError` y la contraseña temporal para compartirla a mano.
4. Los secrets nuevos de edge functions tardan ~2 min en propagarse.

Las plantillas de correo de recuperación (OTP) se configuran en el Dashboard: ver [integraciones/auth-otp-setup.md](integraciones/auth-otp-setup.md).

## 7. Exclusiones

- **Cartera**: `insert into qb_customer_exclusions (customer_name, client_id) values (...)`. Efecto inmediato, sin release.
- **Bancos**: `bank_account_exclusions` es legacy (el informe Bancos ya no usa QB).

## 8. Publicar la app

Ver [02-setup-y-deploy.md](02-setup-y-deploy.md). Resumen: push a `dev` → EAS Update canal development; push a `main` → producción. Cambios nativos (dependencias con código nativo, `app.json`) requieren un build nuevo de EAS, no basta con un update.
