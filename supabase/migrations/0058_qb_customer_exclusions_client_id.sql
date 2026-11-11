-- Exclusiones puntuales por cliente de QB (no por nombre global).
--
-- qb_customer_exclusions nacio (0050) para las 6 empresas del grupo que se
-- facturan entre si: ahi el match por nombre normalizado, global a todos
-- los realms, es correcto porque ninguna de esas 6 es cliente externo en
-- ningun realm.
--
-- Pero un cliente externo real puede aparecer en Cartera como DOS tarjetas
-- con el mismo nombre (mismo Customer facturado desde mas de una empresa
-- del grupo, o duplicado/sub-cliente dentro del mismo QB) con saldos muy
-- distintos. Excluir por nombre ahi apagaria tambien el saldo real.
--
-- client_id guarda el id que usa cartera.service.ts para identificar la
-- tarjeta: `${realmId}-${customerId}` (visible en la URL del detalle,
-- /informes/cartera/<realmId>-<customerId>). Si viene NULL, la fila se
-- comporta como antes (exclusion global por nombre). Si viene con valor,
-- excluye solo esa tarjeta puntual, sin importar el nombre.

alter table qb_customer_exclusions drop constraint qb_customer_exclusions_pkey;
alter table qb_customer_exclusions add column id uuid primary key default gen_random_uuid();
alter table qb_customer_exclusions add column client_id text;

-- Las exclusiones globales (client_id null) siguen siendo unicas por nombre,
-- igual que cuando customer_name era la primary key.
create unique index qb_customer_exclusions_name_global_uniq
  on qb_customer_exclusions (customer_name)
  where client_id is null;

insert into qb_customer_exclusions (customer_name, client_id, reason) values
  ('OKANA', '9130357593815546-1734',
   'tarjeta de $337 distinta a la cartera real de Okana (~66k); ocultada a pedido del usuario sin confirmar la causa exacta en QB (2026-10-21)');
