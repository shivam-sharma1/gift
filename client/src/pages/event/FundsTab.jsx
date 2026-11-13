import { useCallback, useEffect, useState } from 'react';
import { organizerApi } from '../../api.js';
import { FundCard } from '../../components/Cards.jsx';
import { decryptProfile } from '../../crypto.js';
import { Empty, ImageField, Loading, Modal, formatMoney, useToast } from '../../components/ui.jsx';

function FundForm({ initial, currency, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    target: initial?.target ?? '',
    imageUrl: initial?.imageUrl ?? '',
    description: initial?.description ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit({ ...form, target: Number(form.target) });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="fd-title">What is the fund for?</label>
        <input id="fd-title" value={form.title} onChange={set('title')} placeholder="Honeymoon in Bali" required maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="fd-target">Goal amount ({currency})</label>
        <input id="fd-target" type="number" inputMode="numeric" min="1" step="1" value={form.target} onChange={set('target')} required />
        <span className="hint">Once the goal is reached, guests can no longer see or add to this fund.</span>
      </div>
      <ImageField value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} />
      <div className="field">
        <label htmlFor="fd-desc">Short story (optional)</label>
        <textarea id="fd-desc" rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save fund'}</button>
      </div>
    </form>
  );
}

export default function FundsTab({ base, currency, eventKey }) {
  const toast = useToast();
  const [funds, setFunds] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(
    () => organizerApi.get(`${base}/funds`).then((d) => setFunds(d.funds)).catch((e) => toast(e.message, 'error')),
    [base, toast],
  );
  useEffect(() => { load(); }, [load]);

  async function save(form) {
    if (editing === 'new') await organizerApi.post(`${base}/funds`, form);
    else await organizerApi.put(`${base}/funds/${editing.id}`, form);
    setEditing(null);
    load();
  }

  async function remove(fund) {
    const warning = fund.contributions.length ? ' Guests who pledged to it will lose their pledge.' : '';
    if (!window.confirm(`Delete the fund "${fund.title}"?${warning}`)) return;
    try {
      await organizerApi.del(`${base}/funds/${fund.id}`);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!funds) return <Loading />;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <p className="muted">Cash funds for things like a honeymoon or a new home. Guests pledge an amount to bring on the day.</p>
        <button className="btn" onClick={() => setEditing('new')}>Add a fund</button>
      </div>

      {funds.length === 0 ? (
        <div className="card"><Empty>No funds yet. Add one for a honeymoon, a new home or anything you are saving for.</Empty></div>
      ) : (
        <div className="stack">
          {funds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              currency={currency}
              badge={<span className={`badge ${fund.raised >= fund.target ? 'taken' : 'open'}`}>{fund.raised >= fund.target ? 'Full' : 'Open'}</span>}
            >
              {fund.contributions.length > 0 && (
                <ul className="plain-list">
                  {fund.contributions.map((c) => {
                    const guest = decryptProfile(eventKey, c.guest.profile);
                    return (
                      <li key={c.id}>
                        <span>{guest.name}{guest.relationship ? <span className="muted"> ({guest.relationship})</span> : null}</span>
                        <strong>{formatMoney(currency, c.amount)}</strong>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="actions start">
                <button className="btn btn-quiet btn-small" onClick={() => setEditing(fund)}>Edit</button>
                <button className="btn btn-quiet btn-small danger-text" onClick={() => remove(fund)}>Delete</button>
              </div>
            </FundCard>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add a fund' : 'Edit fund'} onClose={() => setEditing(null)}>
          <FundForm initial={editing === 'new' ? null : editing} currency={currency} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
