import test from "node:test";
import assert from "node:assert/strict";

// Re-test the exact role mapping logic and visibility matrix from CompanyDashboardSidebar.md
function resolveCompanyRole(user) {
  if (!user) return "member";
  const r = (user.role || "").toLowerCase();
  if (r === "platform_admin" || r === "platform") return "platform_admin";
  if (r === "company_owner" || r === "owner") return "owner";
  if (r === "company_admin" || r === "admin" || r === "company") return "admin";
  if (r === "viewer") return "viewer";
  return "member";
}

const SIDEBAR_SECTIONS = [
  {
    id: "work",
    title: "Work",
    items: [
      { id: "dashboard", label: "Dashboard", allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"] },
      { id: "new", label: "New Review", allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"] },
      { id: "history", label: "Reviews", allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"] },
      { id: "findings", label: "Findings", allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"] },
      { id: "reports", label: "Reports", allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"] },
    ],
  },
  {
    id: "company",
    title: "Company",
    items: [
      { id: "rules", label: "Company Rules", allowedRoles: ["owner", "admin", "member", "platform_admin"] },
      { id: "members", label: "Members", allowedRoles: ["owner", "admin", "member", "platform_admin"] },
      { id: "billing", label: "Subscription & Billing", allowedRoles: ["owner", "admin", "platform_admin"] },
      { id: "settings", label: "Company Settings", allowedRoles: ["owner", "admin", "platform_admin"] },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      { id: "profile", label: "Profile", allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"] },
      { id: "voice", label: "Voice assistant", allowedRoles: ["owner", "admin", "member", "platform_admin"] },
      { id: "docs", label: "Help / Docs", allowedRoles: ["owner", "member", "platform_admin"] },
    ],
  },
];

function getVisibleSections(role) {
  return SIDEBAR_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.allowedRoles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

test("Company Dashboard Sidebar Role Visibility Matrix", async (t) => {
  await t.test("maps user roles accurately", () => {
    assert.equal(resolveCompanyRole({ role: "company_owner" }), "owner");
    assert.equal(resolveCompanyRole({ role: "owner" }), "owner");
    assert.equal(resolveCompanyRole({ role: "company_admin" }), "admin");
    assert.equal(resolveCompanyRole({ role: "company" }), "admin");
    assert.equal(resolveCompanyRole({ role: "member" }), "member");
    assert.equal(resolveCompanyRole({ role: "viewer" }), "viewer");
    assert.equal(resolveCompanyRole({ role: "platform_admin" }), "platform_admin");
    assert.equal(resolveCompanyRole(null), "member");
    assert.equal(resolveCompanyRole(undefined), "member");
  });

  await t.test("Owner: Full access to Work, Company, and Account sections", () => {
    const sections = getVisibleSections("owner");
    const sectionIds = sections.map((s) => s.id);
    assert.deepEqual(sectionIds, ["work", "company", "account"]);

    const workItems = sections.find((s) => s.id === "work")?.items.map((i) => i.id);
    assert.deepEqual(workItems, ["dashboard", "new", "history", "findings", "reports"]);

    const companyItems = sections.find((s) => s.id === "company")?.items.map((i) => i.id);
    assert.deepEqual(companyItems, ["rules", "members", "billing", "settings"]);

    const accountItems = sections.find((s) => s.id === "account")?.items.map((i) => i.id);
    assert.deepEqual(accountItems, ["profile", "voice", "docs"]);
  });

  await t.test("Admin: Full Work & Company, Limited Account (Profile, Voice)", () => {
    const sections = getVisibleSections("admin");
    const sectionIds = sections.map((s) => s.id);
    assert.deepEqual(sectionIds, ["work", "company", "account"]);

    const companyItems = sections.find((s) => s.id === "company")?.items.map((i) => i.id);
    assert.deepEqual(companyItems, ["rules", "members", "billing", "settings"]);

    const accountItems = sections.find((s) => s.id === "account")?.items.map((i) => i.id);
    assert.deepEqual(accountItems, ["profile", "voice"]);
    assert.ok(!accountItems.includes("docs"), "Docs must be hidden for admin per plan");
  });

  await t.test("Member: Full Work, Partial Company (Rules, Members), Full Account", () => {
    const sections = getVisibleSections("member");
    const sectionIds = sections.map((s) => s.id);
    assert.deepEqual(sectionIds, ["work", "company", "account"]);

    const companyItems = sections.find((s) => s.id === "company")?.items.map((i) => i.id);
    assert.deepEqual(companyItems, ["rules", "members"]);
    assert.ok(!companyItems.includes("billing"), "Billing must be hidden for member");
    assert.ok(!companyItems.includes("settings"), "Settings must be hidden for member");

    const accountItems = sections.find((s) => s.id === "account")?.items.map((i) => i.id);
    assert.deepEqual(accountItems, ["profile", "voice", "docs"]);
  });

  await t.test("Viewer: Work section only, No Company section, Profile only in Account", () => {
    const sections = getVisibleSections("viewer");
    const sectionIds = sections.map((s) => s.id);
    assert.deepEqual(sectionIds, ["work", "account"]);

    const companySection = sections.find((s) => s.id === "company");
    assert.equal(companySection, undefined, "Company section must be completely hidden for viewer");

    const workItems = sections.find((s) => s.id === "work")?.items.map((i) => i.id);
    assert.deepEqual(workItems, ["dashboard", "new", "history", "findings", "reports"]);

    const accountItems = sections.find((s) => s.id === "account")?.items.map((i) => i.id);
    assert.deepEqual(accountItems, ["profile"]);
  });
});
