import {
  normalizeAccess
} from "../services/analysisAccess.service.js";

export function analysisAccessMiddleware(
  req,
  _res,
  next
) {
  const access =
    req.analysisAccess;

  if (
    access === null ||
    access === undefined
  ) {
    req.analysisAccess = null;
  } else {
    req.analysisAccess =
      normalizeAccess(access);
  }

  next();
}