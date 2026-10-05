import { validateCompanyRule } from './companyRuleSchema.js';

class CompanyRuleRegistry {
  #rules = new Map();

  register(rule) {
    const { error, value } = validateCompanyRule(rule);

    if (error) {
      throw new TypeError(
        `Invalid company rule: ${error.details
          .map((detail) => detail.message)
          .join('; ')}`
      );
    }

    if (this.#rules.has(value.id)) {
      throw new Error(`Company rule already registered: ${value.id}`);
    }

    this.#rules.set(value.id, Object.freeze(value));

    return value;
  }

  registerMany(rules) {
    if (!Array.isArray(rules)) {
      throw new TypeError('Company rules must be an array.');
    }

    return rules.map((rule) => this.register(rule));
  }

  get(ruleId) {
    return this.#rules.get(ruleId) || null;
  }

  list({
    category = null,
    language = null,
    enabledOnly = true
  } = {}) {
    return Array.from(this.#rules.values()).filter((rule) => {
      if (enabledOnly && !rule.enabled) {
        return false;
      }

      if (category && rule.category !== category) {
        return false;
      }

      if (
        language &&
        !rule.languages.includes('*') &&
        !rule.languages.includes(language)
      ) {
        return false;
      }

      return true;
    });
  }

  clear() {
    this.#rules.clear();
  }

  get size() {
    return this.#rules.size;
  }
}

const companyRuleRegistry = new CompanyRuleRegistry();

export {
  CompanyRuleRegistry,
  companyRuleRegistry
};