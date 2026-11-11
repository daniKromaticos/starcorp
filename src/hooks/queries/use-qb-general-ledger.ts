import { useQuery } from '@tanstack/react-query';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { useQBStore } from '@/src/stores/qb.store';
import type { QBTransactionListRaw } from '@/src/types/api.types';
import { queryKeys } from './query-keys';

interface Params {
  /** QB account leaf ids. GL acepta lista separada por comas. */
  accountIds: string[];
  start_date: string;
  end_date: string;
}

const TX_COLUMNS = 'tx_date,txn_type,doc_num,name,memo,subt_nat_amount';

/**
 * Movimientos de una o varias cuentas vía reports/GeneralLedger.
 *
 * OJO: reports/TransactionList NO soporta el filtro `account` — lo ignora
 * silenciosamente y devuelve todas las transacciones del periodo.
 * GeneralLedger sí filtra por account id(s) y agrupa las filas en
 * secciones por cuenta (ver normalizeGeneralLedgerByAccount).
 */
export function useQBGeneralLedger(params: Params) {
  const realmId = useQBStore((s) => s.activeRealmId);
  const accountIds = params.accountIds.join(',');

  return useQuery({
    queryKey: [
      ...queryKeys.qbGeneralLedger(
        accountIds,
        params.start_date,
        params.end_date,
      ),
      realmId ?? 'default',
    ],
    enabled: accountIds.length > 0,
    queryFn: async () => {
      try {
        return await qbQuery<QBTransactionListRaw>(
          'reports/GeneralLedger',
          {
            account: accountIds,
            start_date: params.start_date,
            end_date: params.end_date,
            columns: TX_COLUMNS,
          },
          realmId ?? undefined,
        );
      } catch (e) {
        if (
          e instanceof QBNotConnectedError ||
          e instanceof QBReauthRequiredError
        ) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
