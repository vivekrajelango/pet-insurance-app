import type { ApiClient } from './client';
import type {
  Breed,
  CheckoutResponse,
  MatchResult,
  NewPetInput,
  Order,
  PaymentFailure,
  Pet,
  PetsResponse,
  RazorpaySuccess,
} from './types';

/** Typed calls to the backend. One function per route. */
export function createEndpoints(api: ApiClient) {
  return {
    getPets: (signal?: AbortSignal) => api.request<PetsResponse>('GET', '/v1/pets', undefined, { signal }),

    /**
     * Saves a new pet into the first empty BuddyPress pet slot.
     * NOT BUILT YET in the backend/plugin — returns 404 until it is.
     */
    createPet: (pet: NewPetInput) => api.request<{ pet: Pet }>('POST', '/v1/pets', pet),

    /** Petzadore Breed Library. NOT BUILT YET in the backend — returns 404 until it is. */
    getBreeds: (signal?: AbortSignal) =>
      api.request<{ breeds: Breed[] }>('GET', '/v1/breeds', undefined, { signal }),

    matchPlans: (petId: number, dateOfBirth?: string, signal?: AbortSignal) =>
      api.request<MatchResult>('POST', '/v1/plans/match', { petId, dateOfBirth }, { signal }),

    createOrder: (input: { petId: number; planId: string; dateOfBirth?: string }) =>
      api.request<CheckoutResponse>('POST', '/v1/orders', input),

    getOrder: (orderId: string, signal?: AbortSignal) =>
      api.request<Order>('GET', `/v1/orders/${encodeURIComponent(orderId)}`, undefined, { signal }),

    verifyPayment: (orderId: string, payment: RazorpaySuccess) =>
      api.request<Order>('POST', `/v1/orders/${encodeURIComponent(orderId)}/verify`, payment),

    recordPaymentFailure: (orderId: string, failure: PaymentFailure) =>
      api.request<Order>('POST', `/v1/orders/${encodeURIComponent(orderId)}/failed`, failure),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
