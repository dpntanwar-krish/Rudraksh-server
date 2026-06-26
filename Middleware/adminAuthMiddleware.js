const jwt = require("jsonwebtoken");

const AUTH_COOKIE = "rudraksh_admin_token";
const SESSION_DURATION_MS = 30 * 60 * 1000;

function getJwtSecret() {
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "change-this-in-production";
}

function issueAdminToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30m" });
}

function getTokenFromRequest(req) {
  const fromCookie = req.cookies?.[AUTH_COOKIE];
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();
  return null;
}

function requireAdminAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.adminAuth = {
      adminId: decoded.adminId,
      email: decoded.email,
      role: decoded.role,
      expMs: decoded.exp ? decoded.exp * 1000 : Date.now() + SESSION_DURATION_MS,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function buildAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_MS,
    path: "/",
  };
}

module.exports = {
  AUTH_COOKIE,
  SESSION_DURATION_MS,
  issueAdminToken,
  requireAdminAuth,
  buildAuthCookieOptions,
};
