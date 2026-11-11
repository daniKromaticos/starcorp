/**
 * Notion client — wrapper sobre la edge function `notion-query`.
 *
 * El cliente NUNCA habla con api.notion.com directo. Antes de cada
 * llamada se asegura una sesión Supabase (anónima si no hay login real
 * todavía) para que la edge function pueda validar JWT.
 */

import {
  ensureAnonymousSession,
  supabase,
} from '@/src/config/supabase';
import type { NotionQueryResponse } from '@/src/types/api.types';

export interface NotionQueryParams {
  database_id: string;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  page_size?: number;
  start_cursor?: string;
  fetch_all?: boolean;
}

export async function notionQuery(
  params: NotionQueryParams,
): Promise<NotionQueryResponse> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.functions.invoke<NotionQueryResponse>(
    'notion-query',
    { body: params },
  );
  if (error) {
    throw new Error(`[notion-query] ${error.message}`);
  }
  if (!data) {
    throw new Error('[notion-query] empty response');
  }
  return data;
}

/**
 * Trae todas las filas de un database paginando del lado del cliente.
 * Útil cuando el tablero supera lo que `fetch_all=true` puede consolidar
 * en una sola invocación de la edge function (CPU cap ~25s).
 */
export async function notionQueryAll(
  base: Omit<NotionQueryParams, 'start_cursor' | 'fetch_all'>,
): Promise<NotionQueryResponse> {
  const all: NotionQueryResponse['results'] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const resp = await notionQuery({
      ...base,
      start_cursor: cursor,
      fetch_all: true,
    });
    all.push(...resp.results);
    cursor = resp.next_cursor ?? undefined;
    pages += 1;
    if (pages > 50) break;
  } while (cursor);
  return { results: all, has_more: false, next_cursor: null };
}
