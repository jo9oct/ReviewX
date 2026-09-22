
export const resourcePatterns = Object.freeze({
  fileOpen:
    /\b(?:fs|fs\.promises)\.(?:open|createReadStream|createWriteStream)\s*\(/,

  databaseConnection:
    /\b(?:connect|createConnection|MongoClient|createPool|pool\.connect)\s*\(/,

  eventListener:
    /\.\s*(?:on|addListener)\s*\(/,

  timer:
    /\bset(?:Timeout|Interval)\s*\(/,

  stream:
    /\b(?:createReadStream|createWriteStream|Readable|Writable|Transform)\b/,

  close:
    /\b(?:close|destroy|end|release|disconnect)\s*\(/,

  clearTimer:
    /\bclear(?:Timeout|Interval)\s*\(/
});