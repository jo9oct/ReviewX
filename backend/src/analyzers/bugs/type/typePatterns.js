export const typePatterns = Object.freeze({
  invalidTypeof:
    /\btypeof\s+[A-Za-z_$][\w$]*\s*(?:===|!==|==|!=)\s*["'](?:integer|float|double|array|list|dict|objectType)["']/
});