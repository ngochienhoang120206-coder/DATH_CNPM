const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
 const token = req.cookies?.access_token;
 if (!token) {
  return res.status(401).json({
   success: false,
   message: 'Authentication required',
   error: 'UNAUTHORIZED'
  });
 }

 try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded; // { id, email, role }
  next();
 } catch (err) {
  return res.status(401).json({
   success: false,
   message: 'Invalid or expired token',
   error: 'INVALID_TOKEN'
  });
 }
};

const requireRole = (...allowedRoles) => {
 return (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
   return res.status(403).json({
    success: false,
    message: 'Forbidden: Insufficient permissions',
    error: 'FORBIDDEN'
   });
  }
  next();
 };
};

module.exports = { verifyToken, requireRole };