/**
 * Service: documentos de activos VAG
 *
 * Un documento por activo en `vag_activo_docs` (PK activo_id); el binario
 * vive en el bucket privado `repositorio` bajo vag/{activoId}/{uuid}.{ext}
 * (mismo bucket y policies que el Repositorio Alejandro). Re-subir
 * reemplaza: upsert de la fila y borrado best-effort del objeto anterior.
 * Los documentos se abren con signed URLs de corta vida.
 *
 * Cada subida se refleja además en el Repositorio Alejandro, bajo el
 * apartado "Activos VAG" (se crea si no existe): misma storage_path, una
 * fila en repo_archivos con el nombre del activo. Al reemplazar se
 * actualiza esa fila (buscándola por el path anterior) en vez de duplicar.
 * El camino inverso también está cubierto: eliminar el archivo desde el
 * Repositorio borra la fila de vag_activo_docs (ver unlinkVagActivoDocs
 * en repositorio.service) y la card del activo vuelve a "Subir documento".
 */

import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '@/src/config/supabase';
import type { VagActivoDoc, VagDocUploadInput } from '@/src/types/vag.types';

const BUCKET = 'repositorio';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
/** Apartado del Repositorio Alejandro donde se reflejan estos documentos.
 * Se busca por nombre (si lo renombran, la próxima subida crea uno nuevo). */
const REPO_APARTADO_VAG = 'Activos Grupo Orion Holding';

interface DocRow {
  activo_id: string;
  archivo_original: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  updated_at: string;
}

function mapDoc(row: DocRow): VagActivoDoc {
  return {
    activoId: row.activo_id,
    archivoOriginal: row.archivo_original,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    updatedAt: row.updated_at,
  };
}

/** Todos los documentos (son pocos activos) → la vista arma su mapa. */
export async function getVagActivoDocs(): Promise<VagActivoDoc[]> {
  const { data, error } = await supabase.from('vag_activo_docs').select('*');
  if (error) throw new Error(`getVagActivoDocs: ${error.message}`);
  return (data as DocRow[]).map(mapDoc);
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : 'bin';
}

/** id del apartado "Activos VAG" del Repositorio; lo crea si no existe. */
async function ensureRepoApartadoVag(): Promise<string> {
  const { data, error } = await supabase
    .from('repo_apartados')
    .select('id')
    .eq('nombre', REPO_APARTADO_VAG)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`ensureRepoApartadoVag: ${error.message}`);
  if (data) return data.id as string;

  const { data: created, error: insError } = await supabase
    .from('repo_apartados')
    .insert({ nombre: REPO_APARTADO_VAG })
    .select('id')
    .single();
  if (insError) throw new Error(`ensureRepoApartadoVag: ${insError.message}`);
  return created.id as string;
}

/** Refleja el documento en repo_archivos: actualiza la fila del path
 * anterior (reemplazo) o inserta una nueva bajo "Activos VAG". Best-effort:
 * un fallo acá no debe tumbar la subida del documento del activo. */
async function syncRepoArchivo(
  input: VagDocUploadInput,
  path: string,
): Promise<void> {
  try {
    if (input.previousStoragePath) {
      const { data: updated, error } = await supabase
        .from('repo_archivos')
        .update({
          archivo_original: input.fileName,
          storage_path: path,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
        })
        .eq('storage_path', input.previousStoragePath)
        .select('id');
      if (error) throw new Error(error.message);
      if (updated && updated.length > 0) return;
    }

    const apartadoId = await ensureRepoApartadoVag();
    const { error: insError } = await supabase.from('repo_archivos').insert({
      apartado_id: apartadoId,
      nombre: input.activoNombre,
      archivo_original: input.fileName,
      storage_path: path,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    });
    if (insError) throw new Error(insError.message);
  } catch (err) {
    console.warn(
      `syncRepoArchivo (${input.activoId}): ${(err as Error).message}`,
    );
  }
}

export async function uploadVagActivoDoc(
  input: VagDocUploadInput,
): Promise<VagActivoDoc> {
  const path = `vag/${input.activoId}/${Crypto.randomUUID()}.${fileExtension(input.fileName)}`;
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
  if (upError) throw new Error(`uploadVagActivoDoc storage: ${upError.message}`);

  const { data, error } = await supabase
    .from('vag_activo_docs')
    .upsert(
      {
        activo_id: input.activoId,
        archivo_original: input.fileName,
        storage_path: path,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'activo_id' },
    )
    .select('*')
    .single();
  if (error) {
    // No dejar huérfano el objeto si falló el upsert.
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`uploadVagActivoDoc: ${error.message}`);
  }

  // Refleja el documento en el Repositorio Alejandro (apartado "Activos
  // VAG") ANTES de borrar el objeto viejo, para que el reemplazo pueda
  // ubicar la fila por el path anterior.
  await syncRepoArchivo(input, path);

  // Reemplazo: el objeto anterior ya no tiene fila que lo referencie.
  if (input.previousStoragePath && input.previousStoragePath !== path) {
    await supabase.storage.from(BUCKET).remove([input.previousStoragePath]);
  }

  return mapDoc(data as DocRow);
}

export async function getVagDocSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`getVagDocSignedUrl: ${error.message}`);
  return data.signedUrl;
}
