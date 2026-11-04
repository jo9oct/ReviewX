import jwt from "jsonwebtoken";
import Auth from "../model/auth.model.js";

const isAuthenticated = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.refreshToken) {
      token = req.cookies.refreshToken;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - no token provided",
        error: { message: "Unauthorized - no token provided", code: "UNAUTHORIZED" },
      });
    }

    const secretKey =
      process.env.Refresh_Secret_Key ||
      process.env.JWT_SECRET ||
      "Car-Rental-Secret-Key-123@";

    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (err) {
      if (process.env.JWT_SECRET && process.env.JWT_SECRET !== secretKey) {
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (_secondaryErr) {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const userId = decoded.userID || decoded.userId || decoded.id || decoded.sub;
    const user = await Auth.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "The account associated with this token no longer exists",
        error: { message: "User not found", code: "USER_NOT_FOUND" },
      });
    }

    // Only enforce single-session mismatch for cookie-based refreshes if sessionToken is present
    if (
      user.sessionToken &&
      user.sessionToken !== token &&
      req.cookies?.refreshToken &&
      !req.headers.authorization
    ) {
      res.clearCookie("refreshToken");
      res.clearCookie("token");
      return res.status(401).json({
        success: false,
        message: "User logged in on another device",
        error: { message: "User logged in on another device", code: "SESSION_EXPIRED" },
      });
    }

    if (user.status === "disabled" || user.status === "suspended" || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
        error: { message: "Your account has been deactivated", code: "ACCOUNT_DISABLED" },
      });
    }

    req.user = user;
    req.user.id = user._id.toString();
    req.user.userId = user._id.toString();
    req.user._id = user._id;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired — please log in again",
        error: { message: "Token has expired — please log in again", code: "TOKEN_EXPIRED" },
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: { message: "Invalid or expired token", code: "INVALID_TOKEN" },
    });
  }
};

export default isAuthenticated;

