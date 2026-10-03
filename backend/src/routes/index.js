import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import reviewRoutes from "./review.routes.js";
import reportRoutes from "./report.routes.js";
import companyRulesRoutes from "./companyRules.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/reviews", reviewRoutes);
router.use("/reports", reportRoutes);
router.use("/company-rules", companyRulesRoutes);
router.use("/admin", adminRoutes);

export default router;
