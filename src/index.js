require('dotenv').config();
const express = require('express');
const cors = require('cors');

const scheduleRoutes = require('./routes/schedules');
const notificationRoutes = require('./routes/notifications');
const complaintRoutes = require('./routes/complaints');

const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/schedule', scheduleRoutes);
app.use('/api/notify', notificationRoutes);
app.use('/api/complaints', complaintRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'CleanSL API' }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 CleanSL API running on port ${PORT}`));

module.exports = app; // exported for Jest testing
