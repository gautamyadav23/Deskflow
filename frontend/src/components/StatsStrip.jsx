import React from 'react';

const StatsStrip = ({ stats }) => {
  const { statusCounts = {}, slaBreachedOpenCount = 0 } = stats || {};

  return (
    <div className="stats-strip fade-in">
      <div className="stat-card">
        <div className="stat-indicator open" />
        <span className="stat-label">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="4" fill="var(--status-open)"/>
          </svg>
          Open
        </span>
        <span className="stat-value">{statusCounts.open || 0}</span>
      </div>

      <div className="stat-card">
        <div className="stat-indicator in_progress" />
        <span className="stat-label">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="4" fill="var(--status-inprogress)"/>
          </svg>
          In Progress
        </span>
        <span className="stat-value">{statusCounts.in_progress || 0}</span>
      </div>

      <div className="stat-card">
        <div className="stat-indicator resolved" />
        <span className="stat-label">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="4" fill="var(--status-resolved)"/>
          </svg>
          Resolved
        </span>
        <span className="stat-value">{statusCounts.resolved || 0}</span>
      </div>

      <div className="stat-card">
        <div className="stat-indicator closed" />
        <span className="stat-label">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="4" fill="var(--status-closed)"/>
          </svg>
          Closed
        </span>
        <span className="stat-value">{statusCounts.closed || 0}</span>
      </div>

      <div className={`stat-card ${slaBreachedOpenCount > 0 ? 'breached-card' : ''}`}>
        <div className="stat-indicator breached" />
        <span className="stat-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--priority-urgent-text)' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          SLA Breached (Active)
        </span>
        <span className="stat-value">{slaBreachedOpenCount}</span>
      </div>
    </div>
  );
};

export default StatsStrip;
