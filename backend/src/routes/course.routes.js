const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/courses', courseController.getCourses);
router.get('/courses/:id', courseController.getCourseById);
router.post('/courses', verifyToken, requireRole('instructor', 'admin'), courseController.createCourse);

module.exports = router;