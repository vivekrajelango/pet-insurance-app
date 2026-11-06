import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Checkbox, Spin, Tag } from 'antd';
import { ApiError } from '../api/client';
import type { Order, Plan } from '../api/types';
import { AppShell } from '../components/AppShell';
import { PetAvatar } from '../components/PetAvatar';
import { Redirect } from '../components/Redirect';
import { ErrorPanel, Loading, StatusCard } from '../components/StatusScreens';
import { useQuote } from '../hooks/useQuote';
import { contactOf, formatINR, formatPhone, petSummary } from '../lib/format';
import { useApp } from '../state/AppContext';
import type { StepKey } from '../state/wizard';
import styles from './ReviewPayStep.module.css';

/** Poll the order this long while the payment is confirmed (webhook path). */
const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 120_000;

type PayState =
  | { kind: 'idle' }
  | { kind: 'paying' }
  | { kind: 'confirming'; slow: boolean }
  | { kind: 'failed'; message: string };

/**
 * Step 4 — summary, terms, Razorpay Checkout.
 * Flow: POST /v1/orders → Razorpay → POST /verify (or /failed) → poll GET /v1/orders/:id
 * until "paid" when Razorpay hasn't captured the payment yet.
 * A failed or cancelled payment stays on this screen with "Try again".
 */
export function ReviewPayStep() {
  const { api, checkout, config, state, dispatch } = useApp();
  const quote = useQuote();
  const [agreed, setAgreed] = useState(false);
  const [pay, setPay] = useState<PayState>({ kind: 'idle' });

  // Page refreshed after payment started: the order may already be paid.
  useEffect(() => {
    if (!state.orderId) return;
    const controller = new AbortController();
    api.getOrder(state.orderId, controller.signal).then(
      (order) => order.status === 'paid' && dispatch({ type: 'paid' }),
      () => {},
    );
    return () => controller.abort();
  }, [api, dispatch, state.orderId]);

  if (pay.kind === 'confirming') return <Confirming slow={pay.slow} />;
  if (quote.loading) return <Loading />;
  if (quote.error) return <ErrorPanel error={quote.error} onRetry={quote.reload} />;
  const { pet, plan, owner } = quote.data!;
  if (!pet || !plan) return <Redirect to={pet ? 'plan' : 'pet'} />;

  const busy = pay.kind === 'paying';
  const contact = contactOf(owner ?? pet.owner, state.contact, config.user.name);

  async function waitUntilPaid(orderId: string): Promise<Order['status']> {
    const started = Date.now();
    for (;;) {
      await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
      const order = await api.getOrder(orderId);
      if (order.status === 'paid' || order.status === 'failed') return order.status;
      if (Date.now() - started > POLL_FOR_MS) {
        setPay({ kind: 'confirming', slow: true });
        return order.status;
      }
    }
  }

  async function startPayment() {
    setPay({ kind: 'paying' });
    try {
      const order = await api.createOrder({
        petId: pet!.id,
        planId: plan!.id,
        dateOfBirth: state.dateOfBirth ?? undefined,
      });
      dispatch({ type: 'orderStarted', orderId: order.orderId });

      const result = await checkout(order.razorpay, { contact: contact.phone });

      if (result.outcome !== 'success') {
        const error =
          result.outcome === 'failed'
            ? result.error
            : { reason: 'dismissed', description: 'Payment cancelled.' };
        await api.recordPaymentFailure(order.orderId, error).catch(() => {});
        setPay({
          kind: 'failed',
          message:
            result.outcome === 'failed'
              ? (result.error.description ?? 'Your payment didn’t go through.')
              : 'The payment window was closed before the payment finished.',
        });
        return;
      }

      setPay({ kind: 'confirming', slow: false });
      const verified = await api.verifyPayment(order.orderId, result.payment);
      const status = verified.status === 'paid' ? 'paid' : await waitUntilPaid(order.orderId);
      if (status === 'paid') dispatch({ type: 'paid' });
      else if (status === 'failed') setPay({ kind: 'failed', message: 'Your payment didn’t go through.' });
      // Otherwise still processing after 2 minutes: "Still confirming" stays up; the email follows.
    } catch (err) {
      if (err instanceof ApiError && err.isSessionEnded) return;
      setPay({ kind: 'failed', message: (err as Error).message });
    }
  }

  const goTo = (step: StepKey) => (busy ? undefined : () => dispatch({ type: 'goTo', step }));
  const answers = Object.keys(state.details).length;
  const payLabel = `Pay ${plan.premium ? formatINR(plan.premium.total) : ''}`;
  const payButton = (
    <Button
      type="primary"
      shape="round"
      size="large"
      block
      disabled={!agreed || !plan.premium}
      loading={busy}
      onClick={startPayment}
    >
      {payLabel}
    </Button>
  );

  return (
    <AppShell
      back={!busy}
      title="Review & pay"
      aside={
        <>
          <Card className={styles.payCard}>
            <div className={`${styles.payTitle} pzi-desktop-only`}>Payment</div>
            <Totals plan={plan} />
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={busy}
              className={`${styles.terms} pzi-desktop-only`}
            >
              <Terms />
            </Checkbox>
            <div className="pzi-desktop-only">{payButton}</div>
            <p className={`${styles.secured} pzi-desktop-only`}>
              Secured by Razorpay · UPI, cards, net banking. Opens in a popup — don’t close this page.
            </p>
          </Card>
          <div className={`${styles.mobileTerms} pzi-mobile-only`}>
            <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={busy}>
              <Terms />
            </Checkbox>
            <p className={styles.note}>
              Payment opens Razorpay (UPI, cards, net banking). Don’t close this page until it finishes.
            </p>
          </div>
        </>
      }
      actions={
        <>
          {payButton}
          <span className={styles.secured}>Secured by Razorpay</span>
        </>
      }
      actionsMobileOnly
    >
      {pay.kind === 'failed' && (
        <div className={styles.failed} role="alert">
          <div className={styles.failedBox}>
            <strong>Payment didn’t go through</strong>
            <span>
              {pay.message} No money was taken. If it was debited, it’ll be refunded automatically in 5–7
              days.
            </span>
          </div>
          <Button type="primary" shape="round" size="large" block disabled={!agreed} onClick={startPayment}>
            Try again
          </Button>
          {/* Razorpay's window lets the member pick another method, so this reopens it too. */}
          <button type="button" className={styles.linkButton} disabled={!agreed} onClick={startPayment}>
            Use a different payment method
          </button>
        </div>
      )}

      <Card>
        <ul className={styles.rows}>
          <ReviewRow
            label="Pet"
            value={`${pet.name} · ${petSummary(pet)}`}
            icon={<PetAvatar pet={pet} size={52} className="pzi-desktop-only" />}
            onChange={goTo('pet')}
          />
          <ReviewRow
            label="Plan"
            value={`${plan.name} · ${formatINR(plan.sumInsured)} sum insured`}
            onChange={goTo('plan')}
          />
          <ReviewRow
            label="Policy holder"
            value={[
              contact.name,
              formatPhone(contact.phone),
              [contact.city, contact.postalCode].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join(' · ')}
            onChange={goTo('details')}
          />
          <ReviewRow
            label="Details for the insurer"
            value={answers ? `${answers} answers` : 'To be confirmed'}
            muted={!answers}
            onChange={goTo('details')}
          />
        </ul>
      </Card>

      {plan.conditions.map((c) => (
        <div key={c.code} className={styles.condition}>
          {c.message}
        </div>
      ))}
    </AppShell>
  );
}

function Terms() {
  return (
    <>
      I confirm the details are correct and agree to the {/* TODO: real policy wording / exclusions links */}
      <a href="#policy-terms">policy terms</a> and <a href="#exclusions">exclusions</a>.
    </>
  );
}

function Totals({ plan }: { plan: Plan }) {
  const premium = plan.premium;
  if (!premium) return <p className={styles.note}>Price unavailable for this plan.</p>;
  return (
    <dl className={styles.totals}>
      <div>
        <dt>Annual premium</dt>
        <dd>{formatINR(premium.base)}</dd>
      </div>
      <div>
        <dt>GST ({premium.gstPercent}%)</dt>
        <dd>{formatINR(premium.gst)}</dd>
      </div>
      <div className={styles.total}>
        <dt>Total</dt>
        <dd>{formatINR(premium.total)}</dd>
      </div>
      {premium.isPlaceholder && (
        <Tag color="orange" className={styles.tag}>
          Indicative price
        </Tag>
      )}
    </dl>
  );
}

function ReviewRow({
  label,
  value,
  icon,
  muted,
  onChange,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  muted?: boolean;
  onChange?: () => void;
}) {
  return (
    <li className={styles.row}>
      {icon}
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={`${styles.rowValue} ${muted ? styles.rowMuted : ''}`}>{value}</span>
      </span>
      {onChange && (
        <Button
          type="link"
          onClick={onChange}
          aria-label={`Change ${label.toLowerCase()}`}
          className={styles.change}
        >
          Change
        </Button>
      )}
    </li>
  );
}

/** While /verify runs or only the webhook can confirm. Back is not offered here. */
function Confirming({ slow }: { slow: boolean }) {
  return (
    <StatusCard icon={<Spin size="large" className={styles.spinner} />} title="Confirming your payment…">
      {slow ? (
        <span role="status">
          Still confirming — we’ll email you once it’s done. Money is never charged twice.
        </span>
      ) : (
        <span role="status">This can take up to a minute. Please don’t close or refresh this page.</span>
      )}
    </StatusCard>
  );
}
