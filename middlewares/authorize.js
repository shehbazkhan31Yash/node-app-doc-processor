const User = require("../models/Users");
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const tokenUserId =
        req.user && (req.user.userId || req.user.id || req.user.sub);
      if (!tokenUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Fetch current user from DB to get up-to-date role (select only role)
      const user = await User.findById(tokenUserId).select("role");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Forbidden: insufficient role" });
      }

      // Attach role and id back to req.user for downstream handlers
      req.user.role = user.role;
      req.user.id = tokenUserId.toString();

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
};

module.exports = authorize;
