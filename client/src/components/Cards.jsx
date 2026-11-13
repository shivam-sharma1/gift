import { ProgressBar, Thumb, formatMoney } from './ui.jsx';

export function GiftCard({ item, currency, badge, children }) {
  return (
    <article className="card gift">
      <Thumb src={item.imageUrl} />
      <div className="gift-body stack-tight">
        <div className="gift-title">
          <h3>{item.title}</h3>
          {badge}
        </div>
        {item.price != null && <p className="price">About {formatMoney(currency, item.price)}</p>}
        {item.description && <p className="muted">{item.description}</p>}
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="link">View product &rarr;</a>
        )}
        {children && <div className="gift-actions">{children}</div>}
      </div>
    </article>
  );
}

export function FundCard({ fund, currency, badge, children }) {
  const remaining = Math.max(0, fund.target - fund.raised);
  return (
    <article className="card gift">
      <Thumb src={fund.imageUrl} />
      <div className="gift-body stack-tight">
        <div className="gift-title">
          <h3>{fund.title}</h3>
          {badge}
        </div>
        {fund.description && <p className="muted">{fund.description}</p>}
        <ProgressBar value={fund.raised} max={fund.target} />
        <p className="fund-figures">
          <strong>{formatMoney(currency, fund.raised)}</strong> of {formatMoney(currency, fund.target)}
          <span className="muted"> · {remaining > 0 ? `${formatMoney(currency, remaining)} to go` : 'Fully funded'}</span>
        </p>
        {children && <div className="gift-actions">{children}</div>}
      </div>
    </article>
  );
}
