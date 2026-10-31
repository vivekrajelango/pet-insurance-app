import type { Pet } from '../api/types';
import styles from './PetAvatar.module.css';

/** Pet photo, or the first letter of the name when there isn't one. Without `size`, CSS sizes it. */
export function PetAvatar({
  pet,
  size,
  shape = 'circle',
  className,
}: {
  pet: Pick<Pet, 'name' | 'photo'>;
  size?: number;
  shape?: 'circle' | 'rounded';
  className?: string;
}) {
  return (
    <span
      className={[styles.avatar, shape === 'rounded' ? styles.rounded : '', className ?? ''].join(' ')}
      style={size ? { width: size, height: size, fontSize: Math.round(size * 0.4) } : undefined}
    >
      {pet.photo ? (
        <img src={pet.photo} alt="" loading="lazy" />
      ) : (
        <span aria-hidden>{pet.name?.[0]?.toUpperCase() ?? '?'}</span>
      )}
    </span>
  );
}
