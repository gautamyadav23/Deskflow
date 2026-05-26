import React, { useState, useEffect } from 'react';

// SLA Targets in minutes
const SLA_TARGETS = {
  urgent: 60,
  high: 240,
  medium: 1440,
  low: 4320
};

const formatAge = (minutes) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

const TicketCard = ({ ticket, onUpdateStatus, onDeleteTicket }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentAgeMinutes, setCurrentAgeMinutes] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Dynamic Age calculation to keep the clock ticking live
  useEffect(() => {
    const calculateAge = () => {
      const start = new Date(ticket.createdAt);
      const isResolvedOrClosed = ticket.status === 'resolved' || ticket.status === 'closed';
      const end = (isResolvedOrClosed && ticket.resolvedAt) ? new Date(ticket.resolvedAt) : new Date();
      
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);
      setCurrentAgeMinutes(Math.max(0, diffMins));
    };

    calculateAge();

    // Only set interval for active tickets (open / in_progress)
    const isResolvedOrClosed = ticket.status === 'resolved' || ticket.status === 'closed';
    if (!isResolvedOrClosed) {
      const interval = setInterval(calculateAge, 30000); // update every 30s
      return () => clearInterval(interval);
    }
  }, [ticket.createdAt, ticket.resolvedAt, ticket.status]);

  const targetMinutes = SLA_TARGETS[ticket.priority] || Infinity;
  const isSlaBreached = currentAgeMinutes > targetMinutes;

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', ticket._id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: ticket._id,
      status: ticket.status
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const descriptionMaxLength = 90;
  const showToggle = ticket.description.length > descriptionMaxLength;
  const displayedDescription = isExpanded 
    ? ticket.description 
    : `${ticket.description.slice(0, descriptionMaxLength)}${showToggle ? '...' : ''}`;

  return (
    <div
      className={`ticket-card fade-in ${isSlaBreached ? 'sla-breached' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-status={ticket.status}
    >
      {/* Top row: Subject & SLA badge */}
      <div className="card-top">
        <h4 className="card-subject">{ticket.subject}</h4>
        {isSlaBreached && (
          <span className="sla-badge" title={`SLA target exceeded (${formatAge(targetMinutes)})`}>
            SLA Breached
          </span>
        )}
      </div>

      {/* Description */}
      <div>
        <p className="card-description">{displayedDescription}</p>
        {showToggle && (
          <button 
            className="desc-toggle" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="card-meta">
        <div className="meta-row">
          <span className="email-label" title={ticket.customerEmail}>
            {ticket.customerEmail}
          </span>
          <span className={`priority-badge ${ticket.priority}`}>
            {ticket.priority}
          </span>
        </div>
        <div className="meta-row">
          <span style={{ color: 'var(--text-muted)' }}>Opened Age:</span>
          <span className="age-ticker" title={`Created at: ${new Date(ticket.createdAt).toLocaleString()}`}>
            {formatAge(currentAgeMinutes)}
          </span>
        </div>
      </div>

      {/* Actions / Transitions */}
      <div className="card-actions">
        {/* Delete ticket */}
        <button 
          className="card-delete-btn" 
          onClick={() => onDeleteTicket(ticket._id)}
          title="Delete Ticket"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>

        {/* Status transition controls */}
        {ticket.status === 'open' && (
          <button 
            className="transition-btn" 
            onClick={() => onUpdateStatus(ticket._id, 'in_progress')}
          >
            Start Work
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        )}

        {ticket.status === 'in_progress' && (
          <>
            <button 
              className="transition-btn" 
              onClick={() => onUpdateStatus(ticket._id, 'open')}
              title="Move back to Open"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Revert
            </button>
            <button 
              className="transition-btn" 
              onClick={() => onUpdateStatus(ticket._id, 'resolved')}
            >
              Resolve
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </>
        )}

        {ticket.status === 'resolved' && (
          <>
            <button 
              className="transition-btn" 
              onClick={() => onUpdateStatus(ticket._id, 'in_progress')}
              title="Move back to In Progress"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Reopen
            </button>
            <button 
              className="transition-btn" 
              onClick={() => onUpdateStatus(ticket._id, 'closed')}
            >
              Close
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </button>
          </>
        )}

        {ticket.status === 'closed' && (
          <button 
            className="transition-btn" 
            onClick={() => onUpdateStatus(ticket._id, 'resolved')}
            title="Move back to Resolved"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Reopen
          </button>
        )}
      </div>
    </div>
  );
};

export default TicketCard;
