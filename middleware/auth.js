const jwt = require("jsonwebtoken");

/**
 * ─── VERIFY USER TOKEN ────────────────────────────────────────
 * Protects routes that require a logged-in leader (user).
 * Expects: Authorization: Bearer <token>
 */
const verifyUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object
    req.user = decoded; // { userid, email, role: "user" }
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      });
    }
    return res.status(403).json({
      success: false,
      message: "Invalid token."
    });
  }
};

/**
 * ─── VERIFY ADMIN TOKEN ──────────────────────────────────────
 * Protects admin-only routes.
 * Expects: Authorization: Bearer <token>
 */
const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    req.admin = decoded; // { adminId, role: "admin", adminRole: 1 or 2 }
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      });
    }
    return res.status(403).json({
      success: false,
      message: "Invalid token."
    });
  }
};

/**
 * ─── VERIFY SUPER ADMIN ─────────────────────────────────────
 * Only Super Admin (role: 1) can access.
 */
const verifySuperAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin" || decoded.adminRole !== 1) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super Admin only."
      });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid token."
    });
  }
};

module.exports = { verifyUser, verifyAdmin, verifySuperAdmin };
