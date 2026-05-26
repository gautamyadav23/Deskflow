import React from 'react';

const Filters = ({ priorityFilter, setPriorityFilter, breachedFilter, setBreachedFilter, onRefresh }) => {
  return (
    <div className="control-bar fade-in">
      <div className="filters-group">
        {/* Priority Filter */}
        <div className="filter-item">
          <label htmlFor="priority-filter">Priority:</label>
          <select
            id="priority-filter"
            className="select-input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* SLA Breached Filter */}
        <div className="filter-item">
          <div 
            className={`switch-container ${breachedFilter ? 'active' : ''}`}
            onClick={() => setBreachedFilter(!breachedFilter)}
          >
            <div className="switch-track">
              <div className="switch-thumb" />
            </div>
            <span className="switch-label">SLA Breached Only</span>
          </div>
        </div>
      </div>

      {/* Refresh and Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn btn-secondary" onClick={onRefresh} title="Reload Board Data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Sync
        </button>
      </div>
    </div>
  );
};

export default Filters;
