import express from 'express';
import { courseController } from '../controllers/course.controller.js';
import { optionalProtect, protect } from '../common/middlewares/protect.middleware.js';
import { authorizeRoles } from '../common/middlewares/authorize.middleware.js';

const courseRouter = express.Router();

courseRouter.get('/categories', courseController.listCategories);
courseRouter.get('/courses', courseController.getCourses);
courseRouter.get('/courses/:id', optionalProtect, courseController.getCourseById);

courseRouter.post('/courses', protect, authorizeRoles('instructor', 'admin'), courseController.createCourse);
courseRouter.put('/courses/:id', protect, authorizeRoles('instructor', 'admin'), courseController.updateCourse);
courseRouter.delete('/courses/:id', protect, authorizeRoles('instructor', 'admin'), courseController.deleteCourse);

courseRouter.post('/courses/:courseId/chapters', protect, authorizeRoles('instructor', 'admin'), courseController.createChapter);
courseRouter.put('/chapters/:id', protect, authorizeRoles('instructor', 'admin'), courseController.updateChapter);
courseRouter.delete('/chapters/:id', protect, authorizeRoles('instructor', 'admin'), courseController.deleteChapter);
courseRouter.post('/chapters/:chapterId/lessons', protect, authorizeRoles('instructor', 'admin'), courseController.createLesson);
courseRouter.put('/lessons/:id', protect, authorizeRoles('instructor', 'admin'), courseController.updateLesson);
courseRouter.delete('/lessons/:id', protect, authorizeRoles('instructor', 'admin'), courseController.deleteLesson);
courseRouter.post('/lessons/:lessonId/materials', protect, authorizeRoles('instructor', 'admin'), courseController.createMaterial);
courseRouter.put('/materials/:id', protect, authorizeRoles('instructor', 'admin'), courseController.updateMaterial);
courseRouter.delete('/materials/:id', protect, authorizeRoles('instructor', 'admin'), courseController.deleteMaterial);

export default courseRouter;
