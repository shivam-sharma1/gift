import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OrganizerHome from './pages/OrganizerHome.jsx';
import EventManage from './pages/EventManage.jsx';
import GuestEvent from './pages/GuestEvent.jsx';

function RequireOrganizer({ children }) {
  const { organizer, loading } = useAuth();
  if (loading) return <Layout><Loading /></Layout>;
  return organizer ? children : <Navigate to="/login" replace />;
}

function NotFound() {
  return (
    <Layout>
      <div className="card center stack">
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist.</p>
        <Link to="/" className="btn">Go home</Link>
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/organizer" element={<RequireOrganizer><OrganizerHome /></RequireOrganizer>} />
      <Route path="/organizer/events/:eventId" element={<RequireOrganizer><EventManage /></RequireOrganizer>} />
      <Route path="/e/:code" element={<GuestEvent />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
