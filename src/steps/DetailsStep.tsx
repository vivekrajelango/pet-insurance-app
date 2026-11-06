import { useState } from 'react';
import { Alert, Button, Card, Form, Input } from 'antd';
import { ApiError } from '../api/client';
import type { OwnerUpdate } from '../api/types';
import { AppShell } from '../components/AppShell';
import { OrderSummary } from '../components/OrderSummary';
import { Redirect } from '../components/Redirect';
import { ErrorPanel, Loading } from '../components/StatusScreens';
import { useQuote } from '../hooks/useQuote';
import { contactOf, formatPhone } from '../lib/format';
import { useApp } from '../state/AppContext';
import type { ContactDetails, DetailsAnswers } from '../state/wizard';
import styles from './DetailsStep.module.css';

/**
 * Step 3 — details the insurer needs.
 *
 * FIELDS TO BE CONFIRMED (Anjana): replace the placeholders in the
 * "Details for the insurer" box with <Form.Item>s. Their values land in
 * state.details and are shown on the Review step. The backend's POST /v1/orders
 * doesn't accept them yet: extend its body schema when the field list is final.
 * Candidates the backend can already accept: gender, neutered/spayed,
 * pre-existing conditions, already insured elsewhere.
 */
export function DetailsStep() {
  const { api, config, state, dispatch } = useApp();
  const quote = useQuote();
  const [form] = Form.useForm<DetailsAnswers>();
  const [editingContact, setEditingContact] = useState(false);

  if (quote.loading) return <Loading />;
  if (quote.error) return <ErrorPanel error={quote.error} onRetry={quote.reload} />;
  const { pet, plan, owner } = quote.data!;
  // Pet removed from the profile, or the plan no longer fits: go back and choose again.
  if (!pet || !plan) return <Redirect to={pet ? 'plan' : 'pet'} />;
  const contact = contactOf(owner ?? pet.owner, state.contact, config.user.name);

  const reviewButton = (
    <Button
      type="primary"
      shape="round"
      size="large"
      block
      disabled={editingContact}
      onClick={() => form.submit()}
    >
      Review order
    </Button>
  );

  return (
    <AppShell
      back
      title="A few more details"
      subtitle={`The insurer needs these to issue ${pet.name ?? 'your pet'}’s policy.`}
      aside={
        <div className="pzi-desktop-only">
          <OrderSummary pet={pet} plan={plan}>
            {reviewButton}
          </OrderSummary>
        </div>
      }
      actions={reviewButton}
      actionsMobileOnly
    >
      <Card>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Your contact details</span>
          {!editingContact && (
            <Button
              color="primary"
              variant="outlined"
              shape="round"
              size="small"
              onClick={() => setEditingContact(true)}
              className={styles.edit}
            >
              Edit
            </Button>
          )}
        </div>
        {editingContact ? (
          <ContactForm
            initial={contact}
            onCancel={() => setEditingContact(false)}
            onSave={async (c) => {
              // Phone, city and PIN code go to the profile; name and email are for this policy only.
              const changes = profileChanges(contact, c);
              if (Object.keys(changes).length) await api.updateMyProfile(changes);
              dispatch({ type: 'saveContact', contact: c });
              setEditingContact(false);
            }}
          />
        ) : (
          <>
            <dl className={styles.contact}>
              <div>
                <dt>Name</dt>
                <dd>{contact.name}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {formatPhone(contact.phone) || (
                    <span className={styles.missing}>Missing — please add it</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{contact.email ?? 'From your account'}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{contact.city ?? '—'}</dd>
              </div>
              <div>
                <dt>PIN code</dt>
                <dd>{contact.postalCode ?? '—'}</dd>
              </div>
            </dl>
            <p className={styles.hint}>
              {state.contact
                ? 'Updated. Phone, city and PIN code are saved to your Petzadore profile too.'
                : 'Pre-filled from your Petzadore profile.'}
            </p>
          </>
        )}
      </Card>

      <div className={styles.insurer}>
        <div className={styles.insurerHead}>
          <span className={styles.cardTitle}>Details for the insurer</span>
          <span className={styles.tbc}>Fields to be confirmed by Anjana</span>
        </div>
        <Form<DetailsAnswers>
          form={form}
          layout="vertical"
          initialValues={state.details}
          onFinish={(details) => dispatch({ type: 'saveDetails', details: details ?? {} })}
          className={styles.placeholders}
        >
          {/* TODO: insurer fields go here once the list is confirmed. */}
          {['[Detail 1]', '[Detail 2]', '[Detail 3]', '[Yes / No declaration]'].map((p) => (
            <div key={p} className={styles.placeholder}>
              {p}
            </div>
          ))}
          <div className={`${styles.placeholder} ${styles.placeholderWide}`}>
            [Free-text detail, if needed]
          </div>
        </Form>
        <p className={styles.hint}>
          Candidates the backend already accepts: gender, neutered/spayed, pre-existing conditions, already
          insured elsewhere.
        </p>
      </div>
    </AppShell>
  );
}

/** The profile fields (PATCH /v1/me/profile) that differ from what is shown now. */
function profileChanges(current: ContactDetails, next: ContactDetails): OwnerUpdate {
  const digits = (phone: string | null) => phone?.replace(/\D/g, '').slice(-10) ?? null;
  const changes: OwnerUpdate = {};
  if (next.phone && digits(next.phone) !== digits(current.phone)) changes.phone = next.phone;
  if (next.city && next.city !== current.city) changes.city = next.city;
  if (next.postalCode && next.postalCode !== current.postalCode) changes.postalCode = next.postalCode;
  return changes;
}

function ContactForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ContactDetails;
  /** Rejects when the profile couldn't be updated; the form stays open with the error. */
  onSave: (contact: ContactDetails) => Promise<void>;
  onCancel: () => void;
}) {
  const [form] = Form.useForm<ContactDetails>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(contact: ContactDetails) {
    setSaving(true);
    setError(null);
    try {
      await onSave(contact);
    } catch (err) {
      if (err instanceof ApiError && err.isSessionEnded) return;
      setError(
        err instanceof ApiError && err.code === 'VALIDATION_ERROR'
          ? 'Your profile didn’t accept these details. Check the phone number and PIN code.'
          : (err as Error).message,
      );
      setSaving(false);
    }
  }

  return (
    <Form<ContactDetails>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={{ ...initial, phone: initial.phone?.replace(/\D/g, '').slice(-10) }}
      onFinish={(v) =>
        save({
          name: v.name?.trim() || null,
          phone: v.phone?.trim() || null,
          email: v.email?.trim() || null,
          city: v.city?.trim() || null,
          postalCode: v.postalCode?.trim() || null,
        })
      }
      className={styles.contactForm}
    >
      <Form.Item
        name="name"
        label="Name"
        rules={[{ required: true, whitespace: true, message: 'Enter your name' }]}
      >
        <Input autoComplete="name" />
      </Form.Item>
      <Form.Item
        name="phone"
        label="Phone"
        rules={[
          { required: true, message: 'Enter your phone number' },
          { pattern: /^[6-9]\d{9}$/, message: 'Enter a 10-digit mobile number' },
        ]}
      >
        <Input inputMode="tel" autoComplete="tel-national" maxLength={10} prefix="+91" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
        <Input inputMode="email" autoComplete="email" />
      </Form.Item>
      <Form.Item
        name="city"
        label="City"
        rules={[{ required: true, whitespace: true, message: 'Enter your city' }]}
      >
        <Input autoComplete="address-level2" />
      </Form.Item>
      <Form.Item
        name="postalCode"
        label="PIN code"
        rules={[
          { required: true, message: 'Enter your PIN code' },
          { pattern: /^\d{6}$/, message: 'PIN codes have 6 digits' },
        ]}
      >
        <Input inputMode="numeric" autoComplete="postal-code" maxLength={6} />
      </Form.Item>
      {error && <Alert type="error" showIcon title={error} />}
      <div className={styles.contactActions}>
        <Button shape="round" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="primary" shape="round" htmlType="submit" loading={saving}>
          Save
        </Button>
      </div>
    </Form>
  );
}
