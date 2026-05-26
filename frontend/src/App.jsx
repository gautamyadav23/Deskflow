import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import StatsStrip from './components/StatsStrip';
import Filters from './components/Filters';
import TicketBoard from './components/TicketBoard';
import TicketFormPanel from './components/TicketFormPanel';

// Get Backend API URL (configurable for production deployment)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5050';

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    priorityCounts: { low: 0, medium: 0, high: 0, urgent: 0 },
    slaBreachedOpenCount: 0
  });

  const [priorityFilter, setPriorityFilter] = useState('');
  const [breachedFilter, setBreachedFilter] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast notification helper
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch Stats from Backend
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/stats`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Fetch Tickets from Backend (applying priority and breach filters)
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/tickets`;
      const params = new URLSearchParams();
      if (priorityFilter) params.append('priority', priorityFilter);
      if (breachedFilter) params.append('breached', 'true');
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Could not connect to the DeskFlow server. Please check that the backend is running.');
      showToast('Error connecting to backend server', 'error');
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, breachedFilter, showToast]);

  // Load initial data
  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [fetchTickets, fetchStats]);

  // Create Ticket Handler
  const handleCreateTicket = async (ticketData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || 'Failed to create ticket', 'error');
        return false;
      }
      
      // Update local ticket list
      setTickets((prev) => [data, ...prev]);
      
      // Refresh stats
      fetchStats();
      showToast('Ticket created successfully!', 'success');
      return true;
    } catch (err) {
      console.error('Error creating ticket:', err);
      showToast('Error connecting to server', 'error');
      return false;
    }
  };

  // Update Status Handler (supports drag and drop and button clicks)
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      // Optimistic update for UI smoothness
      const originalTickets = [...tickets];
      setTickets((prev) => 
        prev.map((t) => t._id === ticketId ? { ...t, status: newStatus } : t)
      );

      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Rollback state if error occurs
        setTickets(originalTickets);
        showToast(data.error || 'Failed to update ticket status', 'error');
        return;
      }
      
      // Update with server-validated ticket (updated timestamps etc.)
      setTickets((prev) => 
        prev.map((t) => t._id === ticketId ? data : t)
      );
      
      fetchStats();
      showToast(`Ticket status updated to '${newStatus.replace('_', ' ')}'`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Error connecting to server', 'error');
    }
  };

  // Delete Ticket Handler
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || 'Failed to delete ticket', 'error');
        return;
      }
      
      setTickets((prev) => prev.filter((t) => t._id !== ticketId));
      fetchStats();
      showToast('Ticket deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting ticket:', err);
      showToast('Error connecting to server', 'error');
    }
  };

  // Manual Trigger to Sync/Reload
  const handleSync = () => {
    fetchTickets();
    fetchStats();
    showToast('Dashboard synchronized', 'success');
  };

  return (
    <div className="app-container">
      {/* Decorative Glows */}
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />

      {/* Header */}
      <header className="app-header fade-in">
        <div className="logo-section">
          <h1>DeskFlow <span className="logo-dot" /></h1>
          <p>Support Ticket Triage & SLA Monitor</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setIsFormOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Ticket
        </button>
      </header>

      {/* Stats Strip */}
      <StatsStrip stats={stats} />

      {/* Filter Options */}
      <Filters 
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        breachedFilter={breachedFilter}
        setBreachedFilter={setBreachedFilter}
        onRefresh={handleSync}
      />

      {/* Main Board Area */}
      {loading && tickets.length === 0 ? (
        <div className="loading-container fade-in">
          <div className="spinner" />
          <span>Loading triage board...</span>
        </div>
      ) : error ? (
        <div className="loading-container fade-in" style={{ color: 'var(--priority-urgent-text)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={handleSync}>
            Retry Connection
          </button>
        </div>
      ) : (
        <TicketBoard 
          tickets={tickets}
          onUpdateStatus={handleUpdateStatus}
          onDeleteTicket={handleDeleteTicket}
          onShowErrorToast={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Slide-out Form Drawer */}
      <TicketFormPanel 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreateTicket={handleCreateTicket}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--priority-low-text)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--priority-urgent-text)" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
