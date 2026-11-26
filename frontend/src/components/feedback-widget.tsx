import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/api";

type FeedbackCategory = "general" | "bug" | "feature";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await submitFeedback({
        category,
        email: email.trim() || undefined,
        message: message.trim(),
      });
      setSubmitted(true);
      setMessage("");
      toast.success("Thank you. Your feedback has been sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <section
          aria-labelledby="feedback-title"
          aria-modal="false"
          className="absolute bottom-14 right-0 w-[min(90vw,24rem)] rounded-lg border border-border bg-background p-5 text-foreground shadow-xl"
          role="dialog"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="feedback-title" className="text-base font-semibold">
                Share feedback
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tell us what is working or what we can improve.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close feedback form"
              className="rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          {submitted ? (
            <div className="space-y-4 text-sm">
              <p>Thanks — your feedback has been sent to the ReviewX team.</p>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setSubmitted(false);
                  setCategory("general");
                  setEmail("");
                }}
              >
                Send more feedback
              </button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block text-xs font-medium">
                Feedback type
                <select
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={category}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "general" || value === "bug" || value === "feature") {
                      setCategory(value);
                    }
                  }}
                >
                  <option value="general">General feedback</option>
                  <option value="bug">Report a bug</option>
                  <option value="feature">Suggest a feature</option>
                </select>
              </label>

              <label className="block text-xs font-medium">
                Your email (optional)
                <input
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="block text-xs font-medium">
                Message
                <textarea
                  className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={5000}
                  minLength={5}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  rows={5}
                  value={message}
                />
              </label>

              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                {busy ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}
        </section>
      )}

      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        onClick={() => setOpen((isOpen) => !isOpen)}
        type="button"
      >
        Feedback
      </button>
    </div>
  );
}
