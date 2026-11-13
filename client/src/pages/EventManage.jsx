import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { organizerApi, tokens } from '../api.js';
import { unwrapEventKey } from '../crypto.js';
import Layout from '../components/Layout.jsx';
import { Loading, formatDate, useToast } from '../components/ui.jsx';
import OverviewTab from './event/OverviewTab.jsx';
import ItemsTab from './event/ItemsTab.jsx';
import FundsTab from './event/FundsTab.jsx';
import GuestsTab from './event/GuestsTab.jsx';

const TABS = [
  ['overview', 'Overview'],
  ['wishlist', 'Wishlist'],
  ['funds', 'Funds'],
  ['guests', 'Guests'],
];

export default function EventManage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'overview';
  const base = `/organizer/events/${eventId}`;

  const load = useCallback(async () => {
    try {
      setData(await organizerApi.get(base));
    } catch (err) {
      toast(err.message, 'error');
      if (err.status === 404) navigate('/organizer', { replace: true });
    }
  }, [base, navigate, toast]);

  useEffect(() => { load(); }, [load]);

  // Only the organiser's browser can unwrap this key; the server stores it encrypted.
  const eventKey = useMemo(() => {
    try {
      return data ? unwrapEventKey(tokens.getWrapKey(), data.event.wrappedKey) : null;
    } catch {
      return null;
    }
  }, [data]);

  return (
    <Layout actions={<Link to="/organizer" className="btn btn-quiet btn-small">All events</Link>}>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="stack-tight">
            <h1>{data.event.title}</h1>
            <p className="muted">{[data.event.coupleNames, formatDate(data.event.date)].filter(Boolean).join(' · ')}</p>
          </div>
          {!eventKey && <p className="error" role="alert">This event could not be unlocked on this device. Please sign out and sign in again.</p>}
          <nav className="tabs" aria-label="Event sections">
            {TABS.map(([key, label]) => (
              <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setParams({ tab: key })}>
                {label}
              </button>
            ))}
          </nav>
          {tab === 'overview' && <OverviewTab base={base} data={data} eventKey={eventKey} reload={load} onDeleted={() => navigate('/organizer')} />}
          {tab === 'wishlist' && <ItemsTab base={base} currency={data.event.currency} eventKey={eventKey} />}
          {tab === 'funds' && <FundsTab base={base} currency={data.event.currency} eventKey={eventKey} />}
          {tab === 'guests' && <GuestsTab base={base} currency={data.event.currency} eventKey={eventKey} />}
        </>
      )}
    </Layout>
  );
}
