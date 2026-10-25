import { assessmentService } from '../services/assessment.service.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const assessmentController = {
  async placeholder(req, res, next) {
    const data = await assessmentService.getHealth();
    const response = responseSuccess(data, 'Assessment health check OK');
    res.status(response.statusCode).json(response);
  }
};

export default assessmentController;
