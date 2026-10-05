import { Router } from "express";
import authRoutes from "./auth.routes.js";
import reviewRoutes from "./review.routes.js";
import reportRoutes from "./report.routes.js";
import companyRulesRoutes from "./companyRules.routes.js";
import adminRoutes from "./admin.routes.js";
import companyRoutes from "./company.routes.js";
import githubRoutes from "./github.routes.js";
import scheduledReviewRoutes from "./scheduledReview.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/reviews", reviewRoutes);
router.use("/reports", reportRoutes);
router.use("/company-rules", companyRulesRoutes);
router.use("/admin", adminRoutes);
router.use("/company", companyRoutes);
router.use("/github", githubRoutes);
router.use("/scheduled-reviews", scheduledReviewRoutes);

export default router;
