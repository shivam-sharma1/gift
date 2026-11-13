import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, guestApi, publicApi, tokens } from '../api.js';
import { FundCard, GiftCard } from '../components/Cards.jsx';
import { decryptProfile, encryptProfile, nameTag } from '../crypto.js';
import Layout from '../components/Layout.jsx';
import { Empty, Loading, Modal, formatDate, formatMoney, useToast } from '../components/ui.jsx';

function Welcome({ event, children }) {
  return (
    <div className="welcome stack-tight">
      <h1>{event.title}</h1>
      {(event.coupleNames || event.date) && (
        <p className="lead">{[event.coupleNames, formatDate(event.date)].filter(Boolean).join(' · ')}</p>
      )}
      {event.message && <p className="message">{event.message}</p>}
      {children}
    </div>
  );
}

function JoinForm({ code, event, eventKey, onJoined }) {
  const [form, setForm] = useState({ name: '', relationship: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const guest = { name: form.name.trim(), relationship: form.relationship.trim() };
    if (!guest.name || !guest.relationship) return setError('Please fill in both fields.');
    setBusy(true);
    setError('');
    try {
      // Encrypted here, so the server never sees the name or relationship.
      const data = await publicApi.post(`/public/events/${code}/join`, {
        profile: encryptProfile(eventKey, guest),
        nameTag: nameTag(eventKey, guest.name),
      });
      tokens.setGuest(code, data.token);
      // If this browser had already joined, the server returns that guest rather than a new one.
      onJoined({ guest: decryptProfile(eventKey, data.guest.profile), event: data.event });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!eventKey) {
    return (
      <>
        <Welcome event={event} />
        <div className="card narrow stack center">
          <h2>This link looks incomplete</h2>
          <p className="muted">Please open the full invite link the couple sent you, including everything after the address.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Welcome event={event} />
      <form className="card narrow stack" onSubmit={submit}>
        <h2>Welcome! Tell us who you are</h2>
        <div className="field">
          <label htmlFor="g-name">Your name</label>
          <input id="g-name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="g-rel">How do you know the couple?</label>
          <input id="g-rel" value={form.relationship} onChange={set('relationship')} placeholder="Cousin, college friend, colleague..." required maxLength={100} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : 'See the gift ideas'}</button>
        <p className="hint center">Your name is locked so only the couple can read it, and other guests never see your choices.</p>
      </form>
    </>
  );
}

function Dashboard({ code, session, onLeave }) {
  const { event, guest } = session;
  const api = guestApi(code);
  const toast = useToast();
  const [tab, setTab] = useState('gifts');
  const [items, setItems] = useState(null);
  const [funds, setFunds] = useState(null);
  const [dialog, setDialog] = useState(null); // {type: 'claim'|'unclaim'|'contribute'|'cancel', ...}
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const load = useCallback(async () => {
    const guestClient = guestApi(code);
    try {
      const [i, f] = await Promise.all([guestClient.get('/guest/items'), guestClient.get('/guest/funds')]);
      setItems(i);
      setFunds(f);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [code, toast]);

  useEffect(() => { load(); }, [load]);

  function open(next) {
    setAmount('');
    setDialogError('');
    setDialog(next);
  }

  async function run(action, successMessage) {
    setBusy(true);
    setDialogError('');
    try {
      await action();
      setDialog(null);
      toast(successMessage);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onLeave();
      setDialogError(err.message);
    } finally {
      setBusy(false);
      load();
    }
  }

  const confirm = () => {
    if (dialog.type === 'claim') return run(() => api.post(`/guest/items/${dialog.item.id}/claim`), 'Thank you! It is marked as your gift.');
    if (dialog.type === 'unclaim') return run(() => api.del(`/guest/items/${dialog.item.id}/claim`), 'Removed. Another guest can now choose it.');
    if (dialog.type === 'cancel') return run(() => api.del(`/guest/contributions/${dialog.fund.contributionId}`), 'Your pledge was cancelled.');
    return run(() => api.post(`/guest/funds/${dialog.fund.id}/contributions`, { amount: Number(amount) }), 'Thank you! Your pledge is noted.');
  };

  const mineCount = items && funds ? items.mine.length + funds.mine.length : 0;
  const ready = items && funds;

  return (
    <>
      <Welcome event={event}>
        <p className="muted">Hello, <strong>{guest.name}</strong>.</p>
      </Welcome>

      <nav className="tabs" aria-label="Sections">
        <button className={tab === 'gifts' ? 'active' : ''} onClick={() => setTab('gifts')}>Gift ideas</button>
        <button className={tab === 'funds' ? 'active' : ''} onClick={() => setTab('funds')}>Cash funds</button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My choices{mineCount > 0 ? ` (${mineCount})` : ''}</button>
      </nav>

      {!ready ? (
        <Loading />
      ) : (
        <div className="stack">
          {tab === 'gifts' && (
            <>
              <p className="muted">Pick a gift you would like to give. Once you choose it, other guests will no longer see it.</p>
              {items.available.length === 0 ? (
                <div className="card"><Empty>No gifts left to choose right now. Thank you for checking!</Empty></div>
              ) : (
                items.available.map((item) => (
                  <GiftCard key={item.id} item={item} currency={event.currency}>
                    <button className="btn" onClick={() => open({ type: 'claim', item })}>I will gift this</button>
                  </GiftCard>
                ))
              )}
              {items.giftedByOthers > 0 && (
                <p className="muted center">{items.giftedByOthers} {items.giftedByOthers === 1 ? 'gift has' : 'gifts have'} already been chosen by other guests.</p>
              )}
            </>
          )}

          {tab === 'funds' && (
            <>
              <p className="muted">Prefer to give cash? Pledge an amount towards something the couple is saving for, and bring it on the day.</p>
              {funds.open.length === 0 ? (
                <div className="card"><Empty>There are no open funds at the moment.</Empty></div>
              ) : (
                funds.open.map((fund) => (
                  <FundCard key={fund.id} fund={fund} currency={event.currency}>
                    <button className="btn" onClick={() => open({ type: 'contribute', fund })}>Add my contribution</button>
                  </FundCard>
                ))
              )}
            </>
          )}

          {tab === 'mine' && (
            <>
              <p className="muted">Only you and the couple can see these.</p>
              {mineCount === 0 && <div className="card"><Empty>You have not chosen anything yet.</Empty></div>}
              {items.mine.map((item) => (
                <GiftCard key={item.id} item={item} currency={event.currency} badge={<span className="badge taken">Your gift</span>}>
                  <button className="btn btn-quiet btn-small" onClick={() => open({ type: 'unclaim', item })}>I changed my mind</button>
                </GiftCard>
              ))}
              {funds.mine.map((fund) => (
                <FundCard key={fund.id} fund={fund} currency={event.currency} badge={<span className="badge taken">You pledged {formatMoney(event.currency, fund.amount)}</span>}>
                  <button className="btn btn-quiet btn-small" onClick={() => open({ type: 'cancel', fund })}>Cancel my pledge</button>
                </FundCard>
              ))}
            </>
          )}
        </div>
      )}

      {dialog && (
        <Modal
          title={{ claim: 'Gift this item?', unclaim: 'Change your mind?', cancel: 'Cancel your pledge?', contribute: 'Your contribution' }[dialog.type]}
          onClose={() => setDialog(null)}
        >
          <form className="stack" onSubmit={(e) => { e.preventDefault(); confirm(); }}>
            {dialog.type === 'claim' && <p>You are choosing <strong>{dialog.item.title}</strong>. Other guests will not see it any more.</p>}
            {dialog.type === 'unclaim' && <p><strong>{dialog.item.title}</strong> will become available to other guests again.</p>}
            {dialog.type === 'cancel' && <p>Your pledge of <strong>{formatMoney(event.currency, dialog.fund.amount)}</strong> to <strong>{dialog.fund.title}</strong> will be removed.</p>}
            {dialog.type === 'contribute' && (
              <div className="field">
                <label htmlFor="amount">Amount for {dialog.fund.title} ({event.currency})</label>
                <input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={dialog.fund.target - dialog.fund.raised}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  required
                />
                <span className="hint">Up to {formatMoney(event.currency, dialog.fund.target - dialog.fund.raised)} is still needed.</span>
              </div>
            )}
            {dialogError && <p className="error" role="alert">{dialogError}</p>}
            <div className="actions">
              <button type="button" className="btn btn-quiet" onClick={() => setDialog(null)}>Go back</button>
              <button className="btn" disabled={busy}>
                {busy ? 'Please wait...' : { claim: 'Yes, I will gift this', unclaim: 'Yes, remove it', cancel: 'Yes, cancel it', contribute: 'Confirm' }[dialog.type]}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function GuestEvent() {
  const code = useParams().code.toUpperCase();
  const [state, setState] = useState({ status: 'loading' });

  const init = useCallback(async () => {
    setState({ status: 'loading' });
    // The invite link carries the event key after the #; keep it on this device.
    const fromLink = new URLSearchParams(window.location.hash.slice(1)).get('k');
    if (fromLink) {
      tokens.setEventKey(code, fromLink);
      window.history.replaceState(null, '', window.location.pathname);
    }
    const eventKey = tokens.getEventKey(code);
    if (tokens.getGuest(code)) {
      try {
        const { guest, event } = await guestApi(code).get('/guest/me');
        const profile = eventKey ? decryptProfile(eventKey, guest.profile) : { name: 'there', relationship: '' };
        return setState({ status: 'ready', session: { guest: profile, event } });
      } catch (err) {
        if (err.status !== 401) return setState({ status: 'error', message: err.message });
        tokens.clearGuest(code);
      }
    }
    try {
      const { event, session } = await publicApi.get(`/public/events/${code}`);
      if (session) {
        // Local storage was cleared but this browser's cookie still knows the guest.
        tokens.setGuest(code, session.token);
        const guest = eventKey ? decryptProfile(eventKey, session.guest.profile) : { name: 'there', relationship: '' };
        return setState({ status: 'ready', session: { guest, event } });
      }
      setState({ status: 'join', event, eventKey });
    } catch (err) {
      setState(err.status === 404 ? { status: 'notfound' } : { status: 'error', message: err.message });
    }
  }, [code]);

  useEffect(() => { init(); }, [init]);

  function leave() {
    tokens.clearGuest(code);
    init();
  }

  return (
    <Layout>
      {state.status === 'loading' && <Loading />}
      {state.status === 'notfound' && (
        <div className="card center stack">
          <h1>Event not found</h1>
          <p className="muted">Please check the invite code or link you were given.</p>
        </div>
      )}
      {state.status === 'error' && (
        <div className="card center stack">
          <p className="error">{state.message}</p>
          <button className="btn" onClick={init}>Try again</button>
        </div>
      )}
      {state.status === 'join' && (
        <JoinForm code={code} event={state.event} eventKey={state.eventKey} onJoined={({ guest, event }) => setState({ status: 'ready', session: { guest, event } })} />
      )}
      {state.status === 'ready' && <Dashboard code={code} session={state.session} onLeave={leave} />}
    </Layout>
  );
}
