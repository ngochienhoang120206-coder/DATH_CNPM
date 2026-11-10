const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const prisma = require('../config/db');

let Y = null;
try {
  Y = require('yjs');
} catch (_e) {
  Y = null;
}

const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24h TTL as specified in Sequence Diagram
const SNAPSHOT_INTERVAL_MS = 30 * 1000; // Periodic checkpoint every 30s
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getJwtSecret = () =>
  process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'replace_with_strong_jwt_secret_key';

const parseCookieToken = (cookieHeader = '') => {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';').map((c) => c.trim());
  for (const pair of pairs) {
    if (pair.startsWith('access_token=')) {
      return decodeURIComponent(pair.slice('access_token='.length));
    }
    if (pair.startsWith('accessToken=')) {
      return decodeURIComponent(pair.slice('accessToken='.length));
    }
  }
  return null;
};

const toByteArray = (raw) => {
  if (!raw) return null;
  try {
    const arr =
      typeof raw === 'string'
        ? JSON.parse(raw)
        : Array.isArray(raw)
        ? raw
        : Object.values(raw);
    return Array.from(arr);
  } catch (_e) {
    return null;
  }
};

module.exports = function initClassroomSocket(io) {
  const activeSessions = new Map(); // sessionId -> { courseId, hostId, codeSnapshot, notesSnapshot }

  const getRoomSnapshot = async (sessionId) => {
    const [strokes, rawYjs, notes] = await Promise.all([
      redis.lrange(`room:${sessionId}:whiteboard`, 0, -1),
      redis.get(`room:${sessionId}:yjs`),
      redis.get(`room:${sessionId}:notes`)
    ]);

    let whiteboard = [];
    for (const s of strokes) {
      try {
        whiteboard.push(JSON.parse(s));
      } catch (_e) {
        // Ignore malformed stroke entry
      }
    }

    let yjsState = toByteArray(rawYjs);
    let resolvedNotes = notes || '';

    // Fallback to PostgreSQL sessions table if Redis cache is empty
    if (whiteboard.length === 0 && !yjsState && !resolvedNotes && UUID_REGEX.test(sessionId)) {
      const dbSession = await prisma.sessions
        .findFirst({
          where: {
            OR: [{ id: sessionId }, { course_id: sessionId }],
            isDeleted: false
          },
          orderBy: { started_at: 'desc' }
        })
        .catch(() => null);

      if (dbSession) {
        if (Array.isArray(dbSession.whiteboard_snapshot)) {
          whiteboard = dbSession.whiteboard_snapshot;
        }
        if (dbSession.notes_snapshot) {
          resolvedNotes = dbSession.notes_snapshot;
        }
      }
    }

    return {
      sessionId,
      whiteboard,
      yjsState,
      notes: resolvedNotes,
      syncedAt: new Date().toISOString()
    };
  };

  const persistSnapshotToDatabase = async (sessionId, extra = {}) => {
    if (!sessionId) return;
    try {
      const meta = activeSessions.get(sessionId) || {};
      const snapshot = await getRoomSnapshot(sessionId);

      let decodedCode =
        extra.codeSnapshot !== undefined ? extra.codeSnapshot : meta.codeSnapshot || '';

      if (!decodedCode && Y && snapshot.yjsState) {
        try {
          const ydoc = new Y.Doc();
          Y.applyUpdate(ydoc, new Uint8Array(snapshot.yjsState));
          decodedCode = ydoc.getText('monaco').toString();
          ydoc.destroy();
        } catch (_e) {
          decodedCode = '';
        }
      }

      const notesSnapshot =
        extra.notesSnapshot !== undefined
          ? extra.notesSnapshot
          : meta.notesSnapshot !== undefined
          ? meta.notesSnapshot
          : snapshot.notes;

      // Resolve valid course and host for foreign-key integrity on sessions table
      let course = null;
      const candidateCourseId = extra.courseId || meta.courseId || sessionId;
      if (UUID_REGEX.test(candidateCourseId)) {
        course = await prisma.courses.findFirst({
          where: { id: candidateCourseId, isDeleted: false }
        });
      }
      if (!course) {
        course = await prisma.courses.findFirst({
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        });
      }
      if (!course) return;

      const hostId = extra.hostId || meta.hostId || course.instructor_id;

      if (UUID_REGEX.test(sessionId)) {
        const existingById = await prisma.sessions.findUnique({ where: { id: sessionId } });
        if (existingById) {
          await prisma.sessions.update({
            where: { id: sessionId },
            data: {
              whiteboard_snapshot: snapshot.whiteboard,
              code_snapshot: decodedCode,
              notes_snapshot: notesSnapshot,
              ...(extra.endedAt ? { ended_at: extra.endedAt } : {})
            }
          });
          return;
        }

        await prisma.sessions.create({
          data: {
            id: sessionId,
            course_id: course.id,
            host_id: hostId,
            started_at: new Date(),
            ended_at: extra.endedAt || null,
            whiteboard_snapshot: snapshot.whiteboard,
            code_snapshot: decodedCode,
            notes_snapshot: notesSnapshot
          }
        });
        return;
      }

      const existingCourseSession = await prisma.sessions.findFirst({
        where: { course_id: course.id, isDeleted: false },
        orderBy: { started_at: 'desc' }
      });

      if (existingCourseSession) {
        await prisma.sessions.update({
          where: { id: existingCourseSession.id },
          data: {
            whiteboard_snapshot: snapshot.whiteboard,
            code_snapshot: decodedCode,
            notes_snapshot: notesSnapshot,
            ...(extra.endedAt ? { ended_at: extra.endedAt } : {})
          }
        });
      } else {
        await prisma.sessions.create({
          data: {
            course_id: course.id,
            host_id: hostId,
            started_at: new Date(),
            ended_at: extra.endedAt || null,
            whiteboard_snapshot: snapshot.whiteboard,
            code_snapshot: decodedCode,
            notes_snapshot: notesSnapshot
          }
        });
      }
    } catch (err) {
      console.error('persistSnapshotToDatabase error:', err.message);
    }
  };

  const checkpointTimer = setInterval(() => {
    activeSessions.forEach((_meta, sessionId) => {
      persistSnapshotToDatabase(sessionId).catch(() => {});
    });
  }, SNAPSHOT_INTERVAL_MS);

  if (typeof checkpointTimer.unref === 'function') {
    checkpointTimer.unref();
  }

  io.use(async (socket, next) => {
    try {
      const { ticket, token } = socket.handshake.auth || {};
      if (ticket) {
        // Step 6 in Sequence Diagram: Single-use ticket GET & DEL
        const rawUser = await redis.get(`socket_ticket:${ticket}`);
        if (rawUser) {
          await redis.del(`socket_ticket:${ticket}`);
          await redis.set(`socket_session:${ticket}`, rawUser, 'EX', ROOM_TTL_SECONDS);
          socket.user = JSON.parse(rawUser);
          return next();
        }

        // Allow seamless Socket.io automatic reconnection using the bound session key
        const reconnectUser = await redis.get(`socket_session:${ticket}`);
        if (reconnectUser) {
          socket.user = JSON.parse(reconnectUser);
          return next();
        }
      }

      const jwtToken = token || parseCookieToken(socket.handshake.headers?.cookie);
      if (jwtToken) {
        const decoded = jwt.verify(jwtToken, getJwtSecret());
        socket.user = {
          id: decoded.id || decoded.userId,
          email: decoded.email,
          fullName: decoded.fullName || decoded.full_name || decoded.email,
          role: decoded.role
        };
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
    const list = Array.from(map.values());
    io.to(sessionId).emit('room:participants', list);
    return list;
  };

  io.on('connection', (socket) => {
    const handleJoinOrSync = async ({ sessionId, courseId } = {}) => {
      if (!sessionId) return;
      try {
        // Proposal 2.3 & Issue #21: Block non-enrolled students from joining live rooms
        if (socket.user?.role === 'student') {
          const checkCourseId =
            courseId && UUID_REGEX.test(courseId)
              ? courseId
              : UUID_REGEX.test(sessionId)
              ? sessionId
              : null;

          let enrolled = null;
          if (checkCourseId) {
            const courseExists = await prisma.courses.findFirst({
              where: { id: checkCourseId, isDeleted: false }
            });
            if (courseExists) {
              enrolled = await prisma.enrollments.findFirst({
                where: {
                  user_id: socket.user.id,
                  course_id: checkCourseId,
                  status: 'enrolled',
                  isDeleted: false
                }
              });
            } else {
              enrolled = await prisma.enrollments.findFirst({
                where: { user_id: socket.user.id, status: 'enrolled', isDeleted: false }
              });
            }
          } else {
            enrolled = await prisma.enrollments.findFirst({
              where: { user_id: socket.user.id, status: 'enrolled', isDeleted: false }
            });
          }

          if (!enrolled) {
            socket.emit('room:error', { message: 'Forbidden: Not enrolled in this course' });
            return socket.disconnect();
          }
        }

        socket.sessionId = sessionId;
        const prevMeta = activeSessions.get(sessionId) || {};
        activeSessions.set(sessionId, {
          ...prevMeta,
          courseId: courseId || prevMeta.courseId || sessionId,
          hostId:
            socket.user?.role === 'instructor'
              ? socket.user.id
              : prevMeta.hostId || socket.user?.id
        });

        await socket.join(sessionId);

        const snapshot = await getRoomSnapshot(sessionId);
        const participants = await broadcastParticipants(sessionId);

        // Clear local canvas on the reconnecting client before applying full state-sync to prevent duplicate strokes
        socket.emit('whiteboard:clear');
        socket.emit('room:state-sync', {
          ...snapshot,
          replaceCanvas: true,
          participants
        });

        socket.to(sessionId).emit('room:user-joined', socket.user);
      } catch (err) {
        console.error('room:join/sync error:', err.message);
      }
    };

    socket.on('room:join', handleJoinOrSync);
    socket.on('room:reconnect', handleJoinOrSync);
    socket.on('room:sync-request', handleJoinOrSync);

    socket.on('whiteboard:draw', async ({ sessionId, fabricObject }) => {
      if (!sessionId || !fabricObject) return;
      try {
        const key = `room:${sessionId}:whiteboard`;
        const serialized = JSON.stringify(fabricObject);
        const lastStroke = await redis.lindex(key, -1);

        // Avoid duplicate stroke insertion during reconnection retries
        if (lastStroke !== serialized) {
          await redis.rpush(key, serialized);
        }
        await redis.expire(key, ROOM_TTL_SECONDS);
        socket.to(sessionId).emit('whiteboard:draw', { fabricObject });
      } catch (err) {
        console.error('whiteboard:draw error:', err.message);
      }
    });

    socket.on('whiteboard:snapshot', async ({ sessionId, objects }) => {
      if (!sessionId || !Array.isArray(objects)) return;
      try {
        const key = `room:${sessionId}:whiteboard`;
        await redis.del(key);
        if (objects.length > 0) {
          await redis.rpush(key, ...objects.map((obj) => JSON.stringify(obj)));
          await redis.expire(key, ROOM_TTL_SECONDS);
        }
        socket.to(sessionId).emit('whiteboard:clear');
        socket.to(sessionId).emit('room:state-sync', {
          sessionId,
          whiteboard: objects,
          replaceCanvas: true
        });
      } catch (err) {
        console.error('whiteboard:snapshot error:', err.message);
      }
    });

    socket.on('whiteboard:clear', async ({ sessionId }) => {
      if (!sessionId) return;
      try {
        await redis.del(`room:${sessionId}:whiteboard`);
        socket.to(sessionId).emit('whiteboard:clear');
      } catch (err) {
        console.error('whiteboard:clear error:', err.message);
      }
    });

    socket.on('code:yjs-update', async ({ sessionId, update, codeSnapshot }) => {
      if (!sessionId || !update) return;
      try {
        const incomingArray = toByteArray(update);
        if (!incomingArray) return;

        const key = `room:${sessionId}:yjs`;
        let finalArray = incomingArray;

        if (Y) {
          const existingRaw = await redis.get(key);
          const existingArray = toByteArray(existingRaw);
          if (existingArray && existingArray.length > 0) {
            try {
              const merged = Y.mergeUpdates([
                new Uint8Array(existingArray),
                new Uint8Array(incomingArray)
              ]);
              finalArray = Array.from(merged);
            } catch (_e) {
              finalArray = incomingArray;
            }
          }
        }

        if (typeof codeSnapshot === 'string') {
          const prevMeta = activeSessions.get(sessionId) || {};
          activeSessions.set(sessionId, { ...prevMeta, codeSnapshot });
        }

        await redis.set(key, JSON.stringify(finalArray), 'EX', ROOM_TTL_SECONDS);
        socket.to(sessionId).emit('code:yjs-update', { update: finalArray });
      } catch (err) {
        console.error('code:yjs-update error:', err.message);
      }
    });

    socket.on('code:awareness', ({ sessionId, cursor }) => {
      if (!sessionId || !socket.user) return;
      io.to(sessionId).emit('code:awareness', {
        userId: socket.user.id,
        fullName: socket.user.fullName || socket.user.full_name || socket.user.email,
        cursor
      });
    });

    socket.on('notes:update', async ({ sessionId, notes }) => {
      if (!sessionId) return;
      try {
        const key = `room:${sessionId}:notes`;
        const cleanNotes = notes || '';
        const prevMeta = activeSessions.get(sessionId) || {};
        activeSessions.set(sessionId, { ...prevMeta, notesSnapshot: cleanNotes });

        await redis.set(key, cleanNotes, 'EX', ROOM_TTL_SECONDS);
        socket.to(sessionId).emit('notes:update', { notes: cleanNotes });
      } catch (err) {
        console.error('notes:update error:', err.message);
      }
    });

    socket.on('room:end-session', async ({ sessionId, codeSnapshot, notesSnapshot }) => {
      if (!sessionId) return;
      try {
        await persistSnapshotToDatabase(sessionId, {
          codeSnapshot,
          notesSnapshot,
          endedAt: new Date()
        });
        activeSessions.delete(sessionId);
      } catch (err) {
        console.error('room:end-session error:', err.message);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.sessionId) {
        try {
          const remaining = await broadcastParticipants(socket.sessionId);
          if (remaining.length === 0) {
            await persistSnapshotToDatabase(socket.sessionId);
            activeSessions.delete(socket.sessionId);
          }
        } catch (_e) {
          // Ignore disconnect broadcast errors
        }
      }
    });
  });
};