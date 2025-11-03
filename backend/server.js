// Ensure dotenv is loaded absolutely first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
// Make sure this require comes AFTER dotenv.config()
const predictionRoutes = require('./routes/predict'); 

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Allow requests from our frontend
app.use(express.json()); // Parse JSON request bodies

// API Routes
app.use('/api/predict', predictionRoutes);

// Simple health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});