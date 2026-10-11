import * as adminBillingService from '../services/adminBilling.service.js';

function errorCode(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
  };
  return map[status] ?? 'ERROR';
}

function handleError(err, res, next) {
  if (err.isOperational || err.statusCode) {
    const status = err.statusCode || 500;
    const code = err.code || errorCode(status);
    return res.status(status).json({
      success: false,
      error: { message: err.message, code },
      ...(err.errors?.length && { errors: err.errors }),
      ...(err.details && { details: err.details }),
    });
  }
  return next(err);
}

// 1. Overview
export async function getOverview(req, res, next) {
  try {
    const data = await adminBillingService.getBillingOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

// 2. Subscriptions
export async function listSubscriptions(req, res, next) {
  try {
    const data = await adminBillingService.listSubscriptions(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getSubscriptionDetail(req, res, next) {
  try {
    const data = await adminBillingService.getSubscriptionDetail(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function grantExtendSubscription(req, res, next) {
  try {
    const { days, newExpiryDate, reason } = req.body;
    const data = await adminBillingService.grantExtendSubscription(
      req.params.id,
      { days, newExpiryDate, reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function changeSubscriptionPlan(req, res, next) {
  try {
    const { targetPlan, reason } = req.body;
    const data = await adminBillingService.changeSubscriptionPlan(
      req.params.id,
      { targetPlan, reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function cancelOrExpireSubscription(req, res, next) {
  try {
    const { targetStatus, reason } = req.body;
    const data = await adminBillingService.cancelOrExpireSubscription(
      req.params.id,
      { targetStatus, reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function reactivateSubscription(req, res, next) {
  try {
    const { reason, extensionDays } = req.body;
    const data = await adminBillingService.reactivateSubscription(
      req.params.id,
      { reason, extensionDays },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function resetSubscriptionUsage(req, res, next) {
  try {
    const { reason } = req.body;
    const data = await adminBillingService.resetSubscriptionUsage(
      req.params.id,
      { reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function applyCustomLimits(req, res, next) {
  try {
    const { customLimits, reason } = req.body;
    const data = await adminBillingService.applyCustomLimits(
      req.params.id,
      { customLimits, reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

// 3. Payments
export async function listPayments(req, res, next) {
  try {
    const data = await adminBillingService.listPayments(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getPaymentDetail(req, res, next) {
  try {
    const data = await adminBillingService.getPaymentDetail(req.params.txRef);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function reverifyPayment(req, res, next) {
  try {
    const { reason } = req.body || {};
    const data = await adminBillingService.reverifyPayment(
      req.params.txRef,
      { reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function refundPayment(req, res, next) {
  try {
    const { reason, revokeSubscription } = req.body;
    const data = await adminBillingService.refundPayment(
      req.params.txRef,
      { reason, revokeSubscription },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function resendPaymentReceipt(req, res, next) {
  try {
    const data = await adminBillingService.resendPaymentReceipt(
      req.params.txRef,
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function exportPaymentsCsv(req, res, next) {
  try {
    const csvContent = await adminBillingService.exportPaymentsCsv(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reviewx-payments.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getReconciliationReport(req, res, next) {
  try {
    const data = await adminBillingService.getReconciliationReport();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

// 4. Plans Catalogue
export async function listCataloguePlans(req, res, next) {
  try {
    const data = await adminBillingService.listCataloguePlans();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateCataloguePlan(req, res, next) {
  try {
    const { updates, reason } = req.body;
    const data = await adminBillingService.updateCataloguePlan(
      req.params.planId,
      updates,
      { reason },
      req.user,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

// 5. Usage Monitoring
export async function getUsageMonitoring(req, res, next) {
  try {
    const data = await adminBillingService.getUsageMonitoring();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

// 6. Logs & Health
export async function listWebhookLogs(req, res, next) {
  try {
    const data = await adminBillingService.listWebhookLogs(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function replayWebhook(req, res, next) {
  try {
    const data = await adminBillingService.replayWebhookLog(req.params.id, req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listBillingAuditLogs(req, res, next) {
  try {
    const data = await adminBillingService.listBillingAuditLogs(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}
