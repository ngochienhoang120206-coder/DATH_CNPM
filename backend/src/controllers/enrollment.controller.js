const prisma = require('../config/db');

exports.enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status: 'enrolled', isDeleted: false, leftAt: null },
      create: { userId, courseId, status: 'enrolled' }
    });

    return res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.leaveCourse = async (req, res) => {
  try {
    const updated = await prisma.enrollment.update({
      where: { userId_courseId: { userId: req.user.id, courseId: req.params.id } },
      data: { status: 'left', leftAt: new Date() }
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { courseId, isCompleted = true, lastPositionSeconds = 0 } = req.body;

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: req.user.id, courseId, status: 'enrolled', isDeleted: false }
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
    }

    const progress = await prisma.progress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      update: { isCompleted, lastPositionSeconds, completedAt: isCompleted ? new Date() : null, isDeleted: false },
      create: { enrollmentId: enrollment.id, lessonId, isCompleted, lastPositionSeconds, completedAt: isCompleted ? new Date() : null }
    });

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastLessonId: lessonId }
    });

    return res.json({ success: true, data: progress });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};