/**
 * Organism: OrPagosCalendar
 *
 * Calendario mensual tipo heatmap del Informe Pagos. Header con flechas
 * < > para cambiar de mes y nombre del mes en grande. Grid L–D (lunes
 * a domingo). Cada celda muestra día + monto compacto y se colorea por
 * bucket (bajo/medio/alto). Tap en una celda con pagos llama
 * `onSelectDay(iso)`.
 *
 * Footer: "Total del mes" + "Promedio diario".
 */

import React, { memo, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { formatCurrency } from '@/src/utils/currency';
import {
  MONTO_BUCKET_COLOR,
  type MontoBucket,
} from '@/src/types/pagos.types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface DayCellData {
  iso: string;
  day: number;
  total: number;
  bucket: MontoBucket;
}

interface OrPagosCalendarProps {
  /** yyyy-mm */
  yearMonth: string;
  totalsByDate: Record<string, number>;
  bucketsByDate: Record<string, MontoBucket>;
  onChangeMonth: (next: string) => void;
  onSelectDay: (iso: string) => void;
  /** Día actualmente seleccionado (resaltado), o null. */
  selectedDay?: string | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${pad(nm)}`;
}

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

function weekdayMondayIndex(year: number, monthIdx: number, day: number): number {
  // Lunes = 0 ... Domingo = 6
  const jsDay = new Date(Date.UTC(year, monthIdx, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

function formatCompactMoney(value: number): string {
  // ≥1M en "M" ("$1.2M"): "$1234k" no cabía en la celda (~22px a 320dp).
  if (value >= 999_500) {
    const mm = value / 1_000_000;
    return `$${mm < 9.95 ? mm.toFixed(1) : Math.round(mm)}M`;
  }
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

export const OrPagosCalendar = memo<OrPagosCalendarProps>(
  ({
    yearMonth,
    totalsByDate,
    bucketsByDate,
    onChangeMonth,
    onSelectDay,
    selectedDay = null,
  }) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const monthIdx = m - 1;
    const total = daysInMonth(y, monthIdx);
    // 320dp: columnas de ~36px; se recorta el padding interno de la celda
    // para dejarle más ancho al monto.
    const compact = useWindowDimensions().width < 360;

    const cells = useMemo<(DayCellData | null)[]>(() => {
      const out: (DayCellData | null)[] = [];
      const firstWeekday = weekdayMondayIndex(y, monthIdx, 1);
      for (let i = 0; i < firstWeekday; i++) out.push(null);
      for (let d = 1; d <= total; d++) {
        const iso = `${yearMonth}-${pad(d)}`;
        out.push({
          iso,
          day: d,
          total: totalsByDate[iso] ?? 0,
          bucket: bucketsByDate[iso] ?? 'medio',
        });
      }
      while (out.length % 7 !== 0) out.push(null);
      return out;
    }, [y, monthIdx, total, yearMonth, totalsByDate, bucketsByDate]);

    const monthTotal = useMemo(
      () =>
        Object.entries(totalsByDate)
          .filter(([iso]) => iso.startsWith(yearMonth))
          .reduce((s, [, v]) => s + v, 0),
      [totalsByDate, yearMonth],
    );

    const monthAvg = useMemo(() => {
      const days = Object.keys(totalsByDate).filter((iso) =>
        iso.startsWith(yearMonth),
      ).length;
      return days > 0 ? monthTotal / days : 0;
    }, [monthTotal, totalsByDate, yearMonth]);

    return (
      <View
        className="bg-white rounded-lg p-4 gap-3"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <AtTypography variant="bodyBold" color="#1A1F36">
          Total por fecha
        </AtTypography>

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => onChangeMonth(addMonth(yearMonth, -1))}
            hitSlop={8}
            className="p-1"
          >
            <AtIcon name="chevron-left" size="lg" color="#1A1F36" />
          </Pressable>
          <AtTypography variant="bodyBold" color="#1A1F36">
            {MONTH_NAMES[monthIdx]} {y}
          </AtTypography>
          <Pressable
            onPress={() => onChangeMonth(addMonth(yearMonth, 1))}
            hitSlop={8}
            className="p-1"
          >
            <AtIcon name="chevron-right" size="lg" color="#1A1F36" />
          </Pressable>
        </View>

        {/* Cada columna (header y celdas) mide exactamente 100/7% del ancho,
            así el día 1 queda siempre en la misma columna que el 8. */}
        <View className="flex-row">
          {WEEKDAY_HEADERS.map((w, i) => (
            <View key={i} style={{ width: COL_WIDTH, alignItems: 'center' }}>
              <AtTypography variant="caption" color="#8892A4">
                {w}
              </AtTypography>
            </View>
          ))}
        </View>

        <View>
          {Array.from({ length: cells.length / 7 }).map((_, rowIdx) => (
            <View key={rowIdx} className="flex-row">
              {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell, colIdx) => (
                <DayCell
                  key={`${rowIdx}-${colIdx}`}
                  cell={cell}
                  selected={!!cell && cell.iso === selectedDay}
                  compact={compact}
                  onPress={cell && cell.total > 0 ? () => onSelectDay(cell.iso) : undefined}
                />
              ))}
            </View>
          ))}
        </View>

        <View className="flex-row justify-between items-end pt-2">
          <View>
            <AtTypography variant="caption" color="#1A1F36">
              Total del mes
            </AtTypography>
            <AtTypography
              variant="bodyBold"
              color="#1A1F36"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(monthTotal)}
            </AtTypography>
          </View>
          <View className="items-end">
            <AtTypography variant="caption" color="#1A1F36">
              Promedio diario
            </AtTypography>
            <AtTypography
              variant="bodyBold"
              color="#1A3FE8"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(monthAvg)}
            </AtTypography>
          </View>
        </View>
      </View>
    );
  },
);

OrPagosCalendar.displayName = 'OrPagosCalendar';

interface DayCellProps {
  cell: DayCellData | null;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

/**
 * Ancho de columna fijo: el reparto por flex (incluso con flexBasis 0)
 * resultaba sensible al contenido en web y desfasaba las filas parciales.
 * Con un ancho porcentual explícito, header y todas las filas comparten
 * exactamente las mismas 7 columnas. El espaciado entre celdas es el
 * padding interno del slot (2px por lado = 4px entre recuadros).
 */
const COL_WIDTH = `${100 / 7}%` as const;

const SLOT_STYLE = {
  width: COL_WIDTH,
  height: 60,
  padding: 2,
} as const;

const DayCell = memo<DayCellProps>(({ cell, selected = false, onPress, compact = false }) => {
  if (!cell) {
    return <View style={SLOT_STYLE} />;
  }
  if (cell.total === 0) {
    return (
      <View style={SLOT_STYLE}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#F3F4F6',
            borderRadius: 6,
            padding: 4,
            borderCurve: 'continuous',
          }}
        >
          <AtTypography variant="caption" color="#8892A4">
            {cell.day}
          </AtTypography>
        </View>
      </View>
    );
  }
  const tone = MONTO_BUCKET_COLOR[cell.bucket];
  const Wrapper = onPress ? Pressable : View;
  return (
    <View style={SLOT_STYLE}>
      <Wrapper
        onPress={onPress}
        style={{
          flex: 1,
          backgroundColor: tone.bg,
          borderRadius: 6,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? '#1A1F36' : tone.border,
          padding: 4,
          paddingHorizontal: compact ? 2 : 4,
          borderCurve: 'continuous',
          justifyContent: 'space-between',
        }}
      >
        <AtTypography variant="captionBold" color={tone.text} numberOfLines={1}>
          {cell.day}
        </AtTypography>
        <AtTypography
          variant="caption"
          color={tone.text}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ fontSize: 10 }}
        >
          {formatCompactMoney(cell.total)}
        </AtTypography>
      </Wrapper>
    </View>
  );
});

DayCell.displayName = 'DayCell';
