const reviewConfig = Object.freeze({
  maxFilesPerReview: 1000,

  maxSourceBytesPerReview:
    10 * 1024 * 1024,

  analysis: Object.freeze({
    enableAst: true,
    enableControlFlow: true,
    enableDataFlow: true,
    enableCallGraph: true,
    enableTaintAnalysis: true,
    enableMetrics: true,
    enableSymbols: true,
  }),
});

export {
  reviewConfig,
};

export default reviewConfig;