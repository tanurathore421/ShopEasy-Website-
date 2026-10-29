const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication middleware must run first
    if (!req.userId || !req.userRole) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check whether the user's current role is permitted
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action",
      });
    }

    next();
  };
};

module.exports = authorizeRoles;