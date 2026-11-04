import isAuthenticated from "./isAuthenticated.js";
import jwt from "jsonwebtoken";
import Auth from "../model/auth.model.js";

export const authenticate = isAuthenticated;

export async function optionalAuthenticate(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secretKey =
      process.env.Refresh_Secret_Key ||
      process.env.JWT_SECRET ||
      "Car-Rental-Secret-Key-123@";

    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (_err) {
      if (process.env.JWT_SECRET && process.env.JWT_SECRET !== secretKey) {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } else {
        req.user = null;
        return next();
      }
    }

    const userId = decoded.userID || decoded.userId || decoded.id || decoded.sub;
    const user = await Auth.findById(userId).select("-password");

    if (user && user.status !== "disabled" && user.status !== "suspended") {
      req.user = user;
      req.user.id = user._id.toString();
      req.user.userId = user._id.toString();
      req.user._id = user._id;
    } else {
      req.user = null;
    }
  } catch (_err) {
    req.user = null;
  }

  next();
}

export const protect = authenticate;
export default authenticate;
