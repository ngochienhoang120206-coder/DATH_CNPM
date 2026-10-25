import { enrollmentService } from '../services/enrollment.service.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const enrollmentController = {
  async enrollCourse(req, res, next) {
    const courseId = req.params.id;
    const userId = req.user.id;
    const enrollment = await enrollmentService.enrollCourse(userId, courseId);
    const response = responseSuccess(enrollment, 'Enrolled course successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async leaveCourse(req, res, next) {
    const courseId = req.params.id;
    const userId = req.user.id;
    const updated = await enrollmentService.leaveCourse(userId, courseId);
    const response = responseSuccess(updated, 'Left course successfully');
    res.status(response.statusCode).json(response);
  },

  async updateLessonProgress(req, res, next) {
    const lessonId = req.params.lessonId;
    const { courseId, isCompleted = true, lastPositionSeconds = 0 } = req.body;
    const progressRecord = await enrollmentService.updateLessonProgress({
      userId: req.user.id,
      lessonId,
      courseId,
      isCompleted,
      lastPositionSeconds
    });
    const response = responseSuccess(progressRecord, 'Updated lesson progress successfully');
    res.status(response.statusCode).json(response);
  }
};

export default enrollmentController;
