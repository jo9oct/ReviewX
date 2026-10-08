// STATUS: UPDATED

import crypto from 'node:crypto';

import {
  createPayment,
  findByTxRef,
  updateByTxRef,
} from '../database/repositories/payment.repositories.js';

import {
  findById as findUserById,
} from '../database/repositories/user.repository.js';

import {
  initializeTransaction,
  verifyTransaction,
} from '../integrations/chapa/chapa.client.js';

import {
  getSubscription,
  upgradeSubscription,
} from './subscription.service.js';

import { ApiError } from '../utils/ApiError.js';

import environment from '../config/environment.js';

const PLANS = Object.freeze({
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
});

const getPlanPrice = (plan) => {
  switch (plan) {
    case PLANS.PRO:
      return environment.payment.proPlanPrice;

    case PLANS.ENTERPRISE:
      return environment.payment.enterprisePlanPrice;

    default:
      throw ApiError.badRequest('Invalid subscription plan');
  }
};

const validatePlan = (plan) => {
  if (!Object.values(PLANS).includes(plan)) {
    throw ApiError.badRequest('Invalid subscription plan');
  }
};

/**
 * Chapa requires tx_ref to be no longer than 50 characters.
 *
 * Example:
 * CR-PRO-mg8k2abc-a1b2c3d4
 * CR-ENTERPRISE-mg8k2abc-0123456789abcdef01234567
 *
 * The enterprise reference stays within Chapa's 50-character limit.
 */
const createTxRef = (plan) => {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(12).toString('hex');

  return `CR-${plan.toUpperCase()}-${timestamp}-${randomPart}`;
};

const isValidEmail = (email) => {
  if (typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.trim();

  if (!normalizedEmail || normalizedEmail.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
};

const buildCallbackUrl = () => {
  const {
    backendUrl,
  } = environment.payment;

  return new URL(
    '/api/v1/payment/callback',
    `${backendUrl.replace(/\/+$/, '')}/`,
  ).toString();
};

const buildReturnUrl = (txRef) => {
  const {
    frontendUrl,
  } = environment.payment;

  const returnUrl = new URL(
    '/payment-success',
    `${frontendUrl.replace(/\/+$/, '')}/`,
  );
  returnUrl.searchParams.set('tx_ref', txRef);
  return returnUrl.toString();
};

const splitUserName = (name) => {
  const normalizedName =
    typeof name === 'string'
      ? name.trim()
      : '';

  if (!normalizedName) {
    return {
      firstName: 'User',
      lastName: 'User',
    };
  }

  const parts =
    normalizedName.split(/\s+/);

  return {
    firstName: parts[0],
    lastName:
      parts.slice(1).join(' ') || 'User',
  };
};

/**
 * Initiate a payment for a controlled
 * subscription plan.
 *
 * The frontend does NOT provide:
 * - userId
 * - amount
 * - currency
 * - price
 *
 * The backend controls all of them.
 */
export async function initiatePayment({
  userId,
  plan,
}) {
  if (!userId) {
    throw ApiError.unauthorized(
      'Authenticated user is required',
    );
  }

  validatePlan(plan);

  const user =
    await findUserById(userId);

  if (!user) {
    throw ApiError.notFound(
      'User account not found',
    );
  }

  const email =
    typeof user.email === 'string'
      ? user.email.trim().toLowerCase()
      : '';

  if (!isValidEmail(email)) {
    throw ApiError.badRequest(
      'A valid email address is required for payment',
    );
  }

  const subscription =
    await getSubscription(userId);

  if (
    subscription.plan === plan &&
    subscription.status === 'active'
  ) {
    throw ApiError.badRequest(
      `You already have an active ${plan} subscription`,
    );
  }

  const amount =
    getPlanPrice(plan);

  const currency =
    environment.payment.currency;

  const txRef =
    createTxRef(plan);

  /*
   * Create our internal payment record
   * before contacting Chapa.
   */
  await createPayment({
    userId,
    plan,
    amount,
    currency,
    txRef,
    status: 'pending',
  });

  try {
    const {
      firstName,
      lastName,
    } = splitUserName(user.name);

    const chapaResponse =
      await initializeTransaction({
        amount,
        currency,
        email,
        firstName,
        lastName,
        txRef,
        callbackUrl:
          buildCallbackUrl(),
        returnUrl:
          buildReturnUrl(txRef),
        plan,
      });

    const checkoutUrl =
      chapaResponse?.data?.checkout_url;

    if (!checkoutUrl) {
      throw ApiError.internal(
        'Chapa did not return a checkout URL',
      );
    }

    const updatedPayment =
      await updateByTxRef(
        txRef,
        {
          checkoutUrl,
        },
      );

    if (!updatedPayment) {
      throw ApiError.internal(
        'Payment record could not be updated',
      );
    }

    return {
      paymentId:
        updatedPayment._id,

      txRef:
        updatedPayment.txRef,

      plan:
        updatedPayment.plan,

      amount:
        updatedPayment.amount,

      currency:
        updatedPayment.currency,

      status:
        updatedPayment.status,

      checkoutUrl:
        updatedPayment.checkoutUrl,
    };
  } catch (error) {
    /*
     * If Chapa initialization fails,
     * mark our internal payment as failed.
     */
    try {
      await updateByTxRef(
        txRef,
        {
          status: 'failed',
        },
      );
    } catch (persistenceError) {
      process.stderr.write(
        `Failed to mark Chapa payment ${txRef} as failed after initialization error: ${
          persistenceError instanceof Error
            ? persistenceError.message
            : String(persistenceError)
        }\n`,
      );
    }

    throw error;
  }
}

/**
 * Verify a Chapa payment and upgrade
 * the user's subscription.
 *
 * Chapa calls this through the public
 * callback URL.
 *
 * The payment is considered successful
 * only after server-side verification.
 */
export async function verifyAndCompletePayment({
  txRef,
}) {
  if (
    !txRef ||
    typeof txRef !== 'string'
  ) {
    throw ApiError.badRequest(
      'Transaction reference is required',
    );
  }

  const payment =
    await findByTxRef(txRef);

  if (!payment) {
    throw ApiError.notFound(
      'Payment transaction not found',
    );
  }

  /*
   * Idempotency.
   *
   * If Chapa calls the callback multiple
   * times, do not process the payment again.
   *
   * If the subscription upgrade previously
   * failed, retrying the callback can still
   * complete the subscription.
   */
  if (payment.status === 'paid') {
    const subscription =
      await getSubscription(
        payment.userId,
      );

    if (
      subscription.plan !== payment.plan ||
      subscription.status !== 'active'
    ) {
      await upgradeSubscription(
        payment.userId,
        payment.plan,
      );
    }

    return {
      payment,
      alreadyProcessed: true,
      verificationStatus: 'paid',
    };
  }

  /*
   * Ask Chapa directly for the transaction
   * status. Never trust the callback alone.
   */
  const chapaResponse =
    await verifyTransaction({
      txRef,
    });

  const chapaData =
    chapaResponse?.data;

  if (!chapaData) {
    throw ApiError.internal(
      'Invalid response received from Chapa',
    );
  }

  const chapaStatus =
    String(
      chapaData.status || '',
    ).trim().toLowerCase();

  if (chapaStatus !== 'success') {
    const terminalFailureStatuses = new Set([
      'failed',
      'cancelled',
      'canceled',
      'expired',
    ]);

    if (terminalFailureStatuses.has(chapaStatus)) {
      const failedPayment = await updateByTxRef(
        txRef,
        {
          status: 'failed',
        },
      );
      if (!failedPayment) {
        throw ApiError.internal(
          'Payment could not be marked as failed',
        );
      }
      return {
        payment: failedPayment,
        alreadyProcessed: false,
        verificationStatus: 'failed',
      };
    }

    if (['pending', 'initiated', 'processing', ''].includes(chapaStatus)) {
      return {
        payment,
        alreadyProcessed: false,
        verificationStatus: 'pending',
      };
    }

    const error = new Error('Chapa returned an unsupported transaction status.');
    error.code = 'CHAPA_UNSUPPORTED_TRANSACTION_STATUS';
    error.statusCode = 502;
    throw error;
  }

  /*
   * Verify transaction reference.
   */
  if (
    chapaData.tx_ref &&
    chapaData.tx_ref !== payment.txRef
  ) {
    throw ApiError.badRequest(
      'Chapa transaction reference does not match the payment',
    );
  }

  /*
   * Verify the amount returned by Chapa
   * against our own database record.
   */
  const verifiedAmount =
    Number(chapaData.amount);

  if (
    !Number.isFinite(verifiedAmount) ||
    verifiedAmount !==
      Number(payment.amount)
  ) {
    throw ApiError.badRequest(
      'Payment amount does not match the expected amount',
    );
  }

  /*
   * Verify currency.
   */
  const verifiedCurrency =
    String(
      chapaData.currency || '',
    ).toUpperCase();

  if (
    verifiedCurrency !==
    payment.currency
  ) {
    throw ApiError.badRequest(
      'Payment currency does not match the expected currency',
    );
  }

  /*
   * Mark the payment as paid only after
   * all Chapa verification checks pass.
   */
  const paidPayment =
    await updateByTxRef(
      txRef,
      {
        status: 'paid',
        chapaReference:
          chapaData.reference || null,
        verifiedAt: new Date(),
      },
    );

  if (!paidPayment) {
    throw ApiError.internal(
      'Payment could not be marked as paid',
    );
  }

  /*
   * Upgrade the subscription only after
   * successful payment verification.
   *
   * payment.plan is trusted because it
   * originated from our own payment record,
   * not from the frontend.
   */
  const subscription =
    await getSubscription(
      payment.userId,
    );

  if (
    subscription.plan !== payment.plan ||
    subscription.status !== 'active'
  ) {
    await upgradeSubscription(
      payment.userId,
      payment.plan,
    );
  }

  return {
    payment: paidPayment,
    alreadyProcessed: false,
    verificationStatus: 'paid',
  };
}