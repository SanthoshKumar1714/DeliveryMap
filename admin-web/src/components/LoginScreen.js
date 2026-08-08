import React, { useState } from 'react';
import { login } from '../utils/auth';

export default function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const partner = await login(phone, pin);
      onLogin(partner);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.mark}>DropMap</div>
        <p style={s.sub}>Dispatch console — admin access</p>

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={s.input}
            placeholder="9840012345"
            autoComplete="username"
            required
          />

          <label style={s.label}>PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={s.input}
            placeholder="4–6 digits"
            autoComplete="current-password"
            required
          />

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={s.button}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(circle at 20% 20%, rgba(15,122,108,0.08), transparent 45%), var(--paper)',
    fontFamily: 'var(--font-body)',
  },
  card: { width: 360, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '36px 32px', boxShadow: '0 1px 2px rgba(18,24,26,0.05)' },
  mark: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.01em' },
  sub: { margin: '6px 0 28px', fontSize: 13, color: 'var(--ink-soft)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', marginBottom: 18, border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-mono)', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box' },
  error: { fontSize: 13, color: 'var(--brick)', background: 'var(--brick-soft)', borderRadius: 8, padding: '8px 10px', margin: '-6px 0 18px' },
  button: { width: '100%', padding: 11, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' },
};