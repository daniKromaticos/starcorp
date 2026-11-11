-- Repositorio Alejandro: repositorio documental bajo "Otras compañías".
-- Apartados (secciones) y archivos. Los binarios viven en el bucket privado
-- de Storage `repositorio` (path: alejandro/{apartado_id}/{uuid}.{ext});
-- la app los abre vía signed URLs. Borrar un apartado borra sus filas por
-- cascade, pero los objetos de Storage los elimina el servicio antes de
-- borrar la fila (Storage no conoce el FK).

create table repo_apartados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table repo_archivos (
  id uuid primary key default gen_random_uuid(),
  apartado_id uuid not null references repo_apartados(id) on delete cascade,
  nombre text not null,            -- nombre visible editable en la app
  archivo_original text,           -- filename original del picker (subtítulo)
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index repo_archivos_apartado_idx on repo_archivos (apartado_id);

alter table repo_apartados enable row level security;
alter table repo_archivos enable row level security;

-- App interna: cualquier sesión autenticada (incluye anónimas) gestiona
-- el repositorio completo.
create policy "authenticated all" on repo_apartados
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on repo_archivos
  for all to authenticated using (true) with check (true);

-- Bucket privado para los documentos.
insert into storage.buckets (id, name, public)
values ('repositorio', 'repositorio', false)
on conflict (id) do nothing;

create policy "repositorio select" on storage.objects
  for select to authenticated using (bucket_id = 'repositorio');
create policy "repositorio insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'repositorio');
create policy "repositorio update" on storage.objects
  for update to authenticated using (bucket_id = 'repositorio');
create policy "repositorio delete" on storage.objects
  for delete to authenticated using (bucket_id = 'repositorio');
