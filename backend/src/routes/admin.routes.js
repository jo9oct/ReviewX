import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as adminCtrl from "../controllers/admin.controller.js";
import * as adminBillingCtrl from "../controllers/adminBilling.controller.js";
import * as platformSettingsCtrl from "../controllers/platformSettings.controller.js";

const router = Router();

// All admin endpoints require authentication and platform_admin role
router.use(authenticate);
router.use(authorize("platform_admin"));

// Platform Stats, Users & Companies
router.get("/stats", adminCtrl.getStats);
router.get("/companies", adminCtrl.listCompanies);
router.get("/users", adminCtrl.listUsers);
router.patch("/users/:id/role", adminCtrl.updateUserRole);
router.patch("/users/:id/status", adminCtrl.toggleUserStatus);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ADMIN: SUBSCRIPTION & BILLING
// ─────────────────────────────────────────────────────────────────────────────

// 1. Revenue Overview & KPIs
router.get("/billing/overview", adminBillingCtrl.getOverview);

// 2. Subscriptions Management
router.get("/billing/subscriptions", adminBillingCtrl.listSubscriptions);
router.get("/billing/subscriptions/:id", adminBillingCtrl.getSubscriptionDetail);
router.post("/billing/subscriptions/:id/grant-extend", adminBillingCtrl.grantExtendSubscription);
router.post("/billing/subscriptions/:id/change-plan", adminBillingCtrl.changeSubscriptionPlan);
router.post("/billing/subscriptions/:id/cancel-expire", adminBillingCtrl.cancelOrExpireSubscription);
router.post("/billing/subscriptions/:id/reactivate", adminBillingCtrl.reactivateSubscription);
router.post("/billing/subscriptions/:id/reset-usage", adminBillingCtrl.resetSubscriptionUsage);
router.post("/billing/subscriptions/:id/custom-limits", adminBillingCtrl.applyCustomLimits);

// 3. Payments & Reconciliation
router.get("/billing/payments/export", adminBillingCtrl.exportPaymentsCsv);
router.get("/billing/payments/reconciliation", adminBillingCtrl.getReconciliationReport);
router.get("/billing/payments", adminBillingCtrl.listPayments);
router.get("/billing/payments/:txRef", adminBillingCtrl.getPaymentDetail);
router.post("/billing/payments/:txRef/reverify", adminBillingCtrl.reverifyPayment);
router.post("/billing/payments/:txRef/refund", adminBillingCtrl.refundPayment);
router.post("/billing/payments/:txRef/resend-receipt", adminBillingCtrl.resendPaymentReceipt);

// 4. Plans Catalogue Management
router.get("/billing/plans", adminBillingCtrl.listCataloguePlans);
router.put("/billing/plans/:planId", adminBillingCtrl.updateCataloguePlan);

// 5. Usage & Limits Monitoring
router.get("/billing/usage", adminBillingCtrl.getUsageMonitoring);

// 6. Billing Health, Webhooks & Audit Logs
router.get("/billing/webhooks", adminBillingCtrl.listWebhookLogs);
router.post("/billing/webhooks/:id/replay", adminBillingCtrl.replayWebhook);
router.get("/billing/audit-logs", adminBillingCtrl.listBillingAuditLogs);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ADMIN: QUEUE MONITORING
// ─────────────────────────────────────────────────────────────────────────────

router.get('/queues/summary', adminCtrl.getQueuesSummary);
router.get('/queues', adminCtrl.getQueuesDetail);
router.post('/queues/:queue/retry-failed', adminCtrl.retryFailedJobs);

// All-platform reviews monitoring
router.get('/reviews', adminCtrl.listAllReviews);

// General activity / audit log
router.get('/activity', adminCtrl.listAllAuditLogs);

// Email delivery logs
router.get('/email-logs', adminCtrl.listEmailLogs);

// System settings (read-only env snapshot)
router.get('/settings', adminCtrl.getPlatformSettings);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ADMIN: PLATFORM SETTINGS (writable)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/platform-settings', platformSettingsCtrl.getSettings);
router.put('/platform-settings/:section', platformSettingsCtrl.updateSettings);
router.post('/platform-settings/test-email', platformSettingsCtrl.sendTestEmail);
router.get('/platform-settings/integrations', platformSettingsCtrl.getIntegrationStatuses);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ADMIN: ADMIN MANAGEMENT (promote / demote)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/admins', adminCtrl.listAdmins);
router.post('/admins/promote', adminCtrl.promoteToAdmin);
router.post('/admins/demote', adminCtrl.demoteAdmin);

export default router;
