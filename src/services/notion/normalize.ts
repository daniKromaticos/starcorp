/**
 * Normalizer Notion: aplana las propiedades de una página al valor
 * "limpio" del tipo correspondiente. Mantenelo genérico — cada feature
 * (Seguros, etc.) compone su propio normalizer encima.
 */

import type { NotionPage, NotionProperty } from '@/src/types/api.types';

/**
 * Devuelve el valor "limpio" de una propiedad. Tipos no soportados
 * devuelven null en lugar de throwear para tolerar evolución del schema.
 */
export function pickValue(p: NotionProperty | undefined): unknown {
  if (!p) return null;
  switch (p.type) {
    case 'title':
      return (p.title as { plain_text: string }[])
        .map((t) => t.plain_text)
        .join('');
    case 'rich_text':
      return (p.rich_text as { plain_text: string }[])
        .map((t) => t.plain_text)
        .join('');
    case 'number':
      return (p.number as number | null) ?? null;
    case 'select':
      return (p.select as { name: string } | null)?.name ?? null;
    case 'multi_select':
      return (p.multi_select as { name: string }[]).map((s) => s.name);
    case 'status':
      return (p.status as { name: string } | null)?.name ?? null;
    case 'date': {
      const d = p.date as { start: string; end: string | null } | null;
      return d?.start ?? null;
    }
    case 'checkbox':
      return p.checkbox as boolean;
    case 'url':
      return (p.url as string | null) ?? null;
    case 'email':
      return (p.email as string | null) ?? null;
    case 'people':
      return (p.people as { name?: string }[])
        .map((u) => u.name)
        .filter(Boolean);
    case 'relation':
      return (p.relation as { id: string }[]).map((r) => r.id);
    case 'formula': {
      const f = p.formula as
        | { type: 'string'; string: string | null }
        | { type: 'number'; number: number | null }
        | { type: 'boolean'; boolean: boolean | null }
        | { type: 'date'; date: { start: string } | null }
        | undefined;
      if (!f) return null;
      if (f.type === 'string') return f.string;
      if (f.type === 'number') return f.number;
      if (f.type === 'boolean') return f.boolean;
      if (f.type === 'date') return f.date?.start ?? null;
      return null;
    }
    default:
      return null;
  }
}

/**
 * Devuelve un Record<propName, valor>. Útil para acceder por nombre
 * (case-sensitive — debe coincidir EXACTO con Notion incluyendo tildes).
 */
export function flatProperties(page: NotionPage): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(page.properties)) {
    out[name] = pickValue(prop);
  }
  return out;
}

export interface NormalizedRow extends Record<string, unknown> {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export function normalizeRows(pages: NotionPage[]): NormalizedRow[] {
  return pages.map((page) => ({
    id: page.id,
    url: page.url,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
    ...flatProperties(page),
  }));
}

/** Lee una prop por nombre con fallback. Útil cuando el tablero usa
 * variantes de nombre (e.g. "Vigencia" vs "Vigencia inicio"). */
export function pickField<T = unknown>(
  row: Record<string, unknown>,
  names: string[],
  fallback: T | null = null,
): T | null {
  for (const name of names) {
    const v = row[name];
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return fallback;
}
