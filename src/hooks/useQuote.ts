import { useApp } from '../state/AppContext';
import { useAsync } from './useAsync';

/**
 * The chosen pet + plan with its current price, re-checked by the backend, and the
 * member's contact details. Used by the Details and Review steps.
 */
export function useQuote() {
  const { api, state } = useApp();
  const result = useAsync(async (signal) => {
    const [pets, match, profile] = await Promise.all([
      api.getPets(signal),
      api.matchPlans(state.petId!, state.dateOfBirth ?? undefined, signal),
      // Optional: without it the steps fall back to the owner details on the pet (no email).
      api.getMyProfile(signal).catch(() => null),
    ]);
    const pet = pets.pets.find((p) => p.id === state.petId) ?? null;
    const plan = match.plans.find((p) => p.id === state.planId) ?? null;
    return { pet, plan, match, owner: profile?.owner ?? pet?.owner ?? null };
  }, `${state.petId}|${state.planId}|${state.dateOfBirth}`);
  return result;
}
