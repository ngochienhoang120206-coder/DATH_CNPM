import express from 'express';
import { enrollmentController } from '../controllers/enrollment.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';
import { authorizeRoles } from '../common/middlewares/authorize.middleware.js';

const enrollmentRouter = express.Router();

enrollmentRouter.get('/enrollments/me', protect, enrollmentController.getMyEnrollments);
enrollmentRouter.get('/enrollments/my-courses', protect, enrollmentController.getMyCourses);
enrollmentRouter.get('/enrollments/resume', protect, enrollmentController.getResume);
enrollmentRouter.post('/courses/:courseId/enroll', protect, authorizeRoles('student'), enrollmentController.enroll);
enrollmentRouter.post('/enrollments', protect, authorizeRoles('student'), enrollmentController.enroll);
enrollmentRouter.delete('/courses/:courseId/enroll', protect, authorizeRoles('student'), enrollmentController.leave);
enrollmentRouter.post('/lessons/:lessonId/progress', protect, authorizeRoles('student'), enrollmentController.updateProgress);
enrollmentRouter.put('/progress/:lessonId', protect, authorizeRoles('student'), enrollmentController.updateProgress);

export default enrollmentRouter;
