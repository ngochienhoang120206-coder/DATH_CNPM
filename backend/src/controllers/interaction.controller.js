import { interactionService } from '../services/interaction.service.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const interactionController = {
  async placeholder(req, res, next) {
    const data = await interactionService.getHealth();
    const response = responseSuccess(data, 'Interaction & Admin health check OK');
    res.status(response.statusCode).json(response);
  }
};

export default interactionController;
