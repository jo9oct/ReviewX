import express from "express";

import apiRoutes from "./routes/index.js";

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
  analysisAccessMiddleware
} from "./middleware/analysisAccess.middleware.js";

import {
  notFound
} from "./middleware/notFound.middleware.js";

import {
  errorHandler
} from "./middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestId);
app.use(security);
app.use(rateLimit);

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

app.use(analysisAccessMiddleware);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "Code Review Analysis Backend",
    version: "1.0.0"
  });
});

// Mount consolidated API router under /api and /api/v1
app.use("/api", apiRoutes);
app.use("/api/v1", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
