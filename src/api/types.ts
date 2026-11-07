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
  /** As stored on the profile, e.g. "2027-09-17 00:00:00" */
  vaccinationExpiry: string | null;
  /** As entered on the profile; not always 15 digits */
  microchipNumber: string | null;
  /** Image URL */
  photo: string | null;
  city: string | null;
  owner: PetOwner;
}

/** The owner as embedded in each pet: no id or email (GET /v1/me/profile has those). */
export type PetOwner = Pick<Owner, 'name' | 'phone' | 'city' | 'postalCode'>;

/**
 * Reply to POST /v1/pets and PATCH /v1/pets/:id: the pet as read back from the profile,
 * plus fields that were sent but the profile has no field for yet (e.g. "dateOfBirth").
 */
export interface PetWriteResponse {
  pet: Pet;
  skipped: string[];
}

/** PATCH /v1/me/profile: at least one field. Phone: Indian mobile, +91 optional. */
export type OwnerUpdate = Partial<Pick<Owner, 'phone' | 'city' | 'postalCode'>>;

export interface PetsResponse {
  pets: Pet[];
}

/**
 * Body for POST /v1/pets. Required: name, species, breed, and dateOfBirth or ageYears.
 * There is no photo field yet.
 */
export interface NewPetInput {
  name: string;
  species: 'Dog' | 'Cat';
  breed: string;
  dateOfBirth?: string; // YYYY-MM-DD
  ageYears?: number;
  vaccinationStatus?: string;
  vaccinationExpiry?: string; // YYYY-MM-DD
  /** 15 digits */
  microchipNumber?: string;
}

/** One entry of the Petzadore Breed Library (GET /v1/breeds). */
export interface Breed {
  id: number;
  name: string;
  /** As in the library, e.g. ['Dog'] — a breed can list more than one */
  species: string[];
}

/** GET /v1/breeds query */
export interface BreedQuery {
  species?: 'dog' | 'cat';
  /** Search text; names starting with it come first */
  q?: string;
  /** 1–1000, default 1000 */
  limit?: number;
}

/** Type and choices of one BuddyPress profile field (from the plugin). */
export interface ProfileFieldInfo {
  /** Label on the profile, e.g. "Vaccination status" */
  fieldName?: string;
  /** e.g. textbox, radio, number, datebox, telephone */
  type?: string;
  options?: string[] | null;
}

/** GET /v1/pets/form-options: choices for the Add pet form, read from the profile fields. */
export interface PetFormOptions {
  petSlots: number;
  species: string[];
  /** null when the profile has no "Vaccination status" choices */
  vaccinationStatus: string[] | null;
  /** Which pet fields this site's profile has, keyed like the Pet shape */
  petFields: Record<string, ProfileFieldInfo>;
  ownerFields: Record<string, ProfileFieldInfo>;
}

/** GET /v1/me: the member from the session token. */
export interface CurrentUser {
  id: number;
  name: string | null;
  email: string | null;
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
  /** OPD wallet: amount the member pays per visit, e.g. 500 */
  deductiblePerVisit?: number;
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

/** GET /v1/plans: every plan, without a pet's eligibility. */
export interface PlanCatalogue {
  plans: Plan[];
  disclaimers: MatchResult['disclaimers'];
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

// ------------------------------------------------------------------ notifications

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';

/** Per-channel opt-in; true = send on that channel. */
export type NotificationPreferences = Record<NotificationChannel, boolean>;

/** The browser's PushSubscription.toJSON(), for POST /v1/notifications/push/subscriptions. */
export interface PushSubscriptionInput {
  /** https URL from the browser's push service */
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

/** One entry of GET /v1/notifications/deliveries (newest first). */
export interface NotificationDelivery {
  id: string;
  /** e.g. payment_confirmation, certificate_ready, policy_status_update, renewal_reminder */
  type: string;
  channel: NotificationChannel;
  /** queued | sending | retrying | sent | failed | cancelled … */
  status: string;
  reason: string | null;
  /** Address it went to, masked by the backend */
  to: string;
  attempts: number;
  lastError: string | null;
  /** What it is about, e.g. an order id */
  reference: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}
