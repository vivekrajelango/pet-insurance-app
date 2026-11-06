import type { ApiClient } from './client';
import type {
  Breed,
  BreedQuery,
  CheckoutResponse,
  CurrentUser,
  MatchResult,
  NewPetInput,
  Order,
  OrderStatus,
  Owner,
  OwnerUpdate,
  PaymentFailure,
  Pet,
  PetFormOptions,
  PetsResponse,
  PetWriteResponse,
  PlanCatalogue,
  RazorpaySuccess,
} from './types';

/** "?a=1&b=2" from the defined values, or "" */
function query(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) qs.set(key, String(value));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** Typed calls to the backend. One function per route. */
export function createEndpoints(api: ApiClient) {
  return {
    getMe: (signal?: AbortSignal) => api.request<{ user: CurrentUser }>('GET', '/v1/me', undefined, { signal }),

    /** Owner details from the profile: name, email, phone, city, postalCode. */
    getMyProfile: (signal?: AbortSignal) =>
      api.request<{ owner: Owner }>('GET', '/v1/me/profile', undefined, { signal }),

    /** Writes phone / city / PIN code to the WordPress profile. 400 VALIDATION_ERROR for a bad value. */
    updateMyProfile: (values: OwnerUpdate) =>
      api.request<{ owner: Owner; skipped: string[] }>('PATCH', '/v1/me/profile', values),

    getPets: (signal?: AbortSignal) => api.request<PetsResponse>('GET', '/v1/pets', undefined, { signal }),

    getPet: (petId: number, signal?: AbortSignal) =>
      api.request<{ pet: Pet }>('GET', `/v1/pets/${encodeURIComponent(petId)}`, undefined, { signal }),

    /** Choices for the Add pet form (species, vaccination status…). Cached 10 minutes by the backend. */
    getPetFormOptions: (signal?: AbortSignal) =>
      api.request<PetFormOptions>('GET', '/v1/pets/form-options', undefined, { signal }),

    /** Saves a new pet into the first empty pet slot. 409 PET_SLOTS_FULL when all slots are used. */
    createPet: (pet: NewPetInput) => api.request<PetWriteResponse>('POST', '/v1/pets', pet),

    /** Changes only the fields sent. Confirming a dateOfBirth also updates Age. */
    updatePet: (petId: number, values: Partial<NewPetInput>) =>
      api.request<PetWriteResponse>('PATCH', `/v1/pets/${encodeURIComponent(petId)}`, values),

    /** Petzadore Breed Library, optionally filtered by species and search text. */
    getBreeds: (params: BreedQuery = {}, signal?: AbortSignal) =>
      api.request<{ breeds: Breed[] }>('GET', `/v1/breeds${query({ ...params })}`, undefined, { signal }),

    getPlans: (signal?: AbortSignal) => api.request<PlanCatalogue>('GET', '/v1/plans', undefined, { signal }),

    matchPlans: (petId: number, dateOfBirth?: string, signal?: AbortSignal) =>
      api.request<MatchResult>('POST', '/v1/plans/match', { petId, dateOfBirth }, { signal }),

    createOrder: (input: { petId: number; planId: string; dateOfBirth?: string }) =>
      api.request<CheckoutResponse>('POST', '/v1/orders', input),

    /** The member's orders, newest first. */
    listOrders: (status?: OrderStatus, signal?: AbortSignal) =>
      api.request<{ orders: Order[] }>('GET', `/v1/orders${query({ status })}`, undefined, { signal }),

    getOrder: (orderId: string, signal?: AbortSignal) =>
      api.request<Order>('GET', `/v1/orders/${encodeURIComponent(orderId)}`, undefined, { signal }),

    verifyPayment: (orderId: string, payment: RazorpaySuccess) =>
      api.request<Order>('POST', `/v1/orders/${encodeURIComponent(orderId)}/verify`, payment),

    recordPaymentFailure: (orderId: string, failure: PaymentFailure) =>
      api.request<Order>('POST', `/v1/orders/${encodeURIComponent(orderId)}/failed`, failure),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
