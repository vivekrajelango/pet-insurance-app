import { useEffect } from 'react';
import { useApp } from '../state/AppContext';
import type { StepKey } from '../state/wizard';

/** Sends the wizard to another step (e.g. the saved pet/plan no longer exists). */
export function Redirect({ to }: { to: StepKey }) {
  const { dispatch } = useApp();
  useEffect(() => dispatch({ type: 'goTo', step: to }), [dispatch, to]);
  return null;
}
