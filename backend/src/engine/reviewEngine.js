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
  companyRuleRegistry,
} from '../companyRules/companyRuleRegistry.js';

import {
  AppError,
} from '../utils/errors.js';

const DEFAULT_OPTIONS = Object.freeze({
  aiAnalysis: false,
  aiRemediation: false,
  advancedAnalysis: false,
});

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

const ensureMockCompanyRule =
  () => {
    if (
      companyRuleRegistry.get(
        MOCK_COMPANY_RULE.id,
      )
    ) {
      return;
    }

    companyRuleRegistry.register(
      MOCK_COMPANY_RULE,
    );
  };

const evaluateCompanyRules =
  ({
    files,
    analysisByFile,
    access,
  }) => {
    const companyRulesEnabled =
      access?.policy?.companyRules === true;

    if (
      !companyRulesEnabled
    ) {
      return [];
    }

    ensureMockCompanyRule();

    const companyRuleEngine =
      new CompanyRuleEngine(
        companyRuleRegistry,
      );

    return companyRuleEngine.evaluate({
      files,
      analysisByFile,
    });
  };

const normalizeOptions =
  (options) => ({
    ...DEFAULT_OPTIONS,

    ...(options &&
    typeof options === 'object'
      ? options
      : {}),
  });

const validateEngineInput = (
  source,
) => {
  if (
    !source ||
    typeof source !== 'object'
  ) {
    throw new AppError({
      code:
        'REVIEW_SOURCE_INVALID',

      message:
        'Normalized review source is invalid.',

      statusCode: 400,
    });
  }

  if (
    !Array.isArray(source.files)
  ) {
    throw new AppError({
      code:
        'REVIEW_FILES_INVALID',

      message:
        'Normalized review files are invalid.',

      statusCode: 400,
    });
  }

  if (
    source.files.length >
    reviewConfig.maxFilesPerReview
  ) {
    throw new AppError({
      code:
        'REVIEW_FILE_LIMIT_EXCEEDED',

      message:
        'The review exceeds the configured file limit.',

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
  }) {
    validateEngineInput(
      source,
    );

    validateNormalizedSource(
      source,
    );

    const reviewOptions =
      normalizeOptions(
        options,
      );

    const context =
      createReviewContext({
        reviewId,
        projectId,
        source,
      });

    const files =
      source.files.map(
        (file) => ({
          ...file,

          language:
            detectLanguage(
              file.path,
            ),
        }),
      );

    context.addFiles(
      files,
    );

    const parsedFiles =
      parseFiles(
        files,
      );

    const analysisArtifacts =
      buildAnalysisArtifacts(
        files,
        parsedFiles,
        {
          advancedAnalysis:
            reviewOptions.advancedAnalysis,
        },
      );

    const analysisContext =
      createAnalysisContext({
        files,
        parsedFiles,
        ...analysisArtifacts,
      });

    const analysisByFile =
      analysisContext.byFile();

    const evaluatedCompanyRules =
      evaluateCompanyRules({
        files,
        analysisByFile,
        access,
      });

    const suppliedCompanyRules =
      Array.isArray(companyRules)
        ? companyRules
        : [];

    const combinedCompanyRules = [
      ...evaluatedCompanyRules,
      ...suppliedCompanyRules,
    ];

    const staticAnalysis =
      runStaticAnalyzers({
        files,
        analysisByFile,
        companyRules:
          combinedCompanyRules,
      });

    const findings =
      createFindingsFromStaticAnalysis(
        staticAnalysis,
      );

    const score =
      scoreEngine.calculate(
        findings,
      );

    let aiAnalysis;

    try {
      aiAnalysis =
        await aiManager.analyzeReview({
          findings,
          files,
          score,
          options:
            reviewOptions,
        });
    } catch (error) {
      aiAnalysis = {
        enabled:
          reviewOptions.aiAnalysis,

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

    context.setParsers(
      parsedFiles,
    );

    context.setAsts(
      new Map(
        Array.from(
          parsedFiles.entries(),
        ).map(
          ([
            filePath,
            parsed,
          ]) => [
            filePath,
            parsed?.ast || null,
          ],
        ),
      ),
    );

    context.setSymbolsMap(
      analysisArtifacts.symbols,
    );

    context.setControlFlowMap(
      analysisArtifacts.controlFlow,
    );

    context.setDataFlowMap(
      analysisArtifacts.dataFlow,
    );

    context.setCallGraph(
      analysisArtifacts.callGraph,
    );

    context.setTaint(
      analysisArtifacts.taint,
    );

    context.setMetricsMap(
      analysisArtifacts.metrics,
    );

    context.setMetadata({
      parsedFiles:
        parsedFiles.size,

      supportedFiles:
        Array.from(
          parsedFiles.values(),
        ).filter(
          (item) =>
            item?.supported,
        ).length,

      unsupportedFiles:
        Array.from(
          parsedFiles.values(),
        ).filter(
          (item) =>
            !item?.supported,
        ).length,

      staticAnalysis,

      findingCount:
        findings.length,

      score,

      options:
        reviewOptions,

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