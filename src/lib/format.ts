import type { Owner, Pet } from '../api/types';
import type { ContactDetails } from '../state/wizard';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹2,00,000 */
export const formatINR = (amount: number) => inr.format(amount);

/** "Dog · Indian Mongrel · 5 yrs" ("Dog · 5 yrs" without the breed) */
export function petSummary(
  pet: Pick<Pet, 'species' | 'breed' | 'ageYears'>,
  { breed = true }: { breed?: boolean } = {},
): string {
  const age =
    pet.ageYears == null
      ? null
      : pet.ageYears === 1
        ? '1 yr'
        : pet.ageYears === 0
          ? 'under 1 yr'
          : `${pet.ageYears} yrs`;
  return [pet.species, breed && pet.breed, age].filter(Boolean).join(' · ');
}

/** 7299902447 → 72999 02447 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

/** BuddyPress has five pet slots (Pet1–Pet5). */
export const MAX_PETS = 5;

export const isCat = (pet: Pick<Pet, 'species'>) => pet.species?.toLowerCase() === 'cat';

/** Policy holder contact: the member's edits on Step 3, else the profile. */
export function contactOf(owner: Owner, edited: ContactDetails | null, fallbackName: string): ContactDetails {
  const c = edited ?? owner;
  return {
    name: c.name || fallbackName,
    phone: c.phone,
    email: c.email,
    city: c.city,
    postalCode: c.postalCode,
  };
}
