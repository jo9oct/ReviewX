
import {
  generateReport,
  getReport,
  listReports
} from "../reports/reportService.js";

import {
  sendSuccess
} from "../utils/response.js";

export async function create(
  req,
  res,
  next
) {
  try {
    const report =
      await generateReport({
        reviewId:
          req.body.reviewId,
        type:
          req.body.type,
        access:
          req.analysisAccess  ||
          null
      });

    return sendSuccess(
      res,
      report,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req,
  res,
  next
) {
  try {
    const report =
      await getReport(
        req.params.reportId
      );

    return sendSuccess(
      res,
      report
    );
  } catch (error) {
    next(error);
  }
}

export async function getByReviewId(
  req,
  res,
  next
) {
  try {
    const reports =
      await listReports(
        req.params.reviewId
      );

    return sendSuccess(
      res,
      reports
    );
  } catch (error) {
    next(error);
  }
}