
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseSource
} from "../../../parsers/parserManager.js";

test(
  "parser manager parses JavaScript",
  () => {
    const result =
      parseSource({
        code:
          "const value = 10;",
        language:
          "javascript",
        fileName:
          "test.js"
      });

    assert.ok(
      result
    );

    assert.equal(
      typeof result,
      "object"
    );
  }
);

test(
  "parser manager parses Python",
  () => {
    const result =
      parseSource({
        code:
          "value = 10",
        language:
          "python",
        fileName:
          "test.py"
      });

    assert.ok(
      result
    );
  }
);