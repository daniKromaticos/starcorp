/**
 * Mock data del Informe Cartera. Reemplazar por QB AgedReceivables cuando
 * exista la edge function.
 */

import type {
  AgingBucket,
  CarteraClient,
  CarteraInvoice,
  CarteraSnapshot,
} from '@/src/types/cartera.types';

const PALETTE = [
  '#9B2C2C', // red wine — Anchorage inn
  '#1A2B6D', // navy — Kona Village
  '#0E7490', // teal — Kalahari resort PA
  '#65A30D', // lime — Kalahari developement LLC
  '#D9E021', // yellow-lime — Innvite hospitality
  '#3B82F6', // azure — Great Wolf resort holding
  '#0B1F4A', // dark navy — Echo Ohio
  '#F6AD55', // amber — Back 9 golf and entertainment
  '#6B7280', // gray — Otros
];

function makeInvoices(
  clientId: string,
  bucketAmounts: Record<AgingBucket, number>,
): CarteraInvoice[] {
  const invoices: CarteraInvoice[] = [];
  let counter = 1;
  const bucketDays: Record<AgingBucket, number> = {
    corriente: 7,
    '0-30': -10,
    '31-60': -45,
    '61-90': -75,
    '91+': -120,
  };
  (Object.keys(bucketAmounts) as AgingBucket[]).forEach((bucket) => {
    const amount = bucketAmounts[bucket];
    if (amount === 0) return;
    const slice = Math.round(amount / 2);
    [slice, amount - slice].forEach((portion, i) => {
      if (portion === 0) return;
      const daysOverdue = bucketDays[bucket] + i * 2;
      invoices.push({
        id: `${clientId}-${counter}`,
        date: '2026-04-07',
        dueDate: '2026-04-14',
        daysOverdue,
        invoiceNumber: String(3319 + counter),
        note: bucket === '91+' ? 'en cobro jurídico' : undefined,
        amount: portion,
        bucket,
      });
      counter += 1;
    });
  });
  return invoices;
}

function buildClient(
  id: string,
  name: string,
  colorIndex: number,
  buckets: Record<AgingBucket, number>,
): CarteraClient {
  const total = (Object.values(buckets) as number[]).reduce(
    (sum, v) => sum + v,
    0,
  );
  return {
    id,
    name,
    color: PALETTE[colorIndex % PALETTE.length],
    buckets,
    total,
    invoices: makeInvoices(id, buckets),
  };
}

const CARTERA_SNAPSHOT: CarteraSnapshot = {
  updatedAt: '2026-04-07',
  clients: [
    buildClient('anchorage-inn', 'Anchorage inn', 0, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('kona-village', 'Kona Village', 1, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('kalahari-pa', 'Kalahari resort PA LLC', 2, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('kalahari-dev', 'Kalahari developement LLC', 3, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('innvite-hospitality', 'Innvite hospitality', 4, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('great-wolf', 'Great Wolf resort holding', 5, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('echo-ohio', 'Echo Ohio', 6, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
    buildClient('back-9', 'Back 9 golf and entertainment', 7, {
      corriente: 1589.5,
      '0-30': 1589.5,
      '31-60': 1589.5,
      '61-90': 1589.5,
      '91+': 496.52,
    }),
  ],
};

export async function getCarteraMock(): Promise<CarteraSnapshot> {
  await new Promise((r) => setTimeout(r, 80));
  return CARTERA_SNAPSHOT;
}
