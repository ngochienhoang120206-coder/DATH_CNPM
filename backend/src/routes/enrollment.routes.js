const router = require('express').Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/enrollments/me', verifyToken, enrollmentController.getMyEnrollments);
router.post('/courses/:courseId/enroll', verifyToken, enrollmentController.enroll);
router.post('/enrollments', verifyToken, enrollmentController.enroll);
router.delete('/courses/:courseId/enroll', verifyToken, enrollmentController.leave);
router.post('/lessons/:lessonId/progress', verifyToken, enrollmentController.updateProgress);
router.put('/progress/:lessonId', verifyToken, enrollmentController.updateProgress);

module.exports = router;