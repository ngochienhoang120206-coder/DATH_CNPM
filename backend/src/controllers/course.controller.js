import { courseService } from '../services/course.service.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const courseController = {
  async listCategories(req, res) {
    const data = await courseService.listCategories();
    const response = responseSuccess(data, 'List categories successfully');
    res.status(response.statusCode).json(response);
  },

  async getCourses(req, res) {
    const result = await courseService.listCourses(req.query);
    const response = responseSuccess(result.items, 'Get courses successfully', 200, result.pagination);
    res.status(response.statusCode).json(response);
  },

  async listCourses(req, res) {
    const result = await courseService.listCourses(req.query);
    const response = responseSuccess(result.items, 'List courses successfully', 200, result.pagination);
    res.status(response.statusCode).json(response);
  },

  async getCourseById(req, res) {
    const data = await courseService.getCourseById(req.params.id, req.user);
    const response = responseSuccess(data, 'Get course successfully');
    res.status(response.statusCode).json(response);
  },

  async createCourse(req, res) {
    const data = await courseService.createCourse(req.user, req.body);
    const response = responseSuccess(data, 'Course created successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async updateCourse(req, res) {
    const data = await courseService.updateCourse(req.params.id, req.user, req.body);
    const response = responseSuccess(data, 'Course updated successfully');
    res.status(response.statusCode).json(response);
  },

  async deleteCourse(req, res) {
    await courseService.softDeleteCourse(req.params.id, req.user);
    const response = responseSuccess(null, 'Course soft-deleted successfully');
    res.status(response.statusCode).json(response);
  },

  async createChapter(req, res) {
    const data = await courseService.createChapter(req.params.courseId, req.user, req.body);
    const response = responseSuccess(data, 'Chapter created successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async createLesson(req, res) {
    const data = await courseService.createLesson(req.params.chapterId, req.user, req.body);
    const response = responseSuccess(data, 'Lesson created successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async createMaterial(req, res) {
    const data = await courseService.createMaterial(req.params.lessonId, req.user, req.body);
    const response = responseSuccess(data, 'Material created successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async updateChapter(req, res) {
    const data = await courseService.updateChapter(req.params.chapterId || req.params.id, req.user, req.body);
    const response = responseSuccess(data, 'Chapter updated successfully');
    res.status(response.statusCode).json(response);
  },

  async deleteChapter(req, res) {
    await courseService.deleteChapter(req.params.chapterId || req.params.id, req.user);
    const response = responseSuccess(null, 'Chapter soft-deleted successfully');
    res.status(response.statusCode).json(response);
  },

  async updateLesson(req, res) {
    const data = await courseService.updateLesson(req.params.lessonId || req.params.id, req.user, req.body);
    const response = responseSuccess(data, 'Lesson updated successfully');
    res.status(response.statusCode).json(response);
  },

  async deleteLesson(req, res) {
    await courseService.deleteLesson(req.params.lessonId || req.params.id, req.user);
    const response = responseSuccess(null, 'Lesson soft-deleted successfully');
    res.status(response.statusCode).json(response);
  },

  async updateMaterial(req, res) {
    const data = await courseService.updateMaterial(req.params.materialId || req.params.id, req.user, req.body);
    const response = responseSuccess(data, 'Material updated successfully');
    res.status(response.statusCode).json(response);
  },

  async deleteMaterial(req, res) {
    await courseService.deleteMaterial(req.params.materialId || req.params.id, req.user);
    const response = responseSuccess(null, 'Material soft-deleted successfully');
    res.status(response.statusCode).json(response);
  }
};

export default courseController;
