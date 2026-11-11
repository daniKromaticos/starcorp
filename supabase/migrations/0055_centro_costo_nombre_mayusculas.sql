-- Nombres de centro de costo normalizados a mayúsculas.
--
-- En 2025-08 el ERP renombró 11 centros cambiando solo las mayúsculas, con el
-- mismo código: "Great Wolf Resorts Holdings Inc." (hasta 2025-07-31) pasó a
-- "GREAT WOLF RESORTS HOLDINGS INC." (desde 2025-08-01), igual Kalahari
-- Ohio/Pocono/Texas/Wisconsin, Living, Done Rite, Ubar-Toc y los tres Urban.
-- Los RPCs agrupan y filtran por centro_costo_nombre exacto, así que la
-- historia anterior quedaba en otro grupo: en el top 3m (jul–sep 2026) el año
-- anterior de Great Wolf sumaba solo ago+sep 2025 (514.424,29 en vez de
-- 910.641,88) y mostraba +124% en lugar de +26,7%; en 12m, +801%.
--
-- Igual que 0053, se corrige al guardar en vez de tocar los RPCs: el sync
-- (pbi-sync-auxiliar, centroDisplayName) sube a mayúsculas las filas nuevas y
-- este UPDATE las existentes. Los rótulos de reemplazo de 0053 ("Centro X
-- (sin nombre)", "Cierre periodo fiscal", "Sin centro de costo") no se tocan.
-- El source_hash usa el valor crudo de Power BI, así que no cambia.

update accounting_entries
set centro_costo_nombre = upper(trim(centro_costo_nombre))
where centro_costo_nombre <> upper(trim(centro_costo_nombre))
  and centro_costo_nombre not like 'Centro % (sin nombre)'
  and centro_costo_nombre not in ('Cierre periodo fiscal', 'Sin centro de costo');

refresh materialized view mv_monthly_summary;
