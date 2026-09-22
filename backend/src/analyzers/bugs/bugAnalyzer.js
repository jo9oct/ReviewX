import {
  analyzeLogic
} from "./logic/logicAnalyzer.js";

import {
  analyzeNull
} from "./null/nullAnalyzer.js";

import {
  analyzeAsync
} from "./async/asyncAnalyzer.js";

import {
  analyzeExceptions
} from "./exceptions/exceptionAnalyzer.js";

import {
  analyzeResources
} from "./resources/resourceAnalyzer.js";

import {
  analyzeTypes
} from "./type/typeAnalyzer.js";

export function analyzeBugs(context) {
  if (!context?.code) {
    return [];
  }

  return [
    ...analyzeLogic(context),
    ...analyzeNull(context),
    ...analyzeAsync(context),
    ...analyzeExceptions(context),
    ...analyzeResources(context),
    ...analyzeTypes(context)
  ];
}