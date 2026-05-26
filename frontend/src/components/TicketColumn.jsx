import React, { useState } from 'react';
import TicketCard from './TicketCard';

const ALLOWED_TRANSITIONS = {
  'open': ['in_progress'],
  'in_progress': ['open', 'resolved'],
  'resolved': ['in_progress', 'closed'],
  'closed': ['resolved']
};

const TicketColumn = ({ 
  status, 
  title, 
  tickets, 
  draggedTicketStatus, 
  onUpdateStatus, 
  onDeleteTicket,
  onShowErrorToast
}) => {
  const [dragState, setDragState] = useState(null); // 'over' | 'error' | null

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!draggedTicketStatus) return;

    if (dragState) return; // avoid redundant state sets

    const isValid = draggedTicketStatus === status || 
                    (ALLOWED_TRANSITIONS[draggedTicketStatus] && 
                     ALLOWED_TRANSITIONS[draggedTicketStatus].includes(status));

    if (isValid) {
      setDragState('over');
      e.dataTransfer.dropEffect = 'move';
    } else {
      setDragState('error');
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDragState(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragState(null);
    
    try {
      const ticketId = e.dataTransfer.getData('text/plain');
      const dataStr = e.dataTransfer.getData('application/json');
      if (!ticketId || !dataStr) return;

      const { id, status: sourceStatus } = JSON.parse(dataStr);
      
      // If dropped in the same column, do nothing
      if (sourceStatus === status) return;

      // Double check transition rules
      const isAllowed = ALLOWED_TRANSITIONS[sourceStatus] && 
                        ALLOWED_TRANSITIONS[sourceStatus].includes(status);

      if (isAllowed) {
        onUpdateStatus(id, status);
      } else {
        // Trigger a temporary shake/error visual state and notify
        setDragState('error');
        setTimeout(() => setDragState(null), 800);
        onShowErrorToast(`Cannot move ticket from '${sourceStatus}' to '${status}' directly.`);
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  return (
    <div
      className={`board-column ${dragState === 'over' ? 'drag-over' : ''} ${dragState === 'error' ? 'drag-error' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title">
          <span className={`column-indicator ${status}`} />
          {title}
        </div>
        <span className="column-badge">{tickets.length}</span>
      </div>

      <div className="column-content">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              onUpdateStatus={onUpdateStatus}
              onDeleteTicket={onDeleteTicket}
            />
          ))
        ) : (
          <div className="empty-column">
            <svg 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" 
              />
            </svg>
            <span>No tickets here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketColumn;
