/**
 * Informe Seguros — pantalla principal.
 *
 * 3 secciones apiladas: Compañías (carousel de empresas + listas por
 * vencer/vencidas), Vehículos y Propiedades (cada una con su link a
 * Histórico y sus listas). Tap en una pill abre el detalle de empresa;
 * tap en una card por vencer/vencida también navega al detalle de su
 * empresa (cuando aplica).
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlSegurosSkeleton } from '@/src/components/molecules/ml-seguros-skeleton';
import { MlCompanyCard } from '@/src/components/molecules/ml-company-card';
import { MlPolizaAlertRow } from '@/src/components/molecules/ml-poliza-alert-row';
import { MlSectionHeaderLink } from '@/src/components/molecules/ml-section-header-link';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePullToRefresh } from '@/src/hooks/use-pull-to-refresh';
import { useSeguros } from '@/src/hooks/queries/use-seguros';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  diffInDays,
  formatVigenciaDate,
  isInactiva,
  llcsDeVehiculos,
  polizaStatus,
  type PolizaCompania,
  type PolizaStatus,
  type VehiculoLlc,
} from '@/src/types/seguros.types';

/** Card blanca que encierra cada categoría de seguros. */
const CARD_CLASS = 'mx-4 bg-white rounded-lg p-4 gap-3';
const CARD_STYLE = {
  borderCurve: 'continuous',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.06)',
} as const;

function buildSubline(vigenciaFin: string, todayIso: string): string {
  const status = polizaStatus(vigenciaFin, todayIso);
  if (status === 'vencida') {
    return `Vigencia: ${diffInDays(vigenciaFin, todayIso)} días`;
  }
  return `Vigencia: ${formatVigenciaDate(vigenciaFin)}`;
}

export default function SegurosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isPending, refetch } = useSeguros();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  // Estado de colapso por sección (Compañías / Vehículos / Propiedades).
  // Por defecto las 3 arrancan cerradas.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    companias: true,
    vehiculos: true,
    propiedades: true,
  });
  const toggleSection = (key: string) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const { todayIso, empresas, vehiculos, propiedades } = useMemo(() => {
    if (!data) {
      return {
        todayIso: '',
        empresas: [],
        vehiculos: [],
        propiedades: [],
      };
    }
    return {
      todayIso: data.todayIso,
      empresas: data.empresas,
      vehiculos: data.vehiculos,
      propiedades: data.propiedades,
    };
  }, [data]);

  // Las pólizas INACTIVA (columna Estado de Notion) no aparecen en la
  // vista principal — quedan sólo en el histórico.
  const allPolizasCompania = useMemo<PolizaCompania[]>(
    () => empresas.flatMap((e) => e.polizas).filter((p) => !isInactiva(p)),
    [empresas],
  );

  // Solo las empresas que tienen algo que mostrar en el informe. Las que
  // quedaron con todas las polizas inactivas (VENCIDA / CANCELADA) abrian
  // un detalle vacio en los tres chips — siguen completas en el historico.
  const empresasConPolizas = useMemo(
    () => empresas.filter((e) => e.polizas.some((p) => !isInactiva(p))),
    [empresas],
  );

  const polizasPorVencer = useMemo(
    () =>
      allPolizasCompania.filter(
        (p) => polizaStatus(p.vigenciaFin, todayIso) === 'por_vencer',
      ),
    [allPolizasCompania, todayIso],
  );

  const polizasVencidas = useMemo(
    () =>
      allPolizasCompania.filter(
        (p) => polizaStatus(p.vigenciaFin, todayIso) === 'vencida',
      ),
    [allPolizasCompania, todayIso],
  );

  // LLCs con pólizas de vehículo activas — el carousel de la sección,
  // equivalente al de empresas de Compañías.
  const vehiculoLlcs = useMemo(
    () => llcsDeVehiculos(vehiculos.filter((v) => !isInactiva(v))),
    [vehiculos],
  );

  const vehiculosPorVencer = useMemo(
    () => vehiculos.filter((v) => !isInactiva(v) && polizaStatus(v.vigenciaFin, todayIso) === 'por_vencer'),
    [vehiculos, todayIso],
  );
  const vehiculosVencidos = useMemo(
    () => vehiculos.filter((v) => !isInactiva(v) && polizaStatus(v.vigenciaFin, todayIso) === 'vencida'),
    [vehiculos, todayIso],
  );

  const propiedadesPorVencer = useMemo(
    () => propiedades.filter((p) => !isInactiva(p) && polizaStatus(p.vigenciaFin, todayIso) === 'por_vencer'),
    [propiedades, todayIso],
  );
  const propiedadesVencidas = useMemo(
    () => propiedades.filter((p) => !isInactiva(p) && polizaStatus(p.vigenciaFin, todayIso) === 'vencida'),
    [propiedades, todayIso],
  );

  const goEmpresa = (id: string) =>
    router.push(`/(tabs)/informes/seguros/companias/${id}` as never);

  // Navega al detalle de la empresa ubicando la póliza en su estado correcto.
  const goPoliza = (
    empresaId: string,
    polizaId: string,
    status: PolizaStatus,
  ) =>
    router.push({
      pathname: '/(tabs)/informes/seguros/companias/[companyId]',
      params: { companyId: empresaId, polizaId, status },
    } as never);

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ rowGap: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Seguros']}
            onBack={() => router.back()}
          />
        </View>

        {isPending ? (
          <MlSegurosSkeleton />
        ) : (
        <>
        {/* — Compañías — */}
        <View className={CARD_CLASS} style={CARD_STYLE}>
          <MlSectionHeaderLink
            title="Compañías"
            iconName="business-center"
            linkLabel="Histórico de pólizas"
            onLinkPress={() =>
              router.push('/(tabs)/informes/seguros/companias/historico' as never)
            }
            collapsed={collapsed.companias}
            onToggle={() => toggleSection('companias')}
          />

          {!collapsed.companias && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3"
              >
                {empresasConPolizas.length === 0 && (
                  <AtTypography variant="caption" color="#8892A4">
                    Sin compañías con pólizas activas.
                  </AtTypography>
                )}
                {empresasConPolizas.map((empresa) => (
                  <MlCompanyCard
                    key={empresa.id}
                    name={empresa.name}
                    variant="tile"
                    onPress={() => goEmpresa(empresa.id)}
                  />
                ))}
              </ScrollView>

              <View className="gap-2">
                <AtTypography variant="bodyBold" color="#1A1F36">
                  Pólizas por vencer
                </AtTypography>
                {polizasPorVencer.length === 0 && (
                  <AtTypography variant="caption" color="#8892A4">
                    Sin pólizas por vencer.
                  </AtTypography>
                )}
                {polizasPorVencer.map((p) => (
                  <MlPolizaAlertRow
                    key={p.id}
                    title={p.empresaName}
                    subtitle={p.nombre}
                    subline={buildSubline(p.vigenciaFin, todayIso)}
                    variant="por_vencer"
                    onPress={() => goPoliza(p.empresaId, p.id, 'por_vencer')}
                  />
                ))}
              </View>

              <View className="gap-2">
                <AtTypography variant="bodyBold" color="#1A1F36">
                  Pólizas vencidas
                </AtTypography>
                {polizasVencidas.length === 0 && (
                  <AtTypography variant="caption" color="#8892A4">
                    Sin pólizas vencidas.
                  </AtTypography>
                )}
                {polizasVencidas.map((p) => (
                  <MlPolizaAlertRow
                    key={p.id}
                    title={p.empresaName}
                    subtitle={p.nombre}
                    subline={buildSubline(p.vigenciaFin, todayIso)}
                    variant="vencida"
                    onPress={() => goPoliza(p.empresaId, p.id, 'vencida')}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* — Vehículos — */}
        <SimpleAlertSection
          title="Vehículos"
          iconName="directions-bus"
          onTitlePress={() =>
            router.push('/(tabs)/informes/seguros/vehiculos' as never)
          }
          onLinkPress={() =>
            router.push('/(tabs)/informes/seguros/vehiculos/historico' as never)
          }
          pills={vehiculoLlcs}
          onPillPress={(id) =>
            router.push({
              pathname: '/(tabs)/informes/seguros/vehiculos',
              params: { llcId: id },
            } as never)
          }
          porVencer={vehiculosPorVencer.map<AlertItem>((v) => ({
            id: v.id,
            title: v.nombre,
            subtitle: v.asignacion,
            subline: buildSubline(v.vigenciaFin, todayIso),
          }))}
          vencidas={vehiculosVencidos.map<AlertItem>((v) => ({
            id: v.id,
            title: v.nombre,
            subtitle: v.asignacion,
            subline: buildSubline(v.vigenciaFin, todayIso),
          }))}
          onItemPress={(id) =>
            router.push({
              pathname: '/(tabs)/informes/seguros/vehiculos',
              params: {
                polizaId: id,
                status: vehiculosPorVencer.some((v) => v.id === id)
                  ? 'por_vencer'
                  : 'vencida',
              },
            } as never)
          }
          collapsed={collapsed.vehiculos}
          onToggle={() => toggleSection('vehiculos')}
        />

        {/* — Propiedades — */}
        <SimpleAlertSection
          title="Propiedades"
          iconName="home-work"
          onTitlePress={() =>
            router.push('/(tabs)/informes/seguros/propiedades' as never)
          }
          onLinkPress={() =>
            router.push('/(tabs)/informes/seguros/propiedades' as never)
          }
          porVencer={propiedadesPorVencer.map<AlertItem>((p) => ({
            id: p.id,
            title: p.nombre,
            subtitle: p.empresaName,
            subline: buildSubline(p.vigenciaFin, todayIso),
          }))}
          vencidas={propiedadesVencidas.map<AlertItem>((p) => ({
            id: p.id,
            title: p.nombre,
            subtitle: p.empresaName,
            subline: buildSubline(p.vigenciaFin, todayIso),
          }))}
          onItemPress={(id) =>
            router.push({
              pathname: '/(tabs)/informes/seguros/propiedades',
              params: {
                polizaId: id,
                status: propiedadesPorVencer.some((p) => p.id === id)
                  ? 'por_vencer'
                  : 'vencida',
              },
            } as never)
          }
          collapsed={collapsed.propiedades}
          onToggle={() => toggleSection('propiedades')}
        />
        </>
        )}
      </ScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}

interface AlertItem {
  id: string;
  title: string;
  subtitle?: string;
  subline: string;
}

interface SimpleAlertSectionProps {
  title: string;
  iconName: React.ComponentProps<typeof MlSectionHeaderLink>['iconName'];
  onTitlePress: () => void;
  onLinkPress: () => void;
  /** Carousel opcional encima de las listas (Vehículos lo usa con sus LLCs). */
  pills?: VehiculoLlc[];
  onPillPress?: (id: string) => void;
  porVencer: AlertItem[];
  vencidas: AlertItem[];
  onItemPress: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

function SimpleAlertSection({
  title,
  iconName,
  onTitlePress,
  onLinkPress,
  pills,
  onPillPress,
  porVencer,
  vencidas,
  onItemPress,
  collapsed,
  onToggle,
}: SimpleAlertSectionProps) {
  return (
    <View className={CARD_CLASS} style={CARD_STYLE}>
      <MlSectionHeaderLink
        title={title}
        iconName={iconName}
        onTitlePress={onTitlePress}
        linkLabel="Histórico de pólizas"
        onLinkPress={onLinkPress}
        collapsed={collapsed}
        onToggle={onToggle}
      />

      {!collapsed && (
        <>
          {pills && pills.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3"
            >
              {pills.map((pill) => (
                <MlCompanyCard
                  key={pill.id}
                  name={pill.name}
                  variant="tile"
                  onPress={() => onPillPress?.(pill.id)}
                />
              ))}
            </ScrollView>
          )}

          <View className="gap-2">
            <AtTypography variant="bodyBold" color="#1A1F36">
              Pólizas por vencer
            </AtTypography>
            {porVencer.length === 0 && (
              <AtTypography variant="caption" color="#8892A4">
                Sin pólizas por vencer.
              </AtTypography>
            )}
            {porVencer.map((item) => (
              <MlPolizaAlertRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                subline={item.subline}
                variant="por_vencer"
                onPress={() => onItemPress(item.id)}
              />
            ))}
          </View>

          <View className="gap-2">
            <AtTypography variant="bodyBold" color="#1A1F36">
              Pólizas vencidas
            </AtTypography>
            {vencidas.length === 0 && (
              <AtTypography variant="caption" color="#8892A4">
                Sin pólizas vencidas.
              </AtTypography>
            )}
            {vencidas.map((item) => (
              <MlPolizaAlertRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                subline={item.subline}
                variant="vencida"
                onPress={() => onItemPress(item.id)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
