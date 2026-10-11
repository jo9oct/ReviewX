/**
 * Invitation service — create, list, revoke, preview, and accept invitations.
 *
 * Flow:
 *   1. Company owner (company_admin) creates an invitation → a 32-byte
 *      random token is generated, only its SHA-256 hash is stored, and the
 *      raw token is emailed via the Resend HTTP API (email.service.js).
 *   2. The invitee opens `${FRONTEND_URL}/invite/<token>` →
 *      GET /invitations/:token previews it (masked email, company, whether
 *      an account already exists).
 *   3. POST /invitations/:token/accept:
 *        • No account yet      → public: { name, password } creates the user
 *          (role member, attached to the company) and logs them in.
 *        • Account exists      → must be logged in as that email; attaches
 *          the user to the company. Belongs to a different company → 409.
 *
 * Single-use: acceptance goes through an atomic pending → accepted guard,
 * so a token can never be consumed twice.
 */

import crypto from 'crypto';

import { ApiError } from '../utils/ApiError.js';
import * as invitationRepo from '../database/repositories/invitation.repository.js';
import * as companyRepo from '../database/repositories/company.repository.js';
import * as userRepo from '../database/repositories/user.repository.js';
import * as subscriptionService from './subscription.service.js';
import { buildAuthPayload } from './auth.service.js';
import { sendEmail, buildInviteUrl } from './email.service.js';
import { INVITATION_TTL_DAYS } from '../database/models/invitation.model.js';
import { notificationTriggerService } from './notificationTrigger.service.js';

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** j***@example.com — used in the public preview so link holders can
 *  recognise their own address without the endpoint becoming an
 *  enumeration oracle for arbitrary emails. */
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

// ── Guards ────────────────────────────────────────────────────────────────────

/** Resolve the acting user's company id or throw. */
function requireCompany(user) {
  const companyId = user?.company ?? null;
  if (!companyId) {
    throw ApiError.forbidden(
      'You must belong to a company to manage invitations',
    );
  }
  return companyId;
}

/** Fetch the invitation behind a raw token, or throw 404/409. */
async function resolveInvitation(token) {
  const invitation = await invitationRepo.findByTokenHash(hashToken(token));

  // Invalid token and expired/revoked look identical to the caller —
  // no oracle for guessing valid tokens.
  if (!invitation) {
    throw ApiError.notFound(
      'This invitation link is invalid or has expired',
    );
  }

  if (invitation.status !== 'pending') {
    throw ApiError.conflict(
      invitation.status === 'accepted'
        ? 'This invitation has already been accepted'
        : 'This invitation has been revoked',
    );
  }

  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw ApiError.conflict('This invitation has expired');
  }

  return invitation;
}

// ── Service methods ──────────────────────────────────────────────────────────

/**
 * Create an invitation for an email address (company_admin only, by route).
 *
 * Re-inviting an email that already has a pending invitation replaces it
 * (fresh token, fresh expiry) — the old link stops working.
 *
 * @param {object} currentUser  Authenticated user (req.user)
 * @param {{ email: string }} dto
 * @returns {Promise<object>}  Invitation (no tokenHash) + email status + inviteUrl
 */
export async function createInvitation(currentUser, { email }) {
  const companyId = requireCompany(currentUser);
  const normalizedEmail = email.toLowerCase().trim();

  const company = await companyRepo.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  // Already an active member with this email? Then nothing to invite.
  const existingUser = await userRepo.findByEmail(normalizedEmail);
  if (existingUser && existingUser.company?.toString() === companyId.toString()) {
    throw ApiError.conflict('That person is already a member of this company');
  }

  // Replace any pending invite so only the newest token stays live.
  await invitationRepo.deletePendingForEmail(companyId, normalizedEmail);

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const invitation = await invitationRepo.create({
    email:     normalizedEmail,
    company:   companyId,
    role:      'member',
    invitedBy: currentUser.id ?? currentUser._id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const inviteUrl = buildInviteUrl(token);

  // req.user carries only id/role/company — fetch the name for the email.
  const inviter = await userRepo.findById(currentUser.id ?? currentUser._id);
  const inviterName = inviter?.name || 'A ReviewX administrator';

  const result = await sendEmail({
    to:      normalizedEmail,
    subject: `${inviterName} invited you to ${company.name} on ReviewX`,
    html:    inviteHtml({ company, inviterName, inviteUrl, expiresAt }),
    text:    inviteText({ company, inviterName, inviteUrl, expiresAt }),
  });

  // Fire notification: invitation created
  try {
    const invitationData = typeof invitation.toObject === 'function'
      ? invitation.toObject()
      : invitation;

    await notificationTriggerService.onInvitationCreated(
      { ...invitationData, companyName: company.name },
      inviter,
    );
  } catch (notifErr) {
    console.warn('[invitation] Notification trigger failed:', notifErr.message);
  }

  return {
    invitation,
    emailSent: result.sent,
    emailError: result.error || null,
    // Always returned to the inviting admin: lets them copy the link
    // manually if delivery failed (or in dev, where mail is only logged).
    inviteUrl,
  };
}

/**
 * List invitations for the acting user's company.
 *
 * @param {object} currentUser
 * @param {object} [filter]  e.g. { status: 'pending' }
 * @returns {Promise<object[]>}
 */
export async function listInvitations(currentUser, filter = {}) {
  const companyId = requireCompany(currentUser);
  return invitationRepo.listByCompany(companyId, filter);
}

/**
 * Revoke a pending invitation.
 *
 * @param {object} currentUser
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function revokeInvitation(currentUser, id) {
  const companyId = requireCompany(currentUser);

  const invitation = await invitationRepo.findById(id, companyId);
  if (!invitation) {
    throw ApiError.notFound('Invitation not found');
  }
  if (invitation.status !== 'pending') {
    throw ApiError.conflict('Only pending invitations can be revoked');
  }

  const revoked = await invitationRepo.markRevoked(id, companyId);
  if (!revoked) {
    throw ApiError.conflict('Only pending invitations can be revoked');
  }
  return revoked;
}

/**
 * Public preview of an invitation by raw token.
 *
 * @param {string} token
 * @returns {Promise<object>}  { email (masked), companyName, accountExists, expiresAt }
 */
export async function getInvitationInfo(token) {
  const invitation = await resolveInvitation(token);

  const company = await companyRepo.findById(invitation.company);
  const accountExists = await userRepo.emailExists(invitation.email);

  return {
    email:         maskEmail(invitation.email),
    companyName:   company?.name ?? 'a ReviewX workspace',
    role:          invitation.role,
    accountExists,
    expiresAt:     invitation.expiresAt,
  };
}

/**
 * Accept an invitation.
 *
 * @param {string} token
 * @param {object} options
 * @param {object|null} [options.user]   Authenticated user (optionalAuthenticate)
 * @param {string} [options.name]        Required when creating a new account
 * @param {string} [options.password]    Required when creating a new account
 * @returns {Promise<{token: string, expiresIn: string, user: object, subscription?: object, requiresLogin?: false}>}
 *          For the existing-account branch without a session the service
 *          throws 401 with LOGIN_REQUIRED instead (see controller).
 */
export async function acceptInvitation(token, { user = null, name, password } = {}) {
  const invitation = await resolveInvitation(token);

  const accountExists = await userRepo.emailExists(invitation.email);

  if (!accountExists) {
    return acceptAsNewUser(invitation, { name, password });
  }

  // Existing account: the invitee must be logged in as the invited email.
  if (!user) {
    const err = ApiError.unauthorized(
      'An account with this email already exists — sign in to accept the invitation',
    );
    err.code = 'LOGIN_REQUIRED';
    throw err;
  }

  const dbUser = await userRepo.findById(user.id ?? user._id ?? user.userId);
  if (!dbUser) {
    throw ApiError.unauthorized('Sign in to accept the invitation');
  }

  if (dbUser.email.toLowerCase() !== invitation.email) {
    const err = ApiError.unauthorized(
      'This invitation was sent to a different email address — sign in with the invited account',
    );
    err.code = 'EMAIL_MISMATCH';
    throw err;
  }

  const companyId = invitation.company.toString();
  const currentCompany = dbUser.company ? dbUser.company.toString() : null;

  // Cross-company poaching guard: never silently move a user between tenants.
  if (currentCompany && currentCompany !== companyId) {
    throw ApiError.conflict(
      'Your account already belongs to a different company. Leave that company before accepting this invitation',
    );
  }

  // Claim first — atomic single-use guard.
  const claimed = await invitationRepo.markAccepted(invitation._id, dbUser._id.toString());
  if (!claimed) {
    throw ApiError.conflict('This invitation is no longer valid');
  }

  if (!currentCompany) {
    await userRepo.setCompany(dbUser._id, invitation.company);
    dbUser.company = invitation.company;
  }

  // Build workspace context for the personal subscription lookup.
  // Invited users get the member role — their subscription is personal (Free).
  const workspace = {
    type: 'personal',
    userId: dbUser._id.toString(),
    companyId: null,
  };
  const subscription = await subscriptionService.getSubscription(workspace);

  // Return enriched user (with companyRole, isOwner, workspaces, activeWorkspace)
  // so the frontend sidebar and dashboard render correctly on first sign-in.
  const { getMe } = await import('./auth.service.js');
  const activeCompanyId = invitation.company.toString();
  const enrichedUser = await getMe(dbUser._id.toString(), activeCompanyId).catch(() => null);

  // Fire notification: invitation accepted
  try {
    await notificationTriggerService.onInvitationAccepted(invitation, dbUser);
  } catch (notifErr) {
    console.warn('[invitation] Notification trigger failed:', notifErr.message);
  }

  return buildAuthPayload(enrichedUser ?? dbUser, subscription, activeCompanyId);
}

// ── Branches ─────────────────────────────────────────────────────────────────

async function acceptAsNewUser(invitation, { name, password }) {
  if (!name || !password) {
    throw ApiError.unprocessable('Name and password are required', [
      ...(!name ? [{ field: 'name', message: 'Name is required' }] : []),
      ...(!password ? [{ field: 'password', message: 'Password is required' }] : []),
    ]);
  }

  let createdUser;
  try {
    createdUser = await userRepo.createUser(
      {
        name,
        email:   invitation.email,
        role:    'member',           // invites never grant company_admin
        company: invitation.company,
      },
      password,
    );
  } catch (err) {
    // Unique index race with a concurrent registration.
    if (err?.code === 11000) {
      throw ApiError.conflict('An account with that email already exists');
    }
    throw err;
  }

  // Claim the invitation; roll back the fresh account if we lost the race.
  const claimed = await invitationRepo.markAccepted(
    invitation._id,
    createdUser._id.toString(),
  );

  if (!claimed) {
    await deleteUserById(createdUser._id);
    throw ApiError.conflict('This invitation is no longer valid');
  }

  const subscription = await subscriptionService.createFreeSubscription(createdUser._id);

  // Return enriched user so the frontend sidebar renders correctly on first sign-in.
  const { getMe } = await import('./auth.service.js');
  const activeCompanyId = invitation.company.toString();
  const enrichedUser = await getMe(createdUser._id.toString(), activeCompanyId).catch(() => null);

  return buildAuthPayload(enrichedUser ?? createdUser, subscription, activeCompanyId);
}

/** Hard-delete a user document (rollback helper for failed accepts). */
async function deleteUserById(userId) {
  try {
    const { User } = await import('../database/models/user.model.js');
    await User.deleteOne({ _id: userId });
  } catch {
    // Best-effort cleanup — a stray account is preferable to a failed request.
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

function inviteText({ company, inviterName, inviteUrl, expiresAt }) {
  return [
    `${inviterName} invited you to join ${company.name} on ReviewX.`,
    '',
    `Accept the invitation: ${inviteUrl}`,
    '',
    `This link expires on ${expiresAt.toUTCString()}.`,
    'If you did not expect this invitation, you can ignore this email.',
  ].join('\n');
}

function inviteHtml({ company, inviterName, inviteUrl, expiresAt }) {
  return `
<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #111;">
    <h2 style="margin-bottom: 8px;">Join ${escapeHtml(company.name)} on ReviewX</h2>
    <p><strong>${escapeHtml(inviterName)}</strong> invited you to join their workspace.</p>
    <p>
      <a href="${escapeHtml(inviteUrl)}"
         style="display: inline-block; background: #111; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">
        Accept invitation
      </a>
    </p>
    <p style="color: #555; font-size: 13px;">
      Or copy this link: <br/><span style="word-break: break-all;">${escapeHtml(inviteUrl)}</span>
    </p>
    <p style="color: #777; font-size: 12px;">
      This link expires on ${escapeHtml(expiresAt.toUTCString())}. If you did not expect
      this invitation, you can safely ignore this email.
    </p>
  </body>
</html>`.trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
