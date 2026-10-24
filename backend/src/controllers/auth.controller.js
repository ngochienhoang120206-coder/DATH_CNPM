const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const redis = require('../config/redis');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24h
};

exports.register = async (req, res) => {
  try {
    const { email, fullName, password, roleName = 'student' } = req.body;
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(400).json({ success: false, message: 'Invalid role' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, fullName, password: hashedPassword, roleId: role.id }
    });

    return res.status(201).json({
      success: true,
      message: 'Registered successfully',
      data: { id: user.id, email: user.email, fullName: user.fullName, role: role.name }
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
      include: { role: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Account has been banned' });
    }

    const payload = { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.cookie('access_token', token, COOKIE_OPTIONS);
    return res.json({ success: true, message: 'Login successful', data: payload });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  return res.json({ success: true, message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.user.id, isDeleted: false },
    select: { id: true, email: true, fullName: true, avatarUrl: true, bio: true, status: true, role: { select: { name: true } } }
  });
  return res.json({ success: true, data: user });
};

exports.issueSocketTicket = async (req, res) => {
  try {
    const ticket = crypto.randomUUID();
    await redis.set(`socket_ticket:${ticket}`, JSON.stringify(req.user), 'EX', 30);
    return res.json({ success: true, data: { ticket } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};