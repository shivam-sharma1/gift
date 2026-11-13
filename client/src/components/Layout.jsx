import { Link } from 'react-router-dom';
import { GiftIcon } from './ui.jsx';

export default function Layout({ actions, children }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <GiftIcon size={26} />
            <span>Giftwise</span>
          </Link>
          <div className="topbar-actions">{actions}</div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
