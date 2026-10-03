# Code Insight

Design a polished, production-quality UI for a Code Review Platform — a developer

tool where users paste source code and get an automated review: security, bug,

quality, and performance findings, AI explanations, suggested fixes, a score, and

a downloadable report.

STACK: React + TypeScript, Tailwind CSS, Zustand for state, Monaco Editor for

code display/diffing.

AESTHETIC: Developer-tool grade, not generic SaaS. Think Linear, Vercel Dashboard,

GitHub, Sentry, Snyk. Dark mode as the primary theme (with a clean light mode too).

Monospace font (e.g. JetBrains Mono / Geist Mono) for code and technical data,

a clean sans (Inter / Geist) for UI text. Tight spacing, subtle borders over heavy

shadows, restrained color usage where color = meaning (see severity below), not

decoration.

SEVERITY COLOR SYSTEM (use consistently everywhere — badges, borders, score rings):

- CRITICAL: red

- HIGH: orange

- MEDIUM: yellow/amber

- LOW: blue

- INFO: gray/slate

CORE SCREENS (design in this priority order):

1. New Review — code paste (Monaco editor), language selector (JS/TS/Python/

   Java/PHP), single-file upload option, "Start Review" CTA with a clear loading/

   analyzing state (this needs to feel alive — show a step-by-step progress:

   Parsing → Analyzing → Applying Company Rules → AI Explanation → Scoring).

2. Review Result — the centerpiece screen. Overall score (large, prominent,

   ring or gauge), sub-scores for Security/Bugs/Quality/Performance, a findings

   list grouped/filterable by severity and category, each finding as a compact

   card (title, severity badge, category, file:line).

3. Finding Detail — expanded view of one finding: description, code snippet

   with the offending lines highlighted, evidence, AI explanation (clearly

   labeled as AI-generated), suggested fix shown as a before/after diff (Monaco

   diff editor), Accept/Reject controls, status (Detected/False Positive/

   Accepted/Resolved).

4. Dashboard — recent reviews, trend of scores over time, quick "New Review" CTA.

5. Review History — table/list of past reviews with score, date, language, status.

6. Company Rules — list/CRUD for custom rules (name, category, description,

   rule text, severity, enabled toggle).

7. Company Dashboard & Members — company-level view of reviews/findings,

   member management.

8. Subscription & Payment — plan comparison (Free/Paid/Company), Chapa

   checkout flow, payment status states (Pending/Success/Failed/Cancelled).

9. Login / Register / Profile — clean, minimal auth screens.

10. Admin (Platform Admin) — users, companies, plans, payments, reviews overview.

INTERACTION DETAILS THAT MATTER:

- Empty states for zero reviews / zero findings ("no issues found" should feel

  like a genuine win, not a blank screen).

- A voice-question entry point on the Review Result / Finding Detail screens

  (mic icon → "Ask a question about this finding" — powered by Voxide).

- Design for realistic mock data: findings have category, severity, confidence,

  file name, line start/end, code snippet, evidence, recommendation, status.

- Score example to design against: Overall 78, Security 70, Bugs 80, Quality 85,

  Performance 75.

- Since findings arrive as mock data before real backend, design loading and

  skeleton states for review generation, not just a spinner.

Deliver: a cohesive design system (colors, type scale, spacing, component

patterns for badges/cards/buttons/tables) applied consistently across the

screens above, starting with New Review → Review Result → Finding Detail as

the flow to nail first.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
