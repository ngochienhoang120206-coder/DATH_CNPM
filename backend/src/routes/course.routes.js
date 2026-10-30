const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/categories', courseController.listCategories);
router.get('/courses', courseController.listCourses);
router.get('/courses/:id', courseController.getCourseById);

router.post('/courses', verifyToken, requireRole('instructor', 'admin'), courseController.createCourse);
router.put('/courses/:id', verifyToken, requireRole('instructor', 'admin'), courseController.updateCourse);
router.delete('/courses/:id', verifyToken, requireRole('instructor', 'admin'), courseController.deleteCourse);

router.post('/courses/:courseId/chapters', verifyToken, requireRole('instructor', 'admin'), courseController.createChapter);
router.post('/chapters/:chapterId/lessons', verifyToken, requireRole('instructor', 'admin'), courseController.createLesson);
router.post('/lessons/:lessonId/materials', verifyToken, requireRole('instructor', 'admin'), courseController.createMaterial);

module.exports = router;