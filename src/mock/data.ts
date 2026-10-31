/**
 * Sample data for mock mode. Plans mirror backend/src/plans/catalog.js (labels,
 * coverage, eligibility) and the placeholder premiums in pricing.js.
 */
import type { Breed, CoverageRow, Owner, Pet } from '../api/types';

export const OWNER: Owner = {
  id: 31,
  name: 'Vivek Raj',
  email: 'vivek.raj@example.com',
  phone: '7299902447',
  city: 'Chennai',
  postalCode: '600030',
};

const pet = (p: Partial<Pet> & Pick<Pet, 'id' | 'slot' | 'name' | 'species'>): Pet => ({
  ownerId: OWNER.id,
  breed: null,
  dateOfBirth: null,
  ageYears: null,
  gender: null,
  weightKg: null,
  isNeutered: null,
  preExistingConditions: null,
  isCurrentlyInsured: null,
  vaccinationStatus: null,
  vaccinationExpiry: null,
  microchipNumber: null,
  photo: null,
  city: OWNER.city,
  owner: OWNER,
  ...p,
});

/** Matches the wireframes, plus Rocky (8 yrs) to show the "Not eligible" screen. */
export const PETS: Pet[] = [
  pet({
    id: 101,
    slot: 1,
    name: 'Abhimanyu',
    species: 'Dog',
    breed: 'Indian Mongrel',
    ageYears: 5, // age only, no date of birth: Plan step offers the exact DOB banner
    gender: 'Male',
    vaccinationStatus: 'Vaccinated',
    vaccinationExpiry: '2027-03-01',
    microchipNumber: '985112003456789',
  }),
  pet({
    id: 102,
    slot: 2,
    name: 'Bruno',
    species: 'Dog',
    breed: 'Labrador Retriever',
    dateOfBirth: '2023-04-12',
    ageYears: 3,
    gender: 'Male',
    vaccinationStatus: 'Vaccinated',
  }),
  pet({ id: 103, slot: 3, name: 'Misty', species: 'Cat', breed: null, ageYears: 1, gender: 'Female' }),
  pet({
    id: 104,
    slot: 4,
    name: 'Rocky',
    species: 'Dog',
    breed: 'Beagle',
    dateOfBirth: '2018-06-02',
    ageYears: 8,
    vaccinationStatus: 'Vaccinated',
    vaccinationExpiry: '2027-01-15',
  }),
];

/** Fifth pet for the "slots full" scenario. */
export const EXTRA_PET = pet({
  id: 105,
  slot: 5,
  name: 'Luna',
  species: 'Dog',
  breed: 'Shih Tzu',
  dateOfBirth: '2024-08-20',
  ageYears: 2,
  vaccinationStatus: 'Vaccinated',
  vaccinationExpiry: '2027-08-20',
});

export const GIANT_BREEDS = ['Great Dane', 'Saint Bernard', 'Mastiff', 'Newfoundland', 'Irish Wolfhound'];

export const BREEDS: Breed[] = [
  'Indian / mixed breed',
  'Indian Pariah',
  'Indian Mongrel',
  'Beagle',
  'Boxer',
  'Cocker Spaniel',
  'Dachshund',
  'Dalmatian',
  'Dobermann',
  'German Shepherd',
  'Golden Retriever',
  'Labrador Retriever',
  'Lhasa Apso',
  'Pomeranian',
  'Pug',
  'Rajapalayam',
  'Rottweiler',
  'Shih Tzu',
  'Siberian Husky',
  ...GIANT_BREEDS,
]
  .map((name): Breed => ({ name, species: 'Dog' }))
  .concat(
    ['Indian / mixed breed', 'Persian', 'Siamese', 'Maine Coon', 'Bengal'].map((name) => ({
      name,
      species: 'Cat' as const,
    })),
  );

// ------------------------------------------------------------------ plans

const COVERAGE_ITEMS: Omit<CoverageRow, 'covered' | 'display'>[] = [
  {
    key: 'hospitalization',
    label: 'Inpatient Hospitalization & Surgery',
    summary: 'Major operations or overnight stays at the clinic (IV drips, surgeon fees, ICU).',
  },
  {
    key: 'thirdPartyLiability',
    label: 'Third-Party Liability',
    summary: 'Legal fees and compensation if the dog bites someone or damages property.',
  },
  {
    key: 'stolenStraying',
    label: 'Stolen / Straying Cover',
    summary: 'Missing flyers, newspaper ads and reward money if the dog is lost or stolen.',
  },
  {
    key: 'prePostHospitalization',
    label: 'Pre & Post Hospitalization Expenses',
    summary: 'Tests before admission and recovery medicines after going home.',
  },
  { key: 'opdWallet', label: 'Open OPD Wallet', summary: 'Regular vet visits without an overnight stay.' },
  {
    key: 'advancedDiagnostics',
    label: 'Advanced Diagnostics (MRI / CT / ECHO)',
    summary: 'Expensive scans, even without an overnight stay.',
  },
  {
    key: 'physiotherapy',
    label: 'Physiotherapy & Rehab',
    summary: 'Water-treadmills, laser therapy and massages for joint issues.',
  },
  {
    key: 'dental',
    label: 'Dental Treatment',
    summary: 'Root canals and extractions (not cosmetic cleaning).',
  },
  {
    key: 'petMinding',
    label: 'Emergency Pet Minding',
    summary: 'Boarding kennel if the owner is hospitalised.',
  },
  {
    key: 'restoration',
    label: 'Restoration of Sum Insured',
    summary: 'Sum insured refilled after a large claim, for a different illness.',
  },
  { key: 'coPay', label: 'Standard Co-Pay', summary: 'The share of the bill the Pet Parent pays.' },
];

const NC = 'Not Covered';

export interface MockPlan {
  id: string;
  code: string;
  name: string;
  tagline: string;
  sumInsured: number;
  recommended: boolean;
  basePremium: number;
  eligibility: { minAgeMonths: number; maxAgeYears: number; waitingAboveYears?: number };
  coverage: Record<string, string>;
}

export const PLANS: MockPlan[] = [
  {
    id: 'plan-a',
    code: 'A',
    name: 'Plan A',
    tagline: 'The Entry Plan',
    sumInsured: 50000,
    recommended: false,
    basePremium: 1000,
    eligibility: { minAgeMonths: 6, maxAgeYears: 5 },
    coverage: {
      hospitalization: 'Up to ₹50,000',
      thirdPartyLiability: '₹5,00,000',
      stolenStraying: 'Up to ₹5,000',
      prePostHospitalization: '15 Days Pre / 30 Days Post',
      opdWallet: NC,
      advancedDiagnostics: NC,
      physiotherapy: NC,
      dental: NC,
      petMinding: NC,
      restoration: NC,
      coPay: '10%',
    },
  },
  {
    id: 'plan-b',
    code: 'B',
    name: 'Plan B',
    tagline: 'The Upgrade',
    sumInsured: 100000,
    recommended: false,
    basePremium: 2000,
    eligibility: { minAgeMonths: 6, maxAgeYears: 5 },
    coverage: {
      hospitalization: 'Up to ₹1 Lakh',
      thirdPartyLiability: '₹10,00,000',
      stolenStraying: 'Up to ₹10,000',
      prePostHospitalization: '15 Days Pre / 30 Days Post',
      opdWallet: 'Up to ₹10,000 (₹500 deductible per OPD visit)',
      advancedDiagnostics: NC,
      physiotherapy: NC,
      dental: NC,
      petMinding: NC,
      restoration: NC,
      coPay: '10%',
    },
  },
  {
    id: 'plan-c',
    code: 'C',
    name: 'Plan C',
    tagline: 'The Core Seller',
    sumInsured: 200000,
    recommended: true,
    basePremium: 3000,
    eligibility: { minAgeMonths: 6, maxAgeYears: 7, waitingAboveYears: 5 },
    coverage: {
      hospitalization: 'Up to ₹2 Lakhs',
      thirdPartyLiability: '₹10,00,000',
      stolenStraying: 'Up to ₹15,000',
      prePostHospitalization: '15 Days Pre / 30 Days Post',
      opdWallet: 'Up to ₹20,000 (₹500 deductible per OPD visit)',
      advancedDiagnostics: 'Up to ₹15,000',
      physiotherapy: 'Up to ₹10,000',
      dental: 'Up to ₹5,000',
      petMinding: 'Up to ₹10,000',
      restoration: '100% Refill (once per year, for illnesses other than the one claimed)',
      coPay: '10%',
    },
  },
];

export const coverageRows = (plan: MockPlan): CoverageRow[] =>
  COVERAGE_ITEMS.map((item) => ({
    ...item,
    covered: plan.coverage[item.key] !== NC,
    display: plan.coverage[item.key],
  }));

export const GST_PERCENT = 18;

export const DISCLAIMERS = [
  'Not every condition of claim is covered. Please go through the detailed coverage document / policy wording for a full understanding of what is and is not covered.',
  'Please read the policy document for details of the General Exclusions of the policy.',
];
