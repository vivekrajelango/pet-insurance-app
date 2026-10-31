import { Component, useEffect, useState, type ReactNode } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import enGB from 'antd/locale/en_GB';
import 'dayjs/locale/en-gb';
import type { AppConfig } from './config';
import type { Services } from './services';
import { AppProvider, useApp } from './state/AppContext';
import { theme } from './theme';
import { SessionEnded } from './components/StatusScreens';
import { ServiceUnavailable } from './components/ServiceUnavailable';
import { PetSelectStep } from './steps/PetSelectStep';
import { AddPetStep } from './steps/AddPetStep';
import { PlanStep } from './steps/PlanStep';
import { DetailsStep } from './steps/DetailsStep';
import { ReviewPayStep } from './steps/ReviewPayStep';
import { SuccessStep } from './steps/SuccessStep';

/**
 * WordPress-safe Ant Design setup:
 * - hashPriority="high": Ant's styles normally use :where() (zero specificity),
 *   which the WordPress theme's `button`/`input` rules would override.
 * - getPopupContainer: dropdowns, date pickers and modals render inside the app
 *   root (not at the end of <body>), so they keep the app's font and reset.
 */
export function Providers({ container, children }: { container: HTMLElement; children: ReactNode }) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider theme={theme} locale={enGB} getPopupContainer={() => container}>
        <AntApp component={false}>
          <div className="pzi-app">{children}</div>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}

/** Providers + step switch. `devTools` (mock mode only) render inside the providers. */
export function App({
  config,
  services,
  container,
  devTools,
}: {
  config: AppConfig;
  services: Services;
  container: HTMLElement;
  devTools?: ReactNode;
}) {
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => services.onSessionEnded(() => setSessionEnded(true)), [services]);

  return (
    <Providers container={container}>
      <ErrorBoundary contactUrl={config.contactUrl}>
        {sessionEnded ? (
          <SessionEnded loginUrl={config.loginUrl} />
        ) : (
          <AppProvider config={config} services={services}>
            <CurrentStep />
          </AppProvider>
        )}
      </ErrorBoundary>
      {devTools}
    </Providers>
  );
}

function CurrentStep() {
  const { state } = useApp();
  // Guard against a saved state that skipped a required choice.
  const step = state.step !== 'pet' && state.step !== 'addPet' && !state.petId ? 'pet' : state.step;
  switch (step) {
    case 'pet':
      return <PetSelectStep />;
    case 'addPet':
      return <AddPetStep />;
    case 'plan':
      return <PlanStep />;
    case 'details':
      return state.planId ? <DetailsStep /> : <PlanStep />;
    case 'review':
      return state.planId ? <ReviewPayStep /> : <PlanStep />;
    case 'done':
      return state.orderId ? <SuccessStep /> : <PetSelectStep />;
  }
}

class ErrorBoundary extends Component<{ children: ReactNode; contactUrl?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[Petzadore Insurance]', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ServiceUnavailable contactUrl={this.props.contactUrl} reference="APP_ERROR" />;
  }
}
