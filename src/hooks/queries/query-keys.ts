/**
 * Centralized Query Keys
 *
 * All TanStack Query keys in one place for easy invalidation.
 */

export const queryKeys = {
  revenue: (period: string) => ['revenue', period] as const,
  topClients: (period: string, limit: number) =>
    ['topClients', period, limit] as const,
  categories: (period: string) => ['categories', period] as const,
  powerBIEmbed: (groupId: string, reportId: string) =>
    ['powerbi', 'embed', groupId, reportId] as const,
  powerBIReports: (groupId: string) =>
    ['powerbi', 'reports', groupId] as const,
  powerBITimeSeries: (datasetId: string, daxQuery: string) =>
    ['powerbi', 'timeseries', datasetId, daxQuery] as const,
  consolidadoClients: (period: string, categoryId: string) =>
    ['consolidado', categoryId, 'clients', period] as const,
  costGroups: (period: string, categoryId: string, clientId: string) =>
    ['consolidado', categoryId, 'groups', clientId, period] as const,
  thirdParties: (period: string, categoryId: string, groupId: string) =>
    ['consolidado', categoryId, 'terceros', groupId, period] as const,
  qbStatus: () => ['qb', 'status'] as const,
  companies: () => ['companies'] as const,
  company: (companyId: string) => ['companies', companyId] as const,
  companyMetrics: (period: string, companyId: string) =>
    ['companies', companyId, 'metrics', period] as const,
  qbCompanyInfo: () => ['qb', 'companyInfo'] as const,
  qbCustomers: () => ['qb', 'customers'] as const,
  qbCustomerBalance: (name: string) => ['qb', 'customerBalance', name] as const,
  qbProfitAndLoss: (start: string, end: string) =>
    ['qb', 'profitAndLoss', start, end] as const,
  qbProfitAndLossByColumn: (start: string, end: string, summarize: string) =>
    ['qb', 'profitAndLoss', start, end, 'by', summarize] as const,
  qbGeneralLedger: (accountIds: string, start: string, end: string) =>
    ['qb', 'generalLedger', accountIds, start, end] as const,
  dashboardSummary: (
    period: string,
    centroCosto: string | null,
    compare: boolean,
  ) => ['dashboard', 'summary', period, centroCosto, compare] as const,
  dashboardTimeseries: (
    period: string,
    centroCosto: string | null,
    compare: boolean,
  ) => ['dashboard', 'timeseries', period, centroCosto, compare] as const,
  pbiSyncLatest: () => ['pbi', 'sync', 'latest'] as const,
  presupuesto: (tipo: string, periodo: string) =>
    ['presupuesto', tipo, periodo] as const,
  nexiataskResponsibilities: () => ['nexiatask', 'responsibilities'] as const,
  nexiataskHistorial: () => ['nexiatask', 'historial'] as const,
  nexiataskTarea: (tareaId: string) => ['nexiatask', 'tarea', tareaId] as const,
  asociadosSnapshot: () => ['asociados', 'snapshot'] as const,
  asociadosTrend: () => ['asociados', 'trend'] as const,
  bancosSnapshot: () => ['bancos', 'snapshot'] as const,
  segurosSnapshot: () => ['seguros', 'snapshot'] as const,
  pagosSnapshot: () => ['pagos', 'snapshot'] as const,
  carteraSnapshot: () => ['cartera', 'snapshot'] as const,
  otrasEmpresas: () => ['otras-empresas', 'list'] as const,
  otrasEmpresaDetail: (id: string, period: string) =>
    ['otras-empresas', id, 'detail', period] as const,
  vagResumen: () => ['vag', 'resumen'] as const,
  vagActivos: () => ['vag', 'activos'] as const,
  vagMovimientos: () => ['vag', 'movimientos'] as const,
  vagCuentas: (tipo: string) => ['vag', 'cuentas', tipo] as const,
  vagActivoDocs: () => ['vag', 'activo-docs'] as const,
  repoApartados: () => ['repositorio', 'apartados'] as const,
  repoApartado: (id: string) => ['repositorio', 'apartados', id] as const,
  repoArchivos: (apartadoId: string) =>
    ['repositorio', 'archivos', apartadoId] as const,
  usuarios: () => ['usuarios', 'list'] as const,
  // Prefix for bulk invalidation
  all: ['finance'] as const,
} as const;
