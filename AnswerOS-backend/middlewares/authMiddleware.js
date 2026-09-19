const jwt = require("jsonwebtoken");

// Middleware to verify JWT token from Authorization header
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");
    req.user = decoded; // { id, role, email, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Middleware to authorize by specific roles (e.g., authorize("admin"))
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.user?.role}' does not have access.`,
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
