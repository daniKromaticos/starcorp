/**
 * useGlobalSearch — unified result list for the global search modal.
 *
 * Combines two sources:
 *   - Empresas: `useCompanies()` (QB realms)
 *   - Clientes: `useConsolidadoClients('ingresos')` (PBI centros de costo).
 *     We use `ingresos` because the global search targets revenue-bearing
 *     clients (the typical search target). If a client only appears under
 *     costos/gastos, it won't be found here; switch to a dedicated
 *     "all centros" RPC later if that becomes a problem.
 *
 * Filtering is a simple case-insensitive substring match on `name` / `nameLower`
 * applied client-side; both lists fit comfortably in memory.
 */

import { useMemo } from 'react';
import { useCompanies } from './use-companies';
import { useConsolidadoClients } from './use-consolidado-clients';

export type GlobalSearchResult =
  | { kind: 'empresa'; id: string; name: string }
  | { kind: 'cliente'; id: string; name: string };

interface UseGlobalSearchOptions {
  query: string;
  limit?: number;
}

interface UseGlobalSearchReturn {
  empresas: GlobalSearchResult[];
  clientes: GlobalSearchResult[];
  isLoading: boolean;
}

export function useGlobalSearch({
  query,
  limit = 50,
}: UseGlobalSearchOptions): UseGlobalSearchReturn {
  const companiesQuery = useCompanies();
  const clientsQuery = useConsolidadoClients('ingresos');

  return useMemo(() => {
    const needle = query.trim().toLowerCase();

    const allEmpresas: GlobalSearchResult[] = (companiesQuery.data ?? []).map(
      (c) => ({ kind: 'empresa', id: c.id, name: c.name }),
    );
    const allClientes: GlobalSearchResult[] = (clientsQuery.data ?? []).map(
      (c) => ({ kind: 'cliente', id: c.id, name: c.name }),
    );

    const match = (name: string) =>
      needle === '' || name.toLowerCase().includes(needle);

    return {
      empresas: allEmpresas.filter((e) => match(e.name)).slice(0, limit),
      clientes: allClientes.filter((c) => match(c.name)).slice(0, limit),
      isLoading: companiesQuery.isPending || clientsQuery.isPending,
    };
  }, [
    companiesQuery.data,
    companiesQuery.isPending,
    clientsQuery.data,
    clientsQuery.isPending,
    query,
    limit,
  ]);
}
