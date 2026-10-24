const router = require('express').Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.post('/courses/:id/enroll', verifyToken, requireRole('student'), enrollmentController.enrollCourse);
router.delete('/courses/:id/enroll', verifyToken, requireRole('student'), enrollmentController.leaveCourse);
router.put('/progress/:lessonId', verifyToken, requireRole('student'), enrollmentController.updateLessonProgress);

module.exports = router;