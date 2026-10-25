import express from 'express';
import { courseController } from '../controllers/course.controller.js';
import { verifyToken, requireRole } from '../common/middlewares/auth.middleware.js';

const courseRouter = express.Router();

courseRouter.get('/courses', courseController.getCourses);
courseRouter.get('/courses/:id', verifyToken, courseController.getCourseById);
courseRouter.post('/courses', verifyToken, requireRole('instructor', 'admin'), courseController.createCourse);

export default courseRouter;
