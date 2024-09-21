const express = require('express');
require('dotenv').config(); // Load environment variables

// Import routes
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');

const app = express();  // Initialize the Express app

// Middleware to parse JSON bodies
app.use(express.json());

// Use the auth and movie routes
app.use('/api/auth', authRoutes);
app.use('/api', movieRoutes);

// Export the app for testing
module.exports = app;

// Only start the server if not in a test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}