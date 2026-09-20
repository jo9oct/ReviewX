
export function generateJSONReport(
  report
) {
  if (
    !report ||
    typeof report !== "object"
  ) {
    throw new TypeError(
      "Report data is required."
    );
  }

  return JSON.stringify(
    report,
    null,
    2
  );
}