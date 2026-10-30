const enrollmentService = require('../services/enrollment.service');

exports.enroll = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const data = await enrollmentService.enrollCourse(req.user.id, courseId);
    return res.status(201).json({ success: true, message: 'Enrolled successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.leave = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const data = await enrollmentService.leaveCourse(req.user.id, courseId);
    return res.json({ success: true, message: 'Left course successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getMyEnrollments = async (req, res) => {
  try {
    const data = await enrollmentService.getMyEnrollments(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const lessonId = req.params.lessonId || req.body.lessonId;
    const data = await enrollmentService.updateLessonProgress(req.user.id, lessonId, req.body);
    return res.json({ success: true, message: 'Progress updated successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};