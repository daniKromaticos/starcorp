import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { OrClientDetail } from '@/src/components/organisms/or-client-detail';

export default function IngresoClienteDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  return <OrClientDetail clientId={clientId ?? ''} entryCategory="ingresos" />;
}
