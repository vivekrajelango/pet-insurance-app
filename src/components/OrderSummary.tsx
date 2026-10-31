import type { ReactNode } from 'react';
import { Card, Tag } from 'antd';
import type { Pet, Plan } from '../api/types';
import { formatINR, petSummary } from '../lib/format';
import { PetAvatar } from './PetAvatar';
import styles from './OrderSummary.module.css';

/** Right-hand "Your order" panel on desktop. `children` go at the bottom (e.g. the step's button). */
export function OrderSummary({ pet, plan, children }: { pet: Pet; plan: Plan; children?: ReactNode }) {
  return (
    <Card className={styles.card}>
      <div className={styles.heading}>Your order</div>
      <div className={styles.pet}>
        <PetAvatar pet={pet} size={48} />
        <span className={styles.petText}>
          <strong>{pet.name}</strong>
          <span className={styles.muted}>{petSummary(pet, { breed: false })}</span>
        </span>
      </div>

      <div className={styles.lines}>
        <div className={styles.line}>
          <span>{plan.name}</span>
          <span>{plan.premium ? formatINR(plan.premium.base) : '—'}</span>
        </div>
        <div className={styles.muted}>Sum insured {formatINR(plan.sumInsured)}</div>
        {plan.premium?.isPlaceholder && (
          <Tag color="orange" className={styles.tag}>
            Indicative price
          </Tag>
        )}
      </div>
      {children}
    </Card>
  );
}
