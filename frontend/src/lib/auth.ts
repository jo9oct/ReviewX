import { STORAGE_KEYS } from "./constants";

export type MockUser = {
  id: string;
  email?: string | undefined;
  user_metadata?: {
    full_name?: string | undefined;
  };
};

export async function ensureProfile(user: MockUser, preferredName?: string) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
  const emailName = user.email?.split("@")[0]?.replace(/[._-]+/g, " ");
  const fullName =
    preferredName?.trim() || metadataName?.trim() || emailName?.trim() || "ReviewX member";
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEYS.PROFILE_NAME, fullName);
  }
  return fullName;
}

export function safeNext(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
