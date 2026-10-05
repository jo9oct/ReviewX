import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as companyCtrl from "../controllers/company.controller.js";

const router = Router();

router.use(authenticate);

router.get("/members", companyCtrl.listMembers);
router.post("/members", companyCtrl.inviteMember);

export default router;
