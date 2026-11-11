/**
 * NexiaTask Service
 *
 * Wrapper sobre la API externa NexiaTask. Cuando EXPO_PUBLIC_USE_MOCKS=true
 * (default) retorna mocks. En false invoca la Edge Function
 * `nexiatask-proxy` con el JWT del usuario, que a su vez llama al upstream
 * inyectando la API key desde Deno.env.
 *
 * ⚠️ NUNCA llamar directo a nexiatask-api.onrender.com desde el cliente —
 * la API key quedaría en el bundle.
 */

import { supabase } from '@/src/config/supabase';
import { withMock } from '@/src/services/mock/mock-adapter';
import {
  mockNexiataskTareasRaw,
  groupTareasIntoResponsibilities,
  getNexiataskTareaDetalle,
  getNexiataskHistorialTree,
  buildTareasConAvancesTree,
  mapHistorialAvances,
} from '@/src/services/mock/nexiatask.mock';
import type {
  NexiataskResponsibilities,
  NexiataskTareaDetalle,
  NexiataskTareaRaw,
  NexiataskAvanceResponse,
  NexiataskHistorialResponse,
  NexiataskHistorialTree,
} from '@/src/types/nexiatask.types';

type ProxyEndpoint = 'avance' | 'tareas' | 'kpis' | 'historial';

async function invokeProxy<T>(
  endpoint: ProxyEndpoint,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(
    'nexiatask-proxy',
    { body: { endpoint, params } },
  );
  if (error) {
    throw new Error(`[nexiatask-proxy] ${endpoint}: ${error.message}`);
  }
  if (data == null) {
    throw new Error(`[nexiatask-proxy] ${endpoint}: empty response`);
  }
  return data;
}

// ─── Responsabilidades (lista) ──────────────────────────────────

export async function fetchResponsibilities(): Promise<NexiataskResponsibilities> {
  return withMock(
    async () => {
      // /avance devuelve las tareas de la semana actual con todos los
      // campos (responsabilidad/objetivo/meta/seguimiento/bloqueo/etc).
      // Lo preferimos sobre /tareas para tener un solo source-of-truth.
      const resp = await invokeProxy<NexiataskAvanceResponse>('avance', {
        include_completed: true,
      });
      return groupTareasIntoResponsibilities(resp.tareas ?? []);
    },
    () => groupTareasIntoResponsibilities(mockNexiataskTareasRaw),
  );
}

// ─── Lista por tarea + avances (drawer = tarea) ─────────────────

/**
 * Árbol departamento → tareas (cada una con su historial de avances) para
 * la lista de reportes. Combina `/avance` (departamento, estado, %) con
 * `/historial` (avances por tarea) — ver buildTareasConAvancesTree.
 */
export async function fetchTareasConHistorial(): Promise<NexiataskHistorialTree> {
  return withMock(
    async () => {
      const [avance, historial] = await Promise.all([
        invokeProxy<NexiataskAvanceResponse>('avance', {
          include_completed: true,
        }),
        invokeProxy<NexiataskHistorialResponse>('historial'),
      ]);
      return buildTareasConAvancesTree(avance.tareas ?? [], historial);
    },
    () => getNexiataskHistorialTree(),
  );
}

// ─── Detalle de una tarea ───────────────────────────────────────

export async function fetchTareaDetalle(
  tareaId: string,
): Promise<NexiataskTareaDetalle | null> {
  return withMock(
    async () => {
      // /avance no expone GET por tarea_id → pedimos la semana actual y
      // filtramos client-side para los campos de la tarea. En paralelo
      // pedimos /historial?tarea_id=<id> para el histórico de avances.
      const [resp, historial] = await Promise.all([
        invokeProxy<NexiataskAvanceResponse>('avance', {
          include_completed: true,
        }),
        invokeProxy<NexiataskHistorialResponse>('historial', {
          tarea_id: tareaId,
        }),
      ]);

      const raw = (resp.tareas ?? []).find(
        (t: NexiataskTareaRaw) => t.tarea_id === tareaId,
      );
      if (!raw) return null;

      // Reusamos el armador del mock para obtener el shape UI ya parseado
      // (fechas, cumplimientoPct coalescido, etc.).
      const tree = groupTareasIntoResponsibilities(resp.tareas ?? []);
      const depto = tree.departamentos.find(
        (d) => d.nombre === raw.departamento,
      );
      const ui = depto?.proyectos
        .flatMap((p) => p.tareas)
        .find((t) => t.id === tareaId);
      if (!ui) return null;

      const historialTarea = (historial.tareas ?? []).find(
        (t) => t.tarea_id === tareaId,
      );

      return {
        ...ui,
        departamentoId: depto?.id ?? '',
        departamentoNombre: raw.departamento || 'Sin Departamento',
        objetivo: raw.objetivo,
        meta: raw.meta,
        // `resultado` === `seguimiento` (la API lo reintrodujo por compat);
        // usamos `resultado` con fallback al narrativo de `seguimiento`.
        resultado: raw.resultado || raw.seguimiento,
        bloqueo: raw.bloqueo,
        apoyoRequerido: raw.apoyo_requerido,
        fechaLimite: raw.fecha_limite,
        avances: mapHistorialAvances(historialTarea?.avances ?? [], tareaId),
      };
    },
    () => getNexiataskTareaDetalle(tareaId),
  );
}
