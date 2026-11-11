/**
 * Design Tokens — Single Source of Truth
 *
 * EXTENSIÓN: Cuando recibas la paleta completa del equipo de diseño,
 * agrega colores aquí. Todos los componentes los consumirán automáticamente.
 *
 * Para agregar gradientes: ver src/theme/gradients.ts
 */
import { CHART_COLORS } from './chart-palette';

export const tokens = {
  color: {
    // Superficie
    background: {
      primary: '#FFFFFF',
      secondary: '#F5F5F7',
      tertiary: '#EBEBF0',
      card: '#FFFFFF',
      cardElevated: '#FAFBFC',
    },
    // Navy oscuro del mockup para headers/titulos
    ink: {
      primary: '#1A1F36',
      secondary: '#4A5568',
      tertiary: '#8892A4',
      inverse: '#FFFFFF',
      // Gris azulado para títulos/labels secundarios dentro de tarjetas.
      label: '#464A6B',
    },
    // Accent — Naranja ámbar del mockup
    accent: {
      primary: '#E8952E',
      secondary: '#F6AD55',
      muted: '#FEEBC8',
    },
    // Semántico
    semantic: {
      positive: '#38A169',
      positiveLight: '#C6F6D5',
      negative: '#E53E3E',
      negativeLight: '#FED7D7',
      warning: '#DD6B20',
      info: '#3182CE',
    },
    // Gráficos — tono sólido de los 8 degradados canónicos (ver chart-palette.ts).
    // Es el primer color de cada degradado, ciclado por índice.
    chart: CHART_COLORS,
    // Bordes
    border: {
      default: 'rgba(0, 0, 0, 0.08)',
      subtle: 'rgba(0, 0, 0, 0.04)',
      emphasis: 'rgba(0, 0, 0, 0.15)',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },

  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    bodyBold: { fontSize: 15, fontWeight: '600' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    captionBold: { fontSize: 13, fontWeight: '600' as const },
    metric: {
      fontSize: 32,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums'] as const,
    },
    metricSmall: {
      fontSize: 20,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums'] as const,
    },
  },
} as const;

export type TokenColors = typeof tokens.color;
export type TokenSpacing = keyof typeof tokens.spacing;

/**
 * Tope al escalado de fuente del sistema (Dynamic Type en iOS, "Tamaño de
 * fuente" en Android). Sin tope, un iPhone con texto grande multiplica las
 * fuentes ×1.3–3 y rompe columnas de ancho fijo ("Client/e", "Tota/l").
 * Lo aplican por defecto los wrappers Text/TextInput de `@/src/tw`.
 */
export const MAX_FONT_SCALE = 1.15;

/**
 * Si el texto sigue el tamaño de fuente del sistema. En `false` la app ignora
 * por completo Dynamic Type / "Tamaño de fuente" (ni crece ni se achica) y
 * MAX_FONT_SCALE deja de tener efecto: aun ×1.15 rompía columnas ajustadas
 * en un iPhone con texto grande. Para volver a respetar el ajuste del
 * usuario con tope, poner `true`.
 */
export const ALLOW_SYSTEM_FONT_SCALING = false;
