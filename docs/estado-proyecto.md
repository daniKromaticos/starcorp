# Starcorp — Estado del Proyecto

**Fecha:** 2026-04-20
**Plataforma:** App móvil (iOS / Android / Web) sobre Expo + React Native

---

## 1. Resumen ejecutivo

Starcorp es una app que consolida la información financiera, comercial y operativa del negocio en un único panel móvil. Actualmente el proyecto cuenta con:

- **Navegación completa** con 5 secciones principales (Inicio, Clientes, Financiero, Informes, Reportes).
- **Sistema de diseño propio** basado en Atomic Design, con tema, tipografía, íconos y gráficos reutilizables.
- **Integraciones en curso** con Power BI (vía Supabase Edge Functions) y QuickBooks.
- **Autenticación y backend** apoyados en Supabase.

---

## 2. Stack tecnológico

| Área | Tecnología |
|------|------------|
| Framework | Expo 54 · React Native 0.81 · React 19 |
| Navegación | expo-router · React Navigation 7 |
| Estado async | TanStack Query v5 |
| Estado cliente | Zustand |
| Backend / Auth | Supabase (Edge Functions + Vault) |
| BI | Power BI (embed + REST API) |
| Contabilidad | QuickBooks Online |
| UI | StyleSheet + tokens de tema · gráficos con `react-native-svg` |
| Despliegue | EAS Update (GitHub Actions en `dev` y `main`) |

---

## 3. Estructura del proyecto

```
starcorp/
├── app/                     → Rutas (expo-router)
│   ├── (tabs)/              → Tabs principales
│   ├── _layout.tsx
│   ├── modal.tsx
│   └── settings.tsx
│
├── src/                     → Código de producto
│   ├── components/          → Atomic Design
│   │   ├── atoms/           → Chips, íconos, badges, skeletons…
│   │   ├── molecules/       → Cards, filas, barras de búsqueda…
│   │   ├── organisms/       → Listas, carruseles, cabeceras…
│   │   ├── templates/       → Layouts por pantalla
│   │   └── charts/          → Área, barras, donut
│   ├── hooks/queries/       → Hooks de datos (TanStack Query)
│   ├── services/            → Capa de servicios (mock actual)
│   ├── stores/              → Zustand (auth, filtros)
│   ├── config/              → Cliente de Supabase, Query Client
│   ├── theme/               → Tokens, gradientes, sombras
│   └── types/               → Tipos de API
│
├── supabase/functions/      → Edge Functions (proxy seguro)
│   ├── powerbi-embed-token
│   └── powerbi-list-reports
│
└── docs/                    → Documentación técnica
```

---

## 4. Pantallas implementadas

| Pantalla | Archivo | Estado |
|----------|---------|--------|
| Dashboard / Inicio | `app/(tabs)/index.tsx` | ✅ Funcional |
| Clientes | `app/(tabs)/clientes.tsx` | ✅ Funcional |
| Financiero | `app/(tabs)/financiero.tsx` | ✅ Funcional |
| Informes | `app/(tabs)/informes.tsx` | ✅ Funcional |
| Reportes (Power BI) | `app/(tabs)/reportes.tsx` | 🟡 Integración en curso |
| Ajustes | `app/settings.tsx` | ✅ Funcional |

---

## 5. Sistema de componentes (Atomic Design)

### Átomos (18)
Chips, íconos, badges de estado, tipografía, valores métricos, indicadores de variación, barras de progreso, divisores, puntos de color, skeletons de carga, íconos con gradiente.

### Moléculas (16)
Tarjetas de métricas, tarjetas de empresa, filas de cliente / categoría / reporte, barra de búsqueda, tabs por categoría, filtros temporales, breadcrumbs, cajas de estadística.

### Organismos (21)
Cabecera de saludo, drawer lateral, listas (clientes, terceros, categorías), carruseles, resumen financiero, secciones de Financiero / Informes, tarjeta de ingresos, top de clientes, gráficos integrados (área, barras, donut), visor de reportes Power BI.

### Plantillas (11)
Dashboard, autenticación, financiero, informes, utilidad, detalle de consolidados, grupos de consolidados, listas de consolidados, terceros, ajustes.

### Gráficos
- Área (tendencias temporales)
- Barras (comparativos)
- Donut (distribuciones por categoría)

---

## 6. Datos y estado

- **Hooks de datos** (`src/hooks/queries/`): ingresos, flujo de caja, ingresos por categoría, reportes, top clientes, listado y embed de Power BI.
- **Claves de query centralizadas** en `query-keys.ts` para evitar duplicidades y facilitar invalidaciones.
- **Caché**: datos financieros con `staleTime: 5 min`.
- **Stores Zustand**: sesión de usuario (`auth.store`) y filtros globales (`filters.store`).

---

## 7. Seguridad e integraciones

Principio clave: **el cliente nunca llama a APIs externas directamente**. Todo pasa por Supabase Edge Functions que validan el JWT del usuario.

| Integración | Estado | Notas |
|-------------|--------|-------|
| Supabase Auth | ✅ Configurado | Cliente en `src/config/supabase.ts` |
| Power BI · listado de reportes | 🟡 En curso | Edge Function `powerbi-list-reports` |
| Power BI · embed token | 🟡 En curso | Edge Function `powerbi-embed-token` + WebView |
| QuickBooks | 📄 Documentado | Pendiente de implementación; refresh tokens en `starcorp_vault` |

Documentación técnica disponible en `docs/`:
- `power-bi-integration.md`
- `quickbooks-integration.md`
- `supabase-role.md`

---

## 8. Calidad y entrega

- **TypeScript en modo estricto** con tipos de API centralizados.
- **ESLint** (configuración Expo).
- **Skeletons de carga** disponibles como patrón base.
- **Despliegue continuo**: cada push a `dev` / `main` publica una actualización OTA vía EAS Update.

---

## 9. Próximos pasos sugeridos

1. Finalizar integración de Power BI (listado + embed en producción).
2. Implementar integración real de QuickBooks sobre la guía ya documentada.
3. Reemplazar la capa de servicios mock (`src/services/mock/`) por servicios reales vía Supabase.
4. Añadir pruebas automatizadas (no hay runner configurado aún).
5. Revisar adopción de NativeWind (instalado pero aún no usado en componentes).
