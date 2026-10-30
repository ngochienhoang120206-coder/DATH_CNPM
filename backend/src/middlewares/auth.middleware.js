const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const getJwtSecret = () => process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'replace_with_strong_jwt_secret_key';

const verifyToken = async (req, res, next) => {
  try {
    let token = req.cookies?.access_token || req.cookies?.accessToken;

    if (!token && req.headers.authorization) {
      const [type, bearerToken] = req.headers.authorization.split(' ');
      if (type === 'Bearer') token = bearerToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.id || decoded.userId;

    const user = await prisma.users.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        role: { select: { name: true } }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or has been deleted' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Account has been banned' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      full_name: user.full_name,
      status: user.status,
      role: user.role?.name || decoded.role
    };

    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  const allowedRoles = roles.flat();
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
  }
  return next();
};

module.exports = {
  verifyToken,
  protect: verifyToken,
  requireRole,
  authorizeRoles: requireRole
};