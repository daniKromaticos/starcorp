-- Documento adjunto por activo de VAG (ficha catastral / escritura…).
-- Un documento por activo: activo_id es la cuenta de 8 dígitos que usa
-- get_vag_activos() como id; re-subir reemplaza el anterior (el servicio
-- borra el objeto viejo de Storage tras el upsert).
--
-- Los binarios reutilizan el bucket privado `repositorio` (mismas
-- policies de 0028) bajo el path vag/{activo_id}/{uuid}.{ext}; la app
-- los abre vía signed URLs.

create table vag_activo_docs (
  activo_id text primary key,
  archivo_original text,           -- filename original del picker
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vag_activo_docs enable row level security;
create policy "authenticated all" on vag_activo_docs
  for all to authenticated using (true) with check (true);
