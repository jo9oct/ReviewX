/**
 * Notification trigger service.
 *
 * Centralized trigger functions called from existing services
 * to fire notifications at appropriate moments.
 *
 * Each function is designed to be called fire-and-forget
 * (non-blocking) — failures are logged but never throw.
 */

import {
  NOTIFICATION_TYPES,
  PRIORITY_LEVELS,
} from '../config/notification.config.js';

import {
  notificationService,
} from './notification.service.js';

const safeTrigger = async (triggerFn, context) => {
  try {
    await triggerFn();
  } catch (error) {
    console.error(`[notificationTrigger] Failed for ${context}:`, error.message);
  }
};

const notificationTriggerService = {
  // ── Review Events ──────────────────────────────────────────────────────────

  /**
   * Triggered when a review is queued.
   */
  async onReviewQueued(review, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: review.company,
        type: NOTIFICATION_TYPES.REVIEW_QUEUED,
        title: 'Review Queued',
        message: `Your review has been queued for processing.`,
        data: {
          reviewId: review.reviewId || review._id,
          sourceType: review.sourceType,
          totalFiles: review.totalFiles,
        },
        actionUrl: `/reviews/${review.reviewId || review._id}`,
        actionLabel: 'View Review',
      });
    }, `review.queued:${review.reviewId || review._id}`);
  },

  /**
   * Triggered when a review starts processing.
   */
  async onReviewStarted(review, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: review.company,
        type: NOTIFICATION_TYPES.REVIEW_STARTED,
        title: 'Review Started',
        message: `Your review is now being processed.`,
        data: {
          reviewId: review.reviewId || review._id,
        },
        actionUrl: `/reviews/${review.reviewId || review._id}`,
        actionLabel: 'View Review',
      });
    }, `review.started:${review.reviewId || review._id}`);
  },

  /**
   * Triggered when a review completes successfully.
   */
  async onReviewCompleted(review, result, user) {
    await safeTrigger(async () => {
      const findingCounts = result?.findingCounts || {};
      const totalFindings = Object.values(findingCounts).reduce((a, b) => a + b, 0);
      const score = result?.score?.overall;

      const message = totalFindings > 0
        ? `Review completed with ${totalFindings} finding${totalFindings !== 1 ? 's' : ''} detected. Score: ${score}/100`
        : `Review completed with no findings. Score: ${score}/100`;

      await notificationService.create({
        userId: user._id || user.id,
        companyId: review.company,
        type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
        title: 'Review Completed',
        message,
        data: {
          reviewId: review.reviewId || review._id,
          totalFindings,
          findingCounts,
          score,
          criticalCount: findingCounts.critical || 0,
        },
        actionUrl: `/reviews/${review.reviewId || review._id}`,
        actionLabel: 'View Results',
      });

      // Also notify company admins
      if (review.company) {
        await notificationService.createForCompany({
          companyId: review.company,
          type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
          title: 'Team Review Completed',
          message: `${user?.name || 'A team member'} completed a review with ${totalFindings} finding${totalFindings !== 1 ? 's' : ''}.`,
          data: {
            reviewId: review.reviewId || review._id,
            totalFindings,
            score,
            userName: user?.name,
          },
          roles: ['company_admin'],
          actionUrl: `/reviews/${review.reviewId || review._id}`,
          actionLabel: 'View Results',
        });
      }
    }, `review.completed:${review.reviewId || review._id}`);
  },

  /**
   * Triggered when a review fails.
   */
  async onReviewFailed(review, error, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: review.company,
        type: NOTIFICATION_TYPES.REVIEW_FAILED,
        title: 'Review Failed',
        message: `Your review could not be completed. ${error?.message || 'Please try again.'}`,
        data: {
          reviewId: review.reviewId || review._id,
          errorCode: error?.code || 'UNKNOWN',
          errorMessage: error?.message,
        },
        priority: PRIORITY_LEVELS.HIGH,
        actionUrl: `/reviews/${review.reviewId || review._id}`,
        actionLabel: 'View Details',
      });
    }, `review.failed:${review.reviewId || review._id}`);
  },

  // ── Finding Events ─────────────────────────────────────────────────────────

  /**
   * Triggered when a critical finding is detected.
   */
  async onCriticalFinding(finding, review, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: review.company,
        type: NOTIFICATION_TYPES.CRITICAL_FINDING,
        title: 'Critical Finding Detected',
        message: `${finding.title} in ${finding.filePath || 'unknown file'}`,
        data: {
          reviewId: review.reviewId || review._id,
          findingId: finding._id,
          findingTitle: finding.title,
          severity: finding.severity,
          filePath: finding.filePath,
          category: finding.category,
        },
        priority: PRIORITY_LEVELS.CRITICAL,
        actionUrl: `/reviews/${review.reviewId || review._id}/findings`,
        actionLabel: 'View Finding',
      });
    }, `finding.critical:${finding._id}`);
  },

  // ── Report Events ──────────────────────────────────────────────────────────

  /**
   * Triggered when a report is ready.
   */
  async onReportReady(report, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: report.company,
        type: NOTIFICATION_TYPES.REPORT_READY,
        title: 'Report Ready',
        message: `Your ${report.type?.toUpperCase() || 'PDF'} report is ready for download.`,
        data: {
          reportId: report._id,
          reviewId: report.reviewId,
          reportType: report.type,
        },
        actionUrl: `/reports/${report._id}`,
        actionLabel: 'Download Report',
      });
    }, `report.ready:${report._id}`);
  },

  /**
   * Triggered when report generation fails.
   */
  async onReportFailed(report, error, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: report.company,
        type: NOTIFICATION_TYPES.REPORT_FAILED,
        title: 'Report Generation Failed',
        message: `We couldn't generate your report. ${error?.message || 'Please try again.'}`,
        data: {
          reportId: report._id,
          reviewId: report.reviewId,
          errorCode: error?.code || 'UNKNOWN',
        },
        priority: PRIORITY_LEVELS.HIGH,
        actionUrl: `/reviews/${report.reviewId}`,
        actionLabel: 'View Review',
      });
    }, `report.failed:${report._id}`);
  },

  // ── Invitation Events ──────────────────────────────────────────────────────

  /**
   * Triggered when an invitation is created.
   */
  async onInvitationCreated(invitation, inviter) {
    await safeTrigger(async () => {
      // Handle both Mongoose documents and plain objects
      const invitationData = typeof invitation.toObject === 'function'
        ? invitation.toObject()
        : invitation;

      // The invitee may not have an account yet. The invitation email is
      // sent separately by the invitation service, so only create an in-app
      // notification when a matching user already exists — otherwise there
      // is no user document to attach the notification to.
      const { findByEmail } = await import('../database/repositories/user.repository.js');
      const existingUser = await findByEmail(invitationData.email);

      if (!existingUser) {
        return;
      }

      await notificationService.create({
        userId: existingUser._id || existingUser.id,
        companyId: invitationData.company,
        type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
        title: 'Invitation Received',
        message: `${inviter?.name || 'Someone'} invited you to join ${invitationData.companyName || 'a team'}.`,
        data: {
          invitationId: invitationData._id,
          companyId: invitationData.company,
          companyName: invitationData.companyName,
          role: invitationData.role,
          inviterName: inviter?.name,
        },
        actionUrl: invitationData.token ? `/invite/${invitationData.token}` : '/notifications',
        actionLabel: 'Accept Invitation',
      });
    }, `invitation.created:${invitation._id}`);
  },

  /**
   * Triggered when an invitation is accepted.
   */
  async onInvitationAccepted(invitation, user) {
    await safeTrigger(async () => {
      // Notify company admins
      if (invitation.company) {
        await notificationService.createForCompany({
          companyId: invitation.company,
          type: NOTIFICATION_TYPES.INVITATION_ACCEPTED,
          title: 'New Member Joined',
          message: `${user?.name || invitation.email} joined the team.`,
          data: {
            invitationId: invitation._id,
            userId: user?._id,
            userName: user?.name,
            userEmail: user?.email,
          },
          roles: ['company_admin'],
        });
      }
    }, `invitation.accepted:${invitation._id}`);
  },

  // ── Team Events ────────────────────────────────────────────────────────────

  /**
   * Triggered when a member is added to a company.
   */
  async onMemberAdded(member, actor) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: member._id || member.id,
        type: NOTIFICATION_TYPES.MEMBER_JOINED,
        title: 'Welcome to the Team',
        message: `${actor?.name || 'An admin'} added you to the company.`,
        data: {
          companyId: member.company,
          memberId: member._id,
          actorName: actor?.name,
        },
      });
    }, `member.added:${member._id}`);
  },

  /**
   * Triggered when a member is removed from a company.
   */
  async onMemberRemoved(member, actor) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: member._id || member.id,
        type: NOTIFICATION_TYPES.MEMBER_REMOVED,
        title: 'Removed from Team',
        message: `${actor?.name || 'An admin'} removed you from the company.`,
        data: {
          companyId: member.company,
          actorName: actor?.name,
        },
      });
    }, `member.removed:${member._id}`);
  },

  /**
   * Triggered when a member's role is changed.
   */
  async onRoleChanged(member, newRole, actor) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: member._id || member.id,
        type: NOTIFICATION_TYPES.ROLE_CHANGED,
        title: 'Role Updated',
        message: `${actor?.name || 'An admin'} changed your role to ${newRole}.`,
        data: {
          companyId: member.company,
          newRole,
          actorName: actor?.name,
        },
      });
    }, `role.changed:${member._id}`);
  },

  // ── Billing Events ─────────────────────────────────────────────────────────

  /**
   * Triggered when a subscription is expiring soon.
   */
  async onSubscriptionExpiring(subscription, daysLeft) {
    await safeTrigger(async () => {
      const companyId = subscription.companyId || null;
      const userId = subscription.userId || null;

      const payload = {
        type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
        title: 'Subscription Expiring Soon',
        message: `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please renew to avoid interruption.`,
        data: {
          subscriptionId: subscription._id,
          plan: subscription.plan,
          daysLeft,
          expiryDate: subscription.expiresAt,
        },
        actionUrl: '/billing',
        actionLabel: 'Manage Subscription',
      };

      if (companyId) {
        await notificationService.createForCompany({
          ...payload,
          companyId,
          roles: ['company_admin'],
        });
      } else if (userId) {
        await notificationService.create({
          ...payload,
          userId,
        });
      }
    }, `subscription.expiring:${subscription._id}`);
  },

  /**
   * Triggered when a subscription expires.
   */
  async onSubscriptionExpired(subscription) {
    await safeTrigger(async () => {
      const companyId = subscription.companyId || null;
      const userId = subscription.userId || null;

      const payload = {
        type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED,
        title: 'Subscription Expired',
        message: `Your subscription has expired. Your account is now on the free plan.`,
        data: {
          subscriptionId: subscription._id,
          plan: subscription.plan,
        },
        priority: PRIORITY_LEVELS.CRITICAL,
        actionUrl: '/billing',
        actionLabel: 'Renew Subscription',
      };

      if (companyId) {
        await notificationService.createForCompany({
          ...payload,
          companyId,
          roles: ['company_admin'],
        });
      } else if (userId) {
        await notificationService.create({
          ...payload,
          userId,
        });
      }
    }, `subscription.expired:${subscription._id}`);
  },

  /**
   * Triggered when a payment fails.
   */
  async onPaymentFailed(payment, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: payment.companyId || null,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: `We couldn't process your payment. Please update your payment method.`,
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          txRef: payment.txRef,
        },
        priority: PRIORITY_LEVELS.CRITICAL,
        actionUrl: '/billing',
        actionLabel: 'Update Payment',
      });
    }, `payment.failed:${payment._id}`);
  },

  /**
   * Triggered when an upgrade is requested.
   */
  async onUpgradeRequested(upgradeRequest, user) {
    await safeTrigger(async () => {
      await notificationService.createForCompany({
        companyId: upgradeRequest.companyId,
        type: NOTIFICATION_TYPES.UPGRADE_REQUESTED,
        title: 'Upgrade Requested',
        message: `${user?.name || 'A team member'} requested a plan upgrade.`,
        data: {
          upgradeRequestId: upgradeRequest._id,
          userId: user?._id || upgradeRequest.requesterId,
          userName: user?.name,
          requestMessage: upgradeRequest.message,
        },
        roles: ['company_admin'],
        actionUrl: '/billing',
        actionLabel: 'Review Request',
      });
    }, `upgrade.requested:${upgradeRequest._id}`);
  },

  /**
   * Triggered when an upgrade is approved.
   */
  async onUpgradeApproved(upgradeRequest, user) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        companyId: upgradeRequest.companyId || null,
        type: NOTIFICATION_TYPES.UPGRADE_APPROVED,
        title: 'Upgrade Approved',
        message: `Your upgrade request has been approved.`,
        data: {
          upgradeRequestId: upgradeRequest._id,
        },
        actionUrl: '/billing',
        actionLabel: 'View Plan',
      });
    }, `upgrade.approved:${upgradeRequest._id}`);
  },

  /**
   * Triggered when usage reaches 80% of quota.
   */
  async onUsageWarning(workspace, usage) {
    await safeTrigger(async () => {
      const limit = usage.reviews.limit;
      const percentage = limit ? Math.round((usage.reviews.used / limit) * 100) : 0;

      const payload = {
        type: NOTIFICATION_TYPES.USAGE_WARNING,
        title: 'Usage Warning',
        message: `You've used ${percentage}% of your monthly review quota (${usage.reviews.used}/${limit}).`,
        data: {
          used: usage.reviews.used,
          limit,
          percentage,
        },
        actionUrl: '/billing',
        actionLabel: 'View Usage',
      };

      if (workspace.companyId) {
        await notificationService.createForCompany({
          ...payload,
          companyId: workspace.companyId,
          roles: ['company_admin'],
        });
      } else if (workspace.userId) {
        await notificationService.create({
          ...payload,
          userId: workspace.userId,
        });
      }
    }, `usage.warning:${workspace.companyId || workspace.userId}`);
  },

  // ── Security Events ────────────────────────────────────────────────────────

  /**
   * Triggered on new login from unrecognized device/location.
   */
  async onNewLogin(user, deviceInfo) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        type: NOTIFICATION_TYPES.NEW_LOGIN,
        title: 'New Login Detected',
        message: `New login from ${deviceInfo?.browser || 'unknown browser'} on ${deviceInfo?.os || 'unknown OS'}.`,
        data: {
          deviceInfo,
          timestamp: new Date(),
        },
        priority: PRIORITY_LEVELS.HIGH,
      });
    }, `security.new_login:${user._id}`);
  },

  /**
   * Triggered on security alert.
   */
  async onSecurityAlert(user, details) {
    await safeTrigger(async () => {
      await notificationService.create({
        userId: user._id || user.id,
        type: NOTIFICATION_TYPES.SECURITY_ALERT,
        title: 'Security Alert',
        message: details?.message || 'A security issue was detected on your account.',
        data: {
          alertType: details?.type,
          details: details?.description,
          timestamp: new Date(),
        },
        priority: PRIORITY_LEVELS.CRITICAL,
      });
    }, `security.alert:${user._id}`);
  },

  // ── System Events ──────────────────────────────────────────────────────────

  /**
   * Triggered for system maintenance notifications.
   */
  async onSystemMaintenance(maintenanceInfo) {
    await safeTrigger(async () => {
      // Notify all users or targeted users
      await notificationService.createForPlatformAdmins({
        type: NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
        title: 'Scheduled Maintenance',
        message: maintenanceInfo?.message || 'System maintenance is scheduled.',
        data: {
          startTime: maintenanceInfo?.startTime,
          endTime: maintenanceInfo?.endTime,
          affectedServices: maintenanceInfo?.affectedServices,
        },
      });
    }, `system.maintenance`);
  },

  /**
   * Triggered for platform announcements.
   */
  async onAnnouncement(announcement) {
    await safeTrigger(async () => {
      await notificationService.createForPlatformAdmins({
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        title: announcement?.title || 'Announcement',
        message: announcement?.message,
        data: {
          announcementId: announcement?._id,
        },
      });
    }, `system.announcement`);
  },
};

export {
  notificationTriggerService,
};

export default notificationTriggerService;
