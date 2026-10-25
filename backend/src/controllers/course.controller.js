import { courseService } from '../services/course.service.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const courseController = {
  async getCourses(req, res, next) {
    const { page, limit, search, categoryId } = req.query;
    const { courses, meta } = await courseService.getCourses({ page, limit, search, categoryId });
    const response = responseSuccess(courses, 'Get courses successfully', 200, meta);
    res.status(response.statusCode).json(response);
  },

  async getCourseById(req, res, next) {
    const course = await courseService.getCourseById(req.params.id, req.user);
    const response = responseSuccess(course, 'Get course successfully');
    res.status(response.statusCode).json(response);
  },

  async createCourse(req, res, next) {
    const course = await courseService.createCourse(req.body, req.user.id);
    const response = responseSuccess(course, 'Created course successfully', 201);
    res.status(response.statusCode).json(response);
  }
};

export default courseController;
