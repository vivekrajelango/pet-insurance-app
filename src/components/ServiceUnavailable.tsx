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
      <SleepingCat />
      <div className={styles.eyebrow}>Service unavailable</div>
      <h1 className={styles.title}>We’re taking a quick paws</h1>
      <p className={styles.body}>
        Our cat curled up on the cable and pulled the plug, so pet insurance is offline for a moment. Your pets and your
        progress are safe. Please try again in a few minutes.
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

function SleepingCat() {
  return (
    <svg className={styles.scene} viewBox="0 0 280 170" aria-hidden>
      <ellipse cx="140" cy="152" rx="112" ry="10" className={styles.shadow} />

      {/* Pulled-out cable and plug */}
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

      {/* Cat, curled up */}
      <g className={styles.breathe}>
        <ellipse cx="172" cy="116" rx="56" ry="24" className={styles.fur} />
        <path
          d="M160 93 q 5 7 1 14 M176 92 q 5 7 1 14 M192 94 q 5 7 1 13 M208 99 q 4 6 1 11"
          className={styles.stripe}
        />

        {/* Tail wrapped round the front; the tip twitches */}
        <path d="M226 122 C 236 140, 196 144, 156 140" className={styles.tail} />
        <path d="M226 122 C 236 140, 196 144, 156 140" className={styles.tailStripes} />
        <g className={styles.tailTip}>
          <path d="M156 140 C 144 139, 136 134, 138 126" className={styles.tail} />
          <path d="M150 139.6 C 142 138, 137 132, 138 126" className={styles.tailEnd} />
        </g>

        {/* Paws */}
        <ellipse cx="110" cy="131" rx="9" ry="5" className={styles.paw} />
        <ellipse cx="127" cy="133" rx="9" ry="5" className={styles.paw} />

        {/* Head */}
        <path d="M99 101 L 103 76 L 117 91 z" className={styles.fur} />
        <path d="M121 90 L 135 74 L 139 99 z" className={styles.fur} />
        <path d="M103 95 L 105 82 L 113 91 z" className={styles.innerEar} />
        <path d="M125 90 L 133 81 L 135 95 z" className={styles.innerEar} />
        <circle cx="119" cy="110" r="22" className={styles.fur} />
        <path d="M113 90 l 2 7 M119 89 v 8 M125 90 l -2 7" className={styles.stripe} />
        <ellipse cx="119" cy="120" rx="10" ry="7" className={styles.muzzle} />
        <path d="M105 110 q 5 4 10 0 M123 110 q 5 4 10 0" className={styles.eye} />
        <path d="M116 116 h 6 l -3 3.5 z" className={styles.nose} />
        <path d="M119 119.5 q -2.5 3 -5.5 1.5 M119 119.5 q 2.5 3 5.5 1.5" className={styles.mouth} />
        <path
          d="M107 119 L 88 115 M107 122 L 88 124 M131 119 L 148 115 M131 122 L 148 124"
          className={styles.whisker}
        />
        <circle cx="104" cy="117" r="3.5" className={styles.blush} />
        <circle cx="134" cy="117" r="3.5" className={styles.blush} />
      </g>

      {/* Zzz */}
      <text x="146" y="72" className={`${styles.z} ${styles.z1}`}>
        z
      </text>
      <text x="160" y="56" className={`${styles.z} ${styles.z2}`}>
        z
      </text>
      <text x="176" y="38" className={`${styles.z} ${styles.z3}`}>
        Z
      </text>
    </svg>
  );
}

function Paws() {
  return (
    <div className={styles.paws} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={styles.pawPrint} style={{ animationDelay: `${i * 0.35}s` }}>
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
