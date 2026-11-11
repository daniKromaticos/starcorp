-- Exclusiones del Informe Bancos. Algunas empresas tienen cuentas QB con
-- AccountType='Bank' que no son bancos reales (anticipos a empleados, cajas
-- menores, cuentas puente, duplicados de bank feed). Mientras contabilidad
-- las reclasifica en QB, esta tabla las filtra en las 3 superficies:
-- la app (bancos.service.ts), el snapshot diario (qb-snapshot-bank-balances)
-- y el delta % (get_bank_balance_previous). Si luego se corrigen en QB,
-- las filas simplemente dejan de matchear — no hay nada que revertir.

create table bank_account_exclusions (
  realm_id text not null,
  account_id text not null,
  account_name text, -- informativo, no se usa para filtrar
  reason text,
  created_at timestamptz not null default now(),
  primary key (realm_id, account_id)
);

alter table bank_account_exclusions enable row level security;
-- La app la lee directo (no vía RPC) para filtrar el query en vivo a QB.
create policy "authenticated read" on bank_account_exclusions
  for select to authenticated using (true);

-- Seed: 5 STARS SOLUTIONSS LLC (1 cuenta auto-creada por bank feed) y
-- MCS Cleaning Services LLC (23 cuentas que no son bancos; quedan visibles
-- Citizens 9230, TD Bank x6408, BoA x4597, PNC 6917 y Wise).
insert into bank_account_exclusions (realm_id, account_id, account_name, reason) values
  ('9130357845952726', '1150040008', 'Cuenta 9593',                 'duplicada bank feed'),
  ('9130357593815546', '264',        'Andres Alvarez',              'anticipo empleado'),
  ('9130357593815546', '241',        'Bill.com Money Out Clearing', 'cuenta puente'),
  ('9130357593815546', '200',        'Bryan Villagomez',            'anticipo empleado'),
  ('9130357593815546', '1150040007', 'Carlos Castrillon',           'anticipo empleado'),
  ('9130357593815546', '7',          'Cash',                        'caja menor'),
  ('9130357593815546', '1150040003', 'Dora Moreno',                 'anticipo empleado'),
  ('9130357593815546', '268',        'Felipe Gomez',                'anticipo empleado'),
  ('9130357593815546', '251',        'Giovanni Lopez',              'anticipo empleado'),
  ('9130357593815546', '1150040006', 'Henry Grijalba',              'anticipo empleado'),
  ('9130357593815546', '263',        'Jaidive Morales',             'anticipo empleado'),
  ('9130357593815546', '260',        'James Aldridge',              'anticipo empleado'),
  ('9130357593815546', '269',        'Jhoan Camacho',               'anticipo empleado'),
  ('9130357593815546', '262',        'Jhon Howard',                 'anticipo empleado'),
  ('9130357593815546', '249',        'Laura Pelaez',                'anticipo empleado'),
  ('9130357593815546', '1150040009', 'Lilian Caceres',              'anticipo empleado'),
  ('9130357593815546', '244',        'Luis Hoyos',                  'anticipo empleado'),
  ('9130357593815546', '199',        'Luisa Parra',                 'anticipo empleado'),
  ('9130357593815546', '1150040008', 'Nathalia Cano',               'anticipo empleado'),
  ('9130357593815546', '198',        'PETTY CASH',                  'caja menor'),
  ('9130357593815546', '248',        'Saul Perilla',                'anticipo empleado'),
  ('9130357593815546', '261',        'Servicios públicos',          'cuenta no bancaria'),
  ('9130357593815546', '250',        'Shirley Olaya',               'anticipo empleado'),
  ('9130357593815546', '1150040005', 'Wendy Ramos',                 'anticipo empleado');

-- El delta % debe compararse contra un total previo que también excluya
-- estas cuentas, o el primer día mostraría un salto artificial. Los
-- snapshots históricos de cuentas excluidas se quedan (solo dejan de
-- contar); el filtro es el anti-join.
create or replace function get_bank_balance_previous()
returns table (realm_id text, previous_total numeric, snapshot_date date)
language sql
stable
security definer
set search_path = public
as $$
  with latest_prior as (
    select realm_id, max(snapshot_date) as snap_date
    from bank_balance_snapshots
    where snapshot_date < current_date
    group by realm_id
  )
  select s.realm_id, sum(s.balance), lp.snap_date
  from bank_balance_snapshots s
  join latest_prior lp using (realm_id)
  where s.snapshot_date = lp.snap_date
    and not exists (
      select 1 from bank_account_exclusions x
      where x.realm_id = s.realm_id and x.account_id = s.account_id
    )
  group by s.realm_id, lp.snap_date;
$$;
