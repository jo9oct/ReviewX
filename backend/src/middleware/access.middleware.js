/**
 * access.middleware.js
 *
 * Attaches subscription, feature flags, and usage to req so downstream
 * controllers and the review service can enforce limits without making
 * extra DB calls.
 *
 * Must run after `authenticate` (which sets req.user and req.activeCompanyId).
 */

import { getEffectiveSubscription } from '../services/entitlement.service.js';
import { getWorkspaceUsage }        from '../services/usage.service.js';
import { resolveWorkspace }         from '../utils/resolveWorkspace.js';
import { assertReviewLimits }       from '../access/access.service.js';

/**
 * Loads the effective subscription + usage for the active workspace and
 * attaches them to the request:
 *   req.workspace    — { type, userId, companyId }
 *   req.subscription — effective subscription document (degraded if expired)
 *   req.features     — merged feature flags
 *   req.usage        — { reviews, aiReviews, seats, periodStart, periodEnd }
 */
export const accessMiddleware = () => {
  return async (req, res, next) => {
    try {
      const workspace          = resolveWorkspace(req);
      const { sub, features }  = await getEffectiveSubscription(workspace);
      const usage              = await getWorkspaceUsage(workspace, sub);

      req.workspace    = workspace;
      req.subscription = sub;
      req.features     = features;
      req.usage        = usage;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Middleware that checks per-review size limits against the authenticated
 * user's effective subscription.
 *
 * Expects `accessMiddleware` to have already run (req.subscription, req.usage).
 * Falls back to conservative Free limits if they are missing.
 */
export const enforceReviewLimits = (req, res, next) => {
  try {
    const totalLines = Number.isInteger(req.body?.totalLines) ? req.body.totalLines : 0;
    const totalFiles = Number.isInteger(req.body?.totalFiles) ? req.body.totalFiles : 0;

    assertReviewLimits({
      subscription: req.subscription,
      usage:        req.usage,
      totalLines,
      totalFiles,
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * requireFeature — middleware that blocks the request when the effective
 * subscription does not have a specific feature flag set to true.
 *
 * @param {string} feature  e.g. 'companyRules', 'aiAnalysis'
 */
export const requireFeature = (feature) => {
  return (req, res, next) => {
    const features = req.features ?? {};
    if (features[feature] !== true) {
      return res.status(403).json({
        success: false,
        error: {
          code:    'FEATURE_NOT_AVAILABLE',
          message: `The "${feature}" feature is not available on your current plan.`,
        },
      });
    }
    return next();
  };
};

export default { accessMiddleware, enforceReviewLimits, requireFeature };
