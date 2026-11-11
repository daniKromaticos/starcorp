/**
 * Presupuesto Mock Data
 *
 * Datos en el shape UI del Informe Presupuesto (agrupado EMPRESA →
 * CENTRO DE COSTOS), simulando la tabla `PROYECCION` de Power BI.
 * Los valores agregados del tipo "ingreso · corriente" cuadran con el
 * gauge del mockup ($882.62 mil ejecutado, ~80% de ejecución).
 *
 * Cuando se conecte Power BI, solo cambia el armador en
 * presupuesto.service.ts; los tipos y la UI no se mueven.
 */

import type {
  PresupuestoData,
  PresupuestoEmpresa,
  PresupuestoCentroCosto,
  PresupuestoQuery,
  PresupuestoTipo,
} from '@/src/types/presupuesto.types';

const DEFAULT_CENTROS = ['Echid Ohio', 'Lake Naomi', 'Okana Resort'];

const COMENTARIO_INGRESO = 'Anticipo retiro utilidades';
const COMENTARIO_GASTO = 'Pago a terceros del período';

/**
 * Construye una EMPRESA repartiendo proyectado/ejecutado entre N centros
 * de costos (el último absorbe el remanente para que las sumas cuadren).
 */
function buildEmpresa(
  id: string,
  empresa: string,
  tipo: PresupuestoTipo,
  proyectado: number,
  ejecutado: number,
  centroNames: string[] = DEFAULT_CENTROS,
): PresupuestoEmpresa {
  const concepto = tipo === 'ingreso' ? 'Ingresos' : 'Gastos';
  const comentario = tipo === 'ingreso' ? COMENTARIO_INGRESO : COMENTARIO_GASTO;
  const n = centroNames.length;
  const proyStep = Math.round(proyectado / n);
  const ejecStep = Math.round(ejecutado / n);

  const centrosCosto: PresupuestoCentroCosto[] = centroNames.map((nombre, i) => {
    const isLast = i === n - 1;
    const proy = isLast ? proyectado - proyStep * (n - 1) : proyStep;
    const ejec = isLast ? ejecutado - ejecStep * (n - 1) : ejecStep;
    return {
      id: `${id}-cc${i + 1}`,
      centroCostos: nombre,
      proyectado: proy,
      ejecutado: ejec,
      concepto,
      categoria: concepto,
      porcentajeEje: proy > 0 ? Math.round((ejec / proy) * 10000) / 100 : 0,
      comentario,
    };
  });

  return { id, empresa, tipo, tipoLabel: tipo === 'ingreso' ? 'Ingreso' : 'Gasto', proyectado, ejecutado, centrosCosto };
}

// Base "mes corriente". Las sumas de ingreso → proyectado 1.103.275 /
// ejecutado 882.620 (fraction 0.8, center "$882.62 mil").
const BASE_EMPRESAS: PresupuestoEmpresa[] = [
  buildEmpresa('5stars', '5 Stars', 'ingreso', 320000, 258547),
  buildEmpresa('clean', 'Clean with me', 'ingreso', 240000, 190000),
  buildEmpresa('mcs', 'MCS', 'ingreso', 210000, 165000),
  buildEmpresa('onea', 'One A', 'ingreso', 180000, 140000),
  buildEmpresa('seasons', 'Seasons Solutions', 'ingreso', 153275, 129073),
  buildEmpresa('proveedores', 'Proveedores Generales', 'gasto', 210000, 168400),
  buildEmpresa('nomina', 'Nómina', 'gasto', 180000, 176200, ['Administración', 'Operaciones']),
  buildEmpresa('servicios', 'Servicios', 'gasto', 96000, 71500, ['Echid Ohio', 'Lake Naomi']),
];

/** Variación % por tipo+período (badge del gauge). */
const DELTA_PCT: Record<PresupuestoTipo, Record<'corriente' | 'pasado', number>> = {
  ingreso: { corriente: 1.87, pasado: -0.94 },
  gasto: { corriente: -2.31, pasado: 1.12 },
};

function scaleEmpresa(e: PresupuestoEmpresa, factor: number): PresupuestoEmpresa {
  return buildEmpresa(
    e.id,
    e.empresa,
    e.tipo,
    Math.round(e.proyectado * factor),
    Math.round(e.ejecutado * factor),
    e.centrosCosto.map((c) => c.centroCostos),
  );
}

export function getPresupuestoMock(query: PresupuestoQuery): PresupuestoData {
  const { tipo, periodo } = query;
  // "Mes pasado" = base escalada (~0.96) para que el delta cambie.
  const factor = periodo === 'pasado' ? 0.96 : 1;
  const empresas = BASE_EMPRESAS.filter((e) => e.tipo === tipo).map((e) =>
    factor === 1 ? e : scaleEmpresa(e, factor),
  );

  const totalProyectado = empresas.reduce((s, e) => s + e.proyectado, 0);
  const totalEjecutado = empresas.reduce((s, e) => s + e.ejecutado, 0);
  const fraction =
    totalProyectado > 0
      ? Math.max(0, Math.min(1, totalEjecutado / totalProyectado))
      : 0;
  const pctReal =
    totalProyectado > 0
      ? Math.round((totalEjecutado / totalProyectado) * 10000) / 100
      : 0;

  return {
    tipo,
    periodo,
    periodoLabel: periodo === 'corriente' ? 'Junio 2026' : 'Mayo 2026',
    empresas,
    totalProyectado,
    totalEjecutado,
    ejecucion: {
      ejecutado: totalEjecutado,
      proyectado: totalProyectado,
      fraction,
      pctReal,
      deltaPct: DELTA_PCT[tipo][periodo],
    },
  };
}
