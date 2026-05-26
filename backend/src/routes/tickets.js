const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

// Helper to get response target in minutes based on priority
const getTargetMinutes = (priority) => {
  switch (priority) {
    case 'urgent': return 60;        // 1 hour
    case 'high': return 240;        // 4 hours
    case 'medium': return 1440;     // 24 hours
    case 'low': return 4320;        // 72 hours
    default: return Infinity;
  }
};

// Helper to compute derived fields on a ticket document
const formatTicket = (ticket) => {
  const ticketObj = ticket.toObject();
  const targetMinutes = getTargetMinutes(ticket.priority);
  
  // For resolved/closed tickets, age stops growing at resolvedAt.
  // Otherwise, it grows until now.
  const isResolvedOrClosed = ticket.status === 'resolved' || ticket.status === 'closed';
  const endTime = (isResolvedOrClosed && ticket.resolvedAt) ? new Date(ticket.resolvedAt) : new Date();
  
  const diffMs = endTime - new Date(ticket.createdAt);
  const ageMinutes = Math.floor(diffMs / 60000);
  
  ticketObj.ageMinutes = Math.max(0, ageMinutes);
  ticketObj.slaBreached = ticketObj.ageMinutes > targetMinutes;
  
  return ticketObj;
};

// Allowed transitions definition
const ALLOWED_TRANSITIONS = {
  'open': ['open', 'in_progress'],
  'in_progress': ['open', 'in_progress', 'resolved'],
  'resolved': ['in_progress', 'resolved', 'closed'],
  'closed': ['resolved', 'closed']
};

/**
 * @route   POST /tickets
 * @desc    Create a new ticket
 */
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;

    // Manual input validation for clean 400 responses
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return res.status(400).json({ error: 'Subject is required and must be a non-empty string' });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required and must be a non-empty string' });
    }
    if (!customerEmail || typeof customerEmail !== 'string') {
      return res.status(400).json({ error: 'Customer email is required' });
    }
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!priority || !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Priority must be one of: low, medium, high, urgent' });
    }

    const ticket = new Ticket({
      subject,
      description,
      customerEmail,
      priority
    });

    await ticket.save();
    
    // Send formatted response with derived fields
    res.status(201).json(formatTicket(ticket));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   GET /tickets
 * @desc    Get all tickets with filters (status, priority, breached)
 */
router.get('/', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    
    // Construct database query
    const dbQuery = {};
    if (status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter value' });
      }
      dbQuery.status = status;
    }
    if (priority) {
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority filter value' });
      }
      dbQuery.priority = priority;
    }

    // Fetch matching tickets
    const tickets = await Ticket.find(dbQuery).sort({ createdAt: -1 });

    // Compute derived fields for all tickets
    let formattedTickets = tickets.map(ticket => formatTicket(ticket));

    // In-memory filter for SLA breach if specified
    if (breached !== undefined) {
      const isBreachedFilter = breached === 'true';
      formattedTickets = formattedTickets.filter(t => t.slaBreached === isBreachedFilter);
    }

    res.json(formattedTickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /tickets/stats
 * @desc    Get aggregate statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    // 1. Initialize empty counters
    const statusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    let slaBreachedOpenCount = 0;

    // 2. Query all tickets
    const tickets = await Ticket.find({});

    // 3. Process status, priority and SLA breaches
    tickets.forEach(ticket => {
      // Aggregate status counts
      if (statusCounts[ticket.status] !== undefined) {
        statusCounts[ticket.status]++;
      }
      
      // Aggregate priority counts
      if (priorityCounts[ticket.priority] !== undefined) {
        priorityCounts[ticket.priority]++;
      }

      // Check if ticket is currently open (open or in_progress) AND SLA is breached
      const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';
      if (isOpen) {
        const targetMinutes = getTargetMinutes(ticket.priority);
        const ageMinutes = Math.floor((new Date() - new Date(ticket.createdAt)) / 60000);
        if (ageMinutes > targetMinutes) {
          slaBreachedOpenCount++;
        }
      }
    });

    res.json({
      statusCounts,
      priorityCounts,
      slaBreachedOpenCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /tickets/:id
 * @desc    Update a ticket (supports changing status with validation rules, priority, etc.)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status, priority, subject, description, customerEmail } = req.body;
    
    // Find ticket by ID
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // 1. Enforce status transition rules if status is changing
    if (status !== undefined && status !== ticket.status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: `Invalid status value: ${status}` });
      }

      const currentStatus = ticket.status;
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      
      if (!allowedNext.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid transition: cannot move ticket from status '${currentStatus}' to '${status}'` 
        });
      }

      // Handle resolvedAt timestamp rules:
      // Set resolvedAt when moving to resolved
      if (status === 'resolved') {
        ticket.resolvedAt = new Date();
      }
      // Clear resolvedAt when moving back to open/in_progress
      else if (status === 'open' || status === 'in_progress') {
        ticket.resolvedAt = undefined;
      }
      
      ticket.status = status;
    }

    // 2. Validate and update priority if provided
    if (priority !== undefined) {
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: 'Priority must be one of: low, medium, high, urgent' });
      }
      ticket.priority = priority;
    }

    // 3. Update other fields if provided
    if (subject !== undefined) {
      if (typeof subject !== 'string' || subject.trim() === '') {
        return res.status(400).json({ error: 'Subject cannot be empty' });
      }
      ticket.subject = subject;
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'Description cannot be empty' });
      }
      ticket.description = description;
    }
    if (customerEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      ticket.customerEmail = customerEmail;
    }

    await ticket.save();
    res.json(formatTicket(ticket));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   DELETE /tickets/:id
 * @desc    Delete a ticket
 */
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
