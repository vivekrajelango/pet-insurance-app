import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AppConfig } from '../config';
import type { Endpoints } from '../api/endpoints';
import type { Checkout, Services } from '../services';
import { loadState, saveState, wizardReducer, type WizardAction, type WizardState } from './wizard';

interface AppContextValue {
  config: AppConfig;
  api: Endpoints;
  checkout: Checkout;
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  config,
  services,
  children,
}: {
  config: AppConfig;
  services: Services;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(wizardReducer, config.user.id, loadState);

  useEffect(() => saveState(config.user.id, state), [config.user.id, state]);

  const { api, checkout } = services;
  const value = useMemo(() => ({ config, api, checkout, state, dispatch }), [config, api, checkout, state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
