const User = require("../models/Users");
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const tokenUserId =
        req.user && (req.user.userId || req.user.id || req.user.sub);
      if (!tokenUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await User.findById(tokenUserId).select("role");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Forbidden: insufficient role" });
      }
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

// const authorize = (...allowedRoles) => {
//   return async (req, res, next) => {
//     try {
//       // req.user must be set by authMiddleware (JWT decoder)
//       const tokenUserId =
//         req.user && (req.user.userId || req.user.id || req.user.sub);
//       if (!tokenUserId) {
//         return res.status(401).json({ message: "Unauthorized" });
//       }

//       // quick "self" shortcut: if allowed and the route param id equals token id, allow
//       if (allowedRoles.includes("self")) {
//         const requestedId = req.params && req.params.id;
//         if (requestedId && requestedId.toString() === tokenUserId.toString()) {
//           req.user = req.user || {};
//           req.user.id = tokenUserId.toString();
//           return next();
//         }
//       }

//       // otherwise verify role from DB (keeps role checks up-to-date)
//       const user = await User.findById(tokenUserId)
//         .select("role")
//         .lean()
//         .exec();
//       if (!user) {
//         return res.status(401).json({ message: "User not found" });
//       }

//       if (!allowedRoles.includes(user.role)) {
//         return res
//           .status(403)
//           .json({ message: "Forbidden: insufficient role" });
//       }

//       req.user = req.user || {};
//       req.user.role = user.role;
//       req.user.id = tokenUserId.toString();

//       next();
//     } catch (err) {
//       console.error("Authorization error:", err);
//       res.status(500).json({ message: "Server error" });
//     }
//   };
// };

// module.exports = authorize;
