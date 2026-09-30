import {
  SECURITY_INJECTION_RULES,
} from './security/injection/rules.js';

import {
  SECURITY_XSS_RULES,
} from './security/xss/rules.js';

import {
  SECURITY_SSRF_RULES,
} from './security/ssrf/rules.js';

import {
  SECURITY_CSRF_RULES,
} from './security/csrf/rules.js';

import {
  SECURITY_COMMAND_INJECTION_RULES,
} from './security/commandInjection/rules.js';

import {
  SECURITY_PATH_TRAVERSAL_RULES,
} from './security/pathTraversal/rules.js';

import {
  SECURITY_SECRET_RULES,
} from './security/secrets/rules.js';

import {
  SECURITY_AUTHENTICATION_RULES,
} from './security/authentication/rules.js';

import {
  SECURITY_AUTHORIZATION_RULES,
} from './security/authorization/rules.js';

import {
  SECURITY_CRYPTOGRAPHY_RULES,
} from './security/cryptography/rules.js';

import {
  SECURITY_FILE_UPLOAD_RULES,
} from './security/fileUpload/rules.js';

import {
  SECURITY_DESERIALIZATION_RULES,
} from './security/deserialization/rules.js';

import {
  SECURITY_PROTOTYPE_POLLUTION_RULES,
} from './security/prototypePollution/rules.js';

import {
  SECURITY_REGEX_DOS_RULES,
} from './security/regexDos/rules.js';

import {
  SECURITY_TRANSPORT_RULES,
} from './security/transport/rules.js';

import {
  BUG_RULES,
} from './bugs.rules.js';

import {
  QUALITY_RULES,
} from './quality.rules.js';

import {
  PERFORMANCE_RULES,
} from './performance.rules.js';

class RuleRegistry {
  constructor() {
    this.rules = new Map();

    this.registerMany(
      SECURITY_INJECTION_RULES,
    );

    this.registerMany(
      SECURITY_XSS_RULES,
    );

    this.registerMany(
      SECURITY_SSRF_RULES,
    );

    this.registerMany(
      SECURITY_CSRF_RULES,
    );

    this.registerMany(
      SECURITY_COMMAND_INJECTION_RULES,
    );

    this.registerMany(
      SECURITY_PATH_TRAVERSAL_RULES,
    );

    this.registerMany(
      SECURITY_SECRET_RULES,
    );

    this.registerMany(
      SECURITY_AUTHENTICATION_RULES,
    );

    this.registerMany(
      SECURITY_AUTHORIZATION_RULES,
    );

    this.registerMany(
      SECURITY_CRYPTOGRAPHY_RULES,
    );

    this.registerMany(
      SECURITY_FILE_UPLOAD_RULES,
    );

    this.registerMany(
      SECURITY_DESERIALIZATION_RULES,
    );

    this.registerMany(
      SECURITY_PROTOTYPE_POLLUTION_RULES,
    );

    this.registerMany(
      SECURITY_REGEX_DOS_RULES,
    );

    this.registerMany(
      SECURITY_TRANSPORT_RULES,
    );

    this.registerMany(
      BUG_RULES,
    );

    this.registerMany(
      QUALITY_RULES,
    );

    this.registerMany(
      PERFORMANCE_RULES,
    );
  }

  register(rule) {
    if (
      !rule ||
      typeof rule.id !== 'string' ||
      !rule.id.trim()
    ) {
      throw new TypeError(
        'A rule must contain a valid id.',
      );
    }

    if (this.rules.has(rule.id)) {
      throw new Error(
        `Rule already registered: ${rule.id}`,
      );
    }

    const registeredRule = Object.freeze({
      ...rule,
    });

    this.rules.set(
      rule.id,
      registeredRule,
    );

    return registeredRule;
  }

  registerMany(rules = []) {
    if (!Array.isArray(rules)) {
      throw new TypeError(
        'Rules must be provided as an array.',
      );
    }

    for (const rule of rules) {
      this.register(rule);
    }

    return this;
  }

  get(ruleId) {
    return (
      this.rules.get(ruleId) ||
      null
    );
  }

  has(ruleId) {
    return this.rules.has(ruleId);
  }

  getAll() {
    return [
      ...this.rules.values(),
    ];
  }

  getByCategory(category) {
    return this.getAll().filter(
      rule =>
        rule.category === category,
    );
  }

  getBySeverity(severity) {
    return this.getAll().filter(
      rule =>
        rule.severity === severity,
    );
  }

  getEnabled() {
    return this.getAll().filter(
      rule =>
        rule.enabled !== false,
    );
  }

  size() {
    return this.rules.size;
  }

  clear() {
    this.rules.clear();
  }
}

const ruleRegistry =
  new RuleRegistry();

export {
  RuleRegistry,
  ruleRegistry,
};

export default ruleRegistry;