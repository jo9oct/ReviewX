/**
 * resolveWorkspace — derives the active workspace context from the request.
 *
 * The JWT payload carries `activeCompanyId` (set at login or via
 * POST /auth/switch-workspace).  This single function is the authoritative
 * source of workspace context for every downstream service.
 *
 * Returns one of two shapes:
 *   { type: 'company',  userId, companyId }   — company workspace
 *   { type: 'personal', userId, companyId: null } — personal workspace
 *
 * Requires that `authenticate` middleware has already run (sets req.user
 * and req.activeCompanyId).
 */
export function resolveWorkspace(req) {
  const userId = req.user?.id || req.user?.userId;
  const activeCompanyId = req.activeCompanyId ?? null;

  if (activeCompanyId) {
    return { type: 'company', userId, companyId: activeCompanyId };
  }
  return { type: 'personal', userId, companyId: null };
}

export default resolveWorkspace;
