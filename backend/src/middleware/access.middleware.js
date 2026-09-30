import {
  getAccessContext,
  assertFeatureAccess,
  assertReviewLimits
} from '../access/access.service.js';

const accessMiddleware = () => {
  return (req, res, next) => {
    try {
      req.access = getAccessContext();

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const requireFeature = (feature) => {
  return (req, res, next) => {
    try {
      assertFeatureAccess(feature);

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const enforceReviewLimits = (req, res, next) => {
  try {
    const totalLines = Number.isInteger(req.body?.totalLines)
      ? req.body.totalLines
      : 0;

    const totalFiles = Number.isInteger(req.body?.totalFiles)
      ? req.body.totalFiles
      : 0;

    assertReviewLimits({
      totalLines,
      totalFiles
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

export {
  accessMiddleware,
  requireFeature,
  enforceReviewLimits
};