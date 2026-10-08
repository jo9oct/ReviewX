import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/primitives";
import { useAuthStore } from "@/lib/auth-store";
import {
  useSubscriptionQuery,
  verifySubscriptionPayment,
  type SubscriptionTier,
} from "@/lib/review-api";

export const Route = createFileRoute("/_authenticated/payment-success")({
  validateSearch: (search: Record<string, unknown>) => ({
    tx_ref: typeof search["tx_ref"] === "string" ? search["tx_ref"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirming payment — ReviewX" },
      { name: "description", content: "Confirming your Chapa payment and subscription upgrade." },
    ],
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { tx_ref: txRef } = Route.useSearch();
  const user = useAuthStore((state) => state.user);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<"checking" | "pending" | "paid" | "failed" | "error">("checking");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const planFromReference: SubscriptionTier | undefined = txRef?.toUpperCase().includes("ENTERPRISE")
    ? "enterprise"
    : txRef?.toUpperCase().includes("PRO")
      ? "pro"
      : undefined;
  const subscription = useSubscriptionQuery(
    user?.id,
    elapsedSeconds < 90 && planFromReference
      ? { untilPlan: planFromReference, pollIntervalMs: 3000 }
      : undefined,
  );
  const refetchSubscription = subscription.refetch;
  useEffect(() => {
    if (!txRef) {
      setVerificationStatus("error");
      setVerificationError("The Chapa return URL is missing its transaction reference.");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    setVerificationStatus("checking");
    setVerificationError(null);

    const verify = async () => {
      try {
        const result = await verifySubscriptionPayment(txRef);
        if (cancelled) return;
        setVerificationStatus(result.verificationStatus);
        if (result.verificationStatus === "paid") {
          await refetchSubscription();
          return;
        }
        if (result.verificationStatus === "failed") return;
        attempts += 1;
        if (attempts < 18) {
          timer = window.setTimeout(() => void verify(), 5000);
        }
      } catch (error) {
        if (cancelled) return;
        setVerificationStatus("error");
        setVerificationError(error instanceof Error ? error.message : "Unable to verify the Chapa transaction.");
      }
    };

    void verify();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [txRef, verifyAttempt, refetchSubscription]);

  const planOrder: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };
  const isConfirmed = Boolean(
    planFromReference &&
      verificationStatus === "paid" &&
      subscription.data?.status === "active" &&
      planOrder[subscription.data.plan] >= planOrder[planFromReference],
  );
  const isWaiting = Boolean(
    txRef &&
      !isConfirmed &&
      verificationStatus !== "failed" &&
      verificationStatus !== "error" &&
      elapsedSeconds < 90,
  );

  const retryVerification = () => {
    setElapsedSeconds(0);
    setVerifyAttempt((attempt) => attempt + 1);
    void subscription.refetch();
  };

  useEffect(() => {
    if (!isWaiting) return;
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isWaiting]);

  const goToWorkspace = () => {
    void navigate({ to: "/dashboard" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <section className="panel w-full max-w-lg p-6 text-center sm:p-8">
        {isConfirmed ? (
          <>
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h1 className="mt-4 text-xl font-semibold">Subscription upgraded</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your {subscription.data?.plan} plan is active. Your updated features are ready to use.
            </p>
          </>
        ) : verificationStatus === "failed" ? (
          <>
            <CircleAlert className="mx-auto size-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Payment was not completed</h1>
            <p role="alert" className="mt-2 text-sm text-muted-foreground">
              Chapa did not report a successful transaction. Your subscription has not been changed.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => void navigate({ to: "/dashboard" })}>
              Return to workspace
            </Button>
          </>
        ) : verificationStatus === "error" || subscription.isError ? (
          <>
            <CircleAlert className="mx-auto size-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Unable to confirm payment status</h1>
            <p role="alert" className="mt-2 text-sm text-muted-foreground">
              {verificationError ??
                (subscription.error instanceof Error
                  ? subscription.error.message
                  : "Could not retrieve your subscription. Your payment is not being assumed successful.")}
            </p>
            <Button variant="outline" className="mt-5" onClick={retryVerification}>Check again</Button>
          </>
        ) : isWaiting ? (
          <>
            <LoaderCircle className="mx-auto size-10 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Confirming your Chapa payment</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The backend will activate your subscription after it verifies the payment. This may take a moment.
            </p>
            {txRef && <p className="mt-4 break-all font-mono text-[10px] text-muted-foreground">Reference: {txRef}</p>}
          </>
        ) : (
          <>
            <CircleAlert className="mx-auto size-10 text-warning" />
            <h1 className="mt-4 text-xl font-semibold">Payment confirmation is still pending</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account has not shown the upgraded plan yet. No payment success is assumed; you can retry checking your subscription.
            </p>
            <Button variant="outline" className="mt-5" onClick={retryVerification}>Check again</Button>
          </>
        )}
        <Button className="mt-5 w-full" variant={isConfirmed ? "default" : "outline"} onClick={goToWorkspace}>
          Return to workspace
        </Button>
      </section>
    </main>
  );
}
