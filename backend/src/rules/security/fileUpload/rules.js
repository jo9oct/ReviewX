const findMatches = (
  source,
  pattern,
  flags = 'giu',
) => {
  const regex = new RegExp(pattern, flags);
  const matches = [];

  for (const match of source.matchAll(regex)) {
    matches.push({
      text: match[0],
      index: match.index ?? 0,
    });
  }

  return matches;
};

const hasObviousUploadValidation = source => {
  const validationPatterns = [
    /\bfileFilter\s*:/iu,
    /\bfileFilter\s*=/iu,
    /\bmimetype\s*===/iu,
    /\bmimetype\s*!==/iu,
    /\bmimeType\s*===/iu,
    /\bmimeType\s*!==/iu,
    /\breq\.file\.mimetype\b/iu,
    /\breq\.file\.mimeType\b/iu,
    /\bfile\.mimetype\b/iu,
    /\bfile\.mimeType\b/iu,
    /\bpath\.extname\s*\(/iu,
    /\bpath\.basename\s*\(/iu,
    /\bextension\s*(?:===|!==|\.includes)/iu,
    /\bextensions?\s*[:=]/iu,
    /\ballowedExtensions?\b/iu,
    /\ballowedMimeTypes?\b/iu,
    /\ballowedMimeTypes?\b/iu,
  ];

  return validationPatterns.some(pattern =>
    pattern.test(source),
  );
};

const getUploadCandidates = source => {
  const candidates = [];

  /*
   * Prefer actual upload middleware attached to a route.
   * This represents the upload handler more accurately than
   * matching every occurrence of "upload" or "multer".
   */
  candidates.push(
    ...findMatches(
      source,
      '\\b(?:upload|fileUpload)\\.(?:single|array|fields|none)\\s*\\([^\\n]*?\\)',
    ),
  );

  /*
   * Detect Python-style request.files usage.
   */
  candidates.push(
    ...findMatches(
      source,
      '\\b(?:request|req)\\.files\\b',
    ),
  );

  /*
   * Detect PHP-style upload handling.
   */
  candidates.push(
    ...findMatches(
      source,
      '\\$_FILES\\b',
    ),
  );

  /*
   * If no concrete upload handler was found, detect multer
   * initialization as the upload middleware boundary.
   */
  if (candidates.length === 0) {
    candidates.push(
      ...findMatches(
        source,
        '\\bmulter\\s*\\([^\\n]*?\\)',
      ),
    );
  }

  /*
   * Fallback for generic upload handler names.
   */
  if (candidates.length === 0) {
    candidates.push(
      ...findMatches(
        source,
        '\\b(?:fileUpload|upload)\\s*=',
      ),
    );
  }

  return candidates;
};

const SECURITY_FILE_UPLOAD_RULES = [
  {
    id: 'security.unrestricted-file-upload',
    category: 'security',
    name: 'Potential Unrestricted File Upload',
    description:
      'Detects file upload handlers where filename or upload processing appears to lack an obvious extension or MIME validation.',
    severity: 'high',
    confidence: 'low',
    languages: [
      'javascript',
      'typescript',
      'python',
      'php',
    ],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      /*
       * If obvious upload validation exists somewhere in the
       * source, do not report the upload as unrestricted based
       * only on the presence of an upload library or handler.
       *
       * This remains intentionally conservative because static
       * analysis cannot prove that the validation is complete.
       */
      if (hasObviousUploadValidation(source)) {
        return [];
      }

      const candidates =
        getUploadCandidates(source);

      /*
       * Deduplicate candidates by source location.
       */
      const uniqueCandidates = [];
      const seen = new Set();

      for (const candidate of candidates) {
        const locationKey = `${candidate.index}:${candidate.text}`;

        if (seen.has(locationKey)) {
          continue;
        }

        seen.add(locationKey);
        uniqueCandidates.push(candidate);
      }

      /*
       * When an actual upload middleware handler exists,
       * report only that handler and do not additionally
       * report its multer declaration/import.
       */
      const routeHandlers =
        uniqueCandidates.filter(candidate =>
          /\b(?:upload|fileUpload)\.(?:single|array|fields|none)\s*\(/iu.test(
            candidate.text,
          ),
        );

      const selectedCandidates =
        routeHandlers.length > 0
          ? routeHandlers
          : uniqueCandidates.slice(0, 1);

      return selectedCandidates.map(candidate => {
        const location =
          getLineLocation(
            candidate.index,
          );

        return createViolation({
          line: location.line,
          column: location.column,
          evidence: candidate.text,
          metadata: {
            detection:
              'file-upload-handler',
            limitation:
              'Static analysis cannot confirm complete upload validation across middleware and storage layers.',
          },
        });
      });
    },
  },
];

export {
  SECURITY_FILE_UPLOAD_RULES,
};

export default SECURITY_FILE_UPLOAD_RULES;