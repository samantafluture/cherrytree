/**
 * Auth gate — shows login/register form when unauthenticated.
 *
 * @example
 *   <AuthGate><App /></AuthGate>
 *
 * @consumers App.tsx
 * @depends context/AuthContext
 */

import { useCallback, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { useAuth } from '../../context';
import { Logo } from '../Logo/Logo';

import styles from './AuthGate.module.css';

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return <AuthForm />;
  }

  return <>{children}</>;
}

function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);

      const err =
        mode === 'login'
          ? await login(email, password)
          : await register(email, username, password);

      if (err) setError(err);
      setSubmitting(false);
    },
    [mode, email, username, password, login, register],
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.title}>
          <Logo />
        </div>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />

          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              required
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
            minLength={8}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Log in'
                : 'Sign up'}
          </button>
        </form>

        <p className={styles.toggle}>
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            className={styles.toggleLink}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
