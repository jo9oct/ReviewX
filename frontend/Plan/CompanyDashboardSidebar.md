# Company Dashboard Sidebar Implementation Plan

## Overview
Implement a role-based company dashboard sidebar that appears in the company workspace. Items are shown/hidden based on user role (Owner, Admin, Member, Viewer).

## Feature Requirements

### Sidebar Structure
Three main sections with role-based visibility:

#### 1. Work (Everyone in the company)
- **Dashboard** - Company overview: review count, average score, open critical findings, recent activity
- **New Review** - Paste/upload code, pick language, "Review as: Company"
- **Reviews** - All company reviews (admins) or only your own (members), with filters
- **Findings** - Cross-review findings with filters by severity, category, status
- **Reports** - JSON and PDF reports

#### 2. Company (Management)
- **Company Rules** - Create, edit and enable/disable rules (name, category, description, rule text, severity)
- **Members** - Member list, roles and status, plus invitations (invite, resend, revoke)
- **Subscription & Billing** - Current plan, usage against limits, Chapa payment, payment history
- **Company Settings** - Company name, logo, details, delete or transfer ownership

#### 3. Account (Bottom of sidebar)
- **Profile** - Name, password, sessions, MFA
- **Voice assistant** - Voxide entry point for review questions
- **Help / Docs** - Optional help documentation

### Role-Based Visibility

| Role | Work Section | Company Section | Account Section |
|------|--------------|-----------------|-----------------|
| **Owner** | All | All | All |
| **Admin** | All | All | Limited (Profile, Voice) |
| **Member** | All | Partial (Rules, Members, Invitations) | Full |
| **Viewer** | Dashboard, New Review, Reviews, Findings, Reports | None | Profile only |

### Implementation Approach

1. **Create Sidebar Component** (`src/components/sidebar.tsx`)
   - Props: `currentUser` (auth user object)
   - Conditional rendering based on `currentUser.role`
   - Each section contains items with role checks

2. **Integrate with Auth System**
   - Use existing `getCurrentUser()` from `api.ts`
   - Map roles: `member` → Member role, `company_owner` → Owner role

3. **Placement**
   - Insert between main nav and main content area
   - Follow existing layout patterns (icons + labels)

4. **Backend Integration**
   - Ensure API endpoints support role-based access control
   - Verify permission checks on company rules, members, etc.

### Technical Details

- **State Management**: Use existing `useQuery` hooks or context for user role
- **Styling**: Leverage existing Tailwind CSS classes; keep consistent with design system
- **Responsive**: Collapse to icons on small screens, drawer on mobile
- **Badges**: Show badge counts (e.g., open critical findings, pending invitations)

### Dependencies
- `frontend/.env.development` - Already configured with `VITE_API_BASE_URL=http://localhost:5000/api/v1`
- `frontend/src/lib/api.ts` - Contains `getCurrentUser()` and auth utilities
- Existing company management APIs (rules, members, etc.)

### Next Steps After Approval
1. Implement `src/components/sidebar.tsx`
2. Test role-based rendering with different user types
3. Verify integration with existing company dashboard (`_authenticated/dashboard.tsx`)
4. Add unit tests for sidebar component
