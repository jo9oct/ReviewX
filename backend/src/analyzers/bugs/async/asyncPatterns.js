export const asyncPatterns = Object.freeze({
  unhandledPromise:
    /^\s*(?!return\b|await\b|const\b|let\b|var\b|if\b|while\b|for\b|switch\b|throw\b)(?:(?<object>[A-Za-z_$][\w$]*)\s*\.\s*)?(?<functionName>[A-Za-z_$][\w$]*)\s*\([^;]*\)\s*;?\s*$/,

  asyncName:
    /(?:^|(?:Async|async)$|(?:Async|async)[A-Za-z0-9_$]*$)/,

  promiseApi:
    /^(?:fetch|request|axios|axiosGet|axiosPost|query|execute|exec|find|findOne|findById|save|create|update|delete|remove|get|load|send|post|put|patch)$/,

  await:
    /\bawait\b/,

  return:
    /\breturn\b/,

  then:
    /\.then\s*\(/,

  catch:
    /\.catch\s*\(/,

  assignment:
    /^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/,

  promiseAll:
    /\bPromise\.all\s*\(/
});