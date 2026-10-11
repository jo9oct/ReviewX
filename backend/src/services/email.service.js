/**
 * Email service — sends transactional email via the Resend HTTP API.
 *
 * Uses the global `fetch` available in Node 20+; no SDK dependency needed.
 *
 * Configuration (see config/env.js):
 *   RESEND_API_KEY  — Resend API key. When empty, messages are logged to
 *                     the console instead of sent (dev/test fallback).
 *   EMAIL_FROM      — From header, e.g. "ReviewX <onboarding@resend.dev>".
 *   FRONTEND_URL    — Public frontend base URL for links in emails.
 */

import { config } from '../config/env.js';
import { EmailLog } from '../database/models/emailLog.model.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Send an email.
 *
 * Never throws — a delivery failure is reported as { sent: false, error }
 * so callers (e.g. invitation creation) can degrade gracefully.
 *
 * @param {object} options
 * @param {string} options.to       Recipient address
 * @param {string} options.subject  Subject line
 * @param {string} options.html     HTML body
 * @param {string} [options.text]   Plain-text fallback body
 * @returns {Promise<{sent: boolean, mode: 'api'|'log', error?: string}>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const apiKey = config.email.resendApiKey;

  // Dev/test fallback: no API key → log the message instead of sending.
  if (!apiKey) {
    console.log(
      [
        '── [email:dev-fallback] ──────────────────────────────',
        `To:      ${to}`,
        `Subject: ${subject}`,
        text ? `Text:    ${text.replace(/\n/g, '\n         ')}` : null,
        'HTML message omitted from log (see invite link above if present).',
        '──────────────────────────────────────────────────────',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    // Log skipped email
    EmailLog.create({ to, subject, status: 'skipped', mode: 'log', provider: 'resend' }).catch(() => {});
    return { sent: false, mode: 'log' };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    config.email.from,
        to:      [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const errMsg = `Resend API error ${res.status}: ${body.slice(0, 300)}`;
      console.warn(`[email:resend-error] Failed to send email to ${to}: ${errMsg}`);
      EmailLog.create({ to, subject, status: 'failed', errorMessage: errMsg, mode: 'api', provider: 'resend' }).catch(() => {});
      return {
        sent:  false,
        mode:  'api',
        error: errMsg,
      };
    }

    EmailLog.create({ to, subject, status: 'sent', mode: 'api', provider: 'resend' }).catch(() => {});
    return { sent: true, mode: 'api' };
  } catch (err) {
    console.warn(`[email:resend-error] Exception sending email to ${to}: ${err.message}`);
    EmailLog.create({ to, subject, status: 'failed', errorMessage: err.message, mode: 'api', provider: 'resend' }).catch(() => {});
    return { sent: false, mode: 'api', error: err.message };
  }
}

/**
 * Build the public URL for an invitation token.
 *
 * @param {string} token  Raw invitation token (never stored server-side)
 * @returns {string}
 */
export function buildInviteUrl(token) {
  return `${config.email.frontendUrl.replace(/\/$/, '')}/invite/${token}`;
}
