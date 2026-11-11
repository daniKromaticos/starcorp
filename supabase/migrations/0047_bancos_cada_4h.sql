-- El sync de bancos pasa de diario a cada 4 horas.
--
-- Se podía dar por hecho que rompería el delta del informe, porque escribe una
-- foto diaria en `bancos_snapshots`. No lo rompe: el snapshot upserta por
-- (snapshot_date, empresa, numero_cuenta), así que cada corrida del mismo día
-- sobreescribe la foto en vez de agregar filas, y `get_bancos_previous()`
-- compara contra `max(snapshot_date) < current_date`, es decir la última foto
-- de un día anterior.
--
-- Horarios: 03:00, 07:00, 11:00, 15:00, 19:00 y 23:00 UTC — o sea 10pm, 2am,
-- 6am, 10am, 2pm y 6pm en Colombia. Se conserva la corrida de las 11:00 UTC
-- que ya existía (6am).
--
-- Efecto lateral menor: como la foto de hoy se sobreescribe, la línea base del
-- delta pasa a ser el cierre de ayer en vez de la mañana de ayer. Y el corte de
-- día es medianoche UTC = 7pm Colombia, así que a esa hora cambia la foto
-- contra la que se compara. Ambos lados (escritura y lectura) usan fecha UTC,
-- así que es coherente; si molesta, habría que pasar los dos a hora Colombia.

select cron.unschedule('pbi-sync-bancos-daily');

select cron.schedule(
  'pbi-sync-bancos-4h',
  '0 3,7,11,15,19,23 * * *',
  $$select trigger_pbi_sync_bancos();$$
);
