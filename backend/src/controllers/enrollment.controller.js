const prisma = require('../config/db');

exports.enrollCourse = async (req, res) => {
 try {
  const course_id = req.params.id;
  const user_id = req.user.id;

  const enrollment = await prisma.enrollments.upsert({
   where: { user_id_course_id: { user_id, course_id } },
   update: { status: 'enrolled', isDeleted: false, left_at: null },
   create: { user_id, course_id, status: 'enrolled' }
  });

  return res.status(201).json({ success: true, data: enrollment });
 } catch (err) {
  return res.status(400).json({ success: false, message: err.message });
 }
};

exports.leaveCourse = async (req, res) => {
 try {
  const updated = await prisma.enrollments.update({
   where: { user_id_course_id: { user_id: req.user.id, course_id: req.params.id } },
   data: { status: 'left', left_at: new Date() }
  });
  return res.json({ success: true, data: updated });
 } catch (err) {
  return res.status(400).json({ success: false, message: err.message });
 }
};

exports.updateLessonProgress = async (req, res) => {
 try {
  const lesson_id = req.params.lessonId;
  const { courseId, isCompleted = true, lastPositionSeconds = 0 } = req.body;

  const enrollment = await prisma.enrollments.findFirst({
   where: { user_id: req.user.id, course_id: courseId, status: 'enrolled', isDeleted: false }
  });
  if (!enrollment) {
   return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
  }

  const progressRecord = await prisma.progress.upsert({
   where: { enrollment_id_lesson_id: { enrollment_id: enrollment.id, lesson_id } },
   update: {
    is_completed: isCompleted,
    last_position_seconds: lastPositionSeconds,
    completed_at: isCompleted ? new Date() : null
   },
   create: {
    enrollment_id: enrollment.id,
    lesson_id,
    is_completed: isCompleted,
    last_position_seconds: lastPositionSeconds,
    completed_at: isCompleted ? new Date() : null
   }
  });

  await prisma.enrollments.update({
   where: { id: enrollment.id },
   data: { last_lesson_id: lesson_id }
  });

  return res.json({ success: true, data: progressRecord });
 } catch (err) {
  return res.status(400).json({ success: false, message: err.message });
 }
};