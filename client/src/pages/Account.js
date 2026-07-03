import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Account.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';

const CHART = {
  width: 680,
  height: 260,
  left: 58,
  right: 24,
  top: 26,
  bottom: 50,
};

function compactAmount(value) {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount);

  if (absolute >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (absolute >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (absolute >= 1000) return `₹${Math.round(amount / 1000)}K`;
  return `₹${amount}`;
}

function chartPoints(items, getValue, maxValue) {
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const denominator = Math.max(items.length - 1, 1);
  const safeMax = Math.max(maxValue, 1);

  return items.map((item, index) => {
    const value = Number(getValue(item) || 0);

    return {
      item,
      value,
      x: CHART.left + ((index / denominator) * plotWidth),
      y: CHART.top + ((1 - (value / safeMax)) * plotHeight),
    };
  });
}

function pathFromPoints(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

function Account() {
  const [transactions, setTransactions] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [donationAmount, setDonationAmount] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');

  const [usernames, setUsernames] = useState([]);
  const [meetingIds, setMeetingIds] = useState([]);
  const [eventIds, setEventIds] = useState([]);

  const [filters, setFilters] = useState({
    type: '',
    username: '',
    meetingId: '',
    eventId: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchPaymentSettings();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await apiFetch('/accounts');
      const data = await res.json();
      setTransactions(data);

      const users = [...new Set(data.map(t => t.username).filter(Boolean))];
      const meetings = [...new Set(data.flatMap(t => t.meetingIds || []))];
      const events = [...new Set(data.flatMap(t => t.eventIds || []))];

      setUsernames(users);
      setMeetingIds(meetings);
      setEventIds(events);
    } catch (err) {
      console.error('Error fetching transactions', err);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await apiFetch('/accounts/payment-settings');
      const data = await res.json();
      setPaymentSettings(data || {});
    } catch (err) {
      console.error('Error fetching payment settings', err);
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = !filters.type || (t.type && t.type.toLowerCase() === filters.type.toLowerCase());
      const matchesUser = !filters.username || t.username === filters.username;
      const matchesMeeting = !filters.meetingId || (Array.isArray(t.meetingIds) && t.meetingIds.includes(filters.meetingId));
      const matchesEvent = !filters.eventId || (Array.isArray(t.eventIds) && t.eventIds.includes(filters.eventId));

      return matchesType && matchesUser && matchesMeeting && matchesEvent;
    });
  }, [filters, transactions]);

  const totals = useMemo(() => {
    const credited = filtered
      .filter(t => t.type && t.type.toLowerCase() === 'credited')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const debited = filtered
      .filter(t => t.type && t.type.toLowerCase() === 'debited')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return { credited, debited };
  }, [filtered]);

  const analytics = useMemo(() => {
    const byResident = {};
    const byEvent = {};
    const byMonth = {};
    let creditedTotal = 0;
    let debitedTotal = 0;

    transactions.forEach(tx => {
      const amount = Number(tx.amount || 0);
      const type = String(tx.type || '').toLowerCase();
      const username = tx.username || 'Unassigned';
      const month = tx.transactionDate ? new Date(tx.transactionDate).toISOString().slice(0, 7) : 'Unknown';

      byResident[username] = byResident[username] || { credited: 0, debited: 0 };
      byMonth[month] = byMonth[month] || { credited: 0, debited: 0 };

      if (type === 'credited') {
        creditedTotal += amount;
        byResident[username].credited += amount;
        byMonth[month].credited += amount;
      }

      if (type === 'debited') {
        debitedTotal += amount;
        byResident[username].debited += amount;
        byMonth[month].debited += amount;
        (tx.eventIds || []).forEach(eventId => {
          byEvent[eventId] = (byEvent[eventId] || 0) + amount;
        });
      }
    });

    const residents = Object.entries(byResident)
      .map(([name, value]) => ({ name, ...value, total: value.credited + value.debited }))
      .sort((a, b) => b.total - a.total);

    const events = Object.entries(byEvent)
      .map(([eventId, amount]) => ({ eventId, amount }))
      .sort((a, b) => b.amount - a.amount);

    const months = Object.entries(byMonth)
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { residents, events, months, credited: creditedTotal, debited: debitedTotal };
  }, [transactions]);

  const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const topResidents = analytics.residents.slice(0, 5);
  const topEvents = analytics.events.slice(0, 5);
  const recentMonths = analytics.months.slice(-6);
  const topDonor = analytics.residents.filter(item => item.credited > 0).sort((a, b) => b.credited - a.credited)[0];
  const topUser = analytics.residents.filter(item => item.debited > 0).sort((a, b) => b.debited - a.debited)[0];
  const topEvent = analytics.events[0];
  const maxResidentChartAmount = Math.max(...topResidents.flatMap(item => [item.credited, item.debited]), 1);
  const maxEventChartAmount = Math.max(...topEvents.map(item => item.amount), 1);
  const maxMonthlyAmount = Math.max(...recentMonths.map(item => Math.max(item.credited, item.debited)), 1);
  const analyticsNet = analytics.credited - analytics.debited;
  const totalMovement = analytics.credited + analytics.debited || 1;
  const creditPercent = Math.round((analytics.credited / totalMovement) * 100);
  const upiLink = paymentSettings.upiId
    ? `upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.upiDisplayName || paymentSettings.accountHolderName || 'Neighborly')}&am=${encodeURIComponent(donationAmount || '')}&cu=INR&tn=${encodeURIComponent(paymentSettings.paymentNote || 'Community donation')}`
    : '';

  const renderLineChart = ({ items, series, labelFor, maxValue, emptyText, showPointValues = false }) => {
    if (!items.length) {
      return <p className="empty-analytics">{emptyText}</p>;
    }

    const gridValues = [1, 0.5, 0];
    const plotWidth = CHART.width - CHART.left - CHART.right;

    return (
      <div className="chart-panel">
        <div className="chart-legend">
          {series.map(item => (
            <span key={item.key}><i style={{ background: item.color }}></i>{item.label}</span>
          ))}
        </div>

        <svg className="line-chart" viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img">
          {gridValues.map((ratio) => {
            const y = CHART.top + ((1 - ratio) * (CHART.height - CHART.top - CHART.bottom));
            return (
              <g key={ratio}>
                <line x1={CHART.left} y1={y} x2={CHART.left + plotWidth} y2={y} className="chart-grid-line" />
                <text x={CHART.left - 10} y={y + 4} className="chart-axis-label" textAnchor="end">
                  {compactAmount(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          <line x1={CHART.left} y1={CHART.top} x2={CHART.left} y2={CHART.height - CHART.bottom} className="chart-axis-line" />
          <line x1={CHART.left} y1={CHART.height - CHART.bottom} x2={CHART.left + plotWidth} y2={CHART.height - CHART.bottom} className="chart-axis-line" />

          {series.map((line) => {
            const points = chartPoints(items, line.getValue, maxValue);
            return (
              <g key={line.key}>
                <path d={pathFromPoints(points)} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((point, index) => (
                  <g key={`${line.key}-${index}`}>
                    <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke={line.color} strokeWidth="3">
                      <title>{`${line.label}: ${compactAmount(point.value)}`}</title>
                    </circle>
                    {showPointValues && (
                      <text x={point.x} y={Math.max(point.y - 10, 14)} className="chart-value-label" textAnchor="middle" fill={line.color}>
                        {compactAmount(point.value)}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}

          {items.map((item, index) => {
            const point = chartPoints(items, () => 0, maxValue)[index];
            return (
              <text key={`${labelFor(item)}-${index}`} x={point.x} y={CHART.height - 18} className="chart-x-label" textAnchor="middle">
                {labelFor(item)}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderIdLinks = (ids, type) => {
    const path = type === 'meeting' ? '/meeting' : '/events';
    const queryKey = type === 'meeting' ? 'meetingId' : 'eventId';
    const list = ids || [];

    if (!list.length) {
      return 'N/A';
    }

    return list.map(id => (
      <Link className="ledger-id-link" key={id} to={`${path}?${queryKey}=${encodeURIComponent(id)}`}>
        {id}
      </Link>
    ));
  };

  return (
  <div className="account-container">
    <PageNav />
    <section className="page-hero compact">
      <span className="eyebrow">Community Ledger</span>
      <h1>Track donations, expenses, and linked community activity.</h1>
    </section>

    <div className="account-tabs" role="tablist" aria-label="Transaction sections">
      <button type="button" className={activeTab === 'ledger' ? 'active' : ''} onClick={() => setActiveTab('ledger')}>
        <i className="fa-solid fa-table" aria-hidden="true"></i>
        Ledger
      </button>
      <button type="button" className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
        <i className="fa-solid fa-chart-pie" aria-hidden="true"></i>
        Analytics
      </button>
      <button type="button" className={activeTab === 'donate' ? 'active' : ''} onClick={() => setActiveTab('donate')}>
        <i className="fa-solid fa-hand-holding-heart" aria-hidden="true"></i>
        Donate
      </button>
    </div>

    {activeTab === 'ledger' && (
      <>
        <div className="filter-bar">
          <select
            value={filters.username}
            onChange={(e) => setFilters({ ...filters, username: e.target.value })}
          >
            <option value="">Filter by Username</option>
            {usernames.map((user, i) => (
              <option key={i} value={user}>{user}</option>
            ))}
          </select>

          <select
            value={filters.meetingId}
            onChange={(e) => setFilters({ ...filters, meetingId: e.target.value })}
          >
            <option value="">Filter by Meeting ID</option>
            {meetingIds.map((id, i) => (
              <option key={i} value={id}>{id}</option>
            ))}
          </select>

          <select
            value={filters.eventId}
            onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
          >
            <option value="">Filter by Event ID</option>
            {eventIds.map((id, i) => (
              <option key={i} value={id}>{id}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All</option>
            <option value="credited">Credited</option>
            <option value="debited">Debited</option>
          </select>
        </div>

        <div className="totals-bar">
          <span><strong>Credited</strong> {formatAmount(totals.credited)}</span>
          <span><strong>Debited</strong> {formatAmount(totals.debited)}</span>
          <span><strong>Net</strong> {formatAmount(totals.credited - totals.debited)}</span>
        </div>

        <div className="account-table-wrapper">
          <table className="account-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Meeting IDs</th>
                <th>Event IDs</th>
                <th>Amount</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, idx) => (
                <tr key={idx}>
                  <td>{new Date(tx.transactionDate).toLocaleDateString()}</td>
                  <td>{tx.type}</td>
                  <td><div className="ledger-id-list">{renderIdLinks(tx.meetingIds, 'meeting')}</div></td>
                  <td><div className="ledger-id-list">{renderIdLinks(tx.eventIds, 'event')}</div></td>
                  <td>{formatAmount(tx.amount)}</td>
                  <td>{tx.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

    {activeTab === 'analytics' && (
      <section className="analytics-dashboard">
        <div className="analytics-summary-card finance-overview">
          <div className="finance-copy">
            <span className="eyebrow">Community Flow</span>
            <h2>{formatAmount(analyticsNet)}</h2>
            <div className="flow-legend" aria-label="Credit and debit totals">
              <span><i className="credit-dot"></i>Credited {formatAmount(analytics.credited)}</span>
              <span><i className="debit-dot"></i>Debited {formatAmount(analytics.debited)}</span>
            </div>
          </div>

          <div className="finance-snapshot" aria-label="Ledger highlights">
            <div className="balance-meter">
              <span>{creditPercent}%</span>
              <small>credit share</small>
            </div>
            <div className="snapshot-stat">
              <span>Top donor</span>
              <strong>{topDonor?.name || 'N/A'}</strong>
              <small>{formatAmount(topDonor?.credited || 0)}</small>
            </div>
            <div className="snapshot-stat">
              <span>Top user</span>
              <strong>{topUser?.name || 'N/A'}</strong>
              <small>{formatAmount(topUser?.debited || 0)}</small>
            </div>
            <div className="snapshot-stat">
              <span>Top event spend</span>
              {topEvent ? (
                <Link to={`/events?eventId=${encodeURIComponent(topEvent.eventId)}`}>{topEvent.eventId}</Link>
              ) : (
                <strong>N/A</strong>
              )}
              <small>{formatAmount(topEvent?.amount || 0)}</small>
            </div>
          </div>
        </div>

        <div className="analytics-grid">
          <article className="analytics-card">
            <div className="analytics-card-heading">
              <h3>Top Resident Activity</h3>
            </div>
            {renderLineChart({
              items: topResidents,
              maxValue: maxResidentChartAmount,
              labelFor: item => item.name.slice(0, 10),
              emptyText: 'No resident transactions yet.',
              series: [
                { key: 'credited', label: 'Credited', color: '#0f766e', getValue: item => item.credited },
                { key: 'debited', label: 'Debited', color: '#be123c', getValue: item => item.debited },
              ],
            })}
          </article>

          <article className="analytics-card">
            <div className="analytics-card-heading">
              <h3>Event Expense Leaders</h3>
            </div>
            {renderLineChart({
              items: topEvents,
              maxValue: maxEventChartAmount,
              labelFor: item => item.eventId,
              emptyText: 'No event-linked expenses yet.',
              showPointValues: true,
              series: [
                { key: 'expense', label: 'Expense', color: '#1d4ed8', getValue: item => item.amount },
              ],
            })}
          </article>

          <article className="analytics-card wide">
            <div className="analytics-card-heading">
              <h3>Six-Month Credit & Debit Trend</h3>
            </div>
            {renderLineChart({
              items: recentMonths,
              maxValue: maxMonthlyAmount,
              labelFor: item => item.month,
              emptyText: 'No monthly data yet.',
              series: [
                { key: 'credited', label: 'Credited', color: '#0f766e', getValue: item => item.credited },
                { key: 'debited', label: 'Debited', color: '#be123c', getValue: item => item.debited },
              ],
            })}
          </article>
        </div>
      </section>
    )}

    {activeTab === 'donate' && (
      <section className="donation-panel">
        <div className="donation-card">
          <div className="donation-heading">
            <span className="eyebrow">Community Donation</span>
            <h2>Payment Details</h2>
          </div>

          {!paymentSettings.upiId && !paymentSettings.accountNumber && (
            <p className="empty-analytics">Donation payment details are not configured yet.</p>
          )}

          {(paymentSettings.accountNumber || paymentSettings.bankName) && (
            <div className="payment-detail-grid">
              <p><strong>Account Holder</strong>{paymentSettings.accountHolderName || 'N/A'}</p>
              <p><strong>Bank</strong>{paymentSettings.bankName || 'N/A'}</p>
              <p><strong>Account Number</strong>{paymentSettings.accountNumber || 'N/A'}</p>
              <p><strong>IFSC</strong>{paymentSettings.ifscCode || 'N/A'}</p>
              <p><strong>Branch</strong>{paymentSettings.branchName || 'N/A'}</p>
            </div>
          )}

          {paymentSettings.upiId && (
            <div className="upi-payment-box">
              <div>
                <span>UPI ID</span>
                <strong>{paymentSettings.upiId}</strong>
                {paymentSettings.upiDisplayName && <small>{paymentSettings.upiDisplayName}</small>}
              </div>
              <label>
                Amount
                <input
                  type="number"
                  min="1"
                  placeholder="Optional amount"
                  value={donationAmount}
                  onChange={e => setDonationAmount(e.target.value)}
                />
              </label>
              <a className="upi-pay-button" href={upiLink}>
                <i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
                Pay with UPI
              </a>
            </div>
          )}

          {paymentSettings.paymentNote && <p className="payment-note">{paymentSettings.paymentNote}</p>}
        </div>
      </section>
    )}

  </div>
);

}

export default Account;
