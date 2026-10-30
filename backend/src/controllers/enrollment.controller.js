import { enrollmentService } from '../services/enrollment.service.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const enrollmentController = {
  async enroll(req, res) {
    const courseId = req.params.id || req.params.courseId || req.body.courseId || req.body.course_id;
    const data = await enrollmentService.enrollCourse(req.user.id || req.user.userId, courseId);
    const response = responseSuccess(data, 'Enrolled successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async leave(req, res) {
    const courseId = req.params.id || req.params.courseId || req.body.courseId || req.body.course_id;
    const data = await enrollmentService.leaveCourse(req.user.id || req.user.userId, courseId);
    const response = responseSuccess(data, 'Left course successfully');
    res.status(response.statusCode).json(response);
  },

  async getMyEnrollments(req, res) {
    const data = await enrollmentService.getMyEnrollments(req.user.id || req.user.userId);
    const response = responseSuccess(data, 'Get my enrollments successfully');
    res.status(response.statusCode).json(response);
  },

  async getMyCourses(req, res) {
    const data = await enrollmentService.getMyCourses(req.user.id || req.user.userId);
    const response = responseSuccess(data, 'Get my courses successfully');
    res.status(response.statusCode).json(response);
  },

  async getResume(req, res) {
    const data = await enrollmentService.getResume(
      req.user.id || req.user.userId,
      req.query.courseId || req.query.course_id
    );
    const response = responseSuccess(data, 'Get resume lesson successfully');
    res.status(response.statusCode).json(response);
  },

  async updateProgress(req, res) {
    const lessonId = req.params.lessonId || req.params.lesson_id || req.body.lessonId;
    const data = await enrollmentService.updateLessonProgress(req.user.id || req.user.userId, lessonId, req.body);
    const response = responseSuccess(data, 'Progress updated successfully');
    res.status(response.statusCode).json(response);
  }
};

export default enrollmentController;
