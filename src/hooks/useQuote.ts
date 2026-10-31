import { useApp } from '../state/AppContext';
import { useAsync } from './useAsync';

/**
 * The chosen pet + plan with its current price, re-checked by the backend.
 * Used by the Details and Review steps for the order summary.
 */
export function useQuote() {
  const { api, state } = useApp();
  const result = useAsync(async (signal) => {
    const [pets, match] = await Promise.all([
      api.getPets(signal),
      api.matchPlans(state.petId!, state.dateOfBirth ?? undefined, signal),
    ]);
    const pet = pets.pets.find((p) => p.id === state.petId) ?? null;
    const plan = match.plans.find((p) => p.id === state.planId) ?? null;
    return { pet, plan, match };
  }, `${state.petId}|${state.planId}|${state.dateOfBirth}`);
  return result;
}
