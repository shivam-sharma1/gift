import { useCallback, useEffect, useMemo, useState } from 'react';
import { organizerApi } from '../../api.js';
import { decryptProfile } from '../../crypto.js';
import { Empty, Loading, formatMoney, useToast } from '../../components/ui.jsx';

export default function GuestsTab({ base, currency, eventKey }) {
  const toast = useToast();
  const [rawGuests, setRawGuests] = useState(null);

  const load = useCallback(
    () => organizerApi.get(`${base}/guests`).then((d) => setRawGuests(d.guests)).catch((e) => toast(e.message, 'error')),
    [base, toast],
  );
  useEffect(() => { load(); }, [load]);

  // Names are decrypted here, in the organiser's browser.
  const guests = useMemo(
    () => rawGuests && rawGuests.map((g) => ({ ...g, ...decryptProfile(eventKey, g.profile) })),
    [rawGuests, eventKey],
  );

  async function remove(guest) {
    if (!window.confirm(`Remove ${guest.name}? Their chosen gifts become available again and their pledges are cancelled.`)) return;
    try {
      await organizerApi.del(`${base}/guests/${guest.id}`);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!guests) return <Loading />;
  if (guests.length === 0) return <div className="card"><Empty>No guests have joined yet. Share your invite link from the Overview tab.</Empty></div>;

  return (
    <div className="stack">
      <p className="muted">{guests.length} {guests.length === 1 ? 'guest' : 'guests'}. Only you can see who chose what.</p>
      {guests.map((guest) => (
        <article key={guest.id} className="card guest-row">
          <div className="stack-tight grow">
            <h3>{guest.name}</h3>
            <p className="muted">{guest.relationship}</p>
            {guest.gifts.length === 0 && guest.contributions.length === 0 ? (
              <p className="muted">Nothing chosen yet.</p>
            ) : (
              <ul className="plain-list">
                {guest.gifts.map((title, i) => <li key={`g${i}`}><span>Gift: {title}</span></li>)}
                {guest.contributions.map((c, i) => (
                  <li key={`c${i}`}><span>Fund: {c.fundTitle}</span><strong>{formatMoney(currency, c.amount)}</strong></li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn btn-quiet btn-small danger-text" onClick={() => remove(guest)}>Remove</button>
        </article>
      ))}
    </div>
  );
}
