
import {
  createFinding
} from "../../analysis/findingFactory.js";

const SENSITIVE_OPERATION =
  /\b(?:delete|remove|update|edit|modify|create|admin|approve|reject|transfer|changePassword|resetPassword)\b/i;

const REQUEST_IDENTIFIER =
  /\b(?:req|request)\.(?:params|body|query)\.[A-Za-z_$][\w$]*/;

const RESOURCE_LOOKUP =
  /\b(?:findById|findOne|findUnique|findFirst|findByPk|getById|deleteById|updateById)\s*\(/i;

const AUTHORIZATION_TERMS =
  /\b(?:authorize|authorization|isAuthorized|isAdmin|hasRole|hasPermission|permission|permissions|role|roles|ownerId|ownsResource|canAccess|accessControl|requireRole|requirePermission|requireAuth)\b/i;

export function analyzeAccessControl(
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
    const line =
      lines[index];

    const finding =
      analyzeLine({
        line,
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

  const hasRequestIdentifier =
    REQUEST_IDENTIFIER.test(line);

  const hasResourceLookup =
    RESOURCE_LOOKUP.test(line);

  const hasSensitiveOperation =
    SENSITIVE_OPERATION.test(line);

  if (
    !hasRequestIdentifier ||
    (!hasResourceLookup &&
      !hasSensitiveOperation)
  ) {
    return null;
  }

  if (
    AUTHORIZATION_TERMS.test(line)
  ) {
    return null;
  }

  if (
    !looksLikeAuthorizationSensitiveAccess(
      line
    )
  ) {
    return null;
  }

  return createFinding({
    category: "security",
    type: "broken-access-control",
    ruleId: "SEC-AC-001",
    title:
      "Potential missing authorization check on resource access.",
    description:
      "The code uses a request-controlled identifier for a sensitive resource operation without visible authorization or ownership validation in the analyzed statement.",
    severity: "high",
    confidence: "medium",
    status: "detected",
    file: fileName,
    line: lineNumber,
    column:
      findRequestColumn(line),
    code: line,
    evidence: [
      {
        type: "source",
        file: fileName,
        line: lineNumber,
        column:
          findRequestColumn(line),
        code: line,
        description:
          "A request-controlled value is used in a resource operation while no authorization or ownership check is visible in this statement."
      }
    ],
    recommendation:
      "Enforce authorization on the server before accessing or modifying the resource. Verify the authenticated user's permissions and, where applicable, ownership of the requested resource.",
    analyzer: "access-control"
  });
}

function looksLikeAuthorizationSensitiveAccess(
  line
) {
  if (
    RESOURCE_LOOKUP.test(line)
  ) {
    return true;
  }

  return (
    SENSITIVE_OPERATION.test(line) &&
    REQUEST_IDENTIFIER.test(line)
  );
}

function findRequestColumn(line) {
  const match =
    line.match(REQUEST_IDENTIFIER);

  return match
    ? match.index + 1
    : 1;
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