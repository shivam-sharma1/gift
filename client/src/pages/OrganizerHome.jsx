import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { organizerApi, tokens } from '../api.js';
import { useAuth } from '../auth.jsx';
import { createEventKey } from '../crypto.js';
import EventForm from '../components/EventForm.jsx';
import Layout from '../components/Layout.jsx';
import { Empty, Loading, Modal, formatDate, useToast } from '../components/ui.jsx';

export default function OrganizerHome() {
  const { organizer, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [events, setEvents] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    organizerApi.get('/organizer/events').then((d) => setEvents(d.events)).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  async function create(form) {
    const { wrappedKey } = createEventKey(tokens.getWrapKey());
    const { event } = await organizerApi.post('/organizer/events', { ...form, wrappedKey });
    navigate(`/organizer/events/${event.id}`);
  }

  return (
    <Layout
      actions={
        <>
          <span className="muted hide-small">{organizer.name}</span>
          <button className="btn btn-quiet btn-small" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
        </>
      }
    >
      <div className="page-head">
        <h1>Your events</h1>
        <button className="btn" onClick={() => setCreating(true)}>New event</button>
      </div>

      {!events ? (
        <Loading />
      ) : events.length === 0 ? (
        <div className="card center stack">
          <Empty>You have no events yet. Create your first one to start building a wishlist.</Empty>
          <button className="btn" onClick={() => setCreating(true)}>Create an event</button>
        </div>
      ) : (
        <div className="grid two">
          {events.map((event) => (
            <Link key={event.id} to={`/organizer/events/${event.id}`} className="card event-card">
              <h2>{event.title}</h2>
              <p className="muted">{[event.coupleNames, formatDate(event.date)].filter(Boolean).join(' · ') || 'No date set'}</p>
              <p><strong>{event.guestCount}</strong> {event.guestCount === 1 ? 'guest' : 'guests'} joined</p>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="New event" onClose={() => setCreating(false)}>
          <EventForm submitLabel="Create event" onSubmit={create} onCancel={() => setCreating(false)} />
        </Modal>
      )}
    </Layout>
  );
}
