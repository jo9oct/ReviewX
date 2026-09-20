
import { successResponse } from "../utils/response.js";

export function health(req, res) {
  return res.status(200).json(
    successResponse({
      message: "Analysis backend is healthy.",
      requestId: req.requestId,
      data: {
        service: "code-review-analysis-backend",
        status: "healthy",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
      }
    })
  );
}