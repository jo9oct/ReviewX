/**
 * Invitation routes — public, token-based endpoints.
 *
 *   GET   /invitations/:token   Preview an invitation (masked email, company)
 *   POST  /invitations/:token/accept
 *                               Accept: new account (name+password) or,
 *                               for existing accounts, requires a session
 *                               as the invited email.
 *
 * Mounted under /api/v1.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { optionalAuthenticate } from '../middleware/authenticate.js';
import {
  invitationTokenParamSchema,
  acceptInvitationSchema,
} from '../validators/invitation.validators.js';
import * as invitationCtrl from '../controllers/invitation.controller.js';

const router = Router();

// Token guessing is impractical (32 random bytes) but rate-limit anyway —
// the preview endpoint reveals whether an account exists for an email.
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many invitation requests — please try again in 15 minutes.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});

router.get(
  '/:token',
  inviteLimiter,
  validate(invitationTokenParamSchema, 'params'),
  invitationCtrl.getInvitationInfo,
);

router.post(
  '/:token/accept',
  inviteLimiter,
  validate(invitationTokenParamSchema, 'params'),
  validate(acceptInvitationSchema),
  optionalAuthenticate,
  invitationCtrl.acceptInvitation,
);

export default router;
