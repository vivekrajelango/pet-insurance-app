import { Button, Card } from 'antd';
import { ErrorPanel, Loading, SuccessIcon } from '../components/StatusScreens';
import { useAsync } from '../hooks/useAsync';
import { formatINR } from '../lib/format';
import { useApp } from '../state/AppContext';
import styles from './SuccessStep.module.css';

/** Step 5 — payment received; the insurer issues the policy next. */
export function SuccessStep() {
  const { api, config, state, dispatch } = useApp();
  const order = useAsync((signal) => api.getOrder(state.orderId!, signal), String(state.orderId));

  if (order.loading) return <Loading />;
  if (order.error) return <ErrorPanel error={order.error} onRetry={order.reload} />;
  const o = order.data!;

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.hero}>
          <SuccessIcon />
          <div className={styles.title} role="heading" aria-level={1}>
            Payment received
          </div>
          <p className={styles.lead}>
            {o.pet.name ?? 'Your pet'}’s {o.plan.name} request has gone to the insurer. You’ll get the policy
            document by email once it’s issued.
          </p>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>Order ID</dt>
            <dd>{o.id}</dd>
          </div>
          <div>
            <dt>Payment ID</dt>
            <dd>{o.paymentId ?? '—'}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatINR(o.amount.total)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={styles.status}>Paid · awaiting policy</dd>
          </div>
        </dl>

        <div className={`${styles.actions} pzi-desktop-only`}>
          <Actions myPoliciesUrl={config.myPoliciesUrl} onRestart={() => dispatch({ type: 'restart' })} />
        </div>
      </Card>

      <div className={styles.nextTitle}>What happens next</div>
      <ol className={styles.next}>
        <li>Confirmation email + SMS/WhatsApp sent to you now.</li>
        {/* TODO: typical turnaround from the insurer ("usually [X] working days") */}
        <li>The insurer issues the policy.</li>
        <li>We remind you 30, 7 and 1 day before renewal.</li>
      </ol>

      <div className={`${styles.actions} pzi-mobile-only`}>
        <Actions myPoliciesUrl={config.myPoliciesUrl} onRestart={() => dispatch({ type: 'restart' })} />
      </div>
    </div>
  );
}

function Actions({ myPoliciesUrl, onRestart }: { myPoliciesUrl: string; onRestart: () => void }) {
  return (
    <>
      {myPoliciesUrl && (
        <Button type="primary" shape="round" size="large" href={myPoliciesUrl}>
          Go to My policies
        </Button>
      )}
      <Button color="primary" variant="outlined" shape="round" size="large" onClick={onRestart}>
        Insure another pet
      </Button>
    </>
  );
}
