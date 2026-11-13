import { useCallback, useEffect, useState } from 'react';
import { organizerApi } from '../../api.js';
import { GiftCard } from '../../components/Cards.jsx';
import { decryptProfile } from '../../crypto.js';
import { Empty, ImageField, Loading, Modal, useToast } from '../../components/ui.jsx';

const GiftedBadge = ({ guest }) => (
  <span className="badge taken">Gifted by {guest.name}{guest.relationship ? ` (${guest.relationship})` : ''}</span>
);

function ItemForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    link: initial?.link ?? '',
    imageUrl: initial?.imageUrl ?? '',
    price: initial?.price ?? '',
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
      await onSubmit({ ...form, price: form.price === '' ? null : Number(form.price) });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="it-title">What would you like?</label>
        <input id="it-title" value={form.title} onChange={set('title')} placeholder="Stand mixer" required maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="it-link">Product link (Amazon, Flipkart, any shop)</label>
        <input id="it-link" type="url" inputMode="url" value={form.link} onChange={set('link')} placeholder="https://" />
      </div>
      <ImageField value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} />
      <div className="field">
        <label htmlFor="it-price">Approximate price (optional)</label>
        <input id="it-price" type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={set('price')} />
      </div>
      <div className="field">
        <label htmlFor="it-desc">Notes for guests (optional, e.g. colour or size)</label>
        <textarea id="it-desc" rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save gift'}</button>
      </div>
    </form>
  );
}

export default function ItemsTab({ base, currency, eventKey }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | item

  const load = useCallback(
    () => organizerApi.get(`${base}/items`).then((d) => setItems(d.items)).catch((e) => toast(e.message, 'error')),
    [base, toast],
  );
  useEffect(() => { load(); }, [load]);

  async function save(form) {
    if (editing === 'new') await organizerApi.post(`${base}/items`, form);
    else await organizerApi.put(`${base}/items/${editing.id}`, form);
    setEditing(null);
    load();
  }

  async function remove(item) {
    const warning = item.claimedBy ? ` ${decryptProfile(eventKey, item.claimedBy.profile).name} has already chosen to gift it.` : '';
    if (!window.confirm(`Remove "${item.title}" from the wishlist?${warning}`)) return;
    try {
      await organizerApi.del(`${base}/items/${item.id}`);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!items) return <Loading />;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <p className="muted">Gifts you would love to receive. Guests pick one, and it disappears for everyone else.</p>
        <button className="btn" onClick={() => setEditing('new')}>Add a gift</button>
      </div>

      {items.length === 0 ? (
        <div className="card"><Empty>Your wishlist is empty. Add the first gift you would love.</Empty></div>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <GiftCard
              key={item.id}
              item={item}
              currency={currency}
              badge={
                item.claimedBy ? (
                  <GiftedBadge guest={decryptProfile(eventKey, item.claimedBy.profile)} />
                ) : (
                  <span className="badge open">Pending</span>
                )
              }
            >
              <button className="btn btn-quiet btn-small" onClick={() => setEditing(item)}>Edit</button>
              <button className="btn btn-quiet btn-small danger-text" onClick={() => remove(item)}>Remove</button>
            </GiftCard>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add a gift' : 'Edit gift'} onClose={() => setEditing(null)}>
          <ItemForm initial={editing === 'new' ? null : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
