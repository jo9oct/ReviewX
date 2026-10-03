import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getActiveDemoAccount } from "@/lib/demo-accounts";
import { STORAGE_KEYS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: ({ location }) => {
    // Guard: if no active account is stored in the session the user has not
    // logged in yet. Redirect to /auth with the intended destination as `next`.
    if (
      typeof window !== "undefined" &&
      !window.sessionStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT)
    ) {
      throw redirect({
        to: "/auth",
        search: { next: location.href },
      });
    }

    const account = getActiveDemoAccount();
    return {
      user: {
        id: account.id,
        email: account.email,
        user_metadata: {
          full_name: account.name,
        },
      },
      role: account.role,
    };
  },
  component: () => <Outlet />,
});
