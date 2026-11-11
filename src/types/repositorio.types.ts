/**
 * Types: Repositorio Alejandro
 *
 * Apartados (secciones) y archivos del repositorio documental. Los
 * binarios viven en el bucket privado de Storage `repositorio`.
 */

export interface RepoApartado {
  id: string;
  nombre: string;
  archivosCount: number;
  createdAt: string;
}

export interface RepoArchivo {
  id: string;
  apartadoId: string;
  /** Nombre visible editable en la app. */
  nombre: string;
  /** Filename original del picker (subtítulo de las filas). */
  archivoOriginal: string | null;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface RepoUploadInput {
  apartadoId: string;
  nombre: string;
  /** URI local del asset elegido con el DocumentPicker. */
  fileUri: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** En web el picker entrega el File del browser; se sube directo. */
  webFile?: Blob;
}
