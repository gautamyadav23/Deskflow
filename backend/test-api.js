require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket');

const API_URL = 'http://127.0.0.1:5050/tickets';

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- Starting API Integration Tests ---');
  
  // Connect to database for seeding backdated data
  const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskflow';
  await mongoose.connect(connStr);
  console.log('Connected to MongoDB for test seeding');
  
  // Clear any existing test data to have a clean state
  await Ticket.deleteMany({});
  console.log('Cleaned up Ticket database');

  try {
    // ----------------------------------------------------
    // TEST 1: POST /tickets - Create valid ticket
    // ----------------------------------------------------
    console.log('\nTest 1: Creating a valid ticket...');
    const createRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Internet is slow',
        description: 'The router is blinking red and the internet speed is less than 1Mbps.',
        customerEmail: 'alice@example.com',
        priority: 'high'
      })
    });
    
    if (createRes.status !== 201) {
      throw new Error(`Create ticket failed: Expected 201, got ${createRes.status}`);
    }
    
    const ticket1 = await createRes.json();
    console.log('✓ Ticket created successfully:', ticket1._id);
    if (ticket1.status !== 'open') throw new Error('Expected default status open');
    if (ticket1.ageMinutes !== 0) throw new Error('Expected ageMinutes to be 0');
    if (ticket1.slaBreached !== false) throw new Error('Expected slaBreached to be false');
    
    // ----------------------------------------------------
    // TEST 2: POST /tickets - Input Validation
    // ----------------------------------------------------
    console.log('\nTest 2: Input validation for ticket creation...');
    const badTicketRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'No Description or email',
        priority: 'super-urgent' // Invalid priority
      })
    });
    
    if (badTicketRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${badTicketRes.status}`);
    }
    
    const badError = await badTicketRes.json();
    console.log('✓ Validation correctly failed with message:', badError.error);

    // Test bad email
    const badEmailRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Need help',
        description: 'Help needed',
        customerEmail: 'not-an-email',
        priority: 'low'
      })
    });
    if (badEmailRes.status !== 400) {
      throw new Error(`Expected 400 for bad email, got ${badEmailRes.status}`);
    }
    const badEmailError = await badEmailRes.json();
    console.log('✓ Email validation failed with message:', badEmailError.error);

    // ----------------------------------------------------
    // TEST 3: PATCH /tickets/:id - Allowed & Disallowed Transitions
    // ----------------------------------------------------
    console.log('\nTest 3: Enforcing status transition rules...');
    
    // Test disallowed transition (open -> resolved)
    const badTransRes = await fetch(`${API_URL}/${ticket1._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    if (badTransRes.status !== 400) {
      throw new Error(`Expected 400 for invalid transition open->resolved, got ${badTransRes.status}`);
    }
    const badTransError = await badTransRes.json();
    console.log('✓ Blocked invalid transition open -> resolved:', badTransError.error);

    // Test valid transition (open -> in_progress)
    const goodTransRes1 = await fetch(`${API_URL}/${ticket1._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
    if (goodTransRes1.status !== 200) {
      throw new Error(`Expected 200 for open->in_progress, got ${goodTransRes1.status}`);
    }
    const ticket1InProgress = await goodTransRes1.json();
    console.log('✓ Transitioned open -> in_progress');
    if (ticket1InProgress.status !== 'in_progress') throw new Error('Expected status to be in_progress');

    // Test valid transition (in_progress -> resolved)
    const goodTransRes2 = await fetch(`${API_URL}/${ticket1._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    if (goodTransRes2.status !== 200) {
      throw new Error(`Expected 200 for in_progress->resolved, got ${goodTransRes2.status}`);
    }
    const ticket1Resolved = await goodTransRes2.json();
    console.log('✓ Transitioned in_progress -> resolved');
    if (ticket1Resolved.status !== 'resolved') throw new Error('Expected status to be resolved');
    if (!ticket1Resolved.resolvedAt) throw new Error('Expected resolvedAt to be populated');

    // Test backward transition: resolved -> in_progress
    const backTransRes = await fetch(`${API_URL}/${ticket1._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
    if (backTransRes.status !== 200) {
      throw new Error(`Expected 200 for resolved->in_progress, got ${backTransRes.status}`);
    }
    const ticket1Back = await backTransRes.json();
    console.log('✓ Transitioned backward resolved -> in_progress');
    if (ticket1Back.status !== 'in_progress') throw new Error('Expected status back to in_progress');
    if (ticket1Back.resolvedAt !== undefined && ticket1Back.resolvedAt !== null) {
      throw new Error('Expected resolvedAt to be cleared');
    }

    // ----------------------------------------------------
    // TEST 4: SLA Breach and Derived Fields at Read Time
    // ----------------------------------------------------
    console.log('\nTest 4: Seeding backdated tickets to verify SLA breach derived fields...');
    
    // Seed an unresolved urgent ticket created 2 hours ago (should breach, target is 1 hour)
    const urgentBreached = new Ticket({
      subject: 'Server is down!',
      description: 'Production is throwing 502 Bad Gateway.',
      customerEmail: 'sysadmin@company.com',
      priority: 'urgent',
      status: 'open',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    });
    await urgentBreached.save();

    // Seed a resolved high ticket created 5 hours ago and resolved 3 hours later (should not breach, target is 4 hours)
    const highNotBreached = new Ticket({
      subject: 'Install new printer',
      description: 'Setup office printer on 2nd floor.',
      customerEmail: 'office@company.com',
      priority: 'high',
      status: 'resolved',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // resolved 3 hours after creation (2 hours ago)
    });
    await highNotBreached.save();

    // Seed a resolved high ticket created 5 hours ago and resolved 4.5 hours later (should breach, target is 4 hours)
    const highBreached = new Ticket({
      subject: 'VPN configuration error',
      description: 'Cannot connect to VPN from home.',
      customerEmail: 'dev@company.com',
      priority: 'high',
      status: 'resolved',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      resolvedAt: new Date(Date.now() - 30 * 60 * 1000) // resolved 4.5 hours after creation (30 mins ago)
    });
    await highBreached.save();

    // Fetch them via API
    const listRes = await fetch(API_URL);
    const tickets = await listRes.json();
    
    const apiUrgent = tickets.find(t => t.subject === 'Server is down!');
    const apiHighNot = tickets.find(t => t.subject === 'Install new printer');
    const apiHighYes = tickets.find(t => t.subject === 'VPN configuration error');

    if (!apiUrgent || !apiHighNot || !apiHighYes) {
      throw new Error('Could not find all seeded tickets in GET /tickets');
    }

    console.log(`Urgent Ticket - ageMinutes: ${apiUrgent.ageMinutes}, breached: ${apiUrgent.slaBreached}`);
    if (apiUrgent.ageMinutes < 118 || apiUrgent.ageMinutes > 122) throw new Error('Urgent ticket age minutes mismatch');
    if (apiUrgent.slaBreached !== true) throw new Error('Urgent ticket should be breached');

    console.log(`High Resolved Ticket (3h response) - ageMinutes: ${apiHighNot.ageMinutes}, breached: ${apiHighNot.slaBreached}`);
    if (apiHighNot.ageMinutes < 178 || apiHighNot.ageMinutes > 182) throw new Error('High not-breached age minutes mismatch');
    if (apiHighNot.slaBreached !== false) throw new Error('High ticket resolved in 3h should NOT be breached (target 4h)');

    console.log(`High Resolved Ticket (4.5h response) - ageMinutes: ${apiHighYes.ageMinutes}, breached: ${apiHighYes.slaBreached}`);
    if (apiHighYes.ageMinutes < 268 || apiHighYes.ageMinutes > 272) throw new Error('High breached age minutes mismatch');
    if (apiHighYes.slaBreached !== true) throw new Error('High ticket resolved in 4.5h should be breached (target 4h)');

    console.log('✓ SLA Breach and derived fields calculations are correct!');

    // ----------------------------------------------------
    // TEST 5: GET /tickets/stats - Aggregated stats
    // ----------------------------------------------------
    console.log('\nTest 5: Checking /tickets/stats endpoint...');
    const statsRes = await fetch(`${API_URL}/stats`);
    const stats = await statsRes.json();
    console.log('Received Stats:', JSON.stringify(stats, null, 2));

    // We should have:
    // status: open = 1 (Server is down), in_progress = 1 (Internet is slow), resolved = 2 (printer + VPN), closed = 0
    if (stats.statusCounts.open !== 1) throw new Error(`Expected open count = 1, got ${stats.statusCounts.open}`);
    if (stats.statusCounts.in_progress !== 1) throw new Error(`Expected in_progress count = 1, got ${stats.statusCounts.in_progress}`);
    if (stats.statusCounts.resolved !== 2) throw new Error(`Expected resolved count = 2, got ${stats.statusCounts.resolved}`);
    if (stats.statusCounts.closed !== 0) throw new Error(`Expected closed count = 0, got ${stats.statusCounts.closed}`);

    // open SLA-breached count: should be 1 (the urgent ticket created 2 hours ago. The "Internet is slow" high-priority ticket is in_progress, but created just now so not breached).
    if (stats.slaBreachedOpenCount !== 1) {
      throw new Error(`Expected slaBreachedOpenCount = 1, got ${stats.slaBreachedOpenCount}`);
    }
    console.log('✓ Statistics endpoint calculations are correct!');

    // ----------------------------------------------------
    // TEST 6: Combinable Filters
    // ----------------------------------------------------
    console.log('\nTest 6: Checking combinable filters...');
    
    // Status filter
    const fStatusRes = await fetch(`${API_URL}?status=resolved`);
    const fStatus = await fStatusRes.json();
    if (fStatus.length !== 2) throw new Error(`Expected 2 resolved tickets, got ${fStatus.length}`);

    // Priority filter
    const fPriorityRes = await fetch(`${API_URL}?priority=high`);
    const fPriority = await fPriorityRes.json();
    // VPN config (high), Printer (high), Internet is slow (high) -> 3
    if (fPriority.length !== 3) throw new Error(`Expected 3 high priority tickets, got ${fPriority.length}`);

    // Breached filter
    const fBreachedRes = await fetch(`${API_URL}?breached=true`);
    const fBreached = await fBreachedRes.json();
    // Server is down (urgent breached), VPN config (high breached) -> 2
    if (fBreached.length !== 2) throw new Error(`Expected 2 breached tickets, got ${fBreached.length}`);

    // Combined filter: priority=high & breached=true
    const fCombinedRes = await fetch(`${API_URL}?priority=high&breached=true`);
    const fCombined = await fCombinedRes.json();
    // VPN config (high breached) -> 1
    if (fCombined.length !== 1) throw new Error(`Expected 1 high breached ticket, got ${fCombined.length}`);
    if (fCombined[0].subject !== 'VPN configuration error') throw new Error('Combined filter returned wrong ticket');

    console.log('✓ Combinable filters work perfectly!');
    
    console.log('\n=======================================');
    console.log('ALL BACKEND TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=======================================');

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Check if server is running, if not start it? No, we will start it in PowerShell, or we can just run it.
runTests();
