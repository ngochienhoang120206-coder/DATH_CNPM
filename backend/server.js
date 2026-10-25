import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app, { allowedOrigins } from './app.js';
import initClassroomSocket from './src/common/socket/classroom.socket.js';

const PORT = process.env.PORT || 3069;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

initClassroomSocket(io);

server.listen(PORT, () => {
  console.log(`Server online at port: ${PORT}`);
});
