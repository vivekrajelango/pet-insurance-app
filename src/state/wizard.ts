/**
 * Wizard state for the Get Insurance flow (see the flow & wireframes canvas):
 *   pet → (addPet) → plan → details → review → done
 *
 * Kept in sessionStorage per WordPress user, so a page refresh or a re-login
 * brings the member back to the same step.
 */

import type { Owner } from '../api/types';

export type StepKey = 'pet' | 'addPet' | 'plan' | 'details' | 'review' | 'done';

/** Step 3 answers. Field list still to be confirmed (see DetailsStep). */
export type DetailsAnswers = Record<string, string | number | boolean | null>;

/** Policy holder contact, pre-filled from the profile and editable on Step 3. */
export type ContactDetails = Pick<Owner, 'name' | 'phone' | 'email' | 'city' | 'postalCode'>;

export interface WizardState {
  step: StepKey;
  petId: number | null;
  /** Exact date of birth the member confirmed on the plan step (YYYY-MM-DD) */
  dateOfBirth: string | null;
  planId: string | null;
  details: DetailsAnswers;
  /** Member's edits to the profile contact (null = use the profile as is) */
  contact: ContactDetails | null;
  /** Set once payment starts, so a refresh can resume / show the result */
  orderId: string | null;
}

export type WizardAction =
  | { type: 'selectPet'; petId: number }
  | { type: 'addPet' }
  | { type: 'petSaved'; petId: number }
  | { type: 'setDateOfBirth'; dateOfBirth: string | null }
  | { type: 'selectPlan'; planId: string }
  | { type: 'saveDetails'; details: DetailsAnswers }
  | { type: 'saveContact'; contact: ContactDetails }
  | { type: 'orderStarted'; orderId: string }
  | { type: 'paid' }
  | { type: 'goTo'; step: StepKey }
  | { type: 'back' }
  | { type: 'restart' };

export const initialState: WizardState = {
  step: 'pet',
  petId: null,
  dateOfBirth: null,
  planId: null,
  details: {},
  contact: null,
  orderId: null,
};

const BACK: Record<StepKey, StepKey> = {
  pet: 'pet',
  addPet: 'pet',
  plan: 'pet',
  details: 'plan',
  review: 'details',
  done: 'done',
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'selectPet':
      // A different pet invalidates the plan choice and any order in progress (details and contact stay).
      return action.petId === state.petId
        ? { ...state, step: 'plan' }
        : {
            ...initialState,
            details: state.details,
            contact: state.contact,
            petId: action.petId,
            step: 'plan',
          };
    case 'addPet':
      return { ...state, step: 'addPet' };
    case 'petSaved':
      return {
        ...initialState,
        details: state.details,
        contact: state.contact,
        petId: action.petId,
        step: 'plan',
      };
    case 'setDateOfBirth':
      return { ...state, dateOfBirth: action.dateOfBirth, planId: null, orderId: null };
    case 'selectPlan':
      // Changing plan keeps the details already typed.
      return { ...state, planId: action.planId, orderId: null, step: 'details' };
    case 'saveDetails':
      return { ...state, details: action.details, step: 'review' };
    case 'saveContact':
      return { ...state, contact: action.contact };
    case 'orderStarted':
      return { ...state, orderId: action.orderId };
    case 'paid':
      return { ...state, step: 'done' };
    case 'goTo':
      return { ...state, step: action.step };
    case 'back':
      return { ...state, step: BACK[state.step] };
    case 'restart':
      return initialState;
  }
}

/** Progress bar position (Pet · Plan · Details · Pay) for each step. */
export const PROGRESS: Record<StepKey, number> = {
  pet: 0,
  addPet: 0,
  plan: 1,
  details: 2,
  review: 3,
  done: 4,
};

// ------------------------------------------------------------------ persistence

const storageKey = (userId: number) => `pzi:wizard:v1:${userId}`;

export function loadState(userId: number): WizardState {
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<WizardState>;
    return { ...initialState, ...saved };
  } catch {
    return initialState;
  }
}

export function saveState(userId: number, state: WizardState) {
  try {
    if (state.step === 'done') window.sessionStorage.removeItem(storageKey(userId));
    else window.sessionStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // storage blocked (private mode etc.): the flow still works, it just won't survive a refresh
  }
}
