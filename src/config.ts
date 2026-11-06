/**
 * Config the WordPress plugin prints on the page (class-pzi-shortcode.php):
 *   window.PetzadoreInsurance = { apiBase, token, tokenExpiresAt, refreshUrl, ... }
 * Keep this in step with PZI_Shortcode::render().
 */
export interface AppConfig {
  /** Backend base URL, e.g. https://petzadore.com/ins-api */
  apiBase: string;
  /** Short-lived HS256 session token for the backend */
  token: string;
  /** Token expiry, ms since epoch */
  tokenExpiresAt: number;
  /** WP REST route that issues a fresh token (cookie auth + X-WP-Nonce) */
  refreshUrl: string;
  restNonce: string;
  user: { id: number; name: string };
  loginUrl: string;
  /** Empty until the "My policies" page exists */
  myPoliciesUrl: string;
  /** Member's Petzadore profile (edit pets). Not printed by the plugin yet. */
  profileUrl?: string;
  /** "Talk to us" page. Not printed by the plugin yet. */
  contactUrl?: string;
}

declare global {
  interface Window {
    PetzadoreInsurance?: AppConfig;
  }
}

/** Reads the page config; in `npm run dev` falls back to .env.local values. */
export function readConfig(): AppConfig | null {
  const fromPage = window.PetzadoreInsurance;
  if (fromPage?.token && fromPage.apiBase) return fromPage;
  if (import.meta.env.DEV) return devConfig();
  return null;
}

function devConfig(): AppConfig | null {
  const token = import.meta.env.VITE_DEV_TOKEN;
  if (!token) return null;
  const claims = decodeClaims(token);
  return {
    apiBase: import.meta.env.VITE_API_BASE || 'https://api.staging.petzadore.com',
    token,
    tokenExpiresAt: claims.exp ? claims.exp * 1000 : Date.now() + 15 * 60_000,
    refreshUrl: '', // no WordPress here: an expired token ends the session
    restNonce: '',
    user: { id: Number(claims.sub) || 0, name: claims.name ?? 'Dev user' },
    loginUrl: '#login',
    myPoliciesUrl: '',
  };
}

function decodeClaims(token: string): { sub?: string; name?: string; exp?: number } {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}
