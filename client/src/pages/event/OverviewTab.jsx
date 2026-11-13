import { useState } from 'react';
import { organizerApi } from '../../api.js';
import EventForm from '../../components/EventForm.jsx';
import { Modal, ProgressBar, formatMoney, useToast } from '../../components/ui.jsx';

export default function OverviewTab({ base, data, eventKey, reload, onDeleted }) {
  const { event, stats } = data;
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  // The key sits after the # so browsers never send it to the server.
  const link = eventKey ? `${window.location.origin}/e/${event.inviteCode}#k=${eventKey}` : '';

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied');
    } catch {
      toast('Press and hold the text to copy it', 'error');
    }
  }

  async function save(form) {
    await organizerApi.put(base, form);
    setEditing(false);
    reload();
  }

  async function remove() {
    if (!window.confirm('Delete this event with all its gifts, funds and guests? This cannot be undone.')) return;
    try {
      await organizerApi.del(base);
      onDeleted();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h2>Invite your guests</h2>
        <p className="muted">Share this link with your guests. It carries the key that keeps their details private, so use the whole link.</p>
        <div className="copy-row">
          <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={() => copy(link)} disabled={!link}>Copy link</button>
        </div>
      </section>

      <section className="grid three">
        <div className="card stat"><span className="stat-num">{stats.guests}</span><span className="muted">Guests joined</span></div>
        <div className="card stat">
          <span className="stat-num">{stats.itemsClaimed}<small> / {stats.items}</small></span>
          <span className="muted">Wishlist gifts taken</span>
        </div>
        <div className="card stat">
          <span className="stat-num">{formatMoney(event.currency, stats.fundsRaised)}</span>
          <span className="muted">pledged of {formatMoney(event.currency, stats.fundsTarget)}</span>
          <ProgressBar value={stats.fundsRaised} max={stats.fundsTarget} />
        </div>
      </section>

      <section className="card stack">
        <h2>Event details</h2>
        <div className="actions start">
          <button className="btn btn-quiet" onClick={() => setEditing(true)}>Edit details</button>
          <button className="btn btn-danger" onClick={remove}>Delete event</button>
        </div>
      </section>

      {editing && (
        <Modal title="Edit event" onClose={() => setEditing(false)}>
          <EventForm initial={event} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}
