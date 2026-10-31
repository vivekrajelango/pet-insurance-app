/**
 * Mock mode (VITE_MOCK_API=true): every screen on sample data, no backend,
 * no Razorpay. Test a scenario with ?mock=<key> (see scenario.ts).
 */
import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import type { AppConfig } from '../config';
import type { Services } from '../services';
import { App, Providers } from '../App';
import { LoggedOut } from '../components/StatusScreens';
import { createMockEndpoints } from './api';
import { OWNER } from './data';
import { MockCheckoutHost, mockCheckout } from './MockCheckout';
import { ProfileMenu } from './ProfileMenu';
import { readScenario, type Scenario } from './scenario';

const config: AppConfig = {
  apiBase: 'mock://',
  token: 'mock',
  tokenExpiresAt: Number.MAX_SAFE_INTEGER,
  refreshUrl: '',
  restNonce: '',
  user: { id: OWNER.id, name: OWNER.name ?? 'Pet parent' },
  loginUrl: '#login',
  myPoliciesUrl: '#my-policies',
  profileUrl: '#my-profile',
  contactUrl: '#contact',
};

function createMockServices(scenario: Scenario): Services {
  const listeners = new Set<() => void>();
  const endSession = (): never => {
    listeners.forEach((l) => l());
    throw new ApiError(401, 'SESSION_ENDED', 'Your session has ended. Please log in again.');
  };
  return {
    api: createMockEndpoints(scenario, endSession),
    checkout: mockCheckout,
    onSessionEnded(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function mockApp(container: HTMLElement): ReactNode {
  const scenario = readScenario();
  const devTools = (
    <>
      <MockCheckoutHost />
      <ProfileMenu loggedOut={scenario === 'loggedOut'} />
    </>
  );

  if (scenario === 'loggedOut') {
    return (
      <Providers container={container}>
        <LoggedOut loginUrl={config.loginUrl} registerUrl="#register" />
        {devTools}
      </Providers>
    );
  }
  return (
    <App config={config} services={createMockServices(scenario)} container={container} devTools={devTools} />
  );
}
