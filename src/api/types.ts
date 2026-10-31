/**
 * Response shapes of the insurance backend (backend/src/routes/v1/*).
 * Hand-written: when a backend response changes, update it here.
 */

/** Error body for every non-2xx response: { error: { code, message } } */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

// ------------------------------------------------------------------ pets

/** Owner details from the BuddyPress profile (wordpress.js → parseMemberProfile). */
export interface Owner {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postalCode: string | null;
}

/** One filled BuddyPress pet slot. `id` is the xprofile group id of the slot. */
export interface Pet {
  id: number;
  slot: number;
  ownerId: number;
  name: string | null;
  /** As entered on the profile: "Dog" | "Cat" */
  species: string | null;
  breed: string | null;
  dateOfBirth: string | null;
  /** Whole years from the profile's "Age" field */
  ageYears: number | null;
  gender: string | null;
  weightKg: number | null;
  isNeutered: boolean | null;
  preExistingConditions: string | null;
  isCurrentlyInsured: boolean | null;
  vaccinationStatus: string | null;
  vaccinationExpiry: string | null;
  microchipNumber: string | null;
  photo: string | null;
  city: string | null;
  owner: Owner;
}

export interface PetsResponse {
  pets: Pet[];
}

/**
 * Body for saving a new pet to the member's profile.
 * NOT BUILT YET: needs POST /v1/pets in the backend and a write route in the plugin.
 */
export interface NewPetInput {
  name: string;
  species: 'Dog' | 'Cat';
  breed: string;
  dateOfBirth?: string; // YYYY-MM-DD
  ageYears?: number;
  vaccinationStatus?: string;
  vaccinationExpiry?: string; // YYYY-MM-DD
  microchipNumber?: string;
  /** Data URL for now; the final upload format depends on the plugin write route. */
  photo?: string;
}

/** One entry of the Petzadore Breed Library. NOT BUILT YET: GET /v1/breeds. */
export interface Breed {
  name: string;
  species: 'Dog' | 'Cat';
}

// ------------------------------------------------------------------ plans

export interface CoverageRow {
  key: string;
  label: string;
  summary: string;
  covered: boolean;
  display: string;
  limit?: number;
  percent?: number;
}

export interface Premium {
  base: number;
  gst: number;
  total: number;
  gstPercent: number;
  currency: 'INR';
  /** true while pricing.js still has placeholder premiums */
  isPlaceholder: boolean;
}

export interface PlanCondition {
  code: 'WAITING_PERIOD' | string;
  days?: number;
  message: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  tagline: string;
  sumInsured: number;
  recommended: boolean;
  premium: Premium | null;
  coverage: CoverageRow[];
  conditions: PlanCondition[];
}

export type IneligibleReasonCode = 'SPECIES_NOT_COVERED' | 'TOO_YOUNG' | 'TOO_OLD' | 'GIANT_BREED_AGE';

export interface IneligiblePlan {
  id: string;
  name: string;
  reasons: { code: IneligibleReasonCode | string; message: string }[];
}

/** POST /v1/plans/match */
export interface MatchResult {
  petId: number;
  petName: string | null;
  /** incomplete = profile is missing species/age; none = no plan fits */
  status: 'eligible' | 'none' | 'incomplete';
  missing: string[];
  pet: {
    species: 'dog' | 'cat';
    ageMonths: number;
    ageYears: number;
    /** Age came from whole years on the profile, not a date of birth */
    ageIsApproximate: boolean;
    isGiantBreed: boolean;
  } | null;
  plans: Plan[];
  ineligiblePlans: IneligiblePlan[];
  disclaimers: string[];
}

// ------------------------------------------------------------------ orders

export type OrderStatus = 'created' | 'processing' | 'paid' | 'failed';

export interface Order {
  id: string;
  status: OrderStatus;
  plan: { id: string; name: string; tagline: string; sumInsured: number };
  pet: { id: number; name: string | null };
  conditions: PlanCondition[];
  amount: { base: number; gst: number; total: number; currency: 'INR' };
  paidAt: string | null;
  paymentId: string | null;
  lastPaymentError: { code?: string; description?: string; reason?: string } | null;
}

/** Options passed straight to Razorpay Checkout (amount in paise). */
export interface RazorpayOrderOptions {
  keyId: string;
  orderId: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  prefill: { name: string; email: string };
  notes: Record<string, string>;
}

/** POST /v1/orders */
export interface CheckoutResponse {
  orderId: string;
  razorpay: RazorpayOrderOptions;
  summary: Order;
}

/** What Razorpay's success handler returns */
export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentFailure {
  code?: string;
  description?: string;
  reason?: string;
}
