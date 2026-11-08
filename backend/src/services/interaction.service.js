const prisma = require('../config/db');

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const sanitizeText = (input = '') =>
  String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim();

const attachUsers = async (items, userKey = 'user_id', targetField = 'user') => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const userIds = [...new Set(items.map((i) => i[userKey]).filter(Boolean))];
  if (userIds.length === 0) return items;

  const users = await prisma.users.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      status: true,
      role: { select: { name: true } }
    }
  });

  const userMap = new Map(
    users.map((u) => [
      u.id,
      {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        full_name: u.full_name,
        avatarUrl: u.avatar_url,
        avatar_url: u.avatar_url,
        status: u.status,
        role: u.role?.name || 'student'
      }
    ])
  );

  return items.map((item) => ({
    ...item,
    [targetField]: userMap.get(item[userKey]) || null
  }));
};

exports.getLessonComments = async (lessonId) => {
  const lesson = await prisma.lessons.findFirst({
    where: { id: lessonId, isDeleted: false }
  });
  if (!lesson) throw createError('Lesson not found', 404);

  const rawComments = await prisma.comments.findMany({
    where: { lesson_id: lessonId, isDeleted: false },
    orderBy: { createdAt: 'asc' }
  });

  const commentsWithUser = await attachUsers(rawComments, 'user_id', 'user');
  const commentMap = new Map();
  const rootComments = [];

  commentsWithUser.forEach((c) => {
    commentMap.set(c.id, { ...c, replies: [] });
  });

  commentsWithUser.forEach((c) => {
    const node = commentMap.get(c.id);
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id).replies.push(node);
    } else {
      rootComments.push(node);
    }
  });

  return rootComments;
};

exports.createLessonComment = async (lessonId, user, payload = {}) => {
  const content = sanitizeText(payload.content);
  const parentId = payload.parent_id || payload.parentId || null;

  if (!content) throw createError('Comment content is required', 400);

  const lesson = await prisma.lessons.findFirst({
    where: { id: lessonId, isDeleted: false }
  });
  if (!lesson) throw createError('Lesson not found', 404);

  if (parentId) {
    const parentComment = await prisma.comments.findFirst({
      where: { id: parentId, lesson_id: lessonId, isDeleted: false }
    });
    if (!parentComment) throw createError('Parent comment not found', 404);
  }

  const created = await prisma.comments.create({
    data: {
      lesson_id: lessonId,
      user_id: user.id,
      parent_id: parentId,
      content
    }
  });

  const [enriched] = await attachUsers([created], 'user_id', 'user');
  return { ...enriched, replies: [] };
};

exports.deleteComment = async (commentId, user) => {
  const comment = await prisma.comments.findFirst({
    where: { id: commentId, isDeleted: false }
  });
  if (!comment) throw createError('Comment not found', 404);

  if (comment.user_id !== user.id && user.role !== 'admin' && user.role !== 'instructor') {
    throw createError('Forbidden: Insufficient permissions to delete comment', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.comments.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id
      }
    });

    if (user.role === 'admin') {
      await tx.admin_logs.create({
        data: {
          admin_id: user.id,
          action: 'DELETE_COMMENT',
          target_type: 'comment',
          target_id: commentId,
          details: { lesson_id: comment.lesson_id, author_id: comment.user_id }
        }
      });
    }
  });

  return { id: commentId };
};

exports.createReport = async (userId, payload = {}) => {
  let commentId = payload.comment_id || payload.commentId || null;
  let courseId = payload.course_id || payload.courseId || null;
  const targetType = payload.target_type || payload.targetType;
  const targetId = payload.target_id || payload.targetId;

  if (!commentId && !courseId && targetId) {
    if (targetType === 'comment') commentId = targetId;
    else courseId = targetId;
  }

  const reason = sanitizeText(payload.reason);
  if (!reason) throw createError('Report reason is required', 400);
  if (!commentId && !courseId) {
    throw createError('Either comment_id or course_id must be provided', 400);
  }

  if (commentId) {
    const comment = await prisma.comments.findFirst({
      where: { id: commentId, isDeleted: false }
    });
    if (!comment) throw createError('Reported comment not found', 404);
  }

  if (courseId) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false }
    });
    if (!course) throw createError('Reported course not found', 404);
  }

  return prisma.reports.create({
    data: {
      reporter_id: userId,
      comment_id: commentId,
      course_id: courseId,
      reason,
      status: 'pending'
    }
  });
};

exports.getUserNotifications = async (userId) => {
  const items = await prisma.notifications.findMany({
    where: { user_id: userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const unreadCount = items.filter((n) => !n.is_read).length;
  return { items, unreadCount };
};

exports.markNotificationRead = async (notificationId, userId) => {
  const notification = await prisma.notifications.findFirst({
    where: { id: notificationId, user_id: userId, isDeleted: false }
  });
  if (!notification) throw createError('Notification not found', 404);

  return prisma.notifications.update({
    where: { id: notificationId },
    data: { is_read: true }
  });
};

exports.markAllNotificationsRead = async (userId) => {
  await prisma.notifications.updateMany({
    where: { user_id: userId, is_read: false, isDeleted: false },
    data: { is_read: true }
  });
  return { updated: true };
};

exports.getCourseReviews = async (courseId) => {
  const rawReviews = await prisma.reviews.findMany({
    where: { course_id: courseId, isDeleted: false },
    orderBy: { createdAt: 'desc' }
  });
  return attachUsers(rawReviews, 'user_id', 'user');
};

exports.upsertCourseReview = async (courseId, userId, payload = {}) => {
  const rating = Number(payload.rating);
  const comment = sanitizeText(payload.comment || '');

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createError('Rating must be an integer between 1 and 5', 400);
  }

  const enrollment = await prisma.enrollments.findFirst({
    where: { user_id: userId, course_id: courseId, isDeleted: false }
  });
  if (!enrollment) {
    throw createError('Forbidden: You must be enrolled in this course to review', 403);
  }

  const existing = await prisma.reviews.findFirst({
    where: { course_id: courseId, user_id: userId }
  });

  if (existing) {
    return prisma.reviews.update({
      where: { id: existing.id },
      data: { rating, comment, isDeleted: false, deletedAt: null, deletedBy: null }
    });
  }

  return prisma.reviews.create({
    data: { course_id: courseId, user_id: userId, rating, comment }
  });
};

exports.getAdminStats = async () => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    totalCourses,
    publishedCourses,
    enrollments,
    submissions,
    pendingReports,
    courses
  ] = await Promise.all([
    prisma.users.count({ where: { isDeleted: false } }),
    prisma.users.count({ where: { isDeleted: false, status: 'active' } }),
    prisma.users.count({ where: { isDeleted: false, status: 'banned' } }),
    prisma.courses.count({ where: { isDeleted: false } }),
    prisma.courses.count({ where: { isDeleted: false, is_published: true } }),
    prisma.enrollments.findMany({
      where: { isDeleted: false },
      select: { course_id: true, status: true, progress_percent: true }
    }),
    prisma.submissions.findMany({
      where: { isDeleted: false },
      select: { score: true }
    }),
    prisma.reports.count({ where: { isDeleted: false, status: 'pending' } }),
    prisma.courses.findMany({
      where: { isDeleted: false },
      select: { id: true, title: true, is_published: true }
    })
  ]);

  const totalEnrollments = enrollments.length;
  const activeEnrollments = enrollments.filter((e) => e.status === 'enrolled').length;
  const completedEnrollments = enrollments.filter(
    (e) => e.status === 'completed' || Number(e.progress_percent) >= 100
  ).length;
  const droppedEnrollments = enrollments.filter((e) => e.status === 'left').length;

  const completionRate =
    totalEnrollments > 0 ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(2)) : 0;

  const averageProgress =
    totalEnrollments > 0
      ? Number(
          (
            enrollments.reduce((acc, e) => acc + Number(e.progress_percent || 0), 0) /
            totalEnrollments
          ).toFixed(2)
        )
      : 0;

  const gradedSubmissions = submissions.filter((s) => s.score !== null && s.score !== undefined);
  const averageScore =
    gradedSubmissions.length > 0
      ? Number(
          (
            gradedSubmissions.reduce((acc, s) => acc + Number(s.score), 0) /
            gradedSubmissions.length
          ).toFixed(2)
        )
      : 0;

  const courseStats = courses.map((c) => {
    const courseEnrolls = enrollments.filter((e) => e.course_id === c.id);
    const courseCompleted = courseEnrolls.filter(
      (e) => e.status === 'completed' || Number(e.progress_percent) >= 100
    ).length;
    return {
      courseId: c.id,
      title: c.title,
      isPublished: c.is_published,
      enrollmentsCount: courseEnrolls.length,
      completedCount: courseCompleted,
      completionRate:
        courseEnrolls.length > 0
          ? Number(((courseCompleted / courseEnrolls.length) * 100).toFixed(2))
          : 0
    };
  });

  return {
    totalUsers,
    activeUsers,
    bannedUsers,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    droppedEnrollments,
    completionRate,
    averageProgress,
    totalSubmissions: submissions.length,
    gradedSubmissions: gradedSubmissions.length,
    averageScore,
    pendingReports,
    enrollmentsByStatus: [
      { name: 'Enrolled', value: activeEnrollments },
      { name: 'Completed', value: completedEnrollments },
      { name: 'Left', value: droppedEnrollments }
    ],
    courseStats
  };
};

exports.listAdminUsers = async (query = {}) => {
  const { search, status, role } = query;
  const where = { isDeleted: false };

  if (status) where.status = status;
  if (role) where.role = { name: role };
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { full_name: { contains: search, mode: 'insensitive' } }
    ];
  }

  const users = await prisma.users.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      status: true,
      is_verified: true,
      createdAt: true,
      role: { select: { name: true } }
    }
  });

  return users.map((u) => ({
    ...u,
    fullName: u.full_name,
    role: u.role?.name || 'student'
  }));
};

exports.updateUserStatus = async (adminId, targetUserId, payload = {}) => {
  let status = payload.status;
  if (!status && typeof payload.isActive === 'boolean') {
    status = payload.isActive ? 'active' : 'banned';
  }

  const allowedStatuses = ['active', 'banned', 'inactive'];
  if (!allowedStatuses.includes(status)) {
    throw createError(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}`, 400);
  }

  if (adminId === targetUserId && status !== 'active') {
    throw createError('Admin cannot deactivate or ban their own account', 400);
  }

  const targetUser = await prisma.users.findFirst({
    where: { id: targetUserId, isDeleted: false }
  });
  if (!targetUser) throw createError('Target user not found', 404);

  const updated = await prisma.$transaction(async (tx) => {
    const userRecord = await tx.users.update({
      where: { id: targetUserId },
      data: { status },
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        role: { select: { name: true } }
      }
    });

    await tx.admin_logs.create({
      data: {
        admin_id: adminId,
        action: status === 'banned' ? 'BAN_USER' : 'UPDATE_USER_STATUS',
        target_type: 'user',
        target_id: targetUserId,
        details: {
          email: targetUser.email,
          previousStatus: targetUser.status,
          newStatus: status
        }
      }
    });

    return userRecord;
  });

  return {
    ...updated,
    fullName: updated.full_name,
    role: updated.role?.name || 'student'
  };
};

exports.listAdminCourses = async () => {
  const courses = await prisma.courses.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' }
  });
  return attachUsers(courses, 'instructor_id', 'instructor');
};

exports.adminUpdateCourseStatus = async (adminId, courseId, payload = {}) => {
  const course = await prisma.courses.findFirst({
    where: { id: courseId, isDeleted: false }
  });
  if (!course) throw createError('Course not found', 404);

  const isPublished =
    typeof payload.is_published === 'boolean'
      ? payload.is_published
      : typeof payload.isPublished === 'boolean'
      ? payload.isPublished
      : !course.is_published;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.courses.update({
      where: { id: courseId },
      data: {
        is_published: isPublished,
        published_at: isPublished ? new Date() : course.published_at
      }
    });

    await tx.admin_logs.create({
      data: {
        admin_id: adminId,
        action: isPublished ? 'PUBLISH_COURSE' : 'UNPUBLISH_COURSE',
        target_type: 'course',
        target_id: courseId,
        details: { title: course.title, is_published: isPublished }
      }
    });

    return updated;
  });
};

exports.adminDeleteCourse = async (adminId, courseId) => {
  const course = await prisma.courses.findFirst({
    where: { id: courseId, isDeleted: false }
  });
  if (!course) throw createError('Course not found', 404);

  await prisma.$transaction(async (tx) => {
    await tx.courses.update({
      where: { id: courseId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: adminId,
        is_published: false
      }
    });

    await tx.admin_logs.create({
      data: {
        admin_id: adminId,
        action: 'DELETE_COURSE',
        target_type: 'course',
        target_id: courseId,
        details: { title: course.title, instructor_id: course.instructor_id }
      }
    });
  });

  return { id: courseId, isDeleted: true };
};

exports.listAdminReports = async (query = {}) => {
  const where = { isDeleted: false };
  if (query.status) where.status = query.status;

  const rawReports = await prisma.reports.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return attachUsers(rawReports, 'reporter_id', 'reporter');
};

exports.resolveAdminReport = async (adminId, reportId, payload = {}) => {
  const status = payload.status || 'resolved';
  if (!['pending', 'resolved', 'dismissed'].includes(status)) {
    throw createError('Invalid report status', 400);
  }

  const report = await prisma.reports.findFirst({
    where: { id: reportId, isDeleted: false }
  });
  if (!report) throw createError('Report not found', 404);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reports.update({
      where: { id: reportId },
      data: { status, resolved_by: adminId }
    });

    await tx.admin_logs.create({
      data: {
        admin_id: adminId,
        action: 'RESOLVE_REPORT',
        target_type: 'report',
        target_id: reportId,
        details: { previousStatus: report.status, newStatus: status, reason: report.reason }
      }
    });

    return updated;
  });
};

exports.getAdminLogs = async (query = {}) => {
  const limit = Math.min(Number(query.limit) || 100, 200);
  const rawLogs = await prisma.admin_logs.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return attachUsers(rawLogs, 'admin_id', 'admin');
};