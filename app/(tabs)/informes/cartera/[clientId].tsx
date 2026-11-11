/**
 * Informe Cartera — detalle "Gestión carteras vencidas" por cliente.
 *
 * Arriba va la segmentación por aging de la deuda del cliente (barras por
 * bucket + monto y % de cada uno), en vez de repetir el donut del index.
 */

import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { ScrollView, TextInput, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlUpdatedAtCard } from '@/src/components/molecules/ml-updated-at-card';
import {
  MlInvoiceRow,
  INVOICE_AMOUNT_COL_W,
  INVOICE_NARROW_MAX_W,
} from '@/src/components/molecules/ml-invoice-row';
import { OrCarteraAgingCard } from '@/src/components/organisms/or-cartera-aging-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { useCartera } from '@/src/hooks/queries/use-cartera';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { donutColorAt } from '@/src/utils/donut';

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CarteraClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { data } = useCartera();
  const isNarrow = useWindowDimensions().width < INVOICE_NARROW_MAX_W;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  // Mismo orden y colores que el donut del index (mayor→menor, paleta por
  // posición) para que el cliente conserve su color en ambas vistas.
  const sortedClients = useMemo(
    () =>
      [...(data?.clients ?? [])]
        .sort((a, b) => b.total - a.total)
        .map((c, i) => ({ ...c, color: donutColorAt(i) })),
    [data],
  );

  const client = useMemo(
    () => sortedClients.find((c) => c.id === clientId),
    [sortedClients, clientId],
  );

  const invoices = useMemo(() => {
    if (!client) return [];
    const q = search.trim().toLowerCase();
    if (!q) return client.invoices;
    return client.invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.note ?? '').toLowerCase().includes(q),
    );
  }, [client, search]);

  const total = useMemo(
    () => invoices.reduce((s, i) => s + i.amount, 0),
    [invoices],
  );

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ rowGap: 20, paddingBottom: 96 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Cartera', 'Gestión carteras vencidas']}
            onBack={() => router.back()}
          />
        </View>

        {client && (
          <View className="px-4">
            <OrCarteraAgingCard
              title="Segmentación de la cartera"
              name={client.name}
              color={client.color}
              buckets={client.buckets}
              valueFormatter={formatMoney}
            />
          </View>
        )}

        <View className="px-4">
          <MlUpdatedAtCard isoDate={data?.updatedAt ?? '2026-04-07'} />
        </View>

        <View className="px-4">
          <View
            className="flex-row items-center gap-2 rounded-full bg-bg-card px-4 py-3"
            style={{
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <AtIcon name="search" size="md" color="#8892A4" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por cliente"
              placeholderTextColor="#8892A4"
              className="flex-1 p-0 text-ink-primary text-base"
              style={{ fontFamily: 'Roboto_400Regular' }}
            />
          </View>
        </View>

        <View className="gap-2">
          {client && (
            <View className="flex-row items-center px-4 gap-3">
              <View className="flex-row items-center gap-2 flex-1">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: client.color,
                  }}
                />
                <AtTypography
                  variant="bodyBold"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {client.name}
                </AtTypography>
              </View>
              {/* En angosto cada MlInvoiceRow lleva su propio label "Monto". */}
              {!isNarrow && (
                <View
                  style={{ width: INVOICE_AMOUNT_COL_W, marginRight: 16 }}
                  className="items-start"
                >
                  <AtTypography variant="bodyBold" color="#1A1F36">
                    Monto
                  </AtTypography>
                </View>
              )}
            </View>
          )}

          <View
            className="bg-bg-card mx-4 rounded-lg"
            style={{
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
            }}
          >
            {invoices.length === 0 && (
              <View className="px-4 py-4">
                <AtTypography variant="caption" color="#8892A4">
                  Sin facturas para este cliente.
                </AtTypography>
              </View>
            )}
            {invoices.map((inv, i) => (
              <MlInvoiceRow
                key={inv.id}
                date={inv.date}
                daysOverdue={inv.daysOverdue}
                invoiceNumber={inv.invoiceNumber}
                note={inv.note}
                amount={inv.amount}
                showDivider={i < invoices.length - 1}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute left-0 right-0 bottom-0 px-4 pt-1 bg-bg-secondary"
        // Holgura acotada (8–12px) para pegar la card al fondo de forma
        // consistente, sin el espacio extra del safe-area en algunos devices.
        style={{ paddingBottom: Math.min(Math.max(insets.bottom, 8), 12) }}
      >
        <View
          className="rounded-lg px-4 py-3 items-end gap-1"
          style={{
            backgroundColor: '#0F1B4A',
            borderCurve: 'continuous',
          }}
        >
          <AtTypography variant="bodyBold" color="#FFFFFF">
            Total
          </AtTypography>
          <AtTypography variant="metricSmall" color="#FFFFFF">
            {formatMoney(total)}
          </AtTypography>
        </View>
      </View>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}
