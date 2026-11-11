/**
 * Tipos del Informe Cartera (AR aging).
 */

export type AgingBucket = 'corriente' | '0-30' | '31-60' | '61-90' | '91+';

export const AGING_BUCKETS: AgingBucket[] = [
  'corriente',
  '0-30',
  '31-60',
  '61-90',
  '91+',
];

export const AGING_BUCKET_LABEL: Record<AgingBucket, string> = {
  corriente: 'Corriente',
  '0-30': '1 - 30',
  '31-60': '31 - 60',
  '61-90': '61 - 90',
  '91+': '91 - más',
};

export interface CarteraInvoice {
  id: string;
  date: string;          // ISO yyyy-mm-dd
  dueDate: string;       // ISO yyyy-mm-dd
  daysOverdue: number;   // negativo si vencido (-3 = vencida hace 3 días)
  invoiceNumber: string;
  note?: string;
  amount: number;
  bucket: AgingBucket;
}

export interface CarteraClient {
  id: string;
  name: string;
  color: string;
  buckets: Record<AgingBucket, number>;
  total: number;
  invoices: CarteraInvoice[];
}

export interface CarteraSnapshot {
  clients: CarteraClient[];
  updatedAt: string;     // ISO
}
