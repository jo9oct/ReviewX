/**
 * upgradeRequest.controller.js
 *
 * HTTP layer for upgrade-request endpoints.
 * All business logic lives in upgradeRequest.service.js.
 */

import * as upgradeRequestService from '../services/upgradeRequest.service.js';
import { resolveWorkspace }       from '../utils/resolveWorkspace.js';

function handleError(err, res, next) {
  if (err.isOperational || err.statusCode) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: { message: err.message, code: err.code || 'ERROR' },
    });
  }
  return next(err);
}

/**
 * POST /subscriptions/upgrade-request
 * Body: { message?: string }
 *
 * Allowed for: company admins and members (not owners, not personal workspace).
 */
export async function create(req, res, next) {
  try {
    const workspace = resolveWorkspace(req);

    if (workspace.type !== 'company') {
      return res.status(400).json({
        success: false,
        error: {
          code:    'UPGRADE_REQUEST_REQUIRES_COMPANY',
          message: 'Upgrade requests are only available in a company workspace.',
        },
      });
    }

    // Verify the requester actually belongs to this company
    if (!req.user.company || req.user.company !== workspace.companyId) {
      return res.status(403).json({
        success: false,
        error: {
          code:    'FORBIDDEN',
          message: 'You do not belong to this company workspace.',
        },
      });
    }

    // Load company to check if requester is the owner
    const { Company } = await import('../database/models/company.model.js');
    const company = await Company.findById(workspace.companyId).lean();

    if (company && company.owner.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: {
          code:    'OWNER_DOES_NOT_NEED_REQUEST',
          message: 'As the owner you can upgrade directly from the billing page.',
        },
      });
    }

    const { message = '' } = req.body ?? {};
    const record = await upgradeRequestService.createUpgradeRequest(
      req.user.id,
      workspace.companyId,
      message,
    );

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    handleError(err, res, next);
  }
}

/**
 * GET /subscriptions/upgrade-requests
 * Owner only (gated by requireCompanyOwner in routes).
 */
export async function list(req, res, next) {
  try {
    const workspace = resolveWorkspace(req);
    const requests = await upgradeRequestService.listUpgradeRequests(workspace.companyId);
    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    handleError(err, res, next);
  }
}

/**
 * POST /subscriptions/upgrade-requests/:id/acknowledge
 * Owner only (gated by requireCompanyOwner in routes).
 */
export async function acknowledge(req, res, next) {
  try {
    const workspace = resolveWorkspace(req);
    const record = await upgradeRequestService.acknowledgeUpgradeRequest(
      req.params.id,
      workspace.companyId,
    );
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    handleError(err, res, next);
  }
}
