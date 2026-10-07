export function safeNext(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
