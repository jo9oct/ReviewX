// STATUS: UPDATED

import {
  initiatePayment as initiatePaymentService,
  verifyAndCompletePayment,
} from '../services/payment.service.js';
import { WebhookLog } from '../database/models/webhookLog.model.js';
import { resolveWorkspace } from '../utils/resolveWorkspace.js';

const initiateProPayment = async (
  req,
  res,
  next,
) => {
  try {
    const workspace = resolveWorkspace(req);
    const result =
      await initiatePaymentService({
        userId: req.user.id,
        plan: 'pro',
        workspace,
      });

    return res.status(201).json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const initiateTeamPayment = async (
  req,
  res,
  next,
) => {
  try {
    const workspace = resolveWorkspace(req);
    const result =
      await initiatePaymentService({
        userId: req.user.id,
        plan: 'team',
        workspace,
      });

    return res.status(201).json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const initiateEnterprisePayment = async (
  req,
  res,
  next,
) => {
  try {
    const workspace = resolveWorkspace(req);
    const result =
      await initiatePaymentService({
        userId: req.user.id,
        plan: 'enterprise',
        workspace,
      });

    return res.status(201).json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPayment = async (
  req,
  res,
  next,
) => {
  try {
    const txRef =
      req.params.txRef ||
      req.body?.tx_ref ||
      req.body?.data?.tx_ref;

    const result =
      await verifyAndCompletePayment({
        txRef,
      });

    return res.status(200).json({
      success: true,
      data: {
        payment: result.payment,
        alreadyProcessed:
          result.alreadyProcessed,
        verificationStatus:
          result.verificationStatus,
      },
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const handleChapaCallback = async (
  req,
  res,
  next,
) => {
  try {
    const txRef =
      req.body?.tx_ref ||
      req.body?.data?.tx_ref;

    if (typeof txRef !== 'string' || !txRef.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CHAPA_CALLBACK_REFERENCE_MISSING',
          message: 'Chapa callback did not include a transaction reference.',
        },
      });
    }

    const result =
      await verifyAndCompletePayment({
        txRef: txRef.trim(),
      });

    await WebhookLog.create({
      provider: 'chapa',
      txRef: txRef.trim(),
      payload: req.body,
      signatureValid: true,
      processingStatus: 'processed',
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      data: {
        txRef: txRef.trim(),
        verificationStatus: result.verificationStatus,
      },
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (error) {
    await WebhookLog.create({
      provider: 'chapa',
      txRef: req.body?.tx_ref || req.body?.data?.tx_ref || null,
      payload: req.body,
      signatureValid: true,
      processingStatus: 'failed',
      errorMessage: error.message,
    }).catch(() => {});

    return next(error);
  }
};

export {
  initiateProPayment,
  initiateTeamPayment,
  initiateEnterprisePayment,
  verifyPayment,
  handleChapaCallback,
};