/**
 * CherryTree logo — cherry emoji with branded wordmark.
 *
 * @example
 *   <Logo size="sm" />
 *
 * @consumers AuthGate, OutlineList
 * @depends none
 */

import styles from './Logo.module.css';

type LogoProps = {
  size?: 'sm' | 'md';
};

export function Logo({ size = 'md' }: LogoProps) {
  return (
    <div className={`${styles.logo} ${styles[size]}`}>
      <span className={styles.icon}>🍒</span>
      <span className={styles.wordmark}>CherryTree</span>
    </div>
  );
}
