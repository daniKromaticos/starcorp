-- El Auxiliar se mueve durante el día: entre la corrida de las 6am y la tarde
-- los totales de la app quedaban unos cientos de pesos por debajo de Power BI.
-- Con el prune por lotes (0039) la corrida bajó a ~18s, así que pasa de diaria
-- a cada 8 horas: 6am, 2pm y 10pm Colombia (11:00, 19:00 y 03:00 UTC).
--
-- Los demás syncs siguen diarios a propósito. Ojo con bancos y el snapshot de
-- QuickBooks: escriben una foto por día para calcular el delta, correrlos tres
-- veces al día rompería esa lógica.

select cron.unschedule('pbi-sync-auxiliar-daily');

select cron.schedule(
  'pbi-sync-auxiliar-8h',
  '0 3,11,19 * * *',
  $$select trigger_pbi_sync_auxiliar();$$
);
