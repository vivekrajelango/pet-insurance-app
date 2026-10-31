import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Upload } from 'antd';
import { CameraOutlined, SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ApiError } from '../api/client';
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

// TODO: use the exact options of the WordPress "Vaccination status" profile field.
const VACCINATION_OPTIONS = ['Vaccinated', 'Partially vaccinated', 'Not vaccinated'].map((v) => ({
  value: v,
  label: v,
}));

/** Always offered, whatever the Breed Library returns. */
const MIXED_BREED = 'Indian / mixed breed';

const DATE_FORMAT = 'DD/MM/YYYY';
const MAX_PHOTO_MB = 5;

/**
 * Step 1b — add a pet; it is saved to the member's Petzadore profile
 * (first empty BuddyPress pet slot) and then used for the quote.
 * `firstPet`: the profile has no pets, so there is nothing to go back to.
 *
 * Depends on POST /v1/pets + a plugin write route and GET /v1/breeds, which are
 * not built yet (mock mode has them). Without the Breed Library, breed is free text.
 */
export function AddPetStep({ firstPet }: { firstPet?: boolean }) {
  const { api, dispatch } = useApp();
  const [form] = Form.useForm<FormValues>();
  const species = Form.useWatch('species', form) ?? 'Dog';
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pets, loading: petsLoading } = usePets();
  const breeds = useAsync((signal) => api.getBreeds(signal).then((r) => r.breeds), 'breeds');

  const used = new Set(pets.map((p) => p.slot));
  const slot = petsLoading
    ? undefined
    : Array.from({ length: MAX_PETS }, (_, i) => i + 1).find((s) => !used.has(s));
  const breedOptions = [
    MIXED_BREED,
    ...(breeds.data ?? []).filter((b) => b.species === species && b.name !== MIXED_BREED).map((b) => b.name),
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
      photo: photo ?? undefined,
    };
    try {
      const { pet } = await api.createPet(input);
      dispatch({ type: 'petSaved', petId: pet.id });
    } catch (err) {
      if (err instanceof ApiError && err.isSessionEnded) return;
      setError(
        err instanceof ApiError && err.status === 404
          ? 'Saving new pets isn’t available yet. Please add the pet on your Petzadore profile for now.'
          : (err as Error).message,
      );
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
          <Card>
            <div className={styles.cardTitle}>
              Photo <span className={styles.optional}>(optional)</span>
            </div>
            <PhotoUpload photo={photo} onChange={setPhoto} />
          </Card>
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
            <Select placeholder="Select" options={VACCINATION_OPTIONS} />
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

/** Picks an image and keeps it as a data URL (no upload until the write route exists). */
function PhotoUpload({
  photo,
  onChange,
}: {
  photo: string | null;
  onChange: (photo: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  if (photo) {
    return (
      <div className={styles.preview}>
        <img src={photo} alt="Your pet" />
        <Button type="link" onClick={() => onChange(null)}>
          Remove photo
        </Button>
      </div>
    );
  }

  return (
    <>
      <Upload.Dragger
        accept="image/*"
        showUploadList={false}
        className={styles.dropzone}
        beforeUpload={(file) => {
          if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
            setError(`Choose a photo under ${MAX_PHOTO_MB} MB.`);
            return Upload.LIST_IGNORE;
          }
          setError(null);
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result as string);
          reader.readAsDataURL(file);
          return Upload.LIST_IGNORE;
        }}
      >
        <span className={styles.dropzoneText}>
          <CameraOutlined className={styles.camera} aria-hidden />
          <span className="pzi-mobile-only">Upload a photo</span>
          <span className="pzi-desktop-only">Drop a photo or click to upload</span>
        </span>
      </Upload.Dragger>
      {error && <Alert type="error" showIcon title={error} className={styles.photoError} />}
    </>
  );
}
