import type { AppConfig } from '../config';
import type { ApiErrorBody } from './types';

/** Refresh the session token this long before it expires. */
const REFRESH_MARGIN_MS = 60_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** WordPress login ended: the app must show the "Session ended" screen. */
  get isSessionEnded() {
    return this.code === 'SESSION_ENDED';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClient {
  request<T>(method: Method, path: string, body?: unknown, init?: { signal?: AbortSignal }): Promise<T>;
  /** Called once when the session can't be renewed. Returns an unsubscribe function. */
  onSessionEnded(listener: () => void): () => void;
}

/**
 * fetch wrapper for the insurance backend:
 * - adds the Bearer session token
 * - renews the token through WordPress shortly before it expires, and once on a 401
 * - turns error bodies into ApiError
 */
export function createApiClient(config: AppConfig, fetchImpl: typeof fetch = fetch.bind(window)): ApiClient {
  let token = config.token;
  let expiresAt = config.tokenExpiresAt;
  let refreshing: Promise<void> | null = null;
  let ended = false;
  const listeners = new Set<() => void>();

  function endSession(): never {
    if (!ended) {
      ended = true;
      listeners.forEach((l) => l());
    }
    throw new ApiError(401, 'SESSION_ENDED', 'Your session has ended. Please log in again.');
  }

  async function renew(): Promise<void> {
    if (!config.refreshUrl) endSession();
    let res: Response;
    try {
      res = await fetchImpl(config.refreshUrl, {
        method: 'POST',
        credentials: 'same-origin', // WordPress login cookie
        headers: { 'X-WP-Nonce': config.restNonce },
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Could not reach Petzadore. Check your connection and try again.');
    }
    // 401/403: logged out of WordPress, or the REST nonce expired (page open for a day)
    if (res.status === 401 || res.status === 403) endSession();
    if (!res.ok) throw new ApiError(res.status, 'REFRESH_FAILED', 'Could not renew your session.');
    const data = (await res.json()) as { token: string; expiresAt: number };
    token = data.token;
    expiresAt = data.expiresAt;
  }

  /** One renewal at a time, shared by concurrent requests. */
  function renewOnce(): Promise<void> {
    refreshing ??= renew().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(method: Method, path: string, body: unknown, signal?: AbortSignal) {
    try {
      return await fetchImpl(`${config.apiBase}${path}`, {
        method,
        signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new ApiError(0, 'NETWORK', 'Could not reach the insurance service. Please try again.');
    }
  }

  async function request<T>(
    method: Method,
    path: string,
    body?: unknown,
    init: { signal?: AbortSignal } = {},
  ) {
    if (ended) endSession();
    if (Date.now() > expiresAt - REFRESH_MARGIN_MS) await renewOnce();

    let res = await send(method, path, body, init.signal);
    if (res.status === 401) {
      await renewOnce();
      res = await send(method, path, body, init.signal);
      if (res.status === 401) endSession();
    }

    const text = await res.text();
    const data: unknown = text ? safeJson(text) : null;
    if (!res.ok) {
      const err = (data as ApiErrorBody | null)?.error;
      throw new ApiError(
        res.status,
        err?.code ?? `HTTP_${res.status}`,
        err?.message ?? 'Something went wrong.',
      );
    }
    return data as T;
  }

  return {
    request,
    onSessionEnded(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
