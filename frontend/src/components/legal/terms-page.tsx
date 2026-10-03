import { LegalSection, LegalShell } from "./legal-shell";

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="September 2026">
      <LegalSection title="Acceptance">
        <p>
          By accessing or using ReviewX ("the Service") you agree to be bound by these Terms
          of Service. If you are using ReviewX on behalf of an organisation, you represent
          that you have authority to bind that organisation to these terms.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          ReviewX provides automated static code analysis. We analyse source code you submit
          and return findings, scores, and suggested fixes. The Service performs static
          analysis only — your code is never executed on our infrastructure.
        </p>
        <p>
          We reserve the right to modify, suspend, or discontinue any aspect of the Service
          with reasonable notice except in cases of emergency security issues.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You are responsible for maintaining the confidentiality of your credentials and for
          all activity that occurs under your account. Notify us immediately at{" "}
          <a
            href="mailto:security@reviewx.dev"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            security@reviewx.dev
          </a>{" "}
          if you suspect unauthorised access.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:text-muted-foreground">
          <li>Submit code you do not have the right to share.</li>
          <li>Attempt to reverse-engineer, probe, or disrupt the Service or its infrastructure.</li>
          <li>Use the Service to process personal data of third parties without a legal basis.</li>
          <li>Resell or sublicense access to the Service without our written consent.</li>
          <li>Use automated scripts to submit reviews at a rate that degrades the Service for others.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          You retain all rights to the source code you submit. We do not claim any ownership
          over it. By submitting code you grant us a limited, transient licence to process it
          solely for the purpose of delivering the review results to you.
        </p>
        <p>
          ReviewX, its design, trademarks, and software are owned by us and protected by
          applicable intellectual property law.
        </p>
      </LegalSection>

      <LegalSection title="Subscriptions and billing">
        <p>
          Paid plans are billed monthly or annually in advance via Chapa. Subscription fees
          are non-refundable except where required by law. You can cancel at any time; your
          access continues until the end of the billing period.
        </p>
        <p>
          We reserve the right to change pricing with at least 30 days' notice. Continued
          use after a price change constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer of warranties">
        <p>
          The Service is provided "as is" without warranties of any kind, express or implied.
          We do not warrant that the Service will be error-free, uninterrupted, or that
          analysis results will be complete or accurate. Static analysis cannot guarantee the
          absence of all security vulnerabilities.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by applicable law, ReviewX shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages arising from
          your use of the Service. Our total liability to you for any claim shall not exceed
          the amount you paid us in the 12 months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These Terms are governed by the laws of Ethiopia. Disputes shall be resolved in the
          courts of Addis Ababa, unless applicable law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these Terms. We will give at least 14 days' notice of material
          changes via email or an in-app notice. Continued use after the effective date
          constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these Terms?{" "}
          <a
            href="mailto:legal@reviewx.dev"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            legal@reviewx.dev
          </a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
