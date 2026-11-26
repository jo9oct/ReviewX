import express from "express";
import passport from "passport";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  intro,
  googleCallback,
  Profile,
  fail,
  isGoogleOAuthConfigured,
} from "../controllers/google-auth.controller.js";

const router = express.Router();

router.get("/google/intro", intro);

router.get("/auth/google", (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured on this server.",
    });
  }
  return passport.authenticate("google", { scope: ["email", "profile"] })(req, res, next);
});

router.get("/google", (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured on this server.",
    });
  }
  return passport.authenticate("google", { scope: ["email", "profile"] })(req, res, next);
});

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    return passport.authenticate("google", { session: false, failureRedirect: "/fail" })(req, res, next);
  },
  googleCallback
);

router.get(
  "/google/callback",
  (req, res, next) => {
    return passport.authenticate("google", { session: false, failureRedirect: "/fail" })(req, res, next);
  },
  googleCallback
);

router.get("/profile", isAuthenticated, Profile);
router.get("/fail", fail);

export default router;

