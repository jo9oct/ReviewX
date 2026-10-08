// STATUS: UPDATED

import {
  initiatePayment as initiatePaymentService,
  verifyAndCompletePayment,
} from '../services/payment.service.js';

const initiateProPayment = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await initiatePaymentService({
        userId: req.user.id,
        plan: 'pro',
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
    const result =
      await initiatePaymentService({
        userId: req.user.id,
        plan: 'enterprise',
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
    return next(error);
  }
};

export {
  initiateProPayment,
  initiateEnterprisePayment,
  verifyPayment,
  handleChapaCallback,
};