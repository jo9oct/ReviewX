/**
 * requireCompanyOwner middleware
 *
 * Must run after `authenticate` (which sets req.user and req.activeCompanyId).
 *
 * Behaviour:
 *   - Personal workspace  → passes through; any authenticated user may pay
 *     for their own personal plan.
 *   - Company workspace   → only the user referenced in company.owner may
 *     proceed.  All other company members get 403 OWNER_REQUIRED.
 *
 * Export this middleware and apply it to:
 *   - POST /payment/:plan/initiate  (already done in payment.routes.js)
 *   - Future routes: cancel subscription, start trial, transfer ownership,
 *     delete company.
 */

import { resolveWorkspace } from '../utils/resolveWorkspace.js';
import { Company }          from '../database/models/company.model.js';

export async function requireCompanyOwner(req, res, next) {
  try {
    const workspace = resolveWorkspace(req);

    // Personal workspace: the user is the owner of their own plan — always allowed.
    if (workspace.type === 'personal') {
      return next();
    }

    // Company workspace: only the recorded owner may manage billing.
    const company = await Company.findById(workspace.companyId).lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        error: {
          code:    'COMPANY_NOT_FOUND',
          message: 'Company not found.',
        },
      });
    }

    if (!company.owner.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: {
          code:    'OWNER_REQUIRED',
          message: 'Only the company owner can manage billing for this workspace.',
        },
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

export default requireCompanyOwner;
