const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const authoringController = require('../controllers/authoring.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/categories', courseController.listCategories);
router.get('/courses', courseController.listCourses);
router.get('/courses/:id', courseController.getCourseById);

router.post(
  '/courses',
  verifyToken,
  requireRole('instructor', 'admin'),
  courseController.createCourse
);
router.put(
  '/courses/:id',
  verifyToken,
  requireRole('instructor', 'admin'),
  courseController.updateCourse
);
router.delete(
  '/courses/:id',
  verifyToken,
  requireRole('instructor', 'admin'),
  courseController.deleteCourse
);

router.post(
  '/courses/:courseId/chapters',
  verifyToken,
  requireRole('instructor', 'admin'),
  courseController.createChapter
);
router.post(
  '/chapters/:chapterId/lessons',
  verifyToken,
  requireRole('instructor', 'admin'),
  courseController.createLesson
);
router.post(
  '/lessons/:lessonId/materials',
  verifyToken,
  requireRole('instructor', 'admin'),
  courseController.createMaterial
);

// Issue #35: Instructor Assessment Authoring, Class Submissions & Course Reviews
router.get('/courses/:courseId/assessments', verifyToken, authoringController.listCourseAssessments);
router.post(
  '/courses/:courseId/assessments',
  verifyToken,
  requireRole('instructor', 'admin'),
  authoringController.createCourseAssessment
);
router.get(
  '/assessments/:id/submissions',
  verifyToken,
  requireRole('instructor', 'admin'),
  authoringController.listAssessmentSubmissions
);
router.get('/courses/:courseId/reviews', authoringController.getCourseReviews);
router.post('/courses/:courseId/reviews', verifyToken, authoringController.upsertCourseReview);

module.exports = router;