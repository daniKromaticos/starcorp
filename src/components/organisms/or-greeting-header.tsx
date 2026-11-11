/**
 * Organism: OrGreetingHeader
 *
 * "Bienvenido, Alejandro" section from mockup.
 * Migrated to NativeWind + AtTypography.
 */

import { AtTypography } from "@/src/components/atoms/at-typography";
import { View } from "@/src/tw";
import React, { memo } from "react";

interface OrGreetingHeaderProps {
  name: string;
}

export const OrGreetingHeader = memo<OrGreetingHeaderProps>(({ name }) => {
  return (
    <View className="px-4 pb-5">
      <AtTypography variant="h1">
        {name ? `Bienvenido, ${name}` : 'Bienvenido'}
      </AtTypography>
    </View>
  );
});

OrGreetingHeader.displayName = "OrGreetingHeader";
