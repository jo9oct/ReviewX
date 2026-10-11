import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
  createInvitationSchema,
  listInvitationsSchema,
  invitationIdParamSchema,
} from "../validators/invitation.validators.js";
import * as companyCtrl from "../controllers/company.controller.js";
import * as invitationCtrl from "../controllers/invitation.controller.js";

const router = Router();

router.use(authenticate);

router.get("/profile", companyCtrl.getCompanyProfile);
router.patch("/profile", authorize("company_admin"), companyCtrl.updateCompanyProfile);
router.get("/members", companyCtrl.listMembers);

// ── Invitations (company_admin only) ──────────────────────────────────────────
router.post(
  "/invitations",
  authorize("company_admin"),
  validate(createInvitationSchema),
  invitationCtrl.createInvitation,
);

router.get(
  "/invitations",
  authorize("company_admin"),
  validate(listInvitationsSchema, "query"),
  invitationCtrl.listInvitations,
);

router.delete(
  "/invitations/:id",
  authorize("company_admin"),
  validate(invitationIdParamSchema, "params"),
  invitationCtrl.revokeInvitation,
);

export default router;
