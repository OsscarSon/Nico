import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";

const approvedIds = new Set();
const server = createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/synthetic-book") {
    response.writeHead(404).end();
    return;
  }
  const id = request.headers["x-fixture-id"];
  if (typeof id !== "string" || !/^fixture-[0-9]{1,2}$/.test(id)) {
    response.writeHead(400).end();
    return;
  }
  const created = !approvedIds.has(id);
  if (created) approvedIds.add(id);
  response.writeHead(created ? 201 : 200).end();
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/synthetic-book`;
  const runs = [];
  for (let n = 0; n < 60; n += 6) {
    const group = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const at = performance.now();
        const response = await globalThis.fetch(endpoint, {
          method: "POST",
          headers: { "x-fixture-id": "fixture-" + ((n + i) % 30) },
        });
        await response.text();
        return {
          status: response.status,
          milliseconds: performance.now() - at,
        };
      }),
    );
    runs.push(...group);
  }
  const created = runs.filter(({ status }) => status === 201).length;
  const retained = runs.filter(({ status }) => status === 200).length;
  assert.equal(created, 30);
  assert.equal(retained, 30);
  assert.equal(approvedIds.size, 30);
  const latency = runs
    .map(({ milliseconds }) => milliseconds)
    .sort((a, b) => a - b);
  const percentile = (p) => latency[Math.ceil(latency.length * p) - 1];
  console.log(
    JSON.stringify({
      requests: runs.length,
      created,
      retained,
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
    }),
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
