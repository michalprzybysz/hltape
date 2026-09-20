import * as assert from "node:assert";
import { test } from "node:test";
import Fastify from "fastify";
import root from "../../src/routes/root";

// The route is registered on a bare Fastify instance rather than through the real app,
// so the suite needs no environment variables and no database.
test("default root route", async () => {
  const app = Fastify();
  void app.register(root);
  await app.ready();

  const res = await app.inject({ url: "/" });

  assert.deepStrictEqual(JSON.parse(res.payload), { root: true });

  await app.close();
});
