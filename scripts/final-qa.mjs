import { createServer } from "vite";

const tasks = {
  ledger: "/scripts/final-qa-ledger.ts",
  reference: "/scripts/final-qa-reference.ts",
};
const task = process.argv[2];
if (!Object.hasOwn(tasks, task)) throw Error("Usage: node scripts/final-qa.mjs ledger|reference");

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
});
try {
  await vite.ssrLoadModule(tasks[task]);
} finally {
  await vite.close();
}
