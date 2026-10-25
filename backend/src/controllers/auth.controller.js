import { authService } from '../services/auth.service.js';
import { COOKIE_OPTIONS } from '../common/constant/app.constant.js';
import { responseSuccess } from '../common/helpers/response.helper.js';

export const authController = {
  async register(req, res, next) {
    const { email, fullName, password } = req.body;
    const data = await authService.register({ email, fullName, password });
    const response = responseSuccess(data, 'Registered successfully', 201);
    res.status(response.statusCode).json(response);
  },

  async login(req, res, next) {
    const { email, password } = req.body;
    const { token, payload } = await authService.login({ email, password });

    res.cookie('access_token', token, COOKIE_OPTIONS);
    const response = responseSuccess(payload, 'Login successful');
    res.status(response.statusCode).json(response);
  },

  async logout(req, res, next) {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    const response = responseSuccess(null, 'Logged out successfully');
    res.status(response.statusCode).json(response);
  },

  async getProfile(req, res, next) {
    const user = await authService.getProfile(req.user.id);
    const response = responseSuccess(user, 'Get profile successfully');
    res.status(response.statusCode).json(response);
  },

  async updateProfile(req, res, next) {
    const user = await authService.updateProfile(req.user.id, req.body);
    const response = responseSuccess(user, 'Profile updated successfully');
    res.status(response.statusCode).json(response);
  },

  async forgotPassword(req, res, next) {
    await authService.requestPasswordReset(req.body.email);
    const response = responseSuccess(null, 'Nếu tài khoản tồn tại, email đặt lại mật khẩu sẽ được gửi.');
    res.status(response.statusCode).json(response);
  },

  async resetPassword(req, res, next) {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    const response = responseSuccess(null, 'Password reset successfully');
    res.status(response.statusCode).json(response);
  },

  async issueSocketTicket(req, res, next) {
    const ticket = await authService.issueSocketTicket(req.user);
    const response = responseSuccess({ ticket }, 'Issued socket ticket successfully');
    res.status(response.statusCode).json(response);
  }
};

export default authController;
