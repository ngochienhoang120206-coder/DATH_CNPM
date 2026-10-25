import redis from '../redis/connect.redis.js';
import prisma from '../prisma/connect.prisma.js';

const courseRoom = (courseId) => `course:${courseId}`;
const clientErrors = new Set([
  'Invalid course', 'Course not found', 'Course is not available', 'Enrollment required',
  'Forbidden', 'Account is no longer active', 'Invalid room operation', 'Too many room events'
]);
const publicErrorMessage = (error) => clientErrors.has(error?.message) ? error.message : 'Room operation failed';
const socketError = (socket, error) => socket.emit('room:error', { message: publicErrorMessage(error) });

async function authorizeCourse(user, courseId) {
  if (typeof courseId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)) {
    throw new Error('Invalid course');
  }

  const activeUser = await prisma.users.findFirst({
    where: { id: user.id, isDeleted: false, status: 'active' },
    select: { id: true, role: { select: { name: true } } }
  });
  if (!activeUser) throw new Error('Account is no longer active');
  const role = activeUser.role.name;

  const course = await prisma.courses.findFirst({
    where: { id: courseId, isDeleted: false },
    select: { id: true, instructor_id: true, is_published: true }
  });
  if (!course) throw new Error('Course not found');

  const isOwner = role === 'instructor' && course.instructor_id === user.id;
  const isAdmin = role === 'admin';
  if (!course.is_published && !isOwner && !isAdmin) throw new Error('Course is not available');

  if (role === 'student') {
    const enrollment = await prisma.enrollments.findFirst({
      where: { user_id: user.id, course_id: course.id, status: 'enrolled', isDeleted: false },
      select: { id: true }
    });
    if (!enrollment) throw new Error('Enrollment required');
  } else if (!isOwner && !isAdmin) {
    throw new Error('Forbidden');
  }

  return { course, isOwner, isAdmin, role };
}

function allowEvent(socket) {
  const now = Date.now();
  const window = socket.data.eventWindow;
  if (!window || now - window.startedAt >= 60000) {
    socket.data.eventWindow = { startedAt: now, count: 1 };
    return true;
  }
  window.count += 1;
  return window.count <= 120;
}

export const initClassroomSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const ticket = socket.handshake.auth?.ticket;
      if (typeof ticket !== 'string' || ticket.length > 100) return next(new Error('UNAUTHORIZED_SOCKET'));
      const rawUser = await redis.getdel(`socket_ticket:${ticket}`);
      if (!rawUser) return next(new Error('UNAUTHORIZED_SOCKET'));
      socket.user = JSON.parse(rawUser);
      socket.data.authorizedCourses = new Set();
      return next();
    } catch (err) {
      return next(new Error('UNAUTHORIZED_SOCKET'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async (payload, callback) => {
      try {
        if (!allowEvent(socket)) throw new Error('Too many room events');
        const { courseId } = payload || {};
        const { course } = await authorizeCourse(socket.user, courseId);
        const room = courseRoom(course.id);
        await socket.join(room);
        socket.data.authorizedCourses.add(course.id);
        const [strokes, updates] = await Promise.all([
          redis.lrange(`room:${course.id}:whiteboard`, 0, -1),
          redis.lrange(`room:${course.id}:yjs`, 0, -1)
        ]);
        socket.emit('room:state-sync', {
          courseId: course.id,
          whiteboard: strokes.map((stroke) => JSON.parse(stroke)),
          yjsUpdates: updates.map((update) => JSON.parse(update))
        });
        socket.to(room).emit('room:user-joined', { id: socket.user.id, full_name: socket.user.full_name });
        if (typeof callback === 'function') callback({ status: 'success' });
      } catch (error) {
        if (typeof callback === 'function') callback({ status: 'error', message: publicErrorMessage(error) });
        socketError(socket, error);
      }
    });

    socket.on('whiteboard:draw', async (payload) => {
      try {
        if (!allowEvent(socket)) throw new Error('Too many room events');
        const { courseId: suppliedCourseId, sessionId, strokeData: suppliedStroke, fabricObject } = payload || {};
        let courseId = suppliedCourseId;
        let strokeData = suppliedStroke;
        courseId = courseId || sessionId;
        strokeData = strokeData || fabricObject;
        const { course } = await authorizeCourse(socket.user, courseId);
        const room = courseRoom(course.id);
        const encoded = JSON.stringify(strokeData);
        if (!socket.data.authorizedCourses.has(course.id) || !strokeData || encoded.length > 20000) throw new Error('Invalid room operation');
        const key = `room:${course.id}:whiteboard`;
        await redis.rpush(key, encoded);
        await redis.ltrim(key, -2000, -1);
        await redis.expire(key, 86400);
        socket.to(room).emit('whiteboard:draw', { courseId: course.id, sessionId: course.id, fabricObject: strokeData, strokeData });
      } catch (error) {
        socketError(socket, error);
      }
    });

    socket.on('whiteboard:clear', async (payload) => {
      try {
        if (!allowEvent(socket)) throw new Error('Too many room events');
        const { courseId } = payload || {};
        const { course, isOwner, isAdmin } = await authorizeCourse(socket.user, courseId);
        if (!socket.data.authorizedCourses.has(course.id) || (!isOwner && !isAdmin)) throw new Error('Forbidden');
        await redis.del(`room:${course.id}:whiteboard`);
        socket.to(courseRoom(course.id)).emit('whiteboard:clear', { courseId: course.id });
      } catch (error) {
        socketError(socket, error);
      }
    });

    const syncCode = async (payload) => {
      try {
        if (!allowEvent(socket)) throw new Error('Too many room events');
        const { courseId: suppliedCourseId, sessionId, update } = payload || {};
        let courseId = suppliedCourseId;
        courseId = courseId || sessionId;
        const { course } = await authorizeCourse(socket.user, courseId);
        const room = courseRoom(course.id);
        if (!socket.data.authorizedCourses.has(course.id) || !Array.isArray(update) || update.length === 0 || update.length > 65536 || update.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) throw new Error('Invalid room operation');
        const key = `room:${course.id}:yjs`;
        await redis.rpush(key, JSON.stringify(update));
        await redis.ltrim(key, -10000, -1);
        await redis.expire(key, 86400);
        socket.to(room).emit('code:yjs-update', { sessionId: course.id, courseId: course.id, update });
      } catch (error) {
        socketError(socket, error);
      }
    };
    socket.on('yjs:sync', syncCode);
    socket.on('code:yjs-update', syncCode);
  });
};

export default initClassroomSocket;
