const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const courseRoutes = require('./routes/course.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const interactionRoutes = require('./routes/interaction.routes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', enrollmentRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', interactionRoutes);

module.exports = app;