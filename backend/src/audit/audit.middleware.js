export const createAuditMiddleware = ({
  auditService,
  resolveActorId = () => null,
}) => {
  if (
    !auditService ||
    typeof auditService.record !==
      "function"
  ) {
    throw new TypeError(
      "Audit service is required.",
    );
  }

  return async (
    req,
    res,
    next,
  ) => {
    const startedAt =
      Date.now();

    res.on(
      "finish",
      () => {
        const actorId =
          resolveActorId(req);

        void auditService
          .record({
            action:
              `${req.method} ${req.baseUrl || ""}${req.path}`,
            actorId,
            resourceType:
              "http_request",
            resourceId: null,
            status:
              res.statusCode >= 400
                ? "failed"
                : "success",
            metadata: {
              statusCode:
                res.statusCode,
              durationMs:
                Date.now() -
                startedAt,
            },
            ipAddress:
              req.ip || null,
            userAgent:
              req.get("user-agent") ||
              null,
          })
          .catch(() => {
            /*
             * Audit failure must not break
             * an already completed HTTP response.
             */
          });
      },
    );

    next();
  };
};