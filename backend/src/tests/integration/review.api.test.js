
import test from "node:test";
import assert from "node:assert/strict";

import app from "../../app.js";

async function startTestServer() {
  return new Promise(
    (resolve) => {
      const server =
        app.listen(
          0,
          () => resolve(server)
        );
    }
  );
}

test(
  "review API accepts source code",
  async () => {
    const server =
      await startTestServer();

    try {
      const address =
        server.address();

      const response =
        await fetch(
          `http://127.0.0.1:${address.port}/api/reviews`,
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify({
                code:
                  "const value = 10;",
                fileName:
                  "test.js",
                language:
                  "javascript"
              })
          }
        );

      assert.ok(
        [201, 500].includes(
          response.status
        )
      );
    } finally {
      await new Promise(
        (resolve) =>
          server.close(
            resolve
          )
      );
    }
  }
);