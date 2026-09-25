import { LegalSection, LegalShell } from "./legal-shell";

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="September 2026">
      <LegalSection title="Overview">
        <p>
          ReviewX ("we", "us", "our") is an automated static code review service. This
          policy explains what data we collect, how we use it, and the choices you have.
        </p>
        <p>
          By using ReviewX you agree to the practices described here. If you do not agree,
          please do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="Source code you submit">
        <p>
          <strong className="font-medium text-foreground">
            Your source code is never executed, stored permanently, or used for model
            training.
          </strong>{" "}
          When you submit a file for review, it is held in memory for the duration of that
          analysis session only. Once the session ends, the content is discarded. We do not
          retain, index, or share your source code with third parties.
        </p>
        <p>
          Review results (findings, scores, suggested fixes) are associated with your account
          so you can access them later. You can delete any review result at any time from your
          dashboard.
        </p>
      </LegalSection>

      <LegalSection title="Account data">
        <p>
          When you create an account we collect your name, email address, and a hashed
          password (or an OAuth token if you sign in with Google). We use this to identify
          you, send transactional emails (confirmation, password reset), and manage your
          subscription.
        </p>
        <p>
          We do not sell your personal data. We do not share it with advertisers.
        </p>
      </LegalSection>

      <LegalSection title="Usage data">
        <p>
          We collect basic usage telemetry (pages visited, features used, error logs) to
          operate and improve the service. This data is aggregated and does not include your
          source code.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Payments are processed by Chapa. We do not store your card details. Chapa's own
          privacy policy governs the handling of payment information.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We use session cookies to keep you signed in and a minimal set of first-party
          analytics cookies. We do not use third-party advertising cookies.
        </p>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          Account data is retained for as long as your account is active. If you delete your
          account we delete your personal data within 30 days, except where we are required
          by law to retain it longer.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Depending on your location you may have the right to access, correct, or delete the
          personal data we hold about you, or to object to its processing. To exercise these
          rights, contact us at{" "}
          <a
            href="mailto:privacy@reviewx.dev"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            privacy@reviewx.dev
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this policy as the product evolves. When we make material changes we
          will notify you by email or via a banner in the app at least 14 days before the
          change takes effect.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy?{" "}
          <a
            href="mailto:privacy@reviewx.dev"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            privacy@reviewx.dev
          </a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
