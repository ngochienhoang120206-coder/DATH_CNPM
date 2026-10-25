import express from 'express';
import { enrollmentController } from '../controllers/enrollment.controller.js';
import { verifyToken, requireRole } from '../common/middlewares/auth.middleware.js';

const enrollmentRouter = express.Router();

enrollmentRouter.post('/courses/:id/enroll', verifyToken, requireRole('student'), enrollmentController.enrollCourse);
enrollmentRouter.delete('/courses/:id/enroll', verifyToken, requireRole('student'), enrollmentController.leaveCourse);
enrollmentRouter.put('/progress/:lessonId', verifyToken, requireRole('student'), enrollmentController.updateLessonProgress);

export default enrollmentRouter;
