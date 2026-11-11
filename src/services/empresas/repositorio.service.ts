/**
 * Service: Repositorio Alejandro
 *
 * CRUD de apartados/archivos contra las tablas `repo_apartados` /
 * `repo_archivos` y carga de binarios al bucket privado `repositorio`
 * (path: alejandro/{apartadoId}/{uuid}.{ext}). Los documentos se abren
 * con signed URLs de corta vida.
 *
 * Borrar (apartado o archivo) elimina primero los objetos de Storage y
 * después las filas: el cascade de Postgres no conoce el bucket.
 */

import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '@/src/config/supabase';
import type {
  RepoApartado,
  RepoArchivo,
  RepoUploadInput,
} from '@/src/types/repositorio.types';

const BUCKET = 'repositorio';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface ApartadoRow {
  id: string;
  nombre: string;
  created_at: string;
  repo_archivos?: { count: number }[];
}

interface ArchivoRow {
  id: string;
  apartado_id: string;
  nombre: string;
  archivo_original: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

function mapApartado(row: ApartadoRow): RepoApartado {
  return {
    id: row.id,
    nombre: row.nombre,
    archivosCount: row.repo_archivos?.[0]?.count ?? 0,
    createdAt: row.created_at,
  };
}

function mapArchivo(row: ArchivoRow): RepoArchivo {
  return {
    id: row.id,
    apartadoId: row.apartado_id,
    nombre: row.nombre,
    archivoOriginal: row.archivo_original,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

// ── Apartados ────────────────────────────────────────────────────────

export async function getApartados(): Promise<RepoApartado[]> {
  const { data, error } = await supabase
    .from('repo_apartados')
    .select('id, nombre, created_at, repo_archivos(count)')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getApartados: ${error.message}`);
  return (data as ApartadoRow[]).map(mapApartado);
}

export async function getApartado(id: string): Promise<RepoApartado | null> {
  const { data, error } = await supabase
    .from('repo_apartados')
    .select('id, nombre, created_at, repo_archivos(count)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getApartado: ${error.message}`);
  return data ? mapApartado(data as ApartadoRow) : null;
}

export async function createApartado(nombre: string): Promise<RepoApartado> {
  const { data, error } = await supabase
    .from('repo_apartados')
    .insert({ nombre: nombre.trim() })
    .select('id, nombre, created_at')
    .single();
  if (error) throw new Error(`createApartado: ${error.message}`);
  return mapApartado(data as ApartadoRow);
}

export async function updateApartadoNombre(
  id: string,
  nombre: string,
): Promise<void> {
  const { error } = await supabase
    .from('repo_apartados')
    .update({ nombre: nombre.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`updateApartadoNombre: ${error.message}`);
}

/** Los documentos de activos VAG viven en este mismo bucket y quedan
 *  referenciados desde `vag_activo_docs` (ver vag-docs.service). Al borrar
 *  un archivo del Repositorio hay que soltar esa referencia para que la
 *  card del activo vuelva a "Subir documento" en vez de un link roto. */
async function unlinkVagActivoDocs(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase
    .from('vag_activo_docs')
    .delete()
    .in('storage_path', paths);
  if (error) throw new Error(`unlinkVagActivoDocs: ${error.message}`);
}

/** Borra los objetos de Storage del apartado y luego la fila (las filas
 *  de `repo_archivos` caen por cascade). */
export async function deleteApartado(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('repo_archivos')
    .select('storage_path')
    .eq('apartado_id', id);
  if (error) throw new Error(`deleteApartado: ${error.message}`);

  const paths = (data ?? []).map((r) => r.storage_path as string);
  if (paths.length > 0) {
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(paths);
    if (rmError) throw new Error(`deleteApartado storage: ${rmError.message}`);
  }
  await unlinkVagActivoDocs(paths);

  const { error: delError } = await supabase
    .from('repo_apartados')
    .delete()
    .eq('id', id);
  if (delError) throw new Error(`deleteApartado: ${delError.message}`);
}

// ── Archivos ─────────────────────────────────────────────────────────

export async function getArchivos(apartadoId: string): Promise<RepoArchivo[]> {
  const { data, error } = await supabase
    .from('repo_archivos')
    .select('*')
    .eq('apartado_id', apartadoId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getArchivos: ${error.message}`);
  return (data as ArchivoRow[]).map(mapArchivo);
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : 'bin';
}

export async function uploadArchivo(
  input: RepoUploadInput,
): Promise<RepoArchivo> {
  const path = `alejandro/${input.apartadoId}/${Crypto.randomUUID()}.${fileExtension(input.fileName)}`;
  const contentType = input.mimeType ?? 'application/octet-stream';

  // En nativo leemos los bytes del uri local; en web el picker ya entrega
  // el File del browser.
  const body: Blob | Uint8Array =
    Platform.OS === 'web' && input.webFile
      ? input.webFile
      : await new File(input.fileUri).bytes();

  const { error: upError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (upError) throw new Error(`uploadArchivo storage: ${upError.message}`);

  const { data, error } = await supabase
    .from('repo_archivos')
    .insert({
      apartado_id: input.apartadoId,
      nombre: input.nombre.trim(),
      archivo_original: input.fileName,
      storage_path: path,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select('*')
    .single();
  if (error) {
    // No dejar huérfano el objeto si falló el insert.
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`uploadArchivo: ${error.message}`);
  }
  return mapArchivo(data as ArchivoRow);
}

export async function updateArchivoNombre(
  id: string,
  nombre: string,
): Promise<void> {
  const { error } = await supabase
    .from('repo_archivos')
    .update({ nombre: nombre.trim() })
    .eq('id', id);
  if (error) throw new Error(`updateArchivoNombre: ${error.message}`);
}

export async function deleteArchivo(archivo: {
  id: string;
  storagePath: string;
}): Promise<void> {
  const { error: rmError } = await supabase.storage
    .from(BUCKET)
    .remove([archivo.storagePath]);
  if (rmError) throw new Error(`deleteArchivo storage: ${rmError.message}`);

  await unlinkVagActivoDocs([archivo.storagePath]);

  const { error } = await supabase
    .from('repo_archivos')
    .delete()
    .eq('id', archivo.id);
  if (error) throw new Error(`deleteArchivo: ${error.message}`);
}

export async function getArchivoSignedUrl(
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`getArchivoSignedUrl: ${error.message}`);
  return data.signedUrl;
}
