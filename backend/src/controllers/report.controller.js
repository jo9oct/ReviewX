import {
  createReport as createReportService,
} from '../services/report.service.js';

import {
  findById as findReportById,
  findByReviewId,
} from '../database/repositories/report.repository.js';

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
        reviewId,
        format,
      });

    return res
      .status(200)
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
      await findReportById(
        reportId,
      );

    if (!report) {
      const error =
        new Error(
          'Report not found.',
        );

      error.code =
        'REPORT_NOT_FOUND';

      error.statusCode =
        404;

      throw error;
    }

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
      await findByReviewId(
        reviewId,
      );

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