const counters = new Map();
const durations = new Map();

const incrementMap = (
  map,
  key,
  value = 1,
) => {
  map.set(
    key,
    (map.get(key) || 0) +
      value,
  );
};

const recordDuration = (
  key,
  durationMs,
) => {
  if (
    !Number.isFinite(
      durationMs,
    )
  ) {
    return;
  }

  const values =
    durations.get(key) || [];

  values.push(durationMs);

  if (values.length > 1000) {
    values.shift();
  }

  durations.set(
    key,
    values,
  );
};

const calculatePercentile = (
  values,
  percentile,
) => {
  if (!values.length) {
    return null;
  }

  const sorted = [
    ...values,
  ].sort(
    (a, b) => a - b,
  );

  const index = Math.min(
    sorted.length - 1,
    Math.floor(
      sorted.length *
        percentile,
    ),
  );

  return sorted[index];
};

export const createMetricsService =
  () => ({
    increment(
      metric,
      value = 1,
    ) {
      incrementMap(
        counters,
        metric,
        value,
      );
    },

    recordDuration(
      metric,
      durationMs,
    ) {
      recordDuration(
        metric,
        durationMs,
      );
    },

    getCounter(metric) {
      return counters.get(
        metric,
      ) || 0;
    },

    getDurationSummary(metric) {
      const values =
        durations.get(metric) ||
        [];

      if (!values.length) {
        return {
          count: 0,
          min: null,
          max: null,
          average: null,
          p50: null,
          p95: null,
        };
      }

      const total =
        values.reduce(
          (sum, value) =>
            sum + value,
          0,
        );

      return {
        count: values.length,
        min: Math.min(
          ...values,
        ),
        max: Math.max(
          ...values,
        ),
        average:
          total / values.length,
        p50:
          calculatePercentile(
            values,
            0.5,
          ),
        p95:
          calculatePercentile(
            values,
            0.95,
          ),
      };
    },

    snapshot() {
      const counterSnapshot =
        Object.fromEntries(
          counters.entries(),
        );

      const durationSnapshot =
        Object.fromEntries(
          [...durations.keys()].map(
            (key) => [
              key,
              this.getDurationSummary(
                key,
              ),
            ],
          ),
        );

      return {
        counters:
          counterSnapshot,
        durations:
          durationSnapshot,
        timestamp:
          new Date().toISOString(),
      };
    },
  });