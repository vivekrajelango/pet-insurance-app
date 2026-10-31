import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import styles from './ServiceUnavailable.module.css';

/**
 * Full-page fallback when the backend can't be reached (network error, 5xx) or the
 * app itself crashes. Animations are CSS only and stop under prefers-reduced-motion.
 */
export function ServiceUnavailable({
  onRetry = () => window.location.reload(),
  contactUrl,
  reference,
}: {
  onRetry?: () => void;
  contactUrl?: string;
  /** Short error code shown for support, e.g. "NETWORK" or "502" */
  reference?: string;
}) {
  return (
    <div className={styles.page} role="alert">
      <SleepingPup />
      <div className={styles.eyebrow}>Service unavailable</div>
      <h1 className={styles.title}>We’re taking a quick paws</h1>
      <p className={styles.body}>
        Our pup chewed through a cable, so pet insurance is offline for a moment. Your pets and your progress are safe.
        Please try again in a few minutes.
      </p>
      <div className={styles.actions}>
        <Button type="primary" shape="round" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
          Try again
        </Button>
        {contactUrl && (
          <Button shape="round" size="large" href={contactUrl}>
            Talk to us
          </Button>
        )}
      </div>
      {reference && <div className={styles.reference}>Reference: {reference}</div>}
      <Paws />
    </div>
  );
}

function SleepingPup() {
  return (
    <svg className={styles.scene} viewBox="0 0 280 170" aria-hidden>
      <ellipse cx="140" cy="152" rx="112" ry="10" className={styles.shadow} />

      {/* Chewed cable and plug */}
      <path d="M0 150 C 30 150, 40 128, 66 136" className={styles.cable} />
      <path d="M66 136 l4 -3 l2 5 l4 -4" className={styles.cableFrayed} />
      <g className={styles.plug}>
        <rect x="18" y="104" width="22" height="16" rx="4" />
        <rect x="23" y="96" width="3" height="9" rx="1" />
        <rect x="32" y="96" width="3" height="9" rx="1" />
        <path d="M29 120 C 29 132, 14 136, 8 150" className={styles.cable} />
      </g>
      <g className={styles.spark}>
        <path d="M78 124 l3 -8 l2 6 l6 -2 l-4 6 l6 3 l-8 1 l-1 7 l-3 -6 l-7 2 l5 -5 z" />
      </g>

      {/* Bed */}
      <ellipse cx="164" cy="138" rx="86" ry="20" className={styles.bedBase} />
      <path d="M78 136 C 78 112, 250 112, 250 136" className={styles.bedRim} />

      {/* Pup */}
      <g className={styles.breathe}>
        <path d="M222 118 C 246 110, 248 90, 236 86" className={styles.tail} />
        <ellipse cx="170" cy="116" rx="58" ry="26" className={styles.fur} />
        <ellipse cx="186" cy="110" rx="18" ry="12" className={styles.patch} />
        <ellipse cx="132" cy="134" rx="16" ry="7" className={styles.fur} />
        <circle cx="118" cy="112" r="24" className={styles.fur} />
        <path d="M106 94 C 92 92, 88 112, 98 124 C 104 116, 108 104, 106 94 z" className={styles.ear} />
        <ellipse cx="102" cy="122" rx="12" ry="9" className={styles.muzzle} />
        <circle cx="93" cy="119" r="3.4" className={styles.nose} />
        <path d="M112 109 q 6 5 12 0" className={styles.eye} />
        <circle cx="128" cy="118" r="4" className={styles.blush} />
      </g>

      {/* Zzz */}
      <text x="132" y="78" className={`${styles.z} ${styles.z1}`}>
        z
      </text>
      <text x="146" y="62" className={`${styles.z} ${styles.z2}`}>
        z
      </text>
      <text x="162" y="44" className={`${styles.z} ${styles.z3}`}>
        Z
      </text>
    </svg>
  );
}

function Paws() {
  return (
    <div className={styles.paws} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={styles.paw} style={{ animationDelay: `${i * 0.35}s` }}>
          <ellipse cx="12" cy="16" rx="5.5" ry="4.5" />
          <circle cx="5.5" cy="10" r="2.3" />
          <circle cx="9.5" cy="6.5" r="2.3" />
          <circle cx="14.5" cy="6.5" r="2.3" />
          <circle cx="18.5" cy="10" r="2.3" />
        </svg>
      ))}
    </div>
  );
}
