import type { ReactNode } from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { useApp } from '../state/AppContext';
import { PROGRESS } from '../state/wizard';
import styles from './AppShell.module.css';

const STEP_LABELS = ['Pet', 'Plan', 'Details', 'Pay'];

interface AppShellProps {
  /** Small red label above the title (desktop; phones show "Step N of 4" instead) */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shows "← Back" (dispatches 'back' unless a handler is given) */
  back?: boolean | (() => void);
  backLabel?: string;
  /** Hide the progress bar (success, status screens) */
  hideProgress?: boolean;
  /** Main column */
  children: ReactNode;
  /** Right-hand panel on desktop; stacks under the content on phones */
  aside?: ReactNode;
  /** Primary actions: sticky bar at the bottom on phones, end of the page on desktop */
  actions?: ReactNode;
  /** Actions live inside the content on desktop (e.g. a card's button): show the bar on phones only */
  actionsMobileOnly?: boolean;
}

/** Page frame shared by every step: progress, heading, content, aside, actions. */
export function AppShell({
  eyebrow,
  title,
  subtitle,
  back,
  backLabel = 'Back',
  hideProgress,
  children,
  aside,
  actions,
  actionsMobileOnly,
}: AppShellProps) {
  const { state, dispatch } = useApp();
  const onBack = typeof back === 'function' ? back : () => dispatch({ type: 'back' });
  const current = PROGRESS[state.step];
  const showProgress = !hideProgress && state.step !== 'done';
  // Add pet sits before step 1, so phones show the bar without "Step 1 of 4".
  const stepLabel =
    showProgress && state.step !== 'addPet' && `Step ${current + 1} of 4 · ${STEP_LABELS[current]}`;

  return (
    <div className={styles.shell}>
      {showProgress && <ProgressBar current={current} />}

      <div className={styles.head}>
        {(back || eyebrow || stepLabel) && (
          <div className={styles.topRow}>
            {back ? (
              <Button type="link" icon={<ArrowLeftOutlined />} onClick={onBack} className={styles.back}>
                {backLabel}
              </Button>
            ) : (
              eyebrow && <div className={`${styles.eyebrow} pzi-desktop-only`}>{eyebrow}</div>
            )}
            {stepLabel && <span className={`${styles.stepLabel} pzi-mobile-only`}>{stepLabel}</span>}
          </div>
        )}
        <div className={styles.titleRow}>
          <Typography.Title level={1} className={styles.title}>
            {title}
          </Typography.Title>
          {showProgress && <Stepper current={current} />}
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      <div className={aside ? styles.withAside : styles.single}>
        <div className={styles.main}>{children}</div>
        {aside && <aside className={styles.aside}>{aside}</aside>}
      </div>

      {actions && (
        <div className={`${styles.actions} ${actionsMobileOnly ? 'pzi-mobile-only' : ''}`}>{actions}</div>
      )}
    </div>
  );
}

/** Phones: four segments across the top. */
function ProgressBar({ current }: { current: number }) {
  return (
    <div
      className={`${styles.bar} pzi-mobile-only`}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={current + 1}
      aria-label="Progress"
    >
      {STEP_LABELS.map((label, i) => (
        <span key={label} className={i <= current ? styles.segmentOn : styles.segment} />
      ))}
    </div>
  );
}

/** Desktop: ✓ Pet —— 2 Plan —— 3 Details —— 4 Pay */
function Stepper({ current }: { current: number }) {
  return (
    <ol className={`${styles.stepper} pzi-desktop-only`} aria-label="Progress">
      {STEP_LABELS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className={styles[state]} aria-current={state === 'current' ? 'step' : undefined}>
            {i > 0 && <span className={styles.line} aria-hidden />}
            <span className={styles.dot}>{state === 'done' ? <CheckOutlined /> : i + 1}</span>
            <span className={styles.stepName}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
