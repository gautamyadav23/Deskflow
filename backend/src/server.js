require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const ticketsRouter = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Allow all CORS requests for local and cross-origin testing
app.use(express.json());

// Routes
app.use('/tickets', ticketsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'DeskFlow API is running smoothly' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`DeskFlow server running on port ${PORT}`);
});
