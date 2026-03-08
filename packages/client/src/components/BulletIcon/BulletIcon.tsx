/**
 * Visual bullet indicator — expandable, leaf, or completed.
 *
 * @example
 *   <BulletIcon hasChildren collapsed completed={false} onClick={toggle} />
 *
 * @consumers components/NodeItem
 * @depends nothing
 */

import { memo } from 'react';

import styles from './BulletIcon.module.css';

type BulletIconProps = {
  hasChildren: boolean;
  collapsed: boolean;
  completed: boolean;
  onClick: () => void;
};

export const BulletIcon = memo(function BulletIcon({
  hasChildren,
  collapsed,
  completed,
  onClick,
}: BulletIconProps) {
  const className = [
    styles.bullet,
    hasChildren ? styles.parent : styles.leaf,
    collapsed ? styles.collapsed : '',
    completed ? styles.completed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      onClick={onClick}
      aria-label={hasChildren ? (collapsed ? 'Expand' : 'Collapse') : 'Bullet'}
      tabIndex={-1}
    >
      <span className={styles.dot} />
    </button>
  );
});
