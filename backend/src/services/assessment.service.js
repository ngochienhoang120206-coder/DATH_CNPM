const prisma = require('../config/db');
const redis = require('../config/redis');

const localQuizTimers = new Map();
const QUIZ_TIMER_TTL_SECONDS = 6 * 60 * 60;

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const getTimerKey = (assessmentId, userId) => `quiz_timer:${assessmentId}:${userId}`;

const normalizeSubmittedAnswers = (payload = {}) => {
  const raw =
    payload.answers ??
    payload.selected_answers ??
    payload.selectedAnswers ??
    payload.submissions ??
    {};

  const answerMap = new Map();

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (item && typeof item === 'object') {
        const qId = item.question_id || item.questionId;
        const aId = item.answer_id || item.answerId || item.selectedAnswerId;
        if (qId && aId) answerMap.set(String(qId), String(aId));
      } else if (typeof item === 'string') {
        answerMap.set(item, item);
      }
    });
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([qId, aId]) => {
      if (aId && typeof aId === 'object') {
        const resolved = aId.answer_id || aId.answerId || aId.id;
        if (resolved) answerMap.set(String(qId), String(resolved));
      } else if (aId) {
        answerMap.set(String(qId), String(aId));
      }
    });
  }

  return answerMap;
};

exports.getAssessmentById = async (assessmentId, user) => {
  const assessment = await prisma.assessments.findFirst({
    where: { id: assessmentId, isDeleted: false },
    include: {
      course: {
        select: { id: true, title: true, instructor_id: true }
      },
      questions: {
        where: { isDeleted: false },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          assessment_id: true,
          content: true,
          points: true,
          position: true,
          answers: {
            where: { isDeleted: false },
            orderBy: { position: 'asc' },
            // Never expose is_correct to prevent client-side cheating
            select: {
              id: true,
              question_id: true,
              content: true,
              position: true
            }
          }
        }
      }
    }
  });

  if (!assessment) {
    throw createError('Assessment not found', 404);
  }

  if (user?.id && assessment.type === 'quiz') {
    const timerKey = getTimerKey(assessmentId, user.id);
    const existingStart = localQuizTimers.get(timerKey);
    const nowMs = Date.now();

    if (!existingStart) {
      localQuizTimers.set(timerKey, nowMs);
    }
    try {
      const redisStart = await redis.get(timerKey);
      if (!redisStart) {
        await redis.set(timerKey, String(nowMs), 'EX', QUIZ_TIMER_TTL_SECONDS);
      }
    } catch (_e) {
      // Fallback to in-memory timer if Redis is unreachable
    }
  }

  return assessment;
};

exports.submitQuiz = async (assessmentId, user, payload = {}) => {
  const serverNow = new Date();

  const assessment = await prisma.assessments.findFirst({
    where: { id: assessmentId, isDeleted: false },
    include: {
      questions: {
        where: { isDeleted: false },
        orderBy: { position: 'asc' },
        include: {
          answers: {
            where: { isDeleted: false }
          }
        }
      }
    }
  });

  if (!assessment) {
    throw createError('Assessment not found', 404);
  }

  if (assessment.type !== 'quiz') {
    throw createError('This assessment does not accept quiz submissions', 400);
  }

  // 1. Server-side deadline check
  if (assessment.due_at && serverNow > new Date(assessment.due_at)) {
    throw createError('Submission rejected: Assessment deadline has passed', 400);
  }

  // 2. Verify enrollment for student role
  if (user.role === 'student') {
    const enrollment = await prisma.enrollments.findFirst({
      where: {
        user_id: user.id,
        course_id: assessment.course_id,
        status: { in: ['enrolled', 'completed'] },
        isDeleted: false
      }
    });
    if (!enrollment) {
      throw createError('Forbidden: You must be enrolled in this course to submit', 403);
    }
  }

  // 3. Enforce max_attempts
  const previousAttempts = await prisma.submissions.count({
    where: {
      assessment_id: assessmentId,
      user_id: user.id,
      isDeleted: false
    }
  });

  if (assessment.max_attempts && previousAttempts >= assessment.max_attempts) {
    throw createError(
      `Submission rejected: Maximum attempts (${assessment.max_attempts}) reached`,
      400
    );
  }

  // 4. Server-side time limit calculation (ignore client timestamps)
  const timerKey = getTimerKey(assessmentId, user.id);
  let startedAtMs = localQuizTimers.get(timerKey) || null;
  try {
    const redisStart = await redis.get(timerKey);
    if (redisStart) startedAtMs = Number(redisStart);
  } catch (_e) {
    // Use localQuizTimers fallback
  }

  const elapsedSeconds = startedAtMs
    ? Math.max(0, Math.round((serverNow.getTime() - startedAtMs) / 1000))
    : 0;

  if (assessment.time_limit_minutes && startedAtMs) {
    const allowedSeconds = Number(assessment.time_limit_minutes) * 60 + 15; // 15s grace buffer for auto-submit network latency
    if (elapsedSeconds > allowedSeconds) {
      throw createError('Submission rejected: Time limit exceeded based on server clock', 400);
    }
  }

  // 5. Server-side automatic grading
  const answerMap = normalizeSubmittedAnswers(payload);
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;
  const normalizedSelection = {};

  assessment.questions.forEach((question) => {
    const qPoints = Number(question.points) || 1;
    totalPoints += qPoints;

    const correctAnswer = question.answers.find((a) => a.is_correct === true);
    let chosenAnswerId = answerMap.get(String(question.id)) || null;

    if (!chosenAnswerId) {
      const matchedAnswer = question.answers.find((a) => answerMap.has(String(a.id)));
      if (matchedAnswer) chosenAnswerId = matchedAnswer.id;
    }

    if (chosenAnswerId) {
      normalizedSelection[question.id] = chosenAnswerId;
    }

    if (correctAnswer && chosenAnswerId && String(correctAnswer.id) === String(chosenAnswerId)) {
      earnedPoints += qPoints;
      correctCount += 1;
    }
  });

  const calculatedScore =
    totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;

  const submission = await prisma.submissions.create({
    data: {
      assessment_id: assessmentId,
      user_id: user.id,
      attempt_no: previousAttempts + 1,
      selected_answers: normalizedSelection,
      score: calculatedScore,
      feedback: `Auto-graded: ${correctCount}/${assessment.questions.length} correct (${earnedPoints}/${totalPoints} pts).`,
      graded_at: serverNow,
      submitted_at: serverNow
    }
  });

  // Clear active timer after submission
  localQuizTimers.delete(timerKey);
  try {
    await redis.del(timerKey);
  } catch (_e) {
    // Ignore Redis cleanup error
  }

  const passed =
    assessment.pass_score !== null && assessment.pass_score !== undefined
      ? calculatedScore >= Number(assessment.pass_score)
      : true;

  return {
    ...submission,
    score: Number(submission.score),
    earnedPoints,
    totalPoints,
    correctCount,
    totalQuestions: assessment.questions.length,
    elapsedSeconds,
    passed
  };
};

exports.submitFile = async (assessmentId, user, payload = {}) => {
  const serverNow = new Date();

  const assessment = await prisma.assessments.findFirst({
    where: { id: assessmentId, isDeleted: false }
  });

  if (!assessment) {
    throw createError('Assessment not found', 404);
  }

  if (assessment.due_at && serverNow > new Date(assessment.due_at)) {
    throw createError('Submission rejected: Assessment deadline has passed', 400);
  }

  if (user.role === 'student') {
    const enrollment = await prisma.enrollments.findFirst({
      where: {
        user_id: user.id,
        course_id: assessment.course_id,
        status: { in: ['enrolled', 'completed'] },
        isDeleted: false
      }
    });
    if (!enrollment) {
      throw createError('Forbidden: You must be enrolled in this course to submit', 403);
    }
  }

  const fileUrl = (
    payload.file_url ||
    payload.fileUrl ||
    payload.url ||
    payload.fileData ||
    ''
  ).trim();

  if (!fileUrl) {
    throw createError('file_url is required for file submission', 400);
  }

  const previousAttempts = await prisma.submissions.count({
    where: {
      assessment_id: assessmentId,
      user_id: user.id,
      isDeleted: false
    }
  });

  if (assessment.max_attempts && previousAttempts >= assessment.max_attempts) {
    throw createError(
      `Submission rejected: Maximum attempts (${assessment.max_attempts}) reached`,
      400
    );
  }

  return prisma.submissions.create({
    data: {
      assessment_id: assessmentId,
      user_id: user.id,
      attempt_no: previousAttempts + 1,
      file_url: fileUrl,
      submitted_at: serverNow
    }
  });
};

exports.gradeSubmission = async (submissionId, user, payload = {}) => {
  const submission = await prisma.submissions.findFirst({
    where: { id: submissionId, isDeleted: false },
    include: {
      assessment: {
        include: {
          course: true
        }
      }
    }
  });

  if (!submission) {
    throw createError('Submission not found', 404);
  }

  // Strict RBAC: Only the Instructor who created the course is allowed to grade
  if (
    user.role !== 'instructor' ||
    !submission.assessment?.course ||
    submission.assessment.course.instructor_id !== user.id
  ) {
    throw createError(
      'Forbidden: Only the instructor who owns this course can grade this submission',
      403
    );
  }

  const rawScore = payload.score;
  if (rawScore === undefined || rawScore === null || Number.isNaN(Number(rawScore))) {
    throw createError('Valid numeric score is required', 400);
  }

  const score = Number(rawScore);
  if (score < 0 || score > 100) {
    throw createError('Score must be between 0 and 100', 400);
  }

  const feedback = payload.feedback !== undefined ? String(payload.feedback).trim() : null;

  const updated = await prisma.submissions.update({
    where: { id: submissionId },
    data: {
      score,
      feedback,
      graded_by: user.id,
      graded_at: new Date()
    }
  });

  return {
    ...updated,
    score: Number(updated.score)
  };
};

exports.getMySubmissions = async (userId, query = {}) => {
  const where = {
    user_id: userId,
    isDeleted: false
  };

  if (query.assessmentId || query.assessment_id) {
    where.assessment_id = query.assessmentId || query.assessment_id;
  }

  const submissions = await prisma.submissions.findMany({
    where,
    orderBy: { submitted_at: 'desc' },
    include: {
      assessment: {
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
          course: {
            select: { id: true, title: true }
          }
        }
      }
    }
  });

  return submissions.map((s) => ({
    ...s,
    score: s.score !== null && s.score !== undefined ? Number(s.score) : null
  }));
};