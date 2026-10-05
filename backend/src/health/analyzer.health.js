import {
  getSupportedLanguages,
} from "../parsing/languageRegistry.js";

export const checkAnalyzerHealth =
  () => {
    try {
      const languages =
        getSupportedLanguages();

      const healthy =
        Array.isArray(languages) &&
        languages.length > 0;

      return {
        name: "analyzer",
        status: healthy
          ? "healthy"
          : "unhealthy",
        supportedLanguages:
          languages.length,
      };
    } catch (error) {
      return {
        name: "analyzer",
        status: "unhealthy",
        supportedLanguages: 0,
        error:
          error.message ||
          "Analyzer health check failed.",
      };
    }
  };