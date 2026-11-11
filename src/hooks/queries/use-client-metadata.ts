/**
 * useClientMetadata — all-time aggregate stats for one centro_costo.
 * Used by client detail screens to populate Terceros / Movimientos / Vigencia.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/config/supabase';

export interface ClientMetadata {
  nTerceros: number;
  nCuentas: number;
  nEntries: number;
  firstFecha: string | null;
  lastFecha: string | null;
  idCentroCosto: string | null;
  /** Raw row from clientes_master.data (PBI ListadoClientes5Stars). */
  clienteData: Record<string, unknown> | null;
  /**
   * Asociados vigentes del centro_costo. Misma fuente y mismo corte que el
   * Informe Asociados activos (empleados_detail: con codigoalterno,
   * deduplicado por persona con su asignación vigente), así que el número
   * de esta ficha y el del informe siempre coinciden.
   *
   * `0` = el cliente está en empleadosHotel pero nadie tiene código vigente.
   * `null` = el cliente no aparece en empleadosHotel (la UI muestra "XX").
   */
  empleadosActivos: number | null;
  /**
   * Universo del cliente en empleadosHotel sin el filtro de código. La
   * diferencia contra `empleadosActivos` es la gente sin codigoalterno
   * asignado (p. ej. BENCHMARK: 0 de 4).
   */
  empleadosTotal: number | null;
}

interface MetadataRow {
  n_terceros: number | string;
  n_cuentas: number | string;
  n_entries: number | string;
  first_fecha: string | null;
  last_fecha: string | null;
  id_centro_costo: string | null;
  cliente_data: Record<string, unknown> | null;
  empleados_activos: number | string | null;
  empleados_total: number | string | null;
}

export function useClientMetadata(centroCosto: string | null) {
  return useQuery<ClientMetadata | null>({
    queryKey: ['clientMetadata', centroCosto],
    queryFn: async () => {
      if (!centroCosto) return null;
      const { data, error } = await supabase.rpc('get_client_metadata', {
        p_centro_costo: centroCosto,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | MetadataRow
        | undefined;
      if (!row) return null;
      const activos = row.empleados_activos;
      const total = row.empleados_total;
      return {
        nTerceros: Number(row.n_terceros),
        nCuentas: Number(row.n_cuentas),
        nEntries: Number(row.n_entries),
        firstFecha: row.first_fecha,
        lastFecha: row.last_fecha,
        idCentroCosto: row.id_centro_costo ?? null,
        clienteData: row.cliente_data ?? null,
        empleadosActivos: activos == null ? null : Number(activos),
        empleadosTotal: total == null ? null : Number(total),
      };
    },
    enabled: !!centroCosto,
    staleTime: 30 * 60 * 1000,
  });
}
