/**
 * TEMPORARY — Direct QuickBooks test from the app.
 * Replace this with the Edge Function flow (qb-query) before any commit to main.
 * Hardcoded tokens are sandbox-only and expire in 1h.
 */

const ACCESS_TOKEN = 'PEGA_AQUI_EL_ACCESS_TOKEN_DEL_PLAYGROUND';
const REALM_ID = 'PEGA_AQUI_EL_REALM_ID';
const BASE = 'https://sandbox-quickbooks.api.intuit.com';

export async function qbTestCompanyInfo() {
  const url = `${BASE}/v3/company/${REALM_ID}/companyinfo/${REALM_ID}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`QB ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function qbTestCustomers() {
  const q = encodeURIComponent('select * from Customer maxresults 10');
  const url = `${BASE}/v3/company/${REALM_ID}/query?query=${q}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`QB ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function qbTestProfitAndLoss() {
  const url = `${BASE}/v3/company/${REALM_ID}/reports/ProfitAndLoss?start_date=2026-01-01&end_date=2026-04-28`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`QB ${res.status}: ${await res.text()}`);
  return res.json();
}
