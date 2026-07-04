export interface XeroSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  tenantId: string;
  tenantName: string;
  idClaims?: Record<string, unknown>;
}

export interface TokenStore {
  get(): XeroSession | null;
  set(session: XeroSession): void;
  clear(): void;
}

// Parked on globalThis so the session survives dev-server hot reloads:
// module-level state is re-created on every HMR pass, the process is not.
// Restart = re-auth, which is acceptable for this localhost MVP. If HMR ever
// wipes this in practice, swap in a .tokens.json-backed TokenStore here —
// the interface is the seam.
type GlobalCache = {
  session: XeroSession | null;
  refreshing: Promise<XeroSession> | null;
};

const g = globalThis as unknown as { __shortstayXero?: GlobalCache };
g.__shortstayXero ??= { session: null, refreshing: null };
const cache = g.__shortstayXero;

export const tokenStore: TokenStore = {
  get: () => cache.session,
  set(session) {
    cache.session = session;
  },
  clear() {
    cache.session = null;
    cache.refreshing = null;
  },
};

export function getRefreshLock(): Promise<XeroSession> | null {
  return cache.refreshing;
}

export function setRefreshLock(p: Promise<XeroSession> | null): void {
  cache.refreshing = p;
}
