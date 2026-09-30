import {
  getReportQueue,
} from "../queue/queue.factory.js";

import {
  JOB_NAMES,
} from "../queue/queue.constants.js";

const normalizeReportJobData = ({
  reportId,
}) => {
  if (
    typeof reportId !== "string" ||
    !reportId.trim()
  ) {
    throw new TypeError(
      "Report ID is required.",
    );
  }

  return {
    reportId:
      reportId.trim(),
  };
};

export const enqueueReportJob =
  async ({
    reportId,
  }) => {
    const queue =
      getReportQueue();

    const data =
      normalizeReportJobData({
        reportId,
      });

    return queue.add(
      JOB_NAMES.REPORT,
      data,
      {
        jobId:
          `report:${data.reportId}`,
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
      });
    };
  };