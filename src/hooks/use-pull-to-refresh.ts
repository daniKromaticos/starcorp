/**
 * usePullToRefresh — estado del RefreshControl atado a un `refetch`.
 *
 * Usa estado local en vez de `isRefetching` de TanStack Query a propósito:
 * `isRefetching` también se pone en true en los refetch de fondo (los que
 * dispara el foco de la app), y el spinner aparecería solo, sin que nadie
 * haya tirado de la lista.
 */

import { useCallback, useState } from 'react';

export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
