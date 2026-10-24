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
     await redis.del(`socket_ticket:${ticket}`);
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
   if (socket.user.role === 'student') {
    const enrolled = await prisma.enrollments.findFirst({
     where: { user_id: socket.user.id, course_id: courseId, status: 'enrolled', isDeleted: false }
    });
    if (!enrolled) {
     socket.emit('room:error', { message: 'Forbidden: Not enrolled in this course' });
     return socket.disconnect();
    }
   }

   socket.join(sessionId);
   const strokes = await redis.lrange(`room:${sessionId}:whiteboard`, 0, -1);
   const yjsState = await redis.get(`room:${sessionId}:yjs`);

   socket.emit('room:state-sync', {
    whiteboard: strokes.map((s) => JSON.parse(s)),
    yjsState: yjsState || null
   });

   socket.to(sessionId).emit('room:user-joined', socket.user);
  });

  socket.on('whiteboard:draw', async ({ sessionId, fabricObject }) => {
   await redis.rpush(`room:${sessionId}:whiteboard`, JSON.stringify(fabricObject));
   socket.to(sessionId).emit('whiteboard:draw', { fabricObject });
  });

  socket.on('whiteboard:clear', async ({ sessionId }) => {
   await redis.del(`room:${sessionId}:whiteboard`);
   socket.to(sessionId).emit('whiteboard:clear');
  });

  socket.on('code:yjs-update', async ({ sessionId, update }) => {
   await redis.set(`room:${sessionId}:yjs`, update);
   socket.to(sessionId).emit('code:yjs-update', { update });
  });

  socket.on('code:awareness', ({ sessionId, ...awarenessData }) => {
   socket.to(sessionId).emit('code:awareness', awarenessData);
  });

  socket.on('room:end-session', async ({ sessionId, codeSnapshot, notesSnapshot }) => {
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
  });
 });
};