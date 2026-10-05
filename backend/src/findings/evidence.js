const MAX_EVIDENCE_LENGTH = 5000;

const normalizeEvidence = (evidence) => {
  if (!evidence || typeof evidence !== 'object') {
    return null;
  }

  if (
    evidence.type !== 'source' &&
    evidence.type !== 'generated'
  ) {
    return null;
  }

  if (
    typeof evidence.text !== 'string' ||
    evidence.text.length === 0
  ) {
    return null;
  }

  return {
    type: evidence.type,
    text: evidence.text.slice(0, MAX_EVIDENCE_LENGTH)
  };
};

const createEvidence = ({
  type = 'source',
  text
}) => {
  return normalizeEvidence({
    type,
    text
  });
};

export {
  MAX_EVIDENCE_LENGTH,
  normalizeEvidence,
  createEvidence
};