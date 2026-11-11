import React, { memo, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePowerBIEmbed } from '@/src/hooks/queries/use-powerbi-embed';

interface OrPowerBIReportProps {
  groupId: string;
  reportId: string;
  height?: number;
}

export const OrPowerBIReport = memo<OrPowerBIReportProps>(
  ({ groupId, reportId, height }) => {
    const { data, isLoading, error } = usePowerBIEmbed(groupId, reportId);
    const { height: winHeight } = useWindowDimensions();
    const viewHeight = height ?? winHeight - 220;

    const html = useMemo(() => {
      if (!data) return '';
      return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body, #r { margin: 0; padding: 0; height: 100%; width: 100%; background: transparent; }
  iframe { border: 0 !important; }
</style>
</head>
<body>
<div id="r"></div>
<script src="https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.min.js"></script>
<script>
  window.powerbi.embed(document.getElementById('r'), {
    type: 'report',
    tokenType: 1,
    accessToken: ${JSON.stringify(data.embedToken)},
    embedUrl: ${JSON.stringify(data.embedUrl)},
    id: ${JSON.stringify(data.reportId)},
    settings: { panes: { filters: { visible: false } } }
  });
</script>
</body>
</html>`;
    }, [data]);

    if (isLoading) {
      return (
        <View className="gap-3 p-4">
          <AtSkeleton width="100%" height={24} />
          <AtSkeleton width="100%" height={viewHeight - 40} borderRadius={12} />
        </View>
      );
    }

    if (error || !data) {
      const msg =
        error instanceof Error ? error.message : 'error desconocido';
      return (
        <View className="p-4 gap-2">
          <AtTypography variant="h3" color="#1A1F36">
            No se pudo cargar el reporte
          </AtTypography>
          <AtTypography variant="body" color="#DC2626">
            {msg}
          </AtTypography>
        </View>
      );
    }

    return (
      <View style={{ height: viewHeight, width: '100%' }}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    );
  },
);

OrPowerBIReport.displayName = 'OrPowerBIReport';
