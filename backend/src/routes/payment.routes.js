// STATUS: UPDATED

import { Router } from 'express';

import { authenticate }          from '../middleware/authenticate.js';
import { requireCompanyOwner }   from '../middleware/requireCompanyOwner.js';

import {
  initiateProPayment,
  initiateTeamPayment,
  initiateEnterprisePayment,
  verifyPayment,
  handleChapaCallback,
} from '../controllers/payment.controller.js';

const router = Router();

// ── Plan upgrade initiation ───────────────────────────────────────────────────
//
// requireCompanyOwner is workspace-aware:
//   • personal workspace  → passes through (user pays for their own plan)
//   • company workspace   → only company.owner may proceed (403 otherwise)
//
// NOTE: apply requireCompanyOwner to these future routes too when added:
//   POST /cancel
//   POST /trial/start
//   POST /company/transfer-ownership
//   DELETE /company

router.post(
  '/pro/initiate',
  authenticate,
  requireCompanyOwner,
  initiateProPayment,
);

router.post(
  '/team/initiate',
  authenticate,
  requireCompanyOwner,
  initiateTeamPayment,
);

router.post(
  '/enterprise/initiate',
  authenticate,
  requireCompanyOwner,
  initiateEnterprisePayment,
);

// ── Public endpoints (no owner gate — Chapa calls these server-to-server) ────

router.get(
  '/verify/:txRef',
  verifyPayment,
);

router.post(
  '/callback',
  handleChapaCallback,
);

export default router;