-- Asientos sin nombre de centro de costo: se rotulan con un nombre de reemplazo.
--
-- get_dashboard_summary suma todo el Auxiliar, pero get_consolidated_clients y
-- get_top_clients agrupan por centro_costo_nombre y descartan los NULL. Con el
-- filtro de 3 meses (jul–sep 2026) el dashboard mostraba 5.892.162,51 y la
-- suma de clientes 5.861.617,16: los 30.545,35 de diferencia eran centros
-- nuevos (2031 Renaissance Montgomery, 2032 Great Wolf Gurnee, 1045) que el
-- ERP todavía no tiene nombrados, así que `Nom. centro costos` llega vacío.
--
-- En vez de tocar los 7 RPCs que filtran o agrupan por nombre, el nombre se
-- completa al guardar: el sync (pbi-sync-auxiliar, centroDisplayName) para las
-- filas nuevas y este UPDATE para las existentes. Así el consolidado, el
-- ranking y el detalle del cliente funcionan sin cambios.
--
-- El source_hash se calcula con el valor crudo de Power BI, así que no cambia.
-- Cuando el ERP nombre el centro, el asiento llega con otro hash y el prune
-- por synced_at borra la versión rotulada.

update accounting_entries
set centro_costo_nombre = case
  when nullif(trim(centro_costo_codigo), '') is not null
    then 'Centro ' || trim(centro_costo_codigo) || ' (sin nombre)'
  when detalle = 'Cierre periodo fiscal'
    then 'Cierre periodo fiscal'
  else 'Sin centro de costo'
end
where nullif(trim(centro_costo_nombre), '') is null;

refresh materialized view mv_monthly_summary;
