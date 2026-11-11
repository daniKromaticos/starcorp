/**
 * Color utilities — small helpers for tonal variants used across charts
 * and small UI accents (legend dots, slice fills).
 */

export function darkenHex(hex: string, factor = 0.7): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * factor));
  const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * factor));
  const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * factor));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lightenHex(hex: string, factor = 1.18): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const clamp = (n: number) => Math.min(255, Math.max(0, n));
  const r = clamp(Math.round(parseInt(h.substring(0, 2), 16) * factor));
  const g = clamp(Math.round(parseInt(h.substring(2, 4), 16) * factor));
  const b = clamp(Math.round(parseInt(h.substring(4, 6), 16) * factor));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
