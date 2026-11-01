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

  const broadcastParticipants = async (sessionId) => {
    const sockets = await io.in(sessionId).fetchSockets();
    const map = new Map();
    sockets.forEach((s) => {
      if (s.user?.id) {
        map.set(s.user.id, {
          id: s.user.id,
          fullName: s.user.fullName || s.user.full_name || s.user.email,
          role: s.user.role
        });
      }
    });
    io.to(sessionId).emit('room:participants', Array.from(map.values()));
  };

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ sessionId }) => {
      try {
        socket.sessionId = sessionId;
        await socket.join(sessionId);

        const [strokes, rawYjs, notes] = await Promise.all([
          redis.lrange(`room:${sessionId}:whiteboard`, 0, -1),
          redis.get(`room:${sessionId}:yjs`),
          redis.get(`room:${sessionId}:notes`)
        ]);

        socket.emit('room:state-sync', {
          whiteboard: strokes.map((s) => JSON.parse(s)),
          yjsState: rawYjs ? JSON.parse(rawYjs) : null,
          notes: notes || ''
        });

        await broadcastParticipants(sessionId);
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
        socket.to(sessionId).emit('code:yjs-update', { update });
        await redis.set(`room:${sessionId}:yjs`, JSON.stringify(update));
      } catch (err) {
        console.error('code:yjs-update error:', err.message);
      }
    });

    socket.on('code:awareness', ({ sessionId, cursor }) => {
      if (!socket.user) return;
      io.to(sessionId).emit('code:awareness', {
        userId: socket.user.id,
        fullName: socket.user.fullName || socket.user.full_name || socket.user.email,
        cursor
      });
    });

    socket.on('notes:update', async ({ sessionId, notes }) => {
      try {
        socket.to(sessionId).emit('notes:update', { notes });
        await redis.set(`room:${sessionId}:notes`, notes || '');
      } catch (err) {
        console.error('notes:update error:', err.message);
      }
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

    socket.on('disconnect', () => {
      if (socket.sessionId) {
        broadcastParticipants(socket.sessionId).catch(() => {});
      }
    });
  });
};