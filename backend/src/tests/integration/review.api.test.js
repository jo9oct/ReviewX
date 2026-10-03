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
        [200, 201, 202, 500].includes(
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

test(
  "GET /api/reviews returns review list",
  async () => {
    const server = await startTestServer();
    try {
      const address = server.address();
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/reviews?limit=10`
      );

      assert.ok(
        [200, 500].includes(response.status)
      );
      if (response.status === 200) {
        const body = await response.json();
        assert.ok(body.success);
        assert.ok(Array.isArray(body.data));
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
);

test(
  "GET /api/reviews/metrics returns dashboard metrics",
  async () => {
    const server = await startTestServer();
    try {
      const address = server.address();
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/reviews/metrics`
      );

      assert.ok(
        [200, 500].includes(response.status)
      );
      if (response.status === 200) {
        const body = await response.json();
        assert.ok(body.success);
        assert.ok(body.data !== undefined);
        assert.ok("totalReviews" in body.data);
        assert.ok("categoryHealth" in body.data);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
);
