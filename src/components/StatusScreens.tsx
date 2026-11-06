import type { ReactNode } from 'react';
import { Button, Spin } from 'antd';
import { CheckOutlined, LockOutlined } from '@ant-design/icons';
import { ApiError } from '../api/client';
import { ServiceUnavailable } from './ServiceUnavailable';
import styles from './StatusScreens.module.css';

/** Centred white card used by the status screens in the wireframes. */
export function StatusCard({
  icon,
  title,
  children,
  actions,
  align = 'center',
  wide,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  align?: 'center' | 'left';
  wide?: boolean;
}) {
  return (
    <div className={`${styles.card} ${align === 'left' ? styles.left : ''} ${wide ? styles.wide : ''}`}>
      {icon}
      <div className={styles.title} role="heading" aria-level={1}>
        {title}
      </div>
      {children && <div className={styles.body}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export function SuccessIcon() {
  return (
    <span className={styles.successIcon} aria-hidden>
      <CheckOutlined />
    </span>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.center} role="status" aria-live="polite">
      <Spin size="large" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}

/**
 * Friendly message for a failed call, with Retry. Session-ended errors are handled by App.
 * Backend down or unreachable (network error, 5xx) shows the full "Service unavailable" page.
 */
export function ErrorPanel({
  error,
  onRetry,
  title,
}: {
  error: Error;
  onRetry?: () => void;
  title?: string;
}) {
  if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
    return <ServiceUnavailable onRetry={onRetry} reference={error.status ? String(error.status) : error.code} />;
  }
  return (
    <StatusCard
      align="left"
      title={title ?? 'We couldn’t load this'}
      actions={
        onRetry && (
          <Button color="primary" variant="outlined" shape="round" size="large" onClick={onRetry} block>
            Retry
          </Button>
        )
      }
    >
      {error.message}
    </StatusCard>
  );
}

export function SessionEnded({ loginUrl }: { loginUrl: string }) {
  return (
    <StatusCard
      title="You’ve been logged out"
      actions={
        <Button type="primary" shape="round" size="large" href={loginUrl} block>
          Log in again
        </Button>
      }
    >
      Log in again and we’ll bring you back to where you left off.
    </StatusCard>
  );
}

/**
 * Logged-out visitor. In production the shortcode prints this in PHP instead of
 * loading the app; this copy is for the mock and keeps the two in step.
 */
export function LoggedOut({ loginUrl, registerUrl }: { loginUrl: string; registerUrl?: string }) {
  return (
    <StatusCard
      icon={
        <span className={styles.softIcon} aria-hidden>
          <LockOutlined />
        </span>
      }
      title="Insure your pet in minutes"
      actions={
        <>
          <Button type="primary" shape="round" size="large" href={loginUrl} block>
            Log in
          </Button>
          {registerUrl && (
            <a className={styles.link} href={registerUrl}>
              New here? Create an account
            </a>
          )}
        </>
      }
    >
      Log in to your Petzadore account so we can use your pet’s profile.
    </StatusCard>
  );
}

/** No config on the page (plugin not set up, or `npm run dev` without VITE_DEV_TOKEN). */
export function NotConfigured() {
  if (!import.meta.env.DEV) return <ServiceUnavailable reference="NOT_CONFIGURED" />;
  return (
    <StatusCard title="Insurance is temporarily unavailable">
      Dev: set VITE_DEV_TOKEN in .env.local (a session token for VITE_API_BASE), or VITE_MOCK_API=true for
      sample data. Restart <code>npm run dev</code> after editing .env.local.
    </StatusCard>
  );
}
