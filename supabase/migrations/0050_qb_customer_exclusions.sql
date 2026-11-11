-- Exclusiones del Informe Cartera. Las 6 empresas del grupo se facturan
-- entre si en QuickBooks, asi que cada una esta dada de alta como Customer
-- en el QB de las otras. Esas facturas son deuda intercompania, no cartera
-- de clientes: inflaban el donut y el total del informe.
--
-- El match NO es por customer_id (la app consulta QB en vivo y los ids
-- cambian por realm) sino por nombre normalizado: mayusculas y sin nada
-- que no sea alfanumerico. Asi "ONE A SOLUTIONS LLC" y "ONEA SOLUTIONS LLC"
-- caen en la misma clave. Las variantes que no colapsan solas
-- (SEASON/SEASONS) van como filas aparte.
--
-- La exclusion es global a todos los realms: ninguna empresa del grupo es
-- cliente externo de otra. Filtra en una sola superficie, cartera.service.ts,
-- porque Cartera es el unico informe que aun consulta QB en vivo.

create table qb_customer_exclusions (
  customer_name text primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table qb_customer_exclusions enable row level security;

-- La app la lee directo (no via RPC) para filtrar el query en vivo a QB.
create policy "authenticated read" on qb_customer_exclusions
  for select to authenticated using (true);

insert into qb_customer_exclusions (customer_name, reason) values
  ('5 STARS SOLUTIONSS LLC',      'intercompania'),
  ('5 STARS SOLUTIONS LLC',       'intercompania - variante de 5 STARS SOLUTIONSS LLC'),
  ('MCS CLEANING SERVICES LLC',   'intercompania'),
  ('ONEA SOLUTIONS LLC',          'intercompania - cubre "ONE A SOLUTIONS LLC"'),
  ('CLEAN WITH ME LLC',           'intercompania'),
  ('SEASONS SOLUTIONS LLC',       'intercompania'),
  ('SEASON SOLUTIONS LLC',        'intercompania - variante de SEASONS SOLUTIONS LLC'),
  ('BLUE STAR USA SOLUTIONS LLC', 'intercompania');
