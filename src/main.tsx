import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
// Global reset first, so component CSS modules (same specificity) override it.
import './styles/app.css';
import { readConfig } from './config';
import { createServices } from './services';
import { App, Providers } from './App';
import { NotConfigured } from './components/StatusScreens';
import { ServiceUnavailable } from './components/ServiceUnavailable';

/**
 * Entry point. The WordPress shortcode renders <div id="petzadore-insurance-root">
 * and window.PetzadoreInsurance, then loads this module (built file or dev server).
 *
 * VITE_MOCK_API=true runs every screen on sample data (src/mock/) instead of the
 * backend and Razorpay. The mock is a separate chunk, only loaded in that mode.
 */
const ROOT_ID = 'petzadore-insurance-root';

dayjs.locale('en-gb');

async function renderApp(container: HTMLElement): Promise<ReactNode> {
  if (import.meta.env.VITE_MOCK_API === 'true') {
    const { mockApp } = await import('./mock');
    return mockApp(container);
  }
  const config = readConfig();
  if (!config) {
    return (
      <Providers container={container}>
        <NotConfigured />
      </Providers>
    );
  }
  return <App config={config} services={createServices(config)} container={container} />;
}

const container = document.getElementById(ROOT_ID);
if (container) {
  // A failed start (e.g. a chunk that won't load) shows the fallback page, not a blank screen.
  renderApp(container)
    .catch((error: unknown) => {
      console.error('[Petzadore Insurance]', error);
      return (
        <Providers container={container}>
          <ServiceUnavailable reference="LOAD_FAILED" />
        </Providers>
      );
    })
    .then((app) => createRoot(container).render(<StrictMode>{app}</StrictMode>));
} else {
  console.warn(`[Petzadore Insurance] #${ROOT_ID} not found on this page`);
}
