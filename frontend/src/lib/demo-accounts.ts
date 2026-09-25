import { STORAGE_KEYS } from "./constants";
import type { Role } from "./review-store";

export type DemoAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  label: string;
  context: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-member",
    name: "Alex Morgan",
    email: "alex@acme.dev",
    password: "reviewx123",
    role: "member",
    label: "Member",
    context: "Personal reviews and assigned findings",
  },
  {
    id: "demo-company",
    name: "Dana Kim",
    email: "dana@acme.dev",
    password: "reviewx123",
    role: "company",
    label: "Company admin",
    context: "Team reviews, rules, members, and billing",
  },
  {
    id: "demo-platform",
    name: "Priya Shah",
    email: "priya@reviewx.dev",
    password: "reviewx123",
    role: "platform",
    label: "Platform admin",
    context: "Platform users, companies, payments, and reviews",
  },
];

/** Runtime registry for accounts created via the register form this session. */
const runtimeAccounts: DemoAccount[] = [];

export function findDemoAccount(email: string, password: string) {
  const needle = email.trim().toLowerCase();
  // Check runtime-registered accounts first, then static demo accounts.
  return (
    runtimeAccounts.find((a) => a.email === needle && a.password === password) ??
    demoAccounts.find((a) => a.email === needle && a.password === password)
  );
}

export function registerRuntimeAccount(account: DemoAccount) {
  // Overwrite any previous entry with the same email so re-registering works.
  const idx = runtimeAccounts.findIndex((a) => a.email === account.email);
  if (idx >= 0) {
    runtimeAccounts[idx] = account;
  } else {
    runtimeAccounts.push(account);
  }
  setActiveDemoAccount(account);
}

export function getActiveDemoAccount(): DemoAccount {
  if (typeof window === "undefined") return demoAccounts[0]!;
  const accountId = window.sessionStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
  return (
    runtimeAccounts.find((a) => a.id === accountId) ??
    demoAccounts.find((a) => a.id === accountId) ??
    demoAccounts[0]!
  );
}

export function setActiveDemoAccount(account: DemoAccount) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, account.id);
    window.sessionStorage.setItem(STORAGE_KEYS.PROFILE_NAME, account.name);
  }
}
