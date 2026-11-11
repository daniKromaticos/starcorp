/**
 * Origen de la entrada actual al stack de Informes.
 *
 * Home marca 'home' antes de abrir un informe; informes/_layout lo lee para
 * que el "atrás" vuelva a Home (donde estaba) en vez de pasar por el grid de
 * Informes. Es estado de navegación efímero: no dispara renders, por eso no
 * vive en un store de Zustand.
 */

export type InformeOrigin = 'home' | null;

let origin: InformeOrigin = null;

export function setInformeOrigin(next: InformeOrigin): void {
  origin = next;
}

export function getInformeOrigin(): InformeOrigin {
  return origin;
}
