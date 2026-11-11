/**
 * Organism: OrQBTrendChartCard
 *
 * Tendencia Corriente vs Histórico de una sección del P&L de QuickBooks
 * (Ingresos / Costos / Egresos) para la empresa activa. Mismo chart y mismo
 * toggle Totalizado / Corriente / Histórico que la card del consolidado
 * (OrRevenueChartCard); solo cambia la fuente: P&L de QB por columnas en vez
 * de los RPCs de Supabase.
 */

import React, { memo, useMemo, useState } from 'react';
import { View } from '@/src/tw';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { Skeleton } from '@/src/components/atoms/skeleton';
import {
  ConsolidadoChart,
  ConsolidadoToggleBar,
  type ConsolidadoView,
} from '@/src/components/organisms/or-revenue-chart-card';
import { useQBPnLTrend } from '@/src/hooks/queries/use-qb-pnl-trend';
import type { PnLSection } from '@/src/services/quickbooks/normalizer';
import { formatAxisDate, formatMonthLabel } from '@/src/utils/date';
import { calculateDelta } from '@/src/utils/percentage';

interface OrQBTrendChartCardProps {
  section: PnLSection;
  label: string;
}

export const OrQBTrendChartCard = memo<OrQBTrendChartCardProps>(
  ({ section, label }) => {
    const [view, setView] = useState<ConsolidadoView>('totalizado');
    const { buckets, isMonthly, isPending } = useQBPnLTrend(section);

    const corriente = useMemo(() => buckets.map((b) => b.current), [buckets]);
    const historico = useMemo(() => buckets.map((b) => b.previous), [buckets]);

    // Mensual: solo el nombre del mes. Diario/semanal: inicio de cada columna
    // y, en la última, su fin (QB manda EndDate inclusivo), igual que el
    // consolidado.
    const xLabels = useMemo(
      () =>
        buckets.map((b, i) =>
          isMonthly
            ? formatMonthLabel(b.start)
            : formatAxisDate(i === buckets.length - 1 ? b.end : b.start),
        ),
      [buckets, isMonthly],
    );
    const xAxisLabels = useMemo(
      () =>
        isMonthly ? buckets.map((b) => formatMonthLabel(b.start, true)) : xLabels,
      [buckets, isMonthly, xLabels],
    );

    const totalCorriente = corriente.reduce((s, v) => s + v, 0);
    const totalHistorico = historico.reduce((s, v) => s + v, 0);
    const deltaPct = calculateDelta(totalCorriente, totalHistorico);

    const headerValue = view === 'historico' ? totalHistorico : totalCorriente;
    const headerDelta = view === 'historico' ? -deltaPct : deltaPct;

    const isLoading = isPending && buckets.length === 0;

    return (
      <View
        className="bg-bg-card rounded-lg p-4 mx-4 gap-3"
        style={{
          borderCurve: 'continuous',
          boxShadow:
            '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <View className="gap-1">
          <AtTypography variant="captionBold" color="#4A5568">
            {label}
          </AtTypography>
          {/* 320dp: si métrica + delta no caben, el delta baja de línea */}
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            {isLoading ? (
              <Skeleton width={140} height={28} />
            ) : (
              <>
                <AtMetricValue value={headerValue} size="lg" fit />
                <AtDeltaIndicator
                  value={headerDelta}
                  appearance="dark"
                  size="lg"
                />
              </>
            )}
          </View>
        </View>

        {isLoading ? (
          <Skeleton width="100%" height={168} />
        ) : (
          <ConsolidadoChart
            corriente={corriente}
            historico={historico}
            view={view}
            xLabels={xLabels}
            xAxisLabels={xAxisLabels}
          />
        )}

        <ConsolidadoToggleBar value={view} onChange={setView} />
      </View>
    );
  },
);
OrQBTrendChartCard.displayName = 'OrQBTrendChartCard';
