
export const exceptionPatterns = Object.freeze({
  emptyCatch:
    /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/,

  catchWithoutAction:
    /\bcatch\s*\([^)]*\)\s*\{/,

  swallowedError:
    /\bcatch\s*\([^)]*\)\s*\{[^}]*\}/s,

  consoleOnly:
    /\bconsole\.(?:log|error|warn)\s*\(/,

  throwError:
    /\bthrow\s+(?:new\s+)?Error\b/,

  expressRoute:
    /\b(?:app|router)\.(?:get|post|put|patch|delete|use)\s*\(/,

  asyncHandler:
    /\basync\b/
});