export const nullPatterns = Object.freeze({
  nullableAssignment:
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:find|findOne|get|fetch|load|lookup|resolve|query|request|parse|decode)\s*\(/,

  pythonNullableAssignment:
    /^\s*([A-Za-z_]\w*)\s*=\s*(?:find|find_one|get|fetch|load|lookup|query|request|resolve)\s*\(/,

  explicitNull:
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:null|undefined)\s*;?\s*$/
});