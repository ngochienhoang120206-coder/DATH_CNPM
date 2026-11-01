const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dath-cnpm-frontend.vercel.app',
  normalizeOrigin(process.env.CLIENT_URL),
  normalizeOrigin(process.env.FRONTEND_URL)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const resolveRouter = (mod) => (typeof mod === 'function' ? mod : mod?.default || express.Router());

app.use('/api', resolveRouter(require('./routes/auth.routes')));
app.use('/api', resolveRouter(require('./routes/course.routes')));
app.use('/api', resolveRouter(require('./routes/enrollment.routes')));
app.use('/api', resolveRouter(require('./routes/assessment.routes')));
app.use('/api', resolveRouter(require('./routes/interaction.routes')));

module.exports = app;