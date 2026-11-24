import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Layout from '../components/Layout.jsx';

export default function Home() {
  const { organizer } = useAuth();
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  function openEvent(e) {
    e.preventDefault();
    try {
      const url = new URL(link.trim());
      // Invite links include the app's base path (/gift/ on GitHub Pages); the router wants it removed.
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const pathname = url.pathname.startsWith(`${base}/`) ? url.pathname.slice(base.length) : url.pathname;
      if (!/^\/e\/[A-Za-z0-9]+$/.test(pathname)) throw new Error('not an invite');
      navigate({ pathname, hash: url.hash });
    } catch {
      setError('That does not look like an invite link. Please paste the whole link you received.');
    }
  }

  return (
    <Layout>
      <section className="hero">
        <h1>Gifts they will truly love</h1>
        <p className="lead">
          A simple wishlist and gift fund for your wedding or celebration, so every gift is something wanted, and nothing is given twice.
        </p>
      </section>

      <div className="grid two">
        <form className="card stack" onSubmit={openEvent}>
          <h2>I am a guest</h2>
          <p className="muted">Open the invite link the couple sent you, or paste it here.</p>
          <div className="field">
            <label htmlFor="link">Invite link</label>
            <input id="link" value={link} onChange={(e) => { setLink(e.target.value); setError(''); }} placeholder="https://" inputMode="url" autoComplete="off" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={!link.trim()}>Continue</button>
        </form>

        <div className="card stack">
          <h2>I am organising</h2>
          <p className="muted">Create your event, add the gifts and funds you wish for, and invite your guests.</p>
          {organizer ? (
            <Link to="/organizer" className="btn">Open my dashboard</Link>
          ) : (
            <>
              <Link to="/register" className="btn">Create an account</Link>
              <Link to="/login" className="btn btn-quiet">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
