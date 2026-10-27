/** The server may spend up to 180 s on one order (order call plus reconciliation lookups). */
export const ORDER_CLIENT_TIMEOUT_MS = 185_000;
/** After this, an earlier attempt can no longer finish, so "no order found" is final. */
export const ATTEMPT_SETTLED_MS = 190_000;
