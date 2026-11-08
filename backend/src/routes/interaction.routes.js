const router = require('express').Router();
const interactionController = require('../controllers/interaction.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Lesson Q&A Comments
router.get('/lessons/:id/comments', verifyToken, interactionController.getLessonComments);
router.post('/lessons/:id/comments', verifyToken, interactionController.createLessonComment);
router.delete('/comments/:id', verifyToken, interactionController.deleteComment);

// Course Reviews
router.get('/courses/:id/reviews', interactionController.getCourseReviews);
router.post('/courses/:id/reviews', verifyToken, interactionController.upsertCourseReview);

// Violation Reports
router.post('/reports', verifyToken, interactionController.createReport);

// Notifications
router.get('/notifications', verifyToken, interactionController.getNotifications);
router.put('/notifications/read-all', verifyToken, interactionController.markAllNotificationsRead);
router.post('/notifications/read-all', verifyToken, interactionController.markAllNotificationsRead);
router.put('/notifications/:id/read', verifyToken, interactionController.markNotificationRead);
router.patch('/notifications/:id/read', verifyToken, interactionController.markNotificationRead);

// Admin Dashboard & Moderation (Strict Admin RBAC - 403 Forbidden for non-admins)
router.get('/admin/stats', verifyToken, requireRole('admin'), interactionController.getAdminStats);
router.get('/admin/users', verifyToken, requireRole('admin'), interactionController.listAdminUsers);
router.put(
  '/admin/users/:id/status',
  verifyToken,
  requireRole('admin'),
  interactionController.updateUserStatus
);
router.patch(
  '/admin/users/:id/status',
  verifyToken,
  requireRole('admin'),
  interactionController.updateUserStatus
);
router.get(
  '/admin/courses',
  verifyToken,
  requireRole('admin'),
  interactionController.listAdminCourses
);
router.put(
  '/admin/courses/:id/status',
  verifyToken,
  requireRole('admin'),
  interactionController.adminUpdateCourseStatus
);
router.delete(
  '/admin/courses/:id',
  verifyToken,
  requireRole('admin'),
  interactionController.adminDeleteCourse
);
router.get(
  '/admin/reports',
  verifyToken,
  requireRole('admin'),
  interactionController.listAdminReports
);
router.put(
  '/admin/reports/:id',
  verifyToken,
  requireRole('admin'),
  interactionController.resolveAdminReport
);
router.patch(
  '/admin/reports/:id',
  verifyToken,
  requireRole('admin'),
  interactionController.resolveAdminReport
);
router.get('/admin/logs', verifyToken, requireRole('admin'), interactionController.getAdminLogs);

module.exports = router;