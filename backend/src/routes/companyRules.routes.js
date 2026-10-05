import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
  createCompanyRuleSchema,
  updateCompanyRuleSchema,
} from "../validators/companyRules.validators.js";
import * as companyRulesCtrl from "../controllers/companyRules.controller.js";

const router = Router();

// All company rules endpoints require authentication
router.use(authenticate);

// List all company rules (accessible by member, company_admin, platform_admin)
router.get("/", companyRulesCtrl.listRules);

// Get single rule by ID
router.get("/:id", companyRulesCtrl.getRuleById);

// Create a new rule (company_admin and platform_admin only)
router.post(
  "/",
  authorize("company_admin", "platform_admin"),
  validate(createCompanyRuleSchema),
  companyRulesCtrl.createRule
);

// Update a rule (company_admin and platform_admin only)
router.put(
  "/:id",
  authorize("company_admin", "platform_admin"),
  validate(updateCompanyRuleSchema),
  companyRulesCtrl.updateRule
);

// Toggle rule enabled state (company_admin and platform_admin only)
router.patch(
  "/:id/toggle",
  authorize("company_admin", "platform_admin"),
  companyRulesCtrl.toggleRule
);

// Delete a rule (company_admin and platform_admin only)
router.delete(
  "/:id",
  authorize("company_admin", "platform_admin"),
  companyRulesCtrl.deleteRule
);

export default router;
