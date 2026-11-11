/**
 * Catálogo de permisos — derivado de las rutas reales de la app.
 *
 * Cada sección tiene un permiso base `*.ver` (habilita la sección en
 * drawer/tab bar) y permisos finos por sub-vista. Los permisos viven en
 * `app_metadata.permissions` (string[]) — solo modificables server-side
 * (edge function admin-users), así un invitado no puede auto-ampliarse.
 *
 * Usuarios y Conexión QuickBooks NO son permisos: son exclusivos del
 * rol super_admin.
 */

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionSection {
  id: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: 'consolidado',
    label: 'Consolidado',
    permissions: [
      { key: 'consolidado.ver', label: 'Ver consolidado' },
      { key: 'consolidado.ingresos', label: 'Ver ingresos consolidados' },
      { key: 'consolidado.costos', label: 'Ver costos consolidados' },
      { key: 'consolidado.gastos', label: 'Ver gastos consolidados' },
      { key: 'consolidado.utilidades', label: 'Ver utilidades consolidadas' },
    ],
  },
  {
    id: 'financiero',
    label: 'Financiero',
    permissions: [
      { key: 'financiero.ver', label: 'Ver financiero' },
      { key: 'financiero.ingresos', label: 'Ver ingresos' },
      { key: 'financiero.costos', label: 'Ver costos' },
      { key: 'financiero.egresos', label: 'Ver egresos' },
      { key: 'financiero.utilidades', label: 'Ver utilidades' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    permissions: [{ key: 'clientes.ver', label: 'Ver clientes' }],
  },
  {
    id: 'informes',
    label: 'Informes',
    permissions: [
      { key: 'informes.ver', label: 'Ver informes' },
      { key: 'informes.bancos', label: 'Ver informe de bancos' },
      { key: 'informes.cartera', label: 'Ver informe de cartera' },
      { key: 'informes.asociados', label: 'Ver informe de asociados' },
      { key: 'informes.pagos', label: 'Ver calendario de pagos' },
      { key: 'informes.presupuesto', label: 'Ver presupuesto' },
      { key: 'informes.seguros', label: 'Ver seguros' },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    permissions: [{ key: 'reportes.ver', label: 'Ver reportes' }],
  },
  {
    id: 'empresas',
    label: 'Otras compañías',
    permissions: [
      { key: 'empresas.ver', label: 'Ver otras compañías' },
      { key: 'empresas.bbm', label: 'Ver BBM' },
      { key: 'empresas.vag', label: 'Ver Grupo Orion Holding' },
      { key: 'empresas.repositorio', label: 'Ver repositorio' },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_SECTIONS.flatMap(
  (s) => s.permissions.map((p) => p.key),
);
