const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const { error } = require("../utils/apiResponse");

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return error(res, "Authentication required", 401);
  }
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return error(res, "User not found", 401);
    req.user = User.toPublic(user);
    next();
  } catch {
    return error(res, "Invalid or expired token", 401);
  }
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (user) req.user = User.toPublic(user);
  } catch {
    // ignore invalid token for optional routes
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return error(res, "Authentication required", 401);
    if (!roles.includes(req.user.role)) {
      return error(res, "Insufficient permissions", 403);
    }
    next();
  };
}

const requireAdmin = requireRole("super_admin", "city_admin");
const requireSuperAdmin = requireRole("super_admin");

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin
};
