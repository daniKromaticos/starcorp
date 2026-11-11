/**
 * Organism: OrAsociadosTrend
 *
 * Card de la vista "Asociados por tendencia": título + delta, chip del
 * segmento seleccionado, gráfico de línea (# de asociados por mes) y una fila
 * de swatches para elegir qué segmento ver. La opción "Total" (color neutro)
 * agrega todas las series; los clientes individuales y el grupo "Varios" (cola
 * agrupada) los provee el padre con colores únicos de la paleta. Fuente de
 * datos: PBI HistoricoEmpXCli (RPC get_asociados_trend).
 */

import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AreaChart } from '@/src/components/charts/area-chart';
import { useChartActivePoint } from '@/src/components/charts/use-chart-active-point';
import { MlChartTooltip } from '@/src/components/molecules/ml-chart-tooltip';

export interface TrendSeries {
  id: string;
  name: string;
  color: string;
  counts: number[];
}

interface OrAsociadosTrendProps {
  /** Meses en 'YYYY-MM', orden ascendente. */
  months: string[];
  series: TrendSeries[];
  /**
   * Segmento seleccionado (controlado). TODOS_ID = todas las series.
   * Si se omite, el componente maneja la selección internamente.
   */
  selectedId?: string;
  /** Notifica el cambio de segmento (para filtrar la lista externa). */
  onSelectChange?: (id: string) => void;
}

/** Opción agregada "Total" (suma de todas las series), color neutro. */
export const TODOS_ID = '__todos__';
const TODOS_COLOR = '#1A1F36';
const PLOT_HEIGHT = 160;
const Y_GUTTER = 34;

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function monthLabel(ym: string): string {
  const m = Number(ym.split('-')[1]);
  return MONTH_SHORT[m - 1] ?? ym;
}

function niceCeil(v: number): number {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * pow;
}

export const OrAsociadosTrend = memo<OrAsociadosTrendProps>(
  ({ months, series, selectedId: controlledId, onSelectChange }) => {
    const [internalId, setInternalId] = useState<string>(TODOS_ID);
    const selectedId = controlledId ?? internalId;
    const handleSelect = (id: string) => {
      if (onSelectChange) onSelectChange(id);
      else setInternalId(id);
    };
    const [plotWidth, setPlotWidth] = useState(0);

    // Serie "Total" = suma de todas las series por mes.
    const todosCounts = useMemo(() => {
      const n = months.length;
      const out = new Array(n).fill(0);
      for (const s of series) {
        for (let i = 0; i < n; i++) out[i] += s.counts[i] ?? 0;
      }
      return out;
    }, [months.length, series]);

    const options = useMemo<TrendSeries[]>(
      () => [
        { id: TODOS_ID, name: 'Total', color: TODOS_COLOR, counts: todosCounts },
        ...series,
      ],
      [series, todosCounts],
    );

    const selected =
      options.find((o) => o.id === selectedId) ?? options[0];

    const yMax = useMemo(
      () => niceCeil(Math.max(1, ...(selected?.counts ?? [0]))),
      [selected],
    );

    // Delta = variación % del primer mes con dato vs el último de la serie.
    const delta = useMemo(() => {
      const c = selected?.counts ?? [];
      if (c.length < 2) return null;
      const first = c.find((v) => v > 0) ?? 0;
      const last = c[c.length - 1];
      if (!first) return null;
      return ((last - first) / first) * 100;
    }, [selected]);

    const hasData = months.length >= 2 && (selected?.counts.length ?? 0) >= 2;

    const pointCount = selected?.counts.length ?? 0;
    const { activeIndex, handlers } = useChartActivePoint(pointCount, plotWidth);
    const activeX =
      activeIndex != null && pointCount > 1
        ? (activeIndex / (pointCount - 1)) * plotWidth
        : 0;

    return (
      <View
        className="bg-bg-card rounded-lg px-3 py-4 gap-3"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-2">
          <AtTypography variant="bodyBold" style={{ flexShrink: 1 }}>
            Asociados por tendencia
          </AtTypography>
          {delta != null && <AtDeltaIndicator value={delta} size="sm" />}
        </View>

        {/* Chip del segmento seleccionado */}
        <View className="flex-row">
          <View
            className="flex-row items-center gap-2 rounded-md bg-bg-secondary px-3 py-2"
            style={{ borderCurve: 'continuous' }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                backgroundColor: selected?.color ?? TODOS_COLOR,
              }}
            />
            <AtTypography variant="captionBold" color="#1A1F36">
              {selected?.name ?? 'Total'}
            </AtTypography>
          </View>
        </View>

        {/* Gráfico */}
        {hasData ? (
          <View className="gap-1">
            <View className="flex-row">
              {/* Eje Y */}
              <View
                style={{
                  width: Y_GUTTER,
                  height: PLOT_HEIGHT,
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  paddingRight: 6,
                }}
              >
                {[yMax, yMax / 2, 0].map((v) => (
                  <AtTypography key={v} variant="caption" color="#8892A4">
                    {String(Math.round(v))}
                  </AtTypography>
                ))}
              </View>

              {/* Plot */}
              <View
                style={{ flex: 1, height: PLOT_HEIGHT }}
                onLayout={(e) => setPlotWidth(e.nativeEvent.layout.width)}
              >
                {/* Gridlines */}
                {[0, 0.5, 1].map((f) => (
                  <View
                    key={f}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: PLOT_HEIGHT * f,
                      borderTopWidth: 1,
                      borderColor: 'rgba(0,0,0,0.06)',
                      borderStyle: 'dashed',
                    }}
                  />
                ))}
                {plotWidth > 0 && (
                  <AreaChart
                    data={selected.counts}
                    width={plotWidth}
                    height={PLOT_HEIGHT}
                    color={selected.color}
                    smooth={false}
                    fillOpacity={0.12}
                    strokeWidth={2}
                    yMin={0}
                    yMax={yMax}
                    gradientId={`trend-${selected.id}`}
                    showPoints
                    activeIndex={activeIndex}
                  />
                )}

                {/* Capa interactiva: tap/scrub para ver fecha y valor */}
                {plotWidth > 0 && (
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

                {activeIndex != null && activeIndex < pointCount && (
                  <MlChartTooltip
                    x={activeX}
                    plotWidth={plotWidth}
                    title={`${monthLabel(months[activeIndex])} ${
                      months[activeIndex]?.split('-')[0] ?? ''
                    }`}
                    lines={[
                      {
                        color: selected.color,
                        value: `${selected.counts[activeIndex] ?? 0} asociados`,
                      },
                    ]}
                  />
                )}
              </View>
            </View>

            {/* Etiquetas de mes */}
            <View className="flex-row" style={{ marginLeft: Y_GUTTER }}>
              {months.map((ym, i) => (
                <View key={`${ym}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                  <AtTypography variant="caption" color="#8892A4">
                    {monthLabel(ym)}
                  </AtTypography>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ height: PLOT_HEIGHT, justifyContent: 'center' }}>
            <AtTypography variant="caption" color="#8892A4">
              Aún no hay histórico suficiente para mostrar la tendencia.
            </AtTypography>
          </View>
        )}

        {/* Swatches selectores */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-2"
        >
          {options.map((opt) => {
            const active = opt.id === selectedId;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                className="flex-row items-center gap-2 rounded-lg px-2 py-1.5"
                style={{
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: active ? '#1A1F36' : 'rgba(0,0,0,0.08)',
                  backgroundColor: active ? '#F0F2F5' : '#FFFFFF',
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: opt.color,
                    borderCurve: 'continuous',
                  }}
                />
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: active ? '#1A1F36' : '#C4CAD4',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#1A1F36',
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  },
);

OrAsociadosTrend.displayName = 'OrAsociadosTrend';
