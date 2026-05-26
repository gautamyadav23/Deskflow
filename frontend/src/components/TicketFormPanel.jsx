import React, { useState } from 'react';

const TicketFormPanel = ({ isOpen, onClose, onCreateTicket }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [priority, setPriority] = useState('medium');
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        newErrors.customerEmail = 'Please enter a valid email address';
      }
    }
    if (!priority) {
      newErrors.priority = 'Priority is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await onCreateTicket({
      subject,
      description,
      customerEmail,
      priority
    });
    setIsSubmitting(false);

    if (success) {
      // Clear form
      setSubject('');
      setDescription('');
      setCustomerEmail('');
      setPriority('medium');
      setErrors({});
      onClose();
    }
  };

  return (
    <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Create Support Ticket</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-content">
          {/* Subject */}
          <div className="form-group">
            <label htmlFor="ticket-subject">Subject</label>
            <input
              id="ticket-subject"
              type="text"
              className="form-input"
              placeholder="e.g. Printer offline on 2nd floor"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors({ ...errors, subject: null });
              }}
            />
            {errors.subject && <span className="form-error">{errors.subject}</span>}
          </div>

          {/* Customer Email */}
          <div className="form-group">
            <label htmlFor="ticket-email">Customer Email</label>
            <input
              id="ticket-email"
              type="text"
              className="form-input"
              placeholder="e.g. employee@company.com"
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                if (errors.customerEmail) setErrors({ ...errors, customerEmail: null });
              }}
            />
            {errors.customerEmail && <span className="form-error">{errors.customerEmail}</span>}
          </div>

          {/* Priority */}
          <div className="form-group">
            <label htmlFor="ticket-priority">Priority</label>
            <select
              id="ticket-priority"
              className="form-select"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                if (errors.priority) setErrors({ ...errors, priority: null });
              }}
            >
              <option value="low">Low (72 hr target)</option>
              <option value="medium">Medium (24 hr target)</option>
              <option value="high">High (4 hr target)</option>
              <option value="urgent">Urgent (1 hr target)</option>
            </select>
            {errors.priority && <span className="form-error">{errors.priority}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="ticket-desc">Description</label>
            <textarea
              id="ticket-desc"
              className="form-textarea"
              placeholder="Provide a detailed description of the support issue..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: null });
              }}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>
        </form>

        <div className="drawer-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketFormPanel;
