import aiConfig from '../config/ai.config.js';

import {
  createAiContext,
} from './aiContext.js';

import {
  sanitizeAiContext,
  sanitizeSourceForAi,
  validateAiResponse,
  validateImprovementResponse,
  validateSummaryResponse,
  validateFindingAnalysisResponse,
} from './aiGuard.js';

import {
  createProvider,
} from './providers/providerFactory.js';

import findingAnalysisPrompt from './prompts/findingAnalysis.prompt.js';
import securityReviewPrompt from './prompts/securityReview.prompt.js';
import codeImprovementPrompt from './prompts/codeImprovement.prompt.js';
import summaryPrompt from './prompts/summary.prompt.js';

const SYSTEM_PROMPT = `
You are a code-review assistant.

You analyze supplied deterministic static-analysis
results and source excerpts.

Your output is advisory only.

Never invent evidence.
Never invent source locations.
Never claim code was executed.
Never claim a vulnerability was exploited.
Never invent CVEs, package versions, dependencies,
test results, or remediation verification.

When information is insufficient, say so.
Return valid JSON only.
`.trim();

const DEFAULT_OPTIONS =
  Object.freeze({
    aiAnalysis: false,
    aiRemediation: false,
    advancedAnalysis: false,
  });

const normalizeOptions = (
  options = {},
) => ({
  ...DEFAULT_OPTIONS,

  ...(options &&
  typeof options === 'object' &&
  !Array.isArray(options)
    ? options
    : {}),
});

const createSkippedResult = ({
  reason,
  provider,
  enabled,
}) => ({
  enabled,
  available: false,
  provider,
  status: 'skipped',
  reason,
  summary: null,
  findings: [],
  improvements: [],
  riskAreas: [],
  priorities: [],
  errors: [],
});

const parseJsonResponse =
  (response) => {
    if (
      typeof response !==
      'string'
    ) {
      throw new TypeError(
        'AI provider response must be a string.',
      );
    }

    try {
      return JSON.parse(
        response,
      );
    } catch {
      const start =
        response.indexOf(
          '{',
        );

      const end =
        response.lastIndexOf(
          '}',
        );

      if (
        start < 0 ||
        end <= start
      ) {
        throw new Error(
          'AI response was not valid JSON.',
        );
      }

      return JSON.parse(
        response.slice(
          start,
          end + 1,
        ),
      );
    }
  };

const safeComplete = async ({
  provider,
  prompt,
}) => {
  try {
    const response =
      await provider.complete({
        system:
          SYSTEM_PROMPT,

        user:
          prompt,
      });

    return {
      success: true,

      value:
        parseJsonResponse(
          response,
        ),
    };
  } catch (error) {
    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : 'AI provider request failed.',
    };
  }
};

const cloneFinding = (
  finding,
) => {
  try {
    return JSON.parse(
      JSON.stringify(
        finding,
      ),
    );
  } catch {
    return {};
  }
};

class AiAnalyzer {
  constructor({
    provider = null,
  } = {}) {
    this.provider =
      provider ||
      createProvider();
  }

  isAvailable() {
    return (
      aiConfig.enabled &&
      this.provider.isConfigured()
    );
  }

  buildContext({
    findings,
    files,
  }) {
    const context =
      createAiContext({
        findings,
        files,

        maxFindings:
          aiConfig.maxFindings,

        maxSourceBytes:
          aiConfig.maxSourceBytes,

        maxContextBytes:
          aiConfig.maxContextBytes,
      });

    return sanitizeAiContext(
      context,
    );
  }

  async analyze({
    findings,
    files,
    score,
    options = {},
  }) {
    const reviewOptions =
      normalizeOptions(
        options,
      );

    if (
      !reviewOptions.aiAnalysis
    ) {
      return {
        ...createSkippedResult({
          reason:
            'AI analysis was not requested for this review.',

          provider:
            this.provider.name,

          enabled:
            aiConfig.enabled,
        }),

        available:
          this.isAvailable(),
      };
    }

    if (
      !this.isAvailable()
    ) {
      return createSkippedResult({
        enabled:
          aiConfig.enabled,

        provider:
          this.provider.name,

        reason:
          aiConfig.enabled
            ? 'AI provider is not configured.'
            : 'AI analysis is disabled.',
      });
    }

    const context =
      this.buildContext({
        findings,
        files,
      });

    if (!context) {
      return {
        enabled: true,

        available: true,

        provider:
          this.provider.name,

        status:
          'failed',

        summary: null,

        findings: [],

        improvements: [],

        riskAreas: [],

        priorities: [],

        errors: [
          'Unable to create a safe AI context.',
        ],
      };
    }

    const security =
      await safeComplete({
        provider:
          this.provider,

        prompt:
          securityReviewPrompt({
            findings:
              context.findings,

            files:
              context.files,
          }),
      });

    let improvementResult = {
      valid: true,
      value: {
        improvements: [],
      },
    };

    if (
      reviewOptions.aiRemediation
    ) {
      const improvements =
        await safeComplete({
          provider:
            this.provider,

          prompt:
            codeImprovementPrompt({
              findings:
                context.findings,

              files:
                context.files,
            }),
        });

      improvementResult =
        improvements.success
          ? validateImprovementResponse(
              improvements.value,
            )
          : {
              valid: false,

              reason:
                improvements.error,
            };
    }

    const summary =
      await safeComplete({
        provider:
          this.provider,

        prompt:
          summaryPrompt({
            findings:
              context.findings,

            score,
          }),
      });

    const securityResult =
      security.success
        ? validateAiResponse(
            security.value,
          )
        : {
            valid: false,

            reason:
              security.error,
          };

    const summaryResult =
      summary.success
        ? validateSummaryResponse(
            summary.value,
          )
        : {
            valid: false,

            reason:
              summary.error,
          };

    const errors = [];

    if (
      !securityResult.valid
    ) {
      errors.push(
        securityResult.reason ||
          'AI security response validation failed.',
      );
    }

    if (
      reviewOptions.aiRemediation &&
      !improvementResult.valid
    ) {
      errors.push(
        improvementResult.reason ||
          'AI improvement response validation failed.',
      );
    }

    if (
      !summaryResult.valid
    ) {
      errors.push(
        summaryResult.reason ||
          'AI summary response validation failed.',
      );
    }

    const hasValidResult =
      securityResult.valid ||
      summaryResult.valid ||
      (
        reviewOptions.aiRemediation &&
        improvementResult.valid
      );

    return {
      enabled: true,

      available: true,

      provider:
        this.provider.name,

      status:
        hasValidResult
          ? 'completed'
          : 'failed',

      summary:
        summaryResult.valid
          ? summaryResult.value
          : null,

      findings:
        securityResult.valid
          ? securityResult.value
              .findings
          : [],

      improvements:
        reviewOptions.aiRemediation &&
        improvementResult.valid
          ? improvementResult.value
              .improvements
          : [],

      riskAreas:
        summaryResult.valid
          ? summaryResult.value
              .riskAreas
          : [],

      priorities:
        summaryResult.valid
          ? summaryResult.value
              .priorities
          : [],

      errors,
    };
  }

  async analyzeFinding({
    finding,
    source,
    options = {},
  }) {
    const reviewOptions =
      normalizeOptions(
        options,
      );

    if (
      !reviewOptions.aiAnalysis
    ) {
      return {
        status:
          'skipped',

        result:
          null,
      };
    }

    if (
      !this.isAvailable()
    ) {
      return {
        status:
          'skipped',

        result:
          null,
      };
    }

    const safeFinding =
      cloneFinding(
        finding,
      );

    const sanitizedSource =
      sanitizeSourceForAi(
        typeof source ===
        'string'
          ? source.slice(
              0,
              aiConfig.maxSourceBytes,
            )
          : '',
      );

    const result =
      await safeComplete({
        provider:
          this.provider,

        prompt:
          findingAnalysisPrompt({
            finding:
              safeFinding,

            source:
              sanitizedSource,
          }),
      });

    if (
      !result.success
    ) {
      return {
        status:
          'failed',

        result:
          null,

        error:
          result.error,
      };
    }

    const validation =
      validateFindingAnalysisResponse(
        result.value,
      );

    if (
      !validation.valid
    ) {
      return {
        status:
          'failed',

        result:
          null,

        error:
          validation.reason ||
          'AI finding-analysis response validation failed.',
      };
    }

    return {
      status:
        'completed',

      result:
        validation.value,
    };
  }
}

export {
  AiAnalyzer,
  SYSTEM_PROMPT,
};