const interactionService = require('../services/interaction.service');

exports.getLessonComments = async (req, res) => {
  try {
    const lessonId = req.params.id || req.params.lessonId;
    const data = await interactionService.getLessonComments(lessonId);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.createLessonComment = async (req, res) => {
  try {
    const lessonId = req.params.id || req.params.lessonId;
    const data = await interactionService.createLessonComment(lessonId, req.user, req.body);
    return res.status(201).json({ success: true, message: 'Comment posted successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const data = await interactionService.deleteComment(req.params.id, req.user);
    return res.json({ success: true, message: 'Comment deleted successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.createReport = async (req, res) => {
  try {
    const data = await interactionService.createReport(req.user.id, req.body);
    return res.status(201).json({ success: true, message: 'Report submitted successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const result = await interactionService.getUserNotifications(req.user.id);
    return res.json({
      success: true,
      data: result.items,
      unreadCount: result.unreadCount
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const data = await interactionService.markNotificationRead(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Notification marked as read', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const data = await interactionService.markAllNotificationsRead(req.user.id);
    return res.json({ success: true, message: 'All notifications marked as read', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getCourseReviews = async (req, res) => {
  try {
    const courseId = req.params.id || req.params.courseId;
    const data = await interactionService.getCourseReviews(courseId);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.upsertCourseReview = async (req, res) => {
  try {
    const courseId = req.params.id || req.params.courseId;
    const data = await interactionService.upsertCourseReview(courseId, req.user.id, req.body);
    return res.status(201).json({ success: true, message: 'Review saved successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const data = await interactionService.getAdminStats();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.listAdminUsers = async (req, res) => {
  try {
    const data = await interactionService.listAdminUsers(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const data = await interactionService.updateUserStatus(req.user.id, req.params.id, req.body);
    return res.json({ success: true, message: 'User status updated successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.listAdminCourses = async (req, res) => {
  try {
    const data = await interactionService.listAdminCourses();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.adminUpdateCourseStatus = async (req, res) => {
  try {
    const data = await interactionService.adminUpdateCourseStatus(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.json({ success: true, message: 'Course status updated by admin', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.adminDeleteCourse = async (req, res) => {
  try {
    const data = await interactionService.adminDeleteCourse(req.user.id, req.params.id);
    return res.json({ success: true, message: 'Course soft-deleted by admin', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.listAdminReports = async (req, res) => {
  try {
    const data = await interactionService.listAdminReports(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.resolveAdminReport = async (req, res) => {
  try {
    const data = await interactionService.resolveAdminReport(req.user.id, req.params.id, req.body);
    return res.json({ success: true, message: 'Report updated successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getAdminLogs = async (req, res) => {
  try {
    const data = await interactionService.getAdminLogs(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};