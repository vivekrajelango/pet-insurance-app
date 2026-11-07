import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ApiError, userMessage } from '../api/client';
import type { NewPetInput } from '../api/types';
import { AppShell } from '../components/AppShell';
import { useAsync } from '../hooks/useAsync';
import { usePets } from '../hooks/usePets';
import { MAX_PETS } from '../lib/format';
import { useApp } from '../state/AppContext';
import styles from './AddPetStep.module.css';

interface FormValues {
  name: string;
  species: 'Dog' | 'Cat';
  breed: string;
  dateOfBirth?: Dayjs;
  ageYears?: number;
  vaccinationStatus?: string;
  vaccinationExpiry?: Dayjs;
  microchipNumber?: string;
}

/** Used until GET /v1/pets/form-options answers, or if the profile field has no choices. */
const FALLBACK_VACCINATION = ['Vaccinated', 'Partially vaccinated', 'Not vaccinated'];

/** Always offered, whatever the Breed Library returns. */
const MIXED_BREED = 'Indian / mixed breed';

const DATE_FORMAT = 'DD/MM/YYYY';

/**
 * Step 1b — add a pet; it is saved to the member's Petzadore profile
 * (first empty BuddyPress pet slot) and then used for the quote.
 * `firstPet`: the profile has no pets, so there is nothing to go back to.
 *
 * Choices come from GET /v1/pets/form-options and the Breed Library (GET /v1/breeds).
 * Without the Breed Library, breed is free text.
 */
export function AddPetStep({ firstPet }: { firstPet?: boolean }) {
  const { api, dispatch } = useApp();
  const [form] = Form.useForm<FormValues>();
  const species = Form.useWatch('species', form) ?? 'Dog';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pets, loading: petsLoading } = usePets();
  // The library filtered by species; reloads when Dog / Cat changes (the backend caches it).
  const breeds = useAsync(
    (signal) => api.getBreeds({ species: species === 'Cat' ? 'cat' : 'dog' }, signal).then((r) => r.breeds),
    `breeds:${species}`,
  );
  const formOptions = useAsync((signal) => api.getPetFormOptions(signal), 'pet-form-options');
  const vaccinationOptions = (formOptions.data?.vaccinationStatus ?? FALLBACK_VACCINATION).map((v) => ({
    value: v,
    label: v,
  }));

  const used = new Set(pets.map((p) => p.slot));
  const slot = petsLoading
    ? undefined
    : Array.from({ length: MAX_PETS }, (_, i) => i + 1).find((s) => !used.has(s));
  const breedOptions = [
    MIXED_BREED,
    ...(breeds.data ?? []).filter((b) => b.name !== MIXED_BREED).map((b) => b.name),
  ].map((name) => ({ value: name, label: name }));

  async function onFinish(values: FormValues) {
    setSaving(true);
    setError(null);
    const input: NewPetInput = {
      name: values.name.trim(),
      species: values.species,
      breed: values.breed.trim(),
      dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
      ageYears: values.dateOfBirth ? undefined : values.ageYears,
      vaccinationStatus: values.vaccinationStatus,
      vaccinationExpiry: values.vaccinationExpiry?.format('YYYY-MM-DD'),
      microchipNumber: values.microchipNumber?.trim() || undefined,
    };
    try {
      const { pet, skipped } = await api.createPet(input);
      // The profile may have no "Date of birth" field yet (only Age): keep the exact date
      // for plan matching anyway.
      const dateOfBirth = skipped.includes('dateOfBirth') ? (input.dateOfBirth ?? null) : null;
      dispatch({ type: 'petSaved', petId: pet.id, dateOfBirth });
    } catch (err) {
      if (err instanceof ApiError && err.isSessionEnded) return;
      setError(saveErrorMessage(err));
      setSaving(false);
    }
  }

  const slotNote = slot ? `Saved to Pet slot ${slot} on your profile` : 'Saved to your profile';
  const saveButton = (
    <Button type="primary" shape="round" size="large" loading={saving} onClick={() => form.submit()}>
      Save pet &amp; see plans
    </Button>
  );

  return (
    <AppShell
      eyebrow={firstPet ? 'Pet insurance' : undefined}
      back={!firstPet}
      backLabel="Back to my pets"
      title="Tell us about your pet"
      subtitle={
        <span className="pzi-mobile-only">
          We’ll save this to your Petzadore profile too, so you only enter it once.
        </span>
      }
      aside={
        <>
          <Card className="pzi-desktop-only">
            <div className={styles.cardTitle}>Saved to your profile</div>
            <p className={styles.infoText}>
              This pet goes into {slot ? `Pet slot ${slot}` : 'a free pet slot'} on your Petzadore profile, so
              you only enter it once. Date of birth gives the most accurate plan eligibility.
            </p>
          </Card>
        </>
      }
      actions={
        <>
          {saveButton}
          <span className={styles.slotNote}>{slotNote}</span>
        </>
      }
      actionsMobileOnly
    >
      <Card>
        <Form<FormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ species: 'Dog' }}
          // A breed from the other species' list no longer fits.
          onValuesChange={(changed) => {
            if ('species' in changed) form.setFieldValue('breed', undefined);
          }}
          onFinish={onFinish}
          className={styles.form}
        >
          <Form.Item
            name="name"
            label="Pet’s name"
            rules={[{ required: true, whitespace: true, message: 'Enter your pet’s name' }]}
          >
            <Input placeholder="e.g. Bruno" maxLength={60} />
          </Form.Item>

          <Form.Item name="species" label="Type" rules={[{ required: true }]}>
            <TypeToggle />
          </Form.Item>

          <Form.Item
            name="breed"
            label="Breed"
            className={styles.full}
            extra={`From the Petzadore Breed Library. “${MIXED_BREED}” always available.`}
            rules={[{ required: true, whitespace: true, message: 'Choose the breed' }]}
          >
            {breeds.error ? (
              <Input placeholder="e.g. Labrador" maxLength={80} />
            ) : (
              <Select
                showSearch
                placeholder="Search breed"
                options={breedOptions}
                filterSort={byMatch}
                loading={breeds.loading}
                suffixIcon={<SearchOutlined />}
                notFoundContent={`No match. Try “${MIXED_BREED}”.`}
              />
            )}
          </Form.Item>

          <Form.Item
            name="dateOfBirth"
            label="Date of birth"
            dependencies={['ageYears']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value || getFieldValue('ageYears') != null
                    ? Promise.resolve()
                    : Promise.reject(new Error('Enter a date of birth or an age')),
              }),
            ]}
          >
            <DatePicker
              format={DATE_FORMAT}
              placeholder="DD / MM / YYYY"
              disabledDate={(d) => d.isAfter(dayjs(), 'day') || d.isBefore(dayjs().subtract(25, 'year'))}
              className={styles.wide}
            />
          </Form.Item>

          <Form.Item name="ageYears" label="or Age (years)">
            <InputNumber min={0} max={25} precision={0} placeholder="e.g. 3" style={{ width: '100%' }} />
          </Form.Item>

          <p className={`${styles.full} ${styles.hint}`}>
            Date of birth gives the most accurate plan eligibility.
          </p>

          <Form.Item
            name="vaccinationStatus"
            label="Vaccination status"
            rules={[{ required: true, message: 'Choose the vaccination status' }]}
          >
            <Select placeholder="Select" options={vaccinationOptions} loading={formOptions.loading} />
          </Form.Item>

          <Form.Item
            name="vaccinationExpiry"
            label="Vaccination expiry date"
            rules={[{ required: true, message: 'Enter the vaccination expiry date' }]}
          >
            <DatePicker format={DATE_FORMAT} placeholder="DD / MM / YYYY" className={styles.wide} />
          </Form.Item>

          <Form.Item
            name="microchipNumber"
            label={
              <>
                Microchip number&nbsp;<span className={styles.optional}>(optional)</span>
              </>
            }
            className={styles.full}
            rules={[{ pattern: /^\d{15}$/, message: 'Microchip numbers have 15 digits' }]}
          >
            <Input inputMode="numeric" placeholder="15 digits" maxLength={15} />
          </Form.Item>

          {error && <Alert type="error" showIcon title={error} className={styles.full} />}

          <div className={`${styles.full} ${styles.actions} pzi-desktop-only`}>
            {!firstPet && (
              <Button
                color="primary"
                variant="outlined"
                shape="round"
                size="large"
                onClick={() => dispatch({ type: 'back' })}
              >
                Cancel
              </Button>
            )}
            {saveButton}
          </div>
        </Form>
      </Card>
    </AppShell>
  );
}

/** While searching: names starting with the text first (like GET /v1/breeds?q=), then A–Z. */
function byMatch(a: { label: string }, b: { label: string }, { searchValue }: { searchValue: string }) {
  const q = searchValue.trim().toLowerCase();
  if (!q) return 0; // not searching: keep the list order ("Indian / mixed breed" first)
  const rank = (label: string) => (label.toLowerCase().startsWith(q) ? 0 : 1);
  return rank(a.label) - rank(b.label) || a.label.localeCompare(b.label);
}

function saveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'PET_SLOTS_FULL') {
      return `All ${MAX_PETS} pet slots on your profile are in use. Remove a pet on your Petzadore profile to add another.`;
    }
  }
  return userMessage(err);
}

/** Dog / Cat buttons (a Form.Item control: gets value + onChange). */
function TypeToggle({
  value,
  onChange,
}: {
  value?: FormValues['species'];
  onChange?: (v: FormValues['species']) => void;
}) {
  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Type">
      {(['Dog', 'Cat'] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={value === option ? styles.toggleOn : styles.toggleOff}
          onClick={() => onChange?.(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
