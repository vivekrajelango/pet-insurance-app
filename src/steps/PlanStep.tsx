import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Alert, Button, DatePicker, Drawer, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ApiError, userMessage } from '../api/client';
import type { MatchResult, Pet, Plan } from '../api/types';
import { AppShell } from '../components/AppShell';
import { PetAvatar } from '../components/PetAvatar';
import { ErrorPanel, Loading, StatusCard } from '../components/StatusScreens';
import { useAsync } from '../hooks/useAsync';
import { formatINR, petSummary } from '../lib/format';
import { useApp } from '../state/AppContext';
import styles from './PlanStep.module.css';

/** Step 2 — eligible plans for the chosen pet (POST /v1/plans/match). */
export function PlanStep() {
  const { api, state } = useApp();
  const petId = state.petId!;
  const load = useAsync(async (signal) => {
    const [pets, match] = await Promise.all([
      api.getPets(signal),
      api.matchPlans(petId, state.dateOfBirth ?? undefined, signal),
    ]);
    return { pet: pets.pets.find((p) => p.id === petId) ?? null, match };
  }, `${petId}|${state.dateOfBirth}`);

  if (load.loading) return <Loading label="Finding plans…" />;
  if (load.error)
    return <ErrorPanel title="We couldn’t load plans" error={load.error} onRetry={load.reload} />;
  const { pet, match } = load.data!;
  const petName = match.petName ?? 'your pet';

  if (match.status === 'incomplete') {
    return (
      <AppShell back title={`We need ${petName}’s age`}>
        <DobBanner
          reason={`Your profile doesn’t have an age for ${petName}. Add the date of birth to see plans.`}
        />
      </AppShell>
    );
  }

  if (match.status === 'none') return <NotEligible result={match} petName={petName} />;

  return <PlanChooser result={match} pet={pet} petName={petName} />;
}

// ------------------------------------------------------------------ choose

/** Phones: recommended first, then biggest cover. */
function mobileOrder(plans: Plan[]) {
  return [...plans].sort(
    (a, b) => Number(b.recommended) - Number(a.recommended) || b.sumInsured - a.sumInsured,
  );
}

/** Desktop: smallest cover on the left, recommended in the middle. */
function desktopOrder(plans: Plan[]) {
  const others = plans.filter((p) => !p.recommended).sort((a, b) => a.sumInsured - b.sumInsured);
  const recommended = plans.filter((p) => p.recommended);
  const middle = Math.floor(others.length / 2);
  return [...others.slice(0, middle), ...recommended, ...others.slice(middle)];
}

function PlanChooser({ result, pet, petName }: { result: MatchResult; pet: Pet | null; petName: string }) {
  const { state, dispatch } = useApp();
  const recommended = result.plans.find((p) => p.recommended) ?? result.plans[0];
  const [selectedId, setSelectedId] = useState(
    result.plans.some((p) => p.id === state.planId) ? state.planId! : recommended.id,
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const selected = result.plans.find((p) => p.id === selectedId)!;
  const showDob = result.pet?.ageIsApproximate && !state.dateOfBirth;
  const columns = desktopOrder(result.plans);
  const desktopIndex = new Map(columns.map((p, i) => [p.id, i]));
  const choose = (plan: Plan) => dispatch({ type: 'selectPlan', planId: plan.id });
  const changePet = (
    <button
      type="button"
      className={styles.inlineLink}
      onClick={() => dispatch({ type: 'goTo', step: 'pet' })}
    >
      Change pet
    </button>
  );

  return (
    <AppShell
      back
      title={
        <>
          Pick a plan<span className="pzi-desktop-only"> for {petName}</span>
        </>
      }
      subtitle={
        pet && (
          <>
            <span className={`${styles.petChip} pzi-mobile-only`}>
              <PetAvatar pet={pet} size={40} />
              <span>
                Plans for <strong>{petName}</strong> · {petSummary(pet, { breed: false })}
              </span>
            </span>
            <span className="pzi-desktop-only">
              {petSummary(pet)} · {changePet}
            </span>
          </>
        )
      }
      actions={
        <Button type="primary" shape="round" size="large" onClick={() => choose(selected)}>
          Continue with {selected.name}
        </Button>
      }
      actionsMobileOnly
    >
      {showDob && (
        <DobBanner
          reason={`Your profile only has ${petName}’s age in years. Add ${pronoun(pet)} date of birth so we check eligibility exactly.`}
          optional
        />
      )}

      <div className={styles.plans} role="radiogroup" aria-label="Plans">
        {mobileOrder(result.plans).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={plan.id === selectedId}
            desktopOrder={desktopIndex.get(plan.id) ?? 0}
            onSelect={() => setSelectedId(plan.id)}
            onContinue={() => choose(plan)}
          />
        ))}
      </div>

      {selected.conditions.map((c) => (
        <Alert key={c.code} type="warning" showIcon title={c.message} />
      ))}

      <div className="pzi-desktop-only">
        <CompareTable plans={columns} selectedId={selectedId} />
      </div>

      <div className={`${styles.compareMobile} pzi-mobile-only`}>
        <Button
          color="primary"
          variant="outlined"
          shape="round"
          size="large"
          block
          onClick={() => setCompareOpen(true)}
        >
          Compare all plans side by side
        </Button>
        <Drawer
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          title="Compare plans"
          placement="right"
          size="100%"
          closeIcon={<ArrowLeftOutlined aria-label="Back to plans" />}
          className={styles.compareDrawer}
        >
          <p className={styles.compareNote}>Rows where the plans differ are highlighted.</p>
          <CompareTable plans={columns} selectedId={selectedId} />
        </Drawer>
      </div>

      <ul className={styles.disclaimers}>
        {result.disclaimers.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </AppShell>
  );
}

const pronoun = (pet: Pet | null) => {
  const g = pet?.gender?.toLowerCase();
  return g === 'male' ? 'his' : g === 'female' ? 'her' : 'the';
};

/** Three headline covers for the phone cards: "Hospitalisation up to ₹2 Lakhs · …" */
const HIGHLIGHT_LABELS: Record<string, string> = {
  hospitalization: 'Hospitalisation',
  thirdPartyLiability: 'Third-party liability',
  opdWallet: 'OPD wallet',
  stolenStraying: 'Stolen/straying',
};

function highlights(plan: Plan) {
  return plan.coverage
    .filter((row) => row.covered && HIGHLIGHT_LABELS[row.key])
    .slice(0, 3)
    .map((row) => {
      const value = row.display.replace(/\s*\(.*\)$/, '').replace(/^Up to/, 'up to');
      return `${HIGHLIGHT_LABELS[row.key]} ${value}`;
    })
    .join(' · ');
}

function PlanCard({
  plan,
  selected,
  desktopOrder,
  onSelect,
  onContinue,
}: {
  plan: Plan;
  selected: boolean;
  desktopOrder: number;
  onSelect: () => void;
  onContinue: () => void;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect();
    }
  };
  const price = (
    <span className={styles.price}>
      {plan.premium ? formatINR(plan.premium.base) : '—'}
      <span className={styles.per}>
        <span className="pzi-mobile-only"> /yr</span>
        <span className="pzi-desktop-only"> /year</span>
      </span>
    </span>
  );

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      className={`${styles.planCard} ${selected ? styles.selected : ''}`}
      style={{ '--desktop-order': desktopOrder } as CSSProperties}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className={`${styles.badgeRow} ${plan.recommended || selected ? '' : styles.badgeRowBare}`}>
        {plan.recommended && <span className={styles.badge}>Recommended</span>}
        <span className={`${styles.radio} ${selected ? styles.radioOn : ''} pzi-mobile-only`} aria-hidden />
      </span>
      <span className={styles.nameRow}>
        <span className={styles.planName}>{plan.name}</span>
        <span className="pzi-mobile-only">{price}</span>
      </span>
      <span className={styles.planMeta}>
        {plan.tagline} · Sum insured {formatINR(plan.sumInsured)}
      </span>
      <span className={`${styles.highlights} pzi-mobile-only`}>{highlights(plan)}</span>
      <span className="pzi-desktop-only">{price}</span>
      {plan.premium?.isPlaceholder && (
        <Tag color="orange" className={styles.tag}>
          Indicative price
        </Tag>
      )}
      <span className={`${styles.cardAction} pzi-desktop-only`}>
        {selected ? (
          <Button
            type="primary"
            shape="round"
            size="large"
            block
            onClick={(e) => {
              e.stopPropagation();
              onContinue();
            }}
          >
            Selected · Continue
          </Button>
        ) : (
          <Button color="primary" variant="outlined" shape="round" size="large" block tabIndex={-1}>
            Select {plan.name}
          </Button>
        )}
      </span>
    </div>
  );
}

function CompareTable({ plans, selectedId }: { plans: Plan[]; selectedId: string }) {
  const rows = plans[0].coverage.map((row) => {
    const values = plans.map((p) => p.coverage.find((c) => c.key === row.key)?.display ?? '—');
    return { ...row, values, differs: new Set(values).size > 1 };
  });
  return (
    <div className={styles.compare}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Compare coverage</th>
            {plans.map((p) => (
              <th key={p.id} scope="col" className={p.id === selectedId ? styles.selectedCol : undefined}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.differs ? styles.differs : undefined}>
              <th scope="row">
                <span className={styles.coverLabel}>{row.label}</span>
                <span className={styles.coverSummary}>{row.summary}</span>
              </th>
              {row.values.map((value, i) => (
                <td key={plans[i].id} className={plans[i].id === selectedId ? styles.selectedCol : undefined}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ date of birth

/** "Add the exact date of birth" banner; the backend checks it against the profile age (±1.5 years). */
function DobBanner({ reason, optional }: { reason: string; optional?: boolean }) {
  const { api, state, dispatch } = useApp();
  const [value, setValue] = useState<Dayjs | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    if (!value) return;
    const dob = value.format('YYYY-MM-DD');
    setChecking(true);
    setError(null);
    try {
      await api.matchPlans(state.petId!, dob);
      dispatch({ type: 'setDateOfBirth', dateOfBirth: dob });
    } catch (err) {
      if (err instanceof ApiError && err.isSessionEnded) return;
      setError(userMessage(err));
      setChecking(false);
    }
  }

  return (
    <div className={styles.dob}>
      <div className={styles.dobText}>
        <p>
          {reason}
          {optional && (
            <span className={`${styles.dobHint} pzi-desktop-only`}>
              {' '}
              (Optional, within 1.5 years of the profile age.)
            </span>
          )}
        </p>
      </div>
      <div className={styles.dobControls}>
        <label htmlFor="pzi-dob" className="pzi-sr-only">
          Date of birth
        </label>
        <DatePicker
          id="pzi-dob"
          value={value}
          onChange={setValue}
          format="DD/MM/YYYY"
          placeholder="DD / MM / YYYY"
          disabledDate={(d) => d.isAfter(dayjs(), 'day')}
          className={styles.dobInput}
        />
        <Button type="primary" shape="round" onClick={check} loading={checking} disabled={!value}>
          Check
        </Button>
      </div>
      {optional && (
        <p className={`${styles.dobHint} ${styles.dobFoot} pzi-mobile-only`}>
          Optional. Must be within 1.5 years of the age on the profile.
        </p>
      )}
      {error && <Alert type="error" showIcon title={error} className={styles.dobFoot} />}
    </div>
  );
}

// ------------------------------------------------------------------ not eligible

/** One line per reason code, using the most lenient plan's message (catalogue order: A, B, C). */
function reasonLines(result: MatchResult, petName: string) {
  const byCode = new Map<string, string>();
  for (const plan of result.ineligiblePlans) {
    for (const r of plan.reasons) byCode.set(r.code, r.message);
  }
  const age = result.pet;
  return [...byCode].map(([code, message]) => {
    if (code === 'TOO_OLD' && age) return `${message} ${petName} is ${age.ageYears}.`;
    if (code === 'TOO_YOUNG' && age) return `${message} ${petName} is ${age.ageMonths} months old.`;
    return message;
  });
}

function NotEligible({ result, petName }: { result: MatchResult; petName: string }) {
  const { config, dispatch } = useApp();
  return (
    <StatusCard
      align="left"
      title={`We can’t cover ${petName} yet`}
      actions={
        <>
          <Button
            color="primary"
            variant="outlined"
            shape="round"
            size="large"
            block
            onClick={() => dispatch({ type: 'goTo', step: 'pet' })}
          >
            Choose another pet
          </Button>
          {config.contactUrl && (
            <a href={config.contactUrl} className={styles.talk}>
              Talk to us
            </a>
          )}
        </>
      }
    >
      <ul className={styles.reasons}>
        {reasonLines(result, petName).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </StatusCard>
  );
}
