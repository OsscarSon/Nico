import assert from "node:assert/strict";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";

if (!isMainThread) {
  if (workerData.fail) process.exit(7);
  const sum = workerData.rows.reduce((total, value) => total + value, 0);
  parentPort.postMessage({ shard: workerData.shard, sum });
} else {
  const parts = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
  ];
  const committed = new Map();
  const events = [];
  const execute = (shard, fail = false) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: { shard, rows: parts[shard], fail },
      });
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.once("exit", (code) => {
        if (code !== 0) reject(Error("worker exit " + code));
      });
    });
  await Promise.all(
    parts.map(async (_, shard) => {
      let result;
      try {
        result = await execute(shard, shard === 1);
      } catch (error) {
        if (error.message !== "worker exit 7") throw error;
        events.push({ shard, action: "replace failed worker" });
        result = await execute(shard);
      }
      committed.set(result.shard, result.sum);
    }),
  );
  const duplicate = await execute(0);
  if (!committed.has(duplicate.shard))
    committed.set(duplicate.shard, duplicate.sum);
  const total = [...committed.values()].reduce((a, b) => a + b, 0);
  assert.equal(events.length, 1);
  assert.equal(committed.size, parts.length);
  assert.equal(total, (12 * 13) / 2);
  console.log(
    JSON.stringify({
      workers: parts.length,
      events,
      total,
      duplicateIgnored: true,
    }),
  );
}
