import { reviewConfig } from '../config/review.config.js';
import { createReviewContext } from './reviewContext.js';
import { detectLanguage } from './languageDetector.js';
import { parseFiles } from '../parsing/parserManager.js';
import { createAnalysisContext } from '../analysis/analysisContext.js';

import {
  buildAnalysisArtifacts,
  runStaticAnalyzers,
} from './analyzerManager.js';

import {
  buildReviewResult,
} from './resultBuilder.js';

import {
  validateNormalizedSource,
} from '../input/sourceValidator.js';

import {
  createFindingsFromStaticAnalysis,
} from '../findings/findingFactory.js';

import {
  scoreEngine,
} from '../scoring/scoreEngine.js';

import {
  aiManager,
} from '../ai/aiManager.js';

import {
  CompanyRuleEngine,
} from '../companyRules/companyRuleEngine.js';

import {
  CompanyRuleRegistry,
  companyRuleRegistry,
} from '../companyRules/companyRuleRegistry.js';

import {
  PLAN_CONFIGS,
} from '../services/subscription.service.js';

import {
  AppError,
} from '../utils/errors.js';

const DEFAULT_OPTIONS = Object.freeze({
  aiAnalysis: false,
  aiRemediation: false,
  advancedAnalysis: false,
});

/**
 * Helper to get remaining AI quota for a subscription or plan.
 * Reads from the subscription's plan configuration (aiAssistedReviews).
 *
 * @param {object|string} subscription
 * @returns {number}
 */
export const getRemainingAiQuota = (subscription) => {
  if (!subscription) return 0;
  const plan = typeof subscription === 'string' ? subscription : subscription.plan;
  const planConfig = PLAN_CONFIGS[plan];
  if (!planConfig) return 0;

  if (typeof subscription.aiAssistedReviews === 'number') {
    return subscription.aiAssistedReviews;
  }

  return planConfig.aiAssistedReviews ?? 0;
};

const MOCK_COMPANY_RULE = Object.freeze({
  id: 'no-console-log',

  name: 'No console.log',

  description:
    'Console logging is not allowed in application source code.',

  category: 'quality',

  severity: 'medium',

  confidence: 'high',

  languages: [
    'javascript',
    'typescript',
  ],

  enabled: true,

  matcher: {
    type: 'text',

    pattern: 'console.log',

    flags: 'gu',
  },

  remediation:
    'Use the application logging mechanism instead of console.log.',
});

const ensureMockCompanyRule = () => {
  if (companyRuleRegistry.get(MOCK_COMPANY_RULE.id)) {
    return;
  }

  companyRuleRegistry.register(MOCK_COMPANY_RULE);
};

const adaptDbRuleToEngineRule = (rule) => {
  if (!rule || typeof rule !== 'object') return null;

  if (rule.matcher && typeof rule.matcher === 'object' && rule.id) {
    return rule;
  }

  const rawId = rule.id || (rule._id ? `rule-${rule._id.toString()}` : `rule-${Date.now()}`);
  const id = String(rawId).toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  const validCategories = ['architecture', 'security', 'bug', 'quality', 'performance', 'style'];
  const category = validCategories.includes(rule.category) ? rule.category : 'quality';
  const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
  const severity = validSeverities.includes(rule.severity) ? rule.severity : 'medium';
  const pattern = rule.ruleText || rule.matcher?.pattern || rule.name || '';

  if (!pattern) return null;

  return {
    id,
    name: rule.name || 'Company Rule',
    description: rule.description || `Violates company rule: ${rule.name || pattern}`,
    category,
    severity,
    confidence: rule.confidence || 'high',
    languages: Array.isArray(rule.languages) && rule.languages.length > 0 ? rule.languages : ['*'],
    enabled: rule.enabled !== false,
    matcher: {
      type: 'text',
      pattern,
      flags: 'gu',
    },
    remediation: rule.remediation || `Refactor code to remove or replace "${pattern}".`,
  };
};

const evaluateCompanyRules = ({
  files,
  analysisByFile,
  access,
  companyRules = [],
}) => {
  const companyRulesEnabled =
    access?.policy?.companyRules === true ||
    (Array.isArray(companyRules) && companyRules.length > 0);

  if (!companyRulesEnabled) {
    return [];
  }

  const localRegistry = new CompanyRuleRegistry();

  try {
    localRegistry.register(MOCK_COMPANY_RULE);
  } catch {
    // Already registered or duplicate
  }

  if (Array.isArray(companyRules)) {
    for (const rule of companyRules) {
      const adapted = adaptDbRuleToEngineRule(rule);
      if (adapted && adapted.matcher?.pattern && !localRegistry.get(adapted.id)) {
        try {
          localRegistry.register(adapted);
        } catch (err) {
          console.warn(`[reviewEngine] Skipping company rule "${adapted.id}":`, err.message);
        }
      }
    }
  }

  const companyRuleEngine = new CompanyRuleEngine(localRegistry);

  return companyRuleEngine.evaluate({
    files,
    analysisByFile,
  });
};

const normalizeOptions = (options) => ({
  ...DEFAULT_OPTIONS,
  ...(options && typeof options === 'object' ? options : {}),
});

const validateEngineInput = (source) => {
  if (!source || typeof source !== 'object') {
    throw new AppError({
      code: 'REVIEW_SOURCE_INVALID',
      message: 'Normalized review source is invalid.',
      statusCode: 400,
    });
  }

  if (!Array.isArray(source.files)) {
    throw new AppError({
      code: 'REVIEW_FILES_INVALID',
      message: 'Normalized review files are invalid.',
      statusCode: 400,
    });
  }

  if (source.files.length > reviewConfig.maxFilesPerReview) {
    throw new AppError({
      code: 'REVIEW_FILE_LIMIT_EXCEEDED',
      message: 'The review exceeds the configured file limit.',
      statusCode: 413,
    });
  }
};

const reviewEngine = {
  async run({
    source,
    reviewId = null,
    projectId = null,
    companyRules = [],
    options = DEFAULT_OPTIONS,
    access = null,
    subscription = null,
  }) {
    validateEngineInput(source);
    validateNormalizedSource(source);

    const reviewOptions = normalizeOptions(options);

    const context = createReviewContext({
      reviewId,
      projectId,
      source,
    });

    const files = source.files.map((file) => ({
      ...file,
      language: detectLanguage(file.path),
    }));

    context.addFiles(files);

    const parsedFiles = parseFiles(files);

    const analysisArtifacts = buildAnalysisArtifacts(
      files,
      parsedFiles,
      {
        advancedAnalysis: reviewOptions.advancedAnalysis,
      },
    );

    const analysisContext = createAnalysisContext({
      files,
      parsedFiles,
      ...analysisArtifacts,
    });

    const analysisByFile = analysisContext.byFile();

    const evaluatedCompanyRules = evaluateCompanyRules({
      files,
      analysisByFile,
      access,
      companyRules,
    });

    const alreadyEvaluatedViolations = Array.isArray(companyRules)
      ? companyRules.filter((r) => r && r.ruleId && r.location)
      : [];

    const combinedCompanyViolations = [
      ...evaluatedCompanyRules,
      ...alreadyEvaluatedViolations,
    ];

    const staticAnalysis = runStaticAnalyzers({
      files,
      analysisByFile,
      companyRules: combinedCompanyViolations,
      options: reviewOptions,
    });

    const findings = createFindingsFromStaticAnalysis(staticAnalysis);
    const score = scoreEngine.calculate(findings);

    let aiAnalysis;

    if (!reviewOptions.aiAnalysis) {
      aiAnalysis = {
        enabled: false,
        available: false,
        status: 'skipped',
        reason: 'AI analysis is not enabled for this review.',
        summary: null,
        findings: [],
        improvements: [],
        riskAreas: [],
        priorities: [],
      };
    } else {
      const activeSub =
        subscription ||
        access?.subscription ||
        (access?.tier ? { plan: access.tier } : null);

      const hasConfig = activeSub && Boolean(PLAN_CONFIGS[activeSub.plan]);
      const remainingQuota = activeSub ? getRemainingAiQuota(activeSub) : Infinity;

      if (activeSub && !hasConfig) {
        aiAnalysis = {
          enabled: false,
          available: false,
          status: 'skipped',
          reason: 'No AI quota configured for this plan',
          summary: null,
          findings: [],
          improvements: [],
          riskAreas: [],
          priorities: [],
        };
      } else if (activeSub && remainingQuota <= 0) {
        aiAnalysis = {
          enabled: false,
          available: false,
          status: 'skipped',
          reason: 'AI quota exhausted',
          summary: null,
          findings: [],
          improvements: [],
          riskAreas: [],
          priorities: [],
        };
      } else {
        try {
          aiAnalysis = await aiManager.analyzeReview({
            findings,
            files,
            score,
            options: reviewOptions,
          });
        } catch (error) {
          aiAnalysis = {
            enabled: reviewOptions.aiAnalysis,
            available: false,
            status: 'failed',
            provider: null,
            reason:
              error instanceof Error
                ? error.message
                : 'AI analysis failed.',
            summary: null,
            findings: [],
            improvements: [],
            riskAreas: [],
            priorities: [],
          };
        }
      }
    }

    context.setParsers(parsedFiles);

    context.setAsts(
      new Map(
        Array.from(parsedFiles.entries()).map(([filePath, parsed]) => [
          filePath,
          parsed?.ast || null,
        ]),
      ),
    );

    context.setSymbolsMap(analysisArtifacts.symbols);
    context.setControlFlowMap(analysisArtifacts.controlFlow);
    context.setDataFlowMap(analysisArtifacts.dataFlow);
    context.setCallGraph(analysisArtifacts.callGraph);
    context.setTaint(analysisArtifacts.taint);
    context.setMetricsMap(analysisArtifacts.metrics);

    context.setMetadata({
      parsedFiles: parsedFiles.size,
      supportedFiles: Array.from(parsedFiles.values()).filter(
        (item) => item?.supported,
      ).length,
      unsupportedFiles: Array.from(parsedFiles.values()).filter(
        (item) => !item?.supported,
      ).length,
      staticAnalysis,
      findingCount: findings.length,
      score,
      options: reviewOptions,
      access,
      aiAnalysis,
    });

    context.complete();

    return buildReviewResult({
      context,
      parsedFiles,
      analysisContext,
      staticAnalysis,
      findings,
      score,
      aiAnalysis,
    });
  },
};

export {
  reviewEngine,
};
