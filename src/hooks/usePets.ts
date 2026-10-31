import { useApp } from '../state/AppContext';
import { useAsync } from './useAsync';

/** The member's pets from their Petzadore (BuddyPress) profile. */
export function usePets() {
  const { api } = useApp();
  const result = useAsync((signal) => api.getPets(signal).then((r) => r.pets), 'pets');
  return { ...result, pets: result.data ?? [] };
}
