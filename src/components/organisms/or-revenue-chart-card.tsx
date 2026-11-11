/**
 * Organism: OrRevenueChartCard
 *
 * "Empresas (Consolidado)" card. Renders a Corriente vs Histórico area chart
 * with a Totalizado / Corriente / Histórico toggle. Consumes real data from
 * the get_dashboard_summary + get_consolidated_timeseries RPCs.
 */

import React, { memo, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { View, Pressable } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { Skeleton } from '@/src/components/atoms/skeleton';
import { AreaChart } from '@/src/components/charts/area-chart';
import { useChartActivePoint } from '@/src/components/charts/use-chart-active-point';
import { MlChartTooltip } from '@/src/components/molecules/ml-chart-tooltip';
import {
  useDashboardSummary,
  type DashboardSummaryPeriod,
} from '@/src/hooks/queries/use-dashboard-summary';
import {
  useDashboardTimeseries,
  type TimeseriesBucket,
} from '@/src/hooks/queries/use-dashboard-timeseries';
import type { PeriodKey } from '@/src/types/domain.types';
import {
  formatAxisDate,
  formatMonthLabel,
  pickEvenly,
  shiftIsoDate,
} from '@/src/utils/date';

interface OrRevenueChartCardProps {
  onPress?: () => void;
  categoryId?: string;
  label?: string;
  period: PeriodKey;
  centroCosto?: string | null;
  /** When provided, the big header value (and delta) is replaced with this
   *  number — used to surface metrics that don't belong to the consolidated
   *  P&L summary, e.g. QB outstanding balance ("Cartera"). The area chart
   *  itself keeps showing `categoryId` since cartera has no timeseries. */
  headerValueOverride?: number | null;
  /** Arrow rendered next to the override value (e.g. Cartera ascendente o
   *  descendente). Only shown when `headerValueOverride` is provided. */
  headerTrend?: 'up' | 'down' | null;
  /** When true the chart series are forced to 0 — used when the selected
   *  metric has no data for this client (e.g. sin cartera). */
  zeroData?: boolean;
  /**
   * 'margen' cambia la serie a un ratio: en vez de graficar el monto de
   * `categoryId` grafica utilidad/ingresos por bucket, con eje, tooltip y
   * header en porcentaje. El resto de métricas usan 'category'.
   */
  metricMode?: 'category' | 'margen';
}

export type ConsolidadoView = 'totalizado' | 'corriente' | 'historico';
type CategoryId = 'ingresos' | 'costos' | 'gastos' | 'utilidad';
type MetricMode = 'category' | 'margen';

/** Margen en %, 0 cuando no hay base de ingresos (evita Infinity/NaN). */
function marginPct(utilidad: number, ingresos: number): number {
  return ingresos !== 0 ? (utilidad / ingresos) * 100 : 0;
}

// PeriodKey 'today' is shown as "Mes corriente" in the UI; the RPC accepts 'mtd'.
const RPC_PERIOD: Record<PeriodKey, DashboardSummaryPeriod> = {
  today: 'mtd',
  '1w': '1w',
  '1m': '1m',
  '3m': '3m',
  '12m': '12m',
};

export const OrRevenueChartCard = memo<OrRevenueChartCardProps>(
  ({ onPress, categoryId = 'ingresos', label = 'Ingresos', period, centroCosto, headerValueOverride, headerTrend, zeroData, metricMode = 'category' }) => {
    return (
      <Pressable
        onPress={onPress}
        className="bg-bg-card rounded-lg p-4 mx-4 gap-3"
        style={{
          borderCurve: 'continuous',
          boxShadow:
            '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <ConsolidadoChartCard
          categoryId={categoryId as CategoryId}
          label={label}
          period={period}
          centroCosto={centroCosto}
          headerValueOverride={headerValueOverride}
          headerTrend={headerTrend}
          zeroData={zeroData}
          metricMode={metricMode}
        />
      </Pressable>
    );
  },
);
OrRevenueChartCard.displayName = 'OrRevenueChartCard';

function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Dominio del eje en modo porcentaje: múltiplos de 10 (mínimo 10) para que
 * el tick intermedio (`yMax / 2`) también caiga en un entero redondo. La
 * escala compacta de `niceCeil` salta de 22 a 50 y deja la serie aplastada
 * contra el piso del chart.
 */
function niceCeilPercent(value: number): number {
  if (value <= 0) return 0;
  return Math.max(10, Math.ceil(value / 10) * 10);
}

function niceFloorPercent(value: number): number {
  if (value >= 0) return 0;
  return Math.min(-10, Math.floor(value / 10) * 10);
}

function niceFloor(value: number): number {
  if (value >= 0) return 0;
  const abs = Math.abs(value);
  const pow = Math.pow(10, Math.floor(Math.log10(abs)));
  const n = abs / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return -nice * pow;
}

const ConsolidadoChartCard = memo<{
  categoryId: CategoryId;
  label: string;
  period: PeriodKey;
  centroCosto?: string | null;
  headerValueOverride?: number | null;
  headerTrend?: 'up' | 'down' | null;
  zeroData?: boolean;
  metricMode?: MetricMode;
}>(({ categoryId, label, period, centroCosto, headerValueOverride, headerTrend, zeroData, metricMode = 'category' }) => {
  const [view, setView] = useState<ConsolidadoView>('totalizado');
  const rpcPeriod = RPC_PERIOD[period];
  const summary = useDashboardSummary(rpcPeriod, {
    compare: true,
    centroCosto: centroCosto ?? null,
  });
  const timeseries = useDashboardTimeseries(rpcPeriod, {
    compare: true,
    centroCosto: centroCosto ?? null,
  });

  const isMargen = metricMode === 'margen';

  const buckets = useMemo(() => timeseries.data ?? [], [timeseries.data]);
  // En modo margen la serie es el ratio del bucket, no su monto: cada punto
  // es utilidad/ingresos de ESE bucket (no un acumulado del periodo).
  const corriente = useMemo(
    () =>
      buckets.map((b) =>
        zeroData
          ? 0
          : isMargen
            ? marginPct(b.utilidad, b.ingresos)
            : b[categoryId],
      ),
    [buckets, categoryId, zeroData, isMargen],
  );
  const historico = useMemo(
    () =>
      buckets.map((b) =>
        zeroData
          ? 0
          : isMargen
            ? marginPct(b.utilidadPrev, b.ingresosPrev)
            : prevField(b, categoryId),
      ),
    [buckets, categoryId, zeroData, isMargen],
  );
  // Cada bucket se rotula por su fecha de inicio, salvo el último, que se
  // rotula con el cierre del periodo (fin exclusivo − 1 día). Así el borde
  // derecho del eje siempre muestra el último día cerrado (ej. 31-may para
  // 1m) en vez del inicio del último bucket (28-may, …).
  // En 3m/12m cada bucket es un mes completo: se rotula solo con el nombre
  // del mes ("Octubre"); "1 oct" se leía como un día puntual, no como el mes.
  const isMonthly = period === '3m' || period === '12m';
  const xLabels = useMemo(
    () =>
      buckets.map((b, i) =>
        isMonthly
          ? formatMonthLabel(b.start)
          : i === buckets.length - 1
            ? formatAxisDate(shiftIsoDate(b.end, -1))
            : formatAxisDate(b.start),
      ),
    [buckets, isMonthly],
  );
  // El eje usa la abreviatura ("Oct") para que 6 nombres quepan en una fila;
  // el tooltip conserva el nombre completo.
  const xAxisLabels = useMemo(
    () =>
      isMonthly ? buckets.map((b) => formatMonthLabel(b.start, true)) : xLabels,
    [buckets, isMonthly, xLabels],
  );

  // El margen del periodo NO es la suma (ni el promedio) de los margenes
  // por bucket: se recalcula sobre los totales para que un bucket flaco no
  // pese igual que uno grande.
  const margenTotals = useMemo(() => {
    if (!isMargen) return null;
    const sum = (pick: (b: (typeof buckets)[number]) => number) =>
      buckets.reduce((acc, b) => acc + pick(b), 0);
    return {
      corriente: marginPct(sum((b) => b.utilidad), sum((b) => b.ingresos)),
      historico: marginPct(
        sum((b) => b.utilidadPrev),
        sum((b) => b.ingresosPrev),
      ),
    };
  }, [buckets, isMargen]);

  const totalCorriente = margenTotals
    ? margenTotals.corriente
    : corriente.reduce((s, v) => s + v, 0);
  const totalHistorico = margenTotals
    ? margenTotals.historico
    : historico.reduce((s, v) => s + v, 0);
  const totalAll = summary.data
    ? isMargen
      ? marginPct(summary.data.utilidad, summary.data.ingresos)
      : summary.data[categoryId]
    : 0;
  // Margen: la variación son puntos porcentuales (18% → 21% = 3 pp); el
  // resto de categorías usa el delta relativo que ya devuelve el RPC.
  const deltaPct = summary.data
    ? isMargen
      ? totalAll - marginPct(summary.data.utilidadPrev, summary.data.ingresosPrev)
      : summary.data[`${categoryId}DeltaPercent` as const]
    : 0;

  const isOverride = headerValueOverride != null;
  const headerValue = isOverride
    ? headerValueOverride
    : view === 'corriente'
      ? totalCorriente
      : view === 'historico'
        ? totalHistorico
        : totalAll;
  // Override values (e.g. Cartera) have no comparable previous period; hide
  // the delta chip rather than show a misleading delta from `categoryId`.
  const headerDelta = isOverride
    ? null
    : view === 'historico'
      ? -deltaPct
      : deltaPct;

  const isLoading = summary.isPending || timeseries.isPending;

  return (
    <>
      <View className="gap-1">
        <AtTypography variant="captionBold" color="#4A5568">
          {label}
        </AtTypography>
        <View className="flex-row items-center gap-3">
          {isLoading && !summary.data ? (
            <Skeleton width={140} height={28} />
          ) : (
            <>
              <AtMetricValue
                value={headerValue}
                size="lg"
                format={isMargen ? 'percent' : 'currency'}
              />
              {isOverride && headerTrend != null && (
                <AtIcon
                  name={headerTrend === 'up' ? 'north-east' : 'south-east'}
                  size={22}
                  color={headerTrend === 'up' ? '#22C55E' : '#EF4444'}
                />
              )}
              {headerDelta != null && (
                <AtDeltaIndicator
                  value={headerDelta}
                  appearance="dark"
                  size="lg"
                  unit={isMargen ? 'pp' : '%'}
                />
              )}
            </>
          )}
        </View>
      </View>

      {isLoading && buckets.length === 0 ? (
        <Skeleton width="100%" height={168} />
      ) : (
        <ConsolidadoChart
          corriente={corriente}
          historico={historico}
          view={view}
          xLabels={xLabels}
          xAxisLabels={xAxisLabels}
          isPercent={isMargen}
        />
      )}

      <ConsolidadoToggleBar value={view} onChange={setView} />
    </>
  );
});
ConsolidadoChartCard.displayName = 'ConsolidadoChartCard';

function prevField(bucket: TimeseriesBucket, category: CategoryId): number {
  switch (category) {
    case 'ingresos':
      return bucket.ingresosPrev;
    case 'costos':
      return bucket.costosPrev;
    case 'gastos':
      return bucket.gastosPrev;
    case 'utilidad':
      return bucket.utilidadPrev;
  }
}

const X_AXIS_HEIGHT = 18;
/** Ancho reservado por rótulo del eje X ("13 nov" ≈ 40px + aire). */
const X_AXIS_LABEL_SLOT = 58;
/** Bajo este ancho de pantalla la barra de toggles oculta el radio. */
const NARROW_SCREEN = 380;

export const ConsolidadoChart = memo<{
  corriente: number[];
  historico: number[];
  view: ConsolidadoView;
  xLabels: string[];
  /** Rótulos del eje X si difieren del tooltip (ej. "Oct" vs "Octubre"). */
  xAxisLabels?: string[];
  /** Serie de ratio (Margen): eje y tooltip en % en vez de moneda compacta. */
  isPercent?: boolean;
}>(({ corriente, historico, view, xLabels, xAxisLabels = xLabels, isPercent = false }) => {
  const { width: screenWidth } = useWindowDimensions();
  const yAxisWidth = 56;
  const chartWidth = screenWidth - 16 * 4 - yAxisWidth;
  const chartHeight = 160;

  const formatValue = useMemo(
    () => (isPercent ? formatAxisPercent : formatAxisNumber),
    [isPercent],
  );

  const { yMin, yMax } = useMemo(() => {
    const all = [...corriente, ...historico];
    const peak = Math.max(0, ...all);
    const trough = Math.min(0, ...all);
    return isPercent
      ? { yMin: niceFloorPercent(trough), yMax: niceCeilPercent(peak) }
      : { yMin: niceFloor(trough), yMax: niceCeil(peak) };
  }, [corriente, historico, isPercent]);

  const yTicks = useMemo(() => {
    if (yMin >= 0) return [yMax, yMax / 2, 0];
    if (yMax <= 0) return [0, yMin / 2, yMin];
    return [yMax, 0, yMin];
  }, [yMin, yMax]);

  const showCorriente = view === 'totalizado' || view === 'corriente';
  const showHistorico = view === 'totalizado' || view === 'historico';
  const hasData = corriente.some((v) => v !== 0) || historico.some((v) => v !== 0);
  const showXAxis = hasData && xLabels.length >= 2;

  const pointCount = corriente.length;
  const { activeIndex, handlers } = useChartActivePoint(pointCount, chartWidth);
  const showTooltip = hasData && activeIndex != null && activeIndex < pointCount;
  const activeX =
    activeIndex != null && pointCount > 1
      ? (activeIndex / (pointCount - 1)) * chartWidth
      : 0;
  const tooltipLines = useMemo(() => {
    if (activeIndex == null) return [];
    const lines: { color: string; label: string; value: string }[] = [];
    if (showCorriente)
      lines.push({
        color: '#E8952E',
        label: 'Corriente',
        value: formatValue(corriente[activeIndex] ?? 0),
      });
    if (showHistorico)
      lines.push({
        color: '#2D4BA0',
        label: 'Histórico',
        value: formatValue(historico[activeIndex] ?? 0),
      });
    return lines;
  }, [activeIndex, showCorriente, showHistorico, corriente, historico, formatValue]);

  return (
    <View
      style={{
        height: chartHeight + 8 + (showXAxis ? X_AXIS_HEIGHT : 0),
        marginTop: 4,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: chartHeight,
          width: yAxisWidth - 8,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 1,
        }}
      >
        {yTicks.map((t, i) => (
          <AtTypography key={i} variant="label" color="#8892A4">
            {formatValue(t)}
          </AtTypography>
        ))}
      </View>

      <View style={{ marginLeft: yAxisWidth }}>
        <View style={{ position: 'relative', height: chartHeight }}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: chartHeight,
              justifyContent: 'space-between',
            }}
          >
            {yTicks.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 1,
                  backgroundColor: tokens.color.border.subtle,
                }}
              />
            ))}
          </View>

          {!hasData && (
            <View
              style={{
                height: chartHeight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AtTypography variant="label" color="#8892A4">
                Sin datos en este periodo
              </AtTypography>
            </View>
          )}

          {hasData && showCorriente && (
            <View style={{ position: 'absolute', top: 0, left: 0 }}>
              <AreaChart
                data={corriente}
                width={chartWidth}
                height={chartHeight}
                color="#E8952E"
                smooth={false}
                strokeWidth={2}
                strokeOpacity={0.9}
                gradientId="grad-corriente"
                yMin={yMin}
                yMax={yMax}
                activeIndex={activeIndex}
                fillGradient={{
                  stops: [
                    { offset: 0, color: '#F2A24A', opacity: 0.85 },
                    { offset: 1, color: '#E8952E', opacity: 0.35 },
                  ],
                }}
              />
            </View>
          )}

          {hasData && showHistorico && (
            <View style={{ position: 'absolute', top: 0, left: 0 }}>
              <AreaChart
                data={historico}
                width={chartWidth}
                height={chartHeight}
                color="#2D4BA0"
                smooth={false}
                strokeWidth={3}
                strokeOpacity={1}
                gradientId="grad-historico"
                yMin={yMin}
                yMax={yMax}
                activeIndex={activeIndex}
                fillGradient={{
                  stops: [
                    { offset: 0, color: '#5B82E6', opacity: 0.35 },
                    { offset: 1, color: '#2D4BA0', opacity: 0.05 },
                  ],
                }}
              />
            </View>
          )}

          {hasData && pointCount >= 2 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              {...handlers}
            />
          )}

          {showTooltip && (
            <MlChartTooltip
              x={activeX}
              plotWidth={chartWidth}
              title={xLabels[activeIndex!] ?? ''}
              lines={tooltipLines}
            />
          )}
        </View>

        {showXAxis && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            {/* Cuántos rótulos caben según el ancho: con 6 fijos, en un
                teléfono de 360dp se pegaban ("1 nov7 nov13 nov"). */}
            {pickEvenly(
              xAxisLabels,
              Math.max(3, Math.min(6, Math.floor(chartWidth / X_AXIS_LABEL_SLOT))),
            ).map((label, i) => (
              <AtTypography
                key={`${label}-${i}`}
                variant="label"
                color="#8892A4"
                numberOfLines={1}
              >
                {label}
              </AtTypography>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});
ConsolidadoChart.displayName = 'ConsolidadoChart';

const TOGGLE_OPTIONS: {
  key: ConsolidadoView;
  label: string;
  swatch?: string;
}[] = [
  { key: 'totalizado', label: 'Totalizado' },
  { key: 'corriente', label: 'Corriente', swatch: '#E8952E' },
  { key: 'historico', label: 'Histórico', swatch: '#2D4BA0' },
];

export const ConsolidadoToggleBar = memo<{
  value: ConsolidadoView;
  onChange: (next: ConsolidadoView) => void;
}>(({ value, onChange }) => {
  // En pantallas angostas (~360dp) cada chip mide ~93px: texto + swatch +
  // radio no caben y el radio se montaba sobre el texto. Ahí la selección
  // se marca con el borde naranja del chip en vez del radio.
  const { width } = useWindowDimensions();
  const narrow = width < NARROW_SCREEN;
  return (
    <View className="flex-row gap-2 mt-1">
      {TOGGLE_OPTIONS.map((opt) => {
        const selected = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            className={`flex-1 flex-row items-center bg-bg-secondary rounded-md py-2 ${
              narrow ? 'justify-center px-2' : 'justify-between gap-1 px-3'
            }`}
            style={{
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: narrow && selected ? '#E8952E' : 'transparent',
            }}
          >
            <View className="flex-row items-center gap-1.5" style={{ flexShrink: 1 }}>
              {opt.swatch && (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: opt.swatch,
                  }}
                />
              )}
              <AtTypography
                variant="label"
                color="#1A1F36"
                numberOfLines={1}
                adjustsFontSizeToFit
                // 320dp (zoom de pantalla al máximo): "Corriente" pide ~0.82.
                minimumFontScale={0.75}
                style={{ flexShrink: 1 }}
              >
                {opt.label}
              </AtTypography>
            </View>
            {!narrow && <RadioDot selected={selected} />}
          </Pressable>
        );
      })}
    </View>
  );
});
ConsolidadoToggleBar.displayName = 'ConsolidadoToggleBar';

const RadioDot = memo<{ selected: boolean }>(({ selected }) => (
  <View
    style={{
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: selected ? '#E8952E' : '#C7CCD6',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    }}
  >
    {selected && (
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#E8952E',
        }}
      />
    )}
  </View>
));
RadioDot.displayName = 'RadioDot';

function formatAxisNumber(value: number): string {
  if (value === 0) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Eje/tooltip del margen. Los ticks caen en enteros por construcción del
 *  dominio; el tooltip (margen real del bucket) lleva un decimal. */
function formatAxisPercent(value: number): string {
  if (value === 0) return '0%';
  return `${value.toFixed(Number.isInteger(value) ? 0 : 1)}%`;
}
