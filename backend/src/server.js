require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const initClassroomSocket = require('./sockets/classroom.socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

initClassroomSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});