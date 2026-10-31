import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import type { RazorpayOrderOptions } from '../api/types';
import type { CheckoutResult } from '../lib/razorpay';
import type { Checkout } from '../services';
import { formatINR } from '../lib/format';
import styles from './mock.module.css';

interface Pending {
  options: RazorpayOrderOptions;
  resolve: (result: CheckoutResult) => void;
}

let show: ((pending: Pending) => void) | null = null;

/** Stand-in for Razorpay Checkout: resolves when the member pays, fails or closes the window. */
export const mockCheckout: Checkout = (options) =>
  new Promise((resolve) => {
    if (!show) throw new Error('MockCheckoutHost is not mounted');
    show({ options, resolve });
  });

/** Renders the fake payment window. Mounted once, inside the app's providers. */
export function MockCheckoutHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    show = setPending;
    return () => {
      show = null;
    };
  }, []);

  function finish(result: CheckoutResult) {
    pending?.resolve(result);
    setPending(null);
    setPaying(false);
  }

  function pay() {
    setPaying(true);
    const suffix = Math.random().toString(36).slice(2, 16);
    setTimeout(
      () =>
        finish({
          outcome: 'success',
          payment: {
            razorpay_order_id: pending!.options.orderId,
            razorpay_payment_id: `pay_${suffix}`,
            razorpay_signature: 'mock_signature',
          },
        }),
      900,
    );
  }

  const options = pending?.options;
  return (
    <Modal
      open={!!pending}
      title="Razorpay Checkout (mock)"
      onCancel={() => finish({ outcome: 'dismissed' })}
      closable={!paying}
      mask={{ closable: false }}
      footer={null}
      width={380}
      destroyOnHidden
    >
      {options && (
        <div className={styles.checkout}>
          <div className={styles.checkoutMerchant}>{options.name}</div>
          <div className={styles.checkoutDescription}>{options.description}</div>
          <div className={styles.checkoutAmount}>{formatINR(options.amount / 100)}</div>
          <div className={styles.checkoutHint}>
            Test window: no real payment. Choose what Razorpay should report back.
          </div>
          <Button type="primary" size="large" block loading={paying} onClick={pay}>
            Pay {formatINR(options.amount / 100)}
          </Button>
          <Button
            size="large"
            block
            danger
            disabled={paying}
            onClick={() =>
              finish({
                outcome: 'failed',
                error: {
                  code: 'BAD_REQUEST_ERROR',
                  description: 'Your bank declined the payment.',
                  reason: 'payment_failed',
                },
              })
            }
          >
            Simulate a failed payment
          </Button>
          <Button type="link" block disabled={paying} onClick={() => finish({ outcome: 'dismissed' })}>
            Close the window (cancel)
          </Button>
        </div>
      )}
    </Modal>
  );
}
