const isPositiveInteger = (value) => {
  return Number.isInteger(value) && value > 0;
};

const normalizePosition = (position, fallback = {}) => {
  const line = isPositiveInteger(position?.line)
    ? position.line
    : fallback.line || 1;

  const column = isPositiveInteger(position?.column)
    ? position.column
    : fallback.column || 1;

  return {
    line,
    column
  };
};

const normalizeLocation = (location) => {
  const start = normalizePosition(location?.start, {
    line: 1,
    column: 1
  });

  const end = normalizePosition(location?.end, start);

  if (
    end.line < start.line ||
    (
      end.line === start.line &&
      end.column < start.column
    )
  ) {
    return {
      start,
      end: start
    };
  }

  return {
    start,
    end
  };
};

const createLocation = ({
  startLine,
  startColumn,
  endLine,
  endColumn
}) => {
  return normalizeLocation({
    start: {
      line: startLine,
      column: startColumn
    },
    end: {
      line: endLine ?? startLine,
      column: endColumn ?? startColumn
    }
  });
};

export {
  normalizePosition,
  normalizeLocation,
  createLocation
};