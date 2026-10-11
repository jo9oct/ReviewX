// STATUS: UPDATED

import * as subscriptionService           from '../services/subscription.service.js';
import { getWorkspaceUsage }              from '../services/usage.service.js';
import { getPendingRequestStatus }        from '../services/upgradeRequest.service.js';
import { resolveWorkspace }               from '../utils/resolveWorkspace.js';

export async function getMySubscription(req, res, next) {
  try {
    const workspace    = resolveWorkspace(req);
    const subscription = await subscriptionService.getSubscription(workspace);
    const usage        = await getWorkspaceUsage(workspace, subscription);

    // Surface whether the current user already has a pending upgrade request
    // so the frontend can disable the "Request upgrade" button without a
    // separate API call or a localStorage lock.
    let pendingRequest = { exists: false };
    if (workspace.type === 'company') {
      pendingRequest = await getPendingRequestStatus(req.user.id, workspace.companyId);
    }

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        usage,
        pendingRequest,
      },
    });
  } catch (error) {
    return next(error);
  }
}
