import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as adminCtrl from "../controllers/admin.controller.js";

const router = Router();

// All admin endpoints require authentication and platform_admin role
router.use(authenticate);
router.use(authorize("platform_admin"));

router.get("/stats", adminCtrl.getStats);
router.get("/companies", adminCtrl.listCompanies);
router.get("/users", adminCtrl.listUsers);
router.patch("/users/:id/role", adminCtrl.updateUserRole);
router.patch("/users/:id/status", adminCtrl.toggleUserStatus);

export default router;
