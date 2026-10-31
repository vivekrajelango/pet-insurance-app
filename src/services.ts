import type { AppConfig } from './config';
import { createApiClient } from './api/client';
import { createEndpoints, type Endpoints } from './api/endpoints';
import { openCheckout } from './lib/razorpay';

/** Opens the payment window and resolves with what the member did there. */
export type Checkout = typeof openCheckout;

/**
 * Everything the screens need from the outside world. The real set talks to the
 * backend and Razorpay; src/mock/ provides a stand-in for UI work.
 */
export interface Services {
  api: Endpoints;
  checkout: Checkout;
  /** Called once when the session can't be renewed. Returns an unsubscribe function. */
  onSessionEnded(listener: () => void): () => void;
}

export function createServices(config: AppConfig): Services {
  const client = createApiClient(config);
  return { api: createEndpoints(client), checkout: openCheckout, onSessionEnded: client.onSessionEnded };
}
