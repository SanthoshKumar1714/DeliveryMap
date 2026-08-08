require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const locationRoutes = require('./routes/locations');
const settingsRoutes = require('./routes/settings');
const partnerRoutes = require('./routes/partners');
const editRequestRoutes = require('./routes/editRequests');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const compression = require('compression');
// ...

const app = express();

// ============ MIDDLEWARE ============
app.use(cors());  // Allow cross-origin requests
app.use(compression());
app.use(express.json());  // Parse JSON request bodies

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set these in your .env file (local) or hosting dashboard (deployed).');
  process.exit(1);
}
// ============ DATABASE ============
connectDB();  // Connect to MongoDB on startup

// ============ ROUTES ============
app.use(express.json());  // Parse JSON request bodies
app.use('/api', generalLimiter); // safety-net limiter on all /api routes
app.use('/api/locations', locationRoutes);
app.use('/api/settings', settingsRoutes);
// ...
app.use('/api/partners', partnerRoutes);
app.use('/api/edit-requests', editRequestRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '✅ Backend is running' });
});
app.use(errorHandler);
// ============ SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
});