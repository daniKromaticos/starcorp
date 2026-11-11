import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/src/tw';
import { startQuickBooksOAuth } from '@/src/services/quickbooks/oauth';
import { useQBCompanyInfo } from '@/src/hooks/queries/use-qb-company-info';
import { useQBCustomers } from '@/src/hooks/queries/use-qb-customers';
import { useQBProfitAndLoss } from '@/src/hooks/queries/use-qb-profit-and-loss';

export default function QBTestScreen() {
  const [output, setOutput] = useState('Conecta QuickBooks y luego pulsa una query.');
  const [connecting, setConnecting] = useState(false);

  const companyInfo = useQBCompanyInfo();
  const customers = useQBCustomers();
  const pnl = useQBProfitAndLoss({
    start_date: '2026-01-01',
    end_date: '2026-04-28',
  });

  async function connect() {
    setConnecting(true);
    setOutput('⏳ Abriendo OAuth...');
    try {
      const result = await startQuickBooksOAuth();
      setOutput(`OAuth resultado: ${JSON.stringify(result, null, 2)}\n\nRefrescando queries...`);
      companyInfo.refetch();
      customers.refetch();
      pnl.refetch();
    } catch (err) {
      setOutput(`❌ ${(err as Error).message}`);
    } finally {
      setConnecting(false);
    }
  }

  function show(label: string, q: { data?: unknown; error?: unknown; isLoading: boolean }) {
    if (q.isLoading) {
      setOutput(`⏳ ${label} cargando...`);
      return;
    }
    if (q.error) {
      setOutput(`❌ ${label}\n\n${(q.error as Error).message}`);
      return;
    }
    if (q.data === null) {
      setOutput(`⚠️ ${label}: No hay conexión a QuickBooks aún. Pulsa "Conectar QuickBooks".`);
      return;
    }
    setOutput(`✅ ${label}\n\n${JSON.stringify(q.data, null, 2)}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QuickBooks Sandbox Test</Text>

      <TouchableOpacity
        style={[styles.btn, styles.connectBtn]}
        disabled={connecting}
        onPress={connect}>
        <Text style={styles.btnTxt}>
          {connecting ? 'Abriendo...' : '🔗 Conectar QuickBooks'}
        </Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => show('Company Info', companyInfo)}>
          <Text style={styles.btnTxt}>Company Info</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => show('Customers', customers)}>
          <Text style={styles.btnTxt}>Customers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => show('Profit & Loss', pnl)}>
          <Text style={styles.btnTxt}>P&L</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.outputBox}>
        <Text style={styles.outputTxt}>{output}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, backgroundColor: '#0b1220' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  btn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  connectBtn: {
    backgroundColor: '#10b981',
    marginBottom: 16,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
  outputBox: { flex: 1, backgroundColor: '#111827', borderRadius: 8, padding: 12 },
  outputTxt: { color: '#d1d5db', fontFamily: 'monospace', fontSize: 12 },
});
