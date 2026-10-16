import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { applets } from "../../apps/applets/registry";

test("development serves every public page and redirects source links with queries", async () => {
  const server = await createServer({
    server: { host: "127.0.0.1", port: 0, open: false },
  });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    for (const app of applets) {
      const response = await fetch(`${base}/${app.page}`);
      assert.equal(response.status, 200, app.page);
      const html = await response.text();
      assert.ok(html.includes(`src="/${app.entry}"`), app.page);
      assert.ok(html.includes("/@vite/client"), app.page);
      const redirect = await fetch(`${base}/${app.html}?case=calm`, {
        redirect: "manual",
      });
      assert.equal(redirect.status, 302);
      assert.equal(redirect.headers.get("location"), `/${app.page}?case=calm`);
    }
    assert.equal((await fetch(base)).status, 200);
  } finally {
    await server.close();
  }
});
