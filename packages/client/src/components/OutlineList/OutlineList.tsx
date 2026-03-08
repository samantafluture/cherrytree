/**
 * Outline list — shows user's outlines, allows creating new ones.
 *
 * @example
 *   <OutlineList onSelect={(id, title) => ...} />
 *
 * @consumers App.tsx
 * @depends api/
 */

import type { Outline } from '@cherrytree/shared';
import { useCallback, useEffect, useState } from 'react';

import { api } from '../../api';
import { useAuth } from '../../context';
import { Logo } from '../Logo/Logo';

import styles from './OutlineList.module.css';

type OutlineListProps = {
  onSelect: (id: string, title: string) => void;
};

export function OutlineList({ onSelect }: OutlineListProps) {
  const { logout } = useAuth();
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.outlines.list().then((res) => {
      if (res.data) setOutlines(res.data);
      setLoading(false);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    const res = await api.outlines.create();
    if (res.data) {
      setOutlines((prev) => [res.data!, ...prev]);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await api.outlines.delete(id);
    if (!res.error) {
      setOutlines((prev) => prev.filter((o) => o.id !== id));
    }
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading outlines...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Logo size="sm" />
        <div className={styles.actions}>
          <button className={styles.createButton} onClick={handleCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            New outline
          </button>
          <button className={styles.logoutButton} onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {outlines.length === 0 ? (
        <div className={styles.empty}>
          <p>No outlines yet.</p>
          <button className={styles.createButton} onClick={handleCreate}>
            Create your first outline
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {outlines.map((outline) => (
            <div key={outline.id} className={styles.item}>
              <button
                className={styles.itemTitle}
                onClick={() => onSelect(outline.id, outline.title)}
              >
                {outline.title}
              </button>
              <button
                className={styles.deleteButton}
                onClick={() => handleDelete(outline.id)}
                aria-label="Delete outline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
