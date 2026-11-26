import express from "express";
import rateLimit from "express-rate-limit";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  AuthRegister,
  VerifyAuth,
  AuthLogin,
  checkAuth,
  getMe,
  Logout,
  deleteAccount,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  getAllUser,
  updateUser,
  deleteUser,
} from "../controllers/auth.controller.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts — please try again in 15 minutes.",
    error: {
      message: "Too many authentication attempts — please try again in 15 minutes.",
      code: "RATE_LIMITED",
    },
  },
  skip: () => process.env.NODE_ENV === "test",
});

const handleResendAuth = (req, res, next) => {
  if (req.body?.email || req.query?.email) {
    return next();
  }
  return isAuthenticatedForVerification(req, res, next);
};

router.post("/register", authLimiter, AuthRegister);
router.post("/verify", authLimiter, VerifyAuth);
router.post("/login", authLimiter, AuthLogin);
router.get("/check-auth", isAuthenticated, checkAuth);
router.get("/me", isAuthenticated, getMe);
router.post("/logout", isAuthenticated, Logout);
router.delete("/remove-account", isAuthenticated, deleteAccount);
router.post(
  "/resend-verification-code",
  authLimiter,
  handleResendAuth,
  resendVerificationEmail,
);
router.post(
  "/resend-verification",
  authLimiter,
  handleResendAuth,
  resendVerificationEmail,
);
router.post("/forget-password", authLimiter, forgotPassword);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);
router.put("/update-profile", isAuthenticated, updateProfile);
router.put("/update-profile/:_id", isAuthenticated, updateProfile);
router.post("/change-password", isAuthenticated, changePassword);
router.post("/change-password/:_id", isAuthenticated, changePassword);
router.get("/get-all-user", isAuthenticated, getAllUser);
router.put("/update-user/:_id", isAuthenticated, updateUser);
router.delete("/delete-user/:_id", isAuthenticated, deleteUser);

export default router;
