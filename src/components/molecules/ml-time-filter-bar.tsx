/**
 * Molecule: MlTimeFilterBar
 *
 * Horizontal pill container with period options.
 * Selected option uses brandOrange gradient; others are text-only.
 */

import { AtTypography } from "@/src/components/atoms/at-typography";
import { gradients } from "@/src/theme/gradients";
import { Pressable, ScrollView, View } from "@/src/tw";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";

export interface TimeFilterOption {
  key: string;
  label: string;
}

interface MlTimeFilterBarProps {
  options: readonly TimeFilterOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  className?: string;
  /**
   * Reparte las opciones en partes iguales para ocupar todo el ancho
   * (sin scroll horizontal). Útil cuando hay pocas opciones fijas.
   */
  fill?: boolean;
}

export const MlTimeFilterBar = memo<MlTimeFilterBarProps>(
  ({ options, selectedKey, onSelect, className, fill: fillProp = false }) => {
    // Con scroll, "12 meses" quedaba fuera de vista sin pista de que había
    // más (pasa hasta en 390dp). Hasta 5 opciones se reparten siempre a lo
    // ancho, con padding chico y la letra achicándose si no cabe (320dp).
    const fill = fillProp || options.length <= 5;
    const pillStyle = {
      paddingHorizontal: fill ? 4 : 12,
      paddingVertical: 10,
      borderRadius: 999,
      alignItems: "center",
    } as const;

    const renderOption = (opt: TimeFilterOption) => {
      const isSelected = selectedKey === opt.key;
      return (
        <Pressable
          key={opt.key}
          onPress={() => onSelect(opt.key)}
          hitSlop={6}
          className={fill ? "flex-1" : undefined}
        >
          {isSelected ? (
            <LinearGradient
              colors={gradients.brandOrange.colors}
              start={gradients.brandOrange.start}
              end={gradients.brandOrange.end}
              style={pillStyle}
            >
              <AtTypography
                variant="captionBold"
                color="#FFFFFF"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {opt.label}
              </AtTypography>
            </LinearGradient>
          ) : (
            <View style={pillStyle}>
              <AtTypography
                variant="captionBold"
                color="#1A1F36"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {opt.label}
              </AtTypography>
            </View>
          )}
        </Pressable>
      );
    };

    return (
      <View className={`px-4 ${className ?? ""}`}>
        <View
          className="bg-bg-card py-1.5 px-2 rounded-full"
          style={{
            borderCurve: "continuous",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
          }}
        >
          {fill ? (
            <View className="flex-row items-center gap-1 px-1">
              {options.map(renderOption)}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row items-center justify-center gap-1 px-1 grow"
            >
              {options.map(renderOption)}
            </ScrollView>
          )}
        </View>
      </View>
    );
  },
);

MlTimeFilterBar.displayName = "MlTimeFilterBar";
