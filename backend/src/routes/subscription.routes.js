// STATUS: UPDATED

import { Router } from 'express';

import { authenticate }          from '../middleware/authenticate.js';
import { requireCompanyOwner }   from '../middleware/requireCompanyOwner.js';
import * as subscriptionCtrl     from '../controllers/subscription.controller.js';
import * as upgradeRequestCtrl   from '../controllers/upgradeRequest.controller.js';

const router = Router();

// ── Subscription ─────────────────────────────────────────────────────────────
router.get('/', authenticate, subscriptionCtrl.getMySubscription);

// ── Upgrade requests ─────────────────────────────────────────────────────────
// Create (admin/member in company workspace)
router.post('/upgrade-request', authenticate, upgradeRequestCtrl.create);

// List pending (owner only)
router.get('/upgrade-requests', authenticate, requireCompanyOwner, upgradeRequestCtrl.list);

// Acknowledge (owner only)
router.post(
  '/upgrade-requests/:id/acknowledge',
  authenticate,
  requireCompanyOwner,
  upgradeRequestCtrl.acknowledge,
);

export default router;