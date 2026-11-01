const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const prisma = require('../config/db');

module.exports = function initClassroomSocket(io) {
  io.use(async (socket, next) => {
    try {
      const { ticket, token } = socket.handshake.auth || {};
      if (ticket) {
        const rawUser = await redis.get(`socket_ticket:${ticket}`);
        if (rawUser) {
          socket.user = JSON.parse(rawUser);
          return next();
        }
      }
      if (token) {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
      }
      return next(new Error('UNAUTHORIZED_SOCKET'));
    } catch (err) {
      return next(new Error('UNAUTHORIZED_SOCKET'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ sessionId, courseId }) => {
      try {
        socket.join(sessionId);
        const strokes = await redis.lrange(`room:${sessionId}:whiteboard`, 0, -1);
        const yjsState = await redis.get(`room:${sessionId}:yjs`);

        socket.emit('room:state-sync', {
          whiteboard: strokes.map((s) => JSON.parse(s)),
          yjsState: yjsState || null
        });

        socket.emit('room:user-joined', socket.user);
        socket.to(sessionId).emit('room:user-joined', socket.user);
      } catch (err) {
        console.error('room:join error:', err.message);
      }
    });

    socket.on('whiteboard:draw', async ({ sessionId, fabricObject }) => {
      try {
        await redis.rpush(`room:${sessionId}:whiteboard`, JSON.stringify(fabricObject));
        socket.to(sessionId).emit('whiteboard:draw', { fabricObject });
      } catch (err) {
        console.error('whiteboard:draw error:', err.message);
      }
    });

    socket.on('whiteboard:clear', async ({ sessionId }) => {
      try {
        await redis.del(`room:${sessionId}:whiteboard`);
        socket.to(sessionId).emit('whiteboard:clear');
      } catch (err) {
        console.error('whiteboard:clear error:', err.message);
      }
    });

    socket.on('code:yjs-update', async ({ sessionId, update }) => {
      try {
        await redis.set(`room:${sessionId}:yjs`, update);
        socket.to(sessionId).emit('code:yjs-update', { update });
      } catch (err) {
        console.error('code:yjs-update error:', err.message);
      }
    });

    socket.on('code:awareness', ({ sessionId, ...awarenessData }) => {
      socket.to(sessionId).emit('code:awareness', awarenessData);
    });

    socket.on('room:end-session', async ({ sessionId, codeSnapshot, notesSnapshot }) => {
      try {
        const strokes = await redis.lrange(`room:${sessionId}:whiteboard`, 0, -1);
        await prisma.sessions.update({
          where: { id: sessionId },
          data: {
            ended_at: new Date(),
            whiteboard_snapshot: strokes.map((s) => JSON.parse(s)),
            code_snapshot: codeSnapshot || '',
            notes_snapshot: notesSnapshot || ''
          }
        });
      } catch (err) {
        console.error('room:end-session error:', err.message);
      }
    });
  });
};