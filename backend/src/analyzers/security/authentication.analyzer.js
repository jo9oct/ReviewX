
import {
  createFinding
} from "../../analysis/findingFactory.js";

const PASSWORD_TERMS =
  /\b(?:password|passwd|pwd|passcode)\b/i;

const HASHING_TERMS =
  /\b(?:bcrypt|argon2|scrypt|pbkdf2|hashPassword|comparePassword|passwordHash|verifyPassword)\b/i;

const AUTH_TERMS =
  /\b(?:login|signin|signIn|authenticate|authentication|auth|jwt|token|session)\b/i;

export function analyzeAuthentication(
  context
) {
  if (!context?.code) {
    return [];
  }

  const lines =
    context.code.split("\n");

  const findings = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const finding =
      analyzeLine({
        line: lines[index],
        lineNumber: index + 1,
        fileName: context.fileName
      });

    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}

function analyzeLine({
  line,
  lineNumber,
  fileName
}) {
  const trimmed =
    line.trim();

  if (
    !trimmed ||
    isComment(trimmed)
  ) {
    return null;
  }

  const plaintextComparison =
    detectPlaintextPasswordComparison(
      line
    );

  if (plaintextComparison) {
    return createAuthenticationFinding({
      ruleId: "SEC-AUTH-001",
      title:
        "Password appears to be compared directly.",
      description:
        "The code compares a password value directly instead of demonstrating a password-hashing verification operation.",
      severity: "high",
      confidence: "high",
      line,
      lineNumber,
      fileName,
      column:
        plaintextComparison,
      evidenceDescription:
        "A password value participates directly in an equality comparison."
    });
  }

  const hardcodedCredential =
    detectHardcodedCredential(line);

  if (hardcodedCredential) {
    return createAuthenticationFinding({
      ruleId: "SEC-AUTH-002",
      title:
        "Potential hardcoded authentication credential.",
      description:
        "The source contains a password or credential-like value assigned directly in code.",
      severity: "high",
      confidence: "medium",
      line,
      lineNumber,
      fileName,
      column:
        hardcodedCredential,
      evidenceDescription:
        "A credential-like variable is assigned a literal value in source code."
    });
  }

  const unsafePasswordStorage =
    detectUnsafePasswordStorage(line);

  if (unsafePasswordStorage) {
    return createAuthenticationFinding({
      ruleId: "SEC-AUTH-003",
      title:
        "Potential unsafe password storage.",
      description:
        "A password value appears to be stored or assigned without an identifiable password hashing operation in the analyzed statement.",
      severity: "critical",
      confidence: "medium",
      line,
      lineNumber,
      fileName,
      column:
        unsafePasswordStorage,
      evidenceDescription:
        "A password-related value is assigned or persisted without a visible hashing function."
    });
  }

  const clientControlledAuth =
    detectClientControlledAuthentication(
      line
    );

  if (clientControlledAuth) {
    return createAuthenticationFinding({
      ruleId: "SEC-AUTH-004",
      title:
        "Authentication decision may depend on client-controlled data.",
      description:
        "The code appears to use request-controlled authentication or role information directly in an authentication decision.",
      severity: "high",
      confidence: "medium",
      line,
      lineNumber,
      fileName,
      column:
        clientControlledAuth,
      evidenceDescription:
        "Authentication-related logic uses a request-controlled value directly."
    });
  }

  return null;
}

function createAuthenticationFinding({
  ruleId,
  title,
  description,
  severity,
  confidence,
  line,
  lineNumber,
  fileName,
  column,
  evidenceDescription
}) {
  return createFinding({
    category: "security",
    type: "authentication-problem",
    ruleId,
    title,
    description,
    severity,
    confidence,
    status: "detected",
    file: fileName,
    line: lineNumber,
    column,
    code: line,
    evidence: [
      {
        type: "source",
        file: fileName,
        line: lineNumber,
        column,
        code: line,
        description:
          evidenceDescription
      }
    ],
    recommendation:
      recommendationForRule(
        ruleId
      ),
    analyzer: "authentication"
  });
}

function detectPlaintextPasswordComparison(
  line
) {
  if (
    !PASSWORD_TERMS.test(line) ||
    !/[=!]==?/.test(line)
  ) {
    return null;
  }

  if (
    HASHING_TERMS.test(line)
  ) {
    return null;
  }

  const match =
    line.match(PASSWORD_TERMS);

  return match
    ? match.index + 1
    : null;
}

function detectHardcodedCredential(
  line
) {
  const match =
    line.match(
      /\b(?:password|passwd|pwd|secret|apiKey|api_key)\b\s*[:=]\s*["'`][^"'`]{3,}["'`]/
    );

  if (!match) {
    return null;
  }

  return match.index + 1;
}

function detectUnsafePasswordStorage(
  line
) {
  if (
    !PASSWORD_TERMS.test(line)
  ) {
    return null;
  }

  if (
    HASHING_TERMS.test(line)
  ) {
    return null;
  }

  const storageOperation =
    /\b(?:save|create|insert|update|insertOne|createOne|saveUser|register)\b/i;

  if (
    !storageOperation.test(line)
  ) {
    return null;
  }

  const match =
    line.match(PASSWORD_TERMS);

  return match
    ? match.index + 1
    : null;
}

function detectClientControlledAuthentication(
  line
) {
  const requestValue =
    /\b(?:req|request)\.(?:body|query|params)\.(?:role|isAdmin|authenticated|auth|token|user)\b/i;

  if (
    !requestValue.test(line) ||
    !AUTH_TERMS.test(line)
  ) {
    return null;
  }

  const match =
    line.match(requestValue);

  return match
    ? match.index + 1
    : null;
}

function recommendationForRule(
  ruleId
) {
  const recommendations = {
    "SEC-AUTH-001":
      "Use a password-hashing verification function such as bcrypt or Argon2 instead of comparing plaintext passwords.",

    "SEC-AUTH-002":
      "Do not hardcode credentials or secrets. Load secrets from a secure secret-management mechanism or environment configuration.",

    "SEC-AUTH-003":
      "Hash passwords with a password-specific password hashing algorithm before persistence. Never store plaintext passwords.",

    "SEC-AUTH-004":
      "Derive authentication and authorization state from trusted server-side identity information rather than client-controlled request fields."
  };

  return recommendations[ruleId];
}

function isComment(line) {
  return (
    line.startsWith("//") ||
    line.startsWith("#") ||
    line.startsWith("--") ||
    line.startsWith("/*") ||
    line.startsWith("*")
  );
}