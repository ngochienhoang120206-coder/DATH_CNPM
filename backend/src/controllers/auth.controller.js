const authService = require('../services/auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};

exports.register = async (req, res) => {
  try {
    const data = await authService.register(req.body);
    return res.status(201).json({ success: true, message: 'Registered successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { token, payload } = await authService.login(req.body);
    res.cookie('access_token', token, COOKIE_OPTIONS);
    return res.json({ success: true, message: 'Login successful', data: payload });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
  try {
    const data = await authService.getProfile(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const data = await authService.updateProfile(req.user.id, req.body);
    return res.json({ success: true, message: 'Profile updated successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    return res.json({
      success: true,
      message: 'If the account exists, a password reset email has been sent'
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.issueSocketTicket = async (req, res) => {
  try {
    const ticket = await authService.issueSocketTicket(req.user);
    return res.json({ success: true, data: { ticket } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};