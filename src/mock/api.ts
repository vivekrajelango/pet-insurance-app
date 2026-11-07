/**
 * In-browser stand-in for the backend: same function signatures as
 * api/endpoints.ts, answers from mock/data.ts after a short delay.
 * Pets and orders are kept in sessionStorage so a refresh keeps them.
 */
import dayjs, { type Dayjs } from 'dayjs';
import { ApiError } from '../api/client';
import type { Endpoints } from '../api/endpoints';
import type {
  CheckoutResponse,
  IneligiblePlan,
  MatchResult,
  NewPetInput,
  NotificationPreferences,
  Order,
  Owner,
  Pet,
  Plan,
  PlanCondition,
} from '../api/types';
import {
  BREEDS,
  DISCLAIMERS,
  FORM_OPTIONS,
  EXTRA_PET,
  GIANT_BREEDS,
  GST_PERCENT,
  OWNER,
  PETS,
  PLANS,
  coverageRows,
  type MockPlan,
} from './data';
import type { Scenario } from './scenario';

const STORE_KEY = 'pzi:mock:v1';
const MAX_SLOTS = 5;

interface MockOrder extends Order {
  /** GET polls left before a "processing" order turns "paid" (-1 = never) */
  pollsUntilPaid: number;
}

interface Store {
  pets: Pet[];
  orders: Record<string, MockOrder>;
  /** Contact details saved with PATCH /v1/me/profile (missing in stores saved before it existed) */
  owner?: Owner;
  /** Notification opt-ins and registered push endpoints (same caveat) */
  preferences?: NotificationPreferences;
  pushEndpoints?: string[];
}

/** Like the backend: every channel on until the member opts out. */
const DEFAULT_PREFERENCES: NotificationPreferences = { email: true, sms: true, whatsapp: true, push: true };

/** Same rule as the backend: Indian mobile, +91 optional. */
const INDIAN_MOBILE = /^(\+?91[\s-]?|0)?[6-9](?:[\s-]?[0-9]){9}$/;

/** Like staging: the profile stores dates as "YYYY-MM-DD 00:00:00". */
const profileDate = (date?: string) => (date ? `${date} 00:00:00` : null);

function initialPets(scenario: Scenario): Pet[] {
  if (scenario === 'noPets') return [];
  if (scenario === 'slotsFull') return [...PETS, EXTRA_PET];
  return PETS;
}

function loadStore(scenario: Scenario): Store {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // fall through to fresh data
  }
  return { pets: initialPets(scenario), orders: {} };
}

/** Resolves after `ms`, or rejects like fetch does when the request is aborted. */
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

const randomId = (length: number, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') =>
  Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

function quote(plan: MockPlan) {
  const gst = Math.round((plan.basePremium * GST_PERCENT) / 100);
  return { base: plan.basePremium, gst, total: plan.basePremium + gst };
}

// ------------------------------------------------------------------ eligibility

/** Simplified port of backend/src/plans/eligibility.js ("last birthday" ages). */
function matchPlans(pet: Pet, dateOfBirth?: string): MatchResult {
  const base = { petId: pet.id, petName: pet.name, disclaimers: DISCLAIMERS };
  const species = pet.species?.toLowerCase();
  const today = dayjs();

  let birth: Dayjs | null = dateOfBirth
    ? dayjs(dateOfBirth)
    : pet.dateOfBirth
      ? dayjs(pet.dateOfBirth)
      : null;
  let ageIsApproximate = false;
  if (!birth && pet.ageYears && pet.ageYears > 0) {
    birth = today.subtract(pet.ageYears, 'year');
    ageIsApproximate = true;
  }
  const missing = [!species && 'species', !birth && 'dateOfBirth'].filter((m): m is string => !!m);
  if (!species || !birth) {
    return { ...base, status: 'incomplete', missing, pet: null, plans: [], ineligiblePlans: [] };
  }

  const months = today.diff(birth, 'month');
  const years = Math.floor(months / 12);
  const isGiantBreed = species === 'dog' && GIANT_BREEDS.includes(pet.breed ?? '');
  const plans: Plan[] = [];
  const ineligiblePlans: IneligiblePlan[] = [];

  for (const plan of PLANS) {
    const rule = plan.eligibility;
    const reasons: IneligiblePlan['reasons'] = [];
    if (species !== 'dog') {
      reasons.push({ code: 'SPECIES_NOT_COVERED', message: `${plan.name} is available for dogs only.` });
    }
    if (months < rule.minAgeMonths) {
      reasons.push({
        code: 'TOO_YOUNG',
        message: `${plan.name} is available from ${rule.minAgeMonths} months of age.`,
      });
    }
    if (years > rule.maxAgeYears) {
      reasons.push({
        code: 'TOO_OLD',
        message: `${plan.name} accepts new pets up to ${rule.maxAgeYears} years of age.`,
      });
    }
    if (isGiantBreed && months > 48 && !pet.isCurrentlyInsured) {
      reasons.push({
        code: 'GIANT_BREED_AGE',
        message: 'Giant breeds older than 4 years can only be covered if they are already insured.',
      });
    }
    if (reasons.length) {
      ineligiblePlans.push({ id: plan.id, name: plan.name, reasons });
      continue;
    }

    const conditions: PlanCondition[] =
      rule.waitingAboveYears !== undefined && years > rule.waitingAboveYears
        ? [
            {
              code: 'WAITING_PERIOD',
              days: 90,
              message:
                '90-day waiting period applies (except for accidental hospitalisation) because the pet is older than 5 years.',
            },
          ]
        : [];
    plans.push(planView(plan, conditions));
  }

  return {
    ...base,
    status: plans.length ? 'eligible' : 'none',
    missing: [],
    pet: {
      species: species as 'dog' | 'cat',
      ageMonths: months,
      ageYears: years,
      ageIsApproximate,
      isGiantBreed,
    },
    plans,
    ineligiblePlans,
  };
}

/** A plan as the backend shows it (premium, coverage rows), with any conditions for the pet. */
function planView(plan: MockPlan, conditions: PlanCondition[] = []): Plan {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    tagline: plan.tagline,
    sumInsured: plan.sumInsured,
    recommended: plan.recommended,
    premium: { ...quote(plan), gstPercent: GST_PERCENT, currency: 'INR', isPlaceholder: true },
    coverage: coverageRows(plan),
    conditions,
  };
}

// ------------------------------------------------------------------ endpoints

export function createMockEndpoints(scenario: Scenario, endSession: () => never): Endpoints {
  const store = loadStore(scenario);
  const save = () => {
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // storage blocked: data lasts until the page is reloaded
    }
  };
  save();

  const findPet = (petId: number) => {
    const pet = store.pets.find((p) => p.id === petId);
    if (!pet) throw new ApiError(404, 'NOT_FOUND', 'Pet not found');
    return pet;
  };
  const findOrder = (orderId: string) => {
    const order = store.orders[orderId];
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found');
    return order;
  };
  const publicOrder = ({ pollsUntilPaid: _, ...order }: MockOrder): Order => order;

  return {
    async getMe(signal) {
      await wait(200, signal);
      return { user: { id: OWNER.id, name: OWNER.name, email: OWNER.email } };
    },

    async getMyProfile(signal) {
      await wait(300, signal);
      return { owner: store.owner ?? OWNER };
    },

    async updateMyProfile(values) {
      await wait(500);
      if (values.phone != null && !INDIAN_MOBILE.test(values.phone)) {
        throw new ApiError(400, 'VALIDATION_ERROR', `body/phone must match pattern "${INDIAN_MOBILE.source}"`);
      }
      if (values.postalCode != null && !/^[0-9]{6}$/.test(values.postalCode)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'body/postalCode must match pattern "^[0-9]{6}$"');
      }
      store.owner = { ...(store.owner ?? OWNER), ...values };
      save();
      return { owner: store.owner, skipped: [] };
    },

    async getPets(signal) {
      await wait(500, signal);
      if (scenario === 'petsError') {
        throw new ApiError(502, 'UPSTREAM_ERROR', 'Petzadore profile service is unavailable.');
      }
      return { pets: store.pets };
    },

    async createPet(input: NewPetInput) {
      await wait(700);
      const used = new Set(store.pets.map((p) => p.slot));
      const slot = [1, 2, 3, 4, 5].find((s) => !used.has(s));
      if (!slot || store.pets.length >= MAX_SLOTS) {
        throw new ApiError(409, 'PET_SLOTS_FULL', 'All 5 pet slots on your profile are in use.');
      }
      // Like staging: the profile has no "Date of birth" field, so it is skipped and only Age is set.
      const pet: Pet = {
        ...PETS[0],
        id: Math.max(100, ...store.pets.map((p) => p.id)) + 1,
        slot,
        name: input.name,
        species: input.species,
        breed: input.breed,
        dateOfBirth: null,
        ageYears: input.dateOfBirth ? dayjs().diff(input.dateOfBirth, 'year') : (input.ageYears ?? null),
        gender: null,
        vaccinationStatus: input.vaccinationStatus ?? null,
        vaccinationExpiry: profileDate(input.vaccinationExpiry),
        microchipNumber: input.microchipNumber ?? null,
        photo: null,
      };
      store.pets = [...store.pets, pet].sort((a, b) => a.slot - b.slot);
      save();
      return { pet, skipped: input.dateOfBirth ? ['dateOfBirth'] : [] };
    },

    async updatePet(petId, values) {
      await wait(500);
      const pet = findPet(petId);
      const { dateOfBirth, vaccinationExpiry, ...rest } = values;
      Object.assign(pet, rest);
      if (vaccinationExpiry) pet.vaccinationExpiry = profileDate(vaccinationExpiry);
      if (dateOfBirth) pet.ageYears = dayjs().diff(dateOfBirth, 'year');
      save();
      return { pet, skipped: dateOfBirth ? ['dateOfBirth'] : [] };
    },

    async getPet(petId, signal) {
      await wait(300, signal);
      return { pet: findPet(petId) };
    },

    async getPetFormOptions(signal) {
      await wait(200, signal);
      return FORM_OPTIONS;
    },

    async getBreeds({ species, q, limit = 1000 } = {}, signal) {
      await wait(200, signal);
      const text = q?.trim().toLowerCase() ?? '';
      const breeds = BREEDS.filter((b) => !species || b.species.some((s) => s.toLowerCase() === species))
        .filter((b) => b.name.toLowerCase().includes(text))
        // Names starting with the search text first, like the backend
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(text)) - Number(!b.name.toLowerCase().startsWith(text)))
        .slice(0, limit);
      return { breeds };
    },

    async getPlans(signal) {
      await wait(300, signal);
      return { plans: PLANS.map((plan) => planView(plan)), disclaimers: DISCLAIMERS };
    },

    async listOrders(status, signal) {
      await wait(300, signal);
      const orders = Object.values(store.orders)
        .filter((o) => !status || o.status === status)
        .reverse()
        .map(publicOrder);
      return { orders };
    },

    async matchPlans(petId, dateOfBirth, signal) {
      await wait(dateOfBirth ? 500 : 700, signal);
      if (scenario === 'sessionEnded') endSession();
      const pet = findPet(petId);
      if (dateOfBirth && pet.ageYears != null) {
        const ageFromDob = dayjs().diff(dateOfBirth, 'month') / 12;
        if (Math.abs(ageFromDob - pet.ageYears) > 1.5) {
          throw new ApiError(
            400,
            'BAD_REQUEST',
            `Date of birth doesn't match the age in ${pet.name ?? 'the pet'}'s profile (${pet.ageYears} years)`,
          );
        }
      }
      return matchPlans(pet, dateOfBirth);
    },

    async createOrder({ petId, planId, dateOfBirth }): Promise<CheckoutResponse> {
      await wait(600);
      const pet = findPet(petId);
      const match = matchPlans(pet, dateOfBirth);
      const plan = match.plans.find((p) => p.id === planId);
      const mockPlan = PLANS.find((p) => p.id === planId);
      if (!plan || !mockPlan)
        throw new ApiError(422, 'NOT_ELIGIBLE', 'This plan is no longer available.');
      const q = quote(mockPlan);
      const order: MockOrder = {
        id: `PZI-${randomId(6)}`,
        status: 'created',
        plan: { id: plan.id, name: plan.name, tagline: plan.tagline, sumInsured: plan.sumInsured },
        pet: { id: pet.id, name: pet.name },
        conditions: plan.conditions,
        amount: { ...q, currency: 'INR' },
        paidAt: null,
        paymentId: null,
        lastPaymentError: null,
        pollsUntilPaid: scenario === 'paymentPending' ? -1 : 1,
      };
      store.orders[order.id] = order;
      save();
      return {
        orderId: order.id,
        razorpay: {
          keyId: 'rzp_test_mock',
          orderId: `order_${randomId(14, 'abcdefghijklmnopqrstuvwxyz0123456789')}`,
          amount: q.total * 100,
          currency: 'INR',
          name: 'Petzadore',
          description: `${plan.name} for ${pet.name}`,
          prefill: { name: OWNER.name ?? '', email: OWNER.email ?? '' },
          notes: { orderId: order.id },
        },
        summary: publicOrder(order),
      };
    },

    async getOrder(orderId, signal) {
      await wait(300, signal);
      const order = findOrder(orderId);
      if (order.status === 'processing' && order.pollsUntilPaid >= 0) {
        if (order.pollsUntilPaid === 0) {
          order.status = 'paid';
          order.paidAt = new Date().toISOString();
        } else order.pollsUntilPaid -= 1;
        save();
      }
      return publicOrder(order);
    },

    async verifyPayment(orderId, payment) {
      await wait(800);
      const order = findOrder(orderId);
      // Like a payment Razorpay hasn't captured yet: the UI polls GET /orders/:id.
      order.status = 'processing';
      order.paymentId = payment.razorpay_payment_id;
      save();
      return publicOrder(order);
    },

    async getNotificationPreferences(signal) {
      await wait(200, signal);
      return { preferences: store.preferences ?? DEFAULT_PREFERENCES };
    },

    async updateNotificationPreferences(changes) {
      await wait(300);
      store.preferences = { ...(store.preferences ?? DEFAULT_PREFERENCES), ...changes };
      save();
      return { preferences: store.preferences };
    },

    async getPushPublicKey(signal) {
      await wait(200, signal);
      // Like staging today: no VAPID keys yet.
      throw new ApiError(503, 'UNAVAILABLE', 'Push notifications are not configured');
    },

    async subscribeToPush(subscription) {
      await wait(300);
      store.pushEndpoints = [...new Set([...(store.pushEndpoints ?? []), subscription.endpoint])];
      save();
      return { ok: true };
    },

    async unsubscribeFromPush(endpoint) {
      await wait(300);
      if (!store.pushEndpoints?.includes(endpoint)) throw new ApiError(404, 'NOT_FOUND', 'Subscription not found');
      store.pushEndpoints = store.pushEndpoints.filter((e) => e !== endpoint);
      save();
      return { ok: true };
    },

    async getNotificationDeliveries(_limit, signal) {
      await wait(200, signal);
      // Like staging's example: nothing sent to this member yet.
      return { deliveries: [] };
    },

    async recordPaymentFailure(orderId, failure) {
      await wait(300);
      const order = findOrder(orderId);
      order.status = 'failed';
      order.lastPaymentError = failure;
      save();
      return publicOrder(order);
    },
  };
}
