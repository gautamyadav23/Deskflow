import React, { useState } from 'react';
import TicketColumn from './TicketColumn';

const TicketBoard = ({ tickets = [], onUpdateStatus, onDeleteTicket, onShowErrorToast }) => {
  const [draggedTicketStatus, setDraggedTicketStatus] = useState(null);

  const handleDragStart = (e) => {
    const card = e.target.closest('.ticket-card');
    if (card) {
      const status = card.getAttribute('data-status');
      setDraggedTicketStatus(status);
    }
  };

  const handleDragEnd = () => {
    setDraggedTicketStatus(null);
  };

  // Group tickets by status
  const ticketsByStatus = {
    open: tickets.filter(t => t.status === 'open'),
    in_progress: tickets.filter(t => t.status === 'in_progress'),
    resolved: tickets.filter(t => t.status === 'resolved'),
    closed: tickets.filter(t => t.status === 'closed')
  };

  return (
    <div 
      className="ticket-board"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TicketColumn
        status="open"
        title="Open"
        tickets={ticketsByStatus.open}
        draggedTicketStatus={draggedTicketStatus}
        onUpdateStatus={onUpdateStatus}
        onDeleteTicket={onDeleteTicket}
        onShowErrorToast={onShowErrorToast}
      />
      <TicketColumn
        status="in_progress"
        title="In Progress"
        tickets={ticketsByStatus.in_progress}
        draggedTicketStatus={draggedTicketStatus}
        onUpdateStatus={onUpdateStatus}
        onDeleteTicket={onDeleteTicket}
        onShowErrorToast={onShowErrorToast}
      />
      <TicketColumn
        status="resolved"
        title="Resolved"
        tickets={ticketsByStatus.resolved}
        draggedTicketStatus={draggedTicketStatus}
        onUpdateStatus={onUpdateStatus}
        onDeleteTicket={onDeleteTicket}
        onShowErrorToast={onShowErrorToast}
      />
      <TicketColumn
        status="closed"
        title="Closed"
        tickets={ticketsByStatus.closed}
        draggedTicketStatus={draggedTicketStatus}
        onUpdateStatus={onUpdateStatus}
        onDeleteTicket={onDeleteTicket}
        onShowErrorToast={onShowErrorToast}
      />
    </div>
  );
};

export default TicketBoard;
