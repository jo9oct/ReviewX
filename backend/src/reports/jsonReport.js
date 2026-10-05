export const generateJsonReport = (report) => {
  if (!report || typeof report !== "object") {
    throw new TypeError("A valid report object is required.");
  }

  return JSON.stringify(report, null, 2);
};