import express from "express";

import reviewRoutes
  from "./routes/review.routes.js";

import reportRoutes
  from "./routes/report.routes.js";

import healthRoutes
  from "./routes/health.routes.js";

import {
  requestId
} from "./middleware/requestId.middleware.js";

import {
  rateLimit
} from "./middleware/rateLimit.middleware.js";

import {
  security
} from "./middleware/security.middleware.js";

import {
  notFound
} from "./middleware/notFound.middleware.js";

import {
  errorHandler
} from "./middleware/error.middleware.js";

const app =
  express();

app.disable(
  "x-powered-by"
);

app.set(
  "trust proxy",
  1
);

app.use(
  requestId
);

app.use(
  security
);

app.use(
  rateLimit
);

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "2mb"
  })
);

app.get(
  "/",
  (_req, res) => {
    res.json({
      success: true,
      service:
        "Code Review Analysis Backend",
      version: "1.0.0"
    });
  }
);

app.use(
  "/api/health",
  healthRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/reports",
  reportRoutes
);

app.use(
  notFound
);

app.use(
  errorHandler
);

export default app;