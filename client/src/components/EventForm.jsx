import { useState } from 'react';

export default function EventForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    coupleNames: initial?.coupleNames ?? '',
    date: initial?.date ? initial.date.slice(0, 10) : '',
    message: initial?.message ?? '',
    currency: initial?.currency ?? '₹',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="ev-title">Event name</label>
        <input id="ev-title" value={form.title} onChange={set('title')} placeholder="Our Wedding" required maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="ev-couple">Names (optional)</label>
        <input id="ev-couple" value={form.coupleNames} onChange={set('coupleNames')} placeholder="Asha & Rohan" maxLength={150} />
      </div>
      <div className="row">
        <div className="field grow">
          <label htmlFor="ev-date">Date (optional)</label>
          <input id="ev-date" type="date" value={form.date} onChange={set('date')} />
        </div>
        <div className="field currency">
          <label htmlFor="ev-currency">Currency</label>
          <input id="ev-currency" value={form.currency} onChange={set('currency')} maxLength={5} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ev-msg">Message to guests (optional)</label>
        <textarea id="ev-msg" rows={3} value={form.message} onChange={set('message')} placeholder="Your presence is the best gift. If you wish to give something, here is what we would love." maxLength={1000} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        {onCancel && <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>}
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );
}
