import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Layout from '../components/Layout.jsx';

export default function AuthPage({ mode }) {
  const { organizer, authenticate } = useAuth();
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (organizer) return <Navigate to="/organizer" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authenticate(mode, form);
      navigate('/organizer');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <form className="card narrow stack" onSubmit={submit}>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        {isRegister && (
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" value={form.name} onChange={set('name')} autoComplete="name" required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={set('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} required />
          {isRegister && (
            <span className="hint">
              At least 8 characters. Your password also locks your guests' details, so they stay private even from us. If you forget it, we cannot recover them.
            </span>
          )}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Securing your account...' : isRegister ? 'Create account' : 'Sign in'}</button>
        <p className="muted center">
          {isRegister ? (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          ) : (
            <>New here? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </form>
    </Layout>
  );
}
