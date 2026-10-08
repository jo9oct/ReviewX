// STATUS: UPDATED

import axios from 'axios';

import environment from '../../config/environment.js';

const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

const getChapaSecretKey = () => {
  const secretKey = environment.payment.chapaSecretKey;

  if (typeof secretKey !== 'string' || !secretKey.trim()) {
    const error = new Error('CHAPA_SECRET_KEY is not configured.');
    error.code = 'CHAPA_SECRET_KEY_MISSING';
    error.statusCode = 500;
    throw error;
  }

  return secretKey.trim();
};

const getProviderMessage = (data, secretKey) => {
  const candidate =
    typeof data?.message === 'string'
      ? data.message
      : typeof data?.error === 'string'
        ? data.error
        : '';

  if (!candidate.trim()) {
    return '';
  }

  return candidate
    .replaceAll(secretKey, '[redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 300);
};

const chapaRequest = async ({ method, url, data }) => {
  const secretKey = getChapaSecretKey();

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = getProviderMessage(
      error.response?.data,
      secretKey,
    );
    let message;

    if (status === 401 || status === 403) {
      message =
        'Chapa rejected the configured credentials. Check CHAPA_SECRET_KEY in the backend environment.';
    } else if (status === 400 || status === 422) {
      message = providerMessage
        ? `Chapa rejected the payment request: ${providerMessage}`
        : 'Chapa rejected the payment request. Check the configured amount, currency, and checkout URLs.';
    } else if (!error.response) {
      message =
        error.code === 'ECONNABORTED'
          ? 'The request to Chapa timed out. Check the backend network connection and try again.'
          : 'The backend could not connect to Chapa. Check the backend network connection and try again.';
    } else {
      message = `Chapa could not process the payment request (HTTP ${status}). Try again later.`;
    }

    console.error(
      `Chapa API request failed (${status ?? error.code ?? 'unknown'}): ${
        providerMessage || error.message
      }`,
    );

    const chapaError = new Error(message);
    chapaError.code = 'CHAPA_API_ERROR';
    chapaError.statusCode = 502;
    chapaError.exposeMessage = true;
    chapaError.details = error.response?.data || null;

    throw chapaError;
  }
};

const initializeTransaction = async ({
  amount,
  currency,
  email,
  firstName,
  lastName,
  txRef,
  callbackUrl,
  returnUrl,
  plan,
}) => {
  const planName =
    plan === 'enterprise'
      ? 'Enterprise'
      : 'ReviewX Pro';

  const planDescription =
    plan === 'enterprise'
      ? 'Upgrade to the ReviewX Enterprise plan.'
      : 'Upgrade to the ReviewX Pro plan.';

  return chapaRequest({
    method: 'POST',
    url: `${CHAPA_BASE_URL}/transaction/initialize`,
    data: {
      amount: String(amount),
      currency,
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef,
      callback_url: callbackUrl,
      return_url: returnUrl,
      customization: {
        title: planName,
        description: planDescription,
      },
      meta: {
        plan,
        payment_reason: `${planName} - Code Review Platform`,
      },
    },
  });
};

const verifyTransaction = async ({ txRef }) => {
  return chapaRequest({
    method: 'GET',
    url: `${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`,
  });
};

export {
  initializeTransaction,
  verifyTransaction,
};