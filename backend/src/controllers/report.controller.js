// STATUS: UPDATED

import {
  createReport as createReportService,
  getReport as getReportService,
  listReports as listReportsService,
} from '../services/report.service.js';

import {
  createResponse,
} from '../utils/response.js';

const createReport = async (
  req,
  res,
  next,
) => {
  try {
    const {
      reviewId,
    } = req.params;

    const {
      format = 'json',
    } = req.body || {};

    const result =
      await createReportService({
        ownerId: req.user.id,
        reviewId,
        format,
      });

    return res
      .status(
        result.status === 'completed'
          ? 200
          : 202,
      )
      .json(
        createResponse({
          success: true,
          data: result,
          meta: {
            requestId:
              req.requestId,
          },
        }),
      );
  } catch (error) {
    return next(error);
  }
};

const getReport = async (
  req,
  res,
  next,
) => {
  try {
    const {
      reportId,
    } = req.params;

    const report =
      await getReportService({
        reportId,
        ownerId: req.user.id,
      });

    return res
      .status(200)
      .json(
        createResponse({
          success: true,
          data: report,
          meta: {
            requestId:
              req.requestId,
          },
        }),
      );
  } catch (error) {
    return next(error);
  }
};

const listReports = async (
  req,
  res,
  next,
) => {
  try {
    const {
      reviewId,
    } = req.params;

    const reports =
      await listReportsService({
        reviewId,
        ownerId: req.user.id,
      });

    return res
      .status(200)
      .json(
        createResponse({
          success: true,
          data: reports,
          meta: {
            requestId:
              req.requestId,
            count:
              reports.length,
          },
        }),
      );
  } catch (error) {
    return next(error);
  }
};

export {
  createReport,
  getReport,
  listReports,
};