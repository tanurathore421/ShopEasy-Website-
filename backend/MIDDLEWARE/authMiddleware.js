const jwt = require("jsonwebtoken");
const Auth = require("../MODELS/auth.model");

const authMiddleware = async (req, res, next) => {
  // Check Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      message: "Authentication service is not configured",
    });
  }

  // Verify JWT
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }

  try {
    // Fetch current account information from MongoDB
    const user = await Auth.findById(decoded.userId).select(
      "_id role isActive"
    );

    if (!user) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    // Prevent deactivated accounts from using protected APIs
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is deactivated",
      });
    }

    // Preserve the existing user ID used by getProfile
    req.userId = user._id.toString();

    // Attach the current role for authorization checks
    req.userRole = user.role || "customer";

    req.user = {
      id: user._id.toString(),
      role: req.userRole,
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error.message);

    return res.status(500).json({
      message: "Authentication verification failed",
    });
  }
};

module.exports = authMiddleware;

/* const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Get token
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Get user ID from token
    req.userId = decoded.userId;

    // Continue to profile route
    next();

  } catch (error) {
    console.log(error);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
 */