
import {
  normalizeAccess
} from "../services/analysisAccess.service.js";

export function analysisAccessMiddleware(
  req,
  _res,
  next
) {
  const access =
    req.analysisAccess || {};

  req.analysisAccess =
    normalizeAccess(access);

  next();
}