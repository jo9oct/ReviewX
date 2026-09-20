
import { env } from "./env.js";

export const uploadConfig = Object.freeze({
  maxFileSize: env.upload.maxFileSize,

  maxFiles: env.upload.maxFiles,

  allowedExtensions: Object.freeze([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".cs",
    ".php",
    ".c",
    ".cpp",
    ".html",
    ".css",
    ".sql"
  ]),

  allowedMimeTypes: Object.freeze([
    "text/plain",
    "text/javascript",
    "application/javascript",
    "application/x-javascript",
    "application/typescript",
    "text/x-python",
    "text/x-java-source",
    "text/x-c",
    "text/x-c++",
    "text/x-csharp",
    "text/x-php",
    "text/html",
    "text/css",
    "application/sql",
    "text/sql",
    "application/octet-stream"
  ]),

  encoding: "utf8"
});