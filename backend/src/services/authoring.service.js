const prisma = require('../config/db');

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

exports.listCourseAssessments = async (courseId) => {
  const course = await prisma.courses.findFirst({
    where: { id: courseId, isDeleted: false }
  });
  if (!course) throw createError('Course not found', 404);

  return prisma.assessments.findMany({
    where: { course_id: courseId, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      course_id: true,
      lesson_id: true,
      type: true,
      title: true,
      description: true,
      time_limit_minutes: true,
      due_at: true,
      max_attempts: true,
      pass_score: true,
      createdAt: true,
      _count: {
        select: { questions: true, submissions: true }
      }
    }
  });
};

exports.createCourseAssessment = async (courseId, user, payload = {}) => {
  const course = await prisma.courses.findFirst({
    where: { id: courseId, isDeleted: false }
  });
  if (!course) throw createError('Course not found', 404);

  if (user.role !== 'admin' && course.instructor_id !== user.id) {
    throw createError('Forbidden: You do not own this course', 403);
  }

  const title = (payload.title || '').trim();
  const type = payload.type === 'assignment' ? 'assignment' : 'quiz';
  if (!title) throw createError('Assessment title is required', 400);

  const questionsInput = Array.isArray(payload.questions) ? payload.questions : [];

  return prisma.$transaction(async (tx) => {
    const createdAssessment = await tx.assessments.create({
      data: {
        course_id: courseId,
        lesson_id: payload.lesson_id || payload.lessonId || null,
        type,
        title,
        description: payload.description || null,
        time_limit_minutes:
          payload.time_limit_minutes !== undefined
            ? Number(payload.time_limit_minutes)
            : payload.timeLimitMinutes !== undefined
            ? Number(payload.timeLimitMinutes)
            : null,
        due_at: payload.due_at || payload.dueAt ? new Date(payload.due_at || payload.dueAt) : null,
        max_attempts: Number(payload.max_attempts || payload.maxAttempts) || 1,
        pass_score:
          payload.pass_score !== undefined
            ? Number(payload.pass_score)
            : payload.passScore !== undefined
            ? Number(payload.passScore)
            : 50
      }
    });

    for (let i = 0; i < questionsInput.length; i += 1) {
      const q = questionsInput[i];
      const createdQuestion = await tx.questions.create({
        data: {
          assessment_id: createdAssessment.id,
          content: (q.content || '').trim(),
          points: Number(q.points) || 10,
          position: q.position !== undefined ? Number(q.position) : i + 1
        }
      });

      const answersInput = Array.isArray(q.answers) ? q.answers : [];
      for (let j = 0; j < answersInput.length; j += 1) {
        const a = answersInput[j];
        await tx.answers.create({
          data: {
            question_id: createdQuestion.id,
            content: (a.content || '').trim(),
            is_correct: Boolean(a.is_correct ?? a.isCorrect),
            position: a.position !== undefined ? Number(a.position) : j + 1
          }
        });
      }
    }

    return tx.assessments.findUnique({
      where: { id: createdAssessment.id },
      include: {
        questions: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' },
          include: {
            answers: {
              where: { isDeleted: false },
              orderBy: { position: 'asc' }
            }
          }
        }
      }
    });
  });
};

exports.listAssessmentSubmissions = async (assessmentId, user, query = {}) => {
  const assessment = await prisma.assessments.findFirst({
    where: { id: assessmentId, isDeleted: false },
    include: { course: true }
  });
  if (!assessment) throw createError('Assessment not found', 404);

  if (user.role !== 'admin' && assessment.course.instructor_id !== user.id) {
    throw createError('Forbidden: Only the course instructor can view class submissions', 403);
  }

  const where = {
    assessment_id: assessmentId,
    isDeleted: false
  };

  if (query.status === 'ungraded') {
    where.score = null;
  } else if (query.status === 'graded') {
    where.score = { not: null };
  }

  const submissions = await prisma.submissions.findMany({
    where,
    orderBy: { submitted_at: 'desc' }
  });

  const userIds = [...new Set(submissions.map((s) => s.user_id).filter(Boolean))];
  const users = await prisma.users.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, full_name: true, avatar_url: true }
  });
  const userMap = new Map(
    users.map((u) => [u.id, { ...u, fullName: u.full_name }])
  );

  return submissions.map((s) => ({
    ...s,
    score: s.score !== null && s.score !== undefined ? Number(s.score) : null,
    student: userMap.get(s.user_id) || null
  }));
};

exports.getCourseReviews = async (courseId) => {
  const reviews = await prisma.reviews.findMany({
    where: { course_id: courseId, isDeleted: false },
    orderBy: { createdAt: 'desc' }
  });

  const userIds = [...new Set(reviews.map((r) => r.user_id).filter(Boolean))];
  const users = await prisma.users.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, full_name: true, avatar_url: true }
  });
  const userMap = new Map(users.map((u) => [u.id, { ...u, fullName: u.full_name }]));

  return reviews.map((r) => ({
    ...r,
    user: userMap.get(r.user_id) || null
  }));
};

exports.upsertCourseReview = async (courseId, userId, payload = {}) => {
  const rating = Number(payload.rating);
  const comment = (payload.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createError('Rating must be an integer between 1 and 5', 400);
  }

  const enrollment = await prisma.enrollments.findFirst({
    where: { user_id: userId, course_id: courseId, isDeleted: false }
  });
  if (!enrollment) {
    throw createError('Forbidden: You must be enrolled in this course to leave a review', 403);
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
    data: {
      course_id: courseId,
      user_id: userId,
      rating,
      comment
    }
  });
};
