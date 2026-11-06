import { useState } from 'react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import type { Pet } from '../api/types';
import { AppShell } from '../components/AppShell';
import { PetAvatar } from '../components/PetAvatar';
import { ErrorPanel, Loading } from '../components/StatusScreens';
import { usePets } from '../hooks/usePets';
import { MAX_PETS, isCat, petSummary } from '../lib/format';
import { useApp } from '../state/AppContext';
import { AddPetStep } from './AddPetStep';
import styles from './PetSelectStep.module.css';

/** Step 1 — choose one of the pets on the member's profile, or add one. */
export function PetSelectStep() {
  const { config, state, dispatch } = useApp();
  const { pets, loading, error, reload } = usePets();
  const [chosenId, setChosenId] = useState<number | null>(state.petId);

  if (loading) return <Loading label="Loading your pets…" />;
  if (error) return <ErrorPanel title="We couldn’t load your pets" error={error} onRetry={reload} />;
  // No pets yet: straight to the Add pet form.
  if (pets.length === 0) return <AddPetStep firstPet />;

  const insurable = pets.filter((p) => !isCat(p));
  // Pre-select the saved choice, else the first pet we can cover.
  const selected = insurable.find((p) => p.id === chosenId) ?? (chosenId === null ? insurable[0] : undefined);
  const firstName = config.user.name.split(' ')[0];
  const slotsFull = pets.length >= MAX_PETS;

  return (
    <AppShell
      eyebrow="Pet insurance"
      title="Which pet are we insuring?"
      subtitle={
        <>
          These are the pets on your Petzadore profile, {firstName}.
          <span className="pzi-desktop-only"> New pets you add are saved to your profile too.</span>
        </>
      }
      actions={
        <Button
          type="primary"
          shape="round"
          size="large"
          disabled={!selected}
          onClick={() => selected && dispatch({ type: 'selectPet', petId: selected.id })}
        >
          {selected ? `See plans for ${selected.name ?? 'your pet'}` : 'Choose a pet'}
        </Button>
      }
    >
      <ul className={styles.grid} aria-label="Your pets">
        {pets.map((pet) => (
          <li key={pet.id}>
            <PetCard pet={pet} selected={pet.id === selected?.id} onSelect={() => setChosenId(pet.id)} />
          </li>
        ))}
        {!slotsFull && (
          <li>
            <button type="button" className={styles.addCard} onClick={() => dispatch({ type: 'addPet' })}>
              <span className={styles.addIcon} aria-hidden>
                <PlusOutlined />
              </span>
              <span className={styles.addTitle}>Add another pet</span>
              <span className={styles.addHint}>Up to {MAX_PETS} pets on your profile</span>
            </button>
          </li>
        )}
      </ul>

      {slotsFull ? (
        <SlotsFull profileUrl={config.profileUrl} />
      ) : (
        <p className={`${styles.note} pzi-mobile-only`}>
          New pets are also saved to your Petzadore profile. You can add up to {MAX_PETS} pets.
        </p>
      )}
    </AppShell>
  );
}

function PetCard({ pet, selected, onSelect }: { pet: Pet; selected: boolean; onSelect: () => void }) {
  const cat = isCat(pet);
  const missingAge = pet.ageYears == null && !pet.dateOfBirth;
  const status = cat
    ? { text: 'Cat cover coming soon', tone: styles.muted }
    : missingAge
      ? { text: 'Missing: age', tone: styles.warn }
      : !pet.vaccinationExpiry
        ? { text: 'Missing: vaccination expiry', tone: styles.warn }
        : {
            // No status on the profile: show the expiry instead of an empty line.
            text:
              [pet.vaccinationStatus, pet.microchipNumber && 'Microchipped'].filter(Boolean).join(' · ') ||
              `Vaccination valid till ${dayjs(pet.vaccinationExpiry).format('D MMM YYYY')}`,
            tone: styles.ok,
          };

  return (
    <button
      type="button"
      className={[styles.card, selected ? styles.selected : '', cat ? styles.disabled : ''].join(' ')}
      onClick={onSelect}
      disabled={cat}
      aria-pressed={selected}
    >
      <PetAvatar pet={pet} shape="rounded" className={styles.photo} />
      <span className={styles.cardBody}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{pet.name ?? 'Unnamed pet'}</span>
          {selected && <CheckCircleFilled className={styles.check} aria-hidden />}
        </span>
        <span className={styles.summary}>{petSummary(pet)}</span>
        {status.text && <span className={status.tone}>{status.text}</span>}
      </span>
    </button>
  );
}

function SlotsFull({ profileUrl }: { profileUrl?: string }) {
  return (
    <div className={styles.full}>
      <strong>Your profile has {MAX_PETS} pets</strong>
      <span>That’s the maximum. Edit or remove a pet on your profile to add a new one.</span>
      {profileUrl && (
        <a href={profileUrl} className={styles.fullLink}>
          Open my profile
        </a>
      )}
    </div>
  );
}
