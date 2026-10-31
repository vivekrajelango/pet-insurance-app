/** Mock scenarios, picked with ?mock=<key>. */
export const SCENARIOS = {
  default: 'Happy path (4 pets, payment succeeds)',
  noPets: 'No pets on the profile → Add pet',
  slotsFull: 'All 5 pet slots used',
  petsError: 'Can’t load pets (502)',
  sessionEnded: 'Session ends on the Plan step',
  loggedOut: 'Logged out visitor',
  paymentPending: 'Payment stays “confirming”',
} as const;

export type Scenario = keyof typeof SCENARIOS;

export function readScenario(): Scenario {
  const key = new URLSearchParams(window.location.search).get('mock');
  return key && key in SCENARIOS ? (key as Scenario) : 'default';
}

export function switchScenario(scenario: Scenario) {
  const url = new URL(window.location.href);
  if (scenario === 'default') url.searchParams.delete('mock');
  else url.searchParams.set('mock', scenario);
  resetMockData();
  window.location.assign(url);
}

/** Clears the mock's saved pets/orders and the wizard progress. */
export function resetMockData() {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith('pzi:')) window.sessionStorage.removeItem(key);
    }
  } catch {
    // storage blocked: nothing to clear
  }
}
