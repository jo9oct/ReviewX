// STATUS: UPDATED

import {
  getReportQueue,
} from "../queue/queue.factory.js";

import {
  JOB_NAMES,
} from "../queue/queue.constants.js";

const normalizeReportJobData = ({
  reportId,
  ownerId,
}) => {
  if (
    typeof reportId !== "string" ||
    !reportId.trim()
  ) {
    throw new TypeError(
      "Report ID is required.",
    );
  }

  if (
    typeof ownerId !== "string" ||
    !ownerId.trim()
  ) {
    throw new TypeError(
      "Owner ID is required.",
    );
  }

  return {
    reportId:
      reportId.trim(),

    ownerId:
      ownerId.trim(),
  };
};

export const enqueueReportJob =
  async ({
    reportId,
    ownerId,
  }) => {
    const queue =
      getReportQueue();

    const data =
      normalizeReportJobData({
        reportId,
        ownerId,
      });

    return queue.add(
      JOB_NAMES.REPORT,
      data,
      {
        jobId:
          `report-${data.reportId}`,
      },
    );
  };

export const createReportProcessor =
  ({
    reportService,
  }) => {
    if (
      !reportService ||
      typeof reportService.generateReport !==
        "function"
    ) {
      throw new TypeError(
        "A report service with generateReport is required.",
      );
    }

    return async (job) => {
      const data =
        normalizeReportJobData(
          job.data || {},
        );

      return reportService.generateReport({
        reportId:
          data.reportId,

        ownerId:
          data.ownerId,
      });
    };
  };