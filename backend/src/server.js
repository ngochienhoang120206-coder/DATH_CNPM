require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const initClassroomSocket = require('./sockets/classroom.socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dath-cnpm-frontend.vercel.app',
  normalizeOrigin(process.env.CLIENT_URL),
  normalizeOrigin(process.env.FRONTEND_URL)
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

initClassroomSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});