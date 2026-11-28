import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { binomialTail } from "../src/grading/academy2/advanced/statistics";
import { dft } from "../src/grading/academy2/advanced/numerics";
import { eigenvectors } from "../src/grading/academy2/data/ml-metrics";
import { exactRandomization } from "../src/grading/academy2/applied/research";
import { seeded } from "../src/grading/academy2/applied/compute";

const random = seeded(251128);
const binomial = [12, 120, 2000, 4000].flatMap((n) =>
  [0.005, 0.123, 0.5, 0.83, 0.99].flatMap((p) =>
    [-3, -1, 0, 1, 3].map((offset) => {
      const k = Math.min(n, Math.max(1, Math.round(n * p + offset * Math.sqrt(n * p * (1 - p)))));
      return { n, p, k, answer: binomialTail(n, p, k) };
    }),
  ),
);
const pca = Array.from({ length: 120 }, (_, i) => {
  const rows = Array.from({ length: 2 + (i % 20) }, () =>
    Array.from({ length: 2 + (i % 7) }, () => (random() * 2 - 1) * 10 ** ((i % 13) - 6)),
  );
  const { basis, variances } = eigenvectors(rows, rows[0]!.length);
  return { rows, basis, variances };
});
const permutations = Array.from({ length: 36 }, (_, i) => {
  const n = 4 + (i % 8);
  const k = 2 + (i % (n - 3));
  const power = (i % 18) - 12;
  const values = Array.from({ length: n }, () => Math.round(random() * 14 - 7) + "e" + power);
  const { p, draws, extreme } = exactRandomization(values.join(" "), k);
  return { values, k, p, draws, extreme };
});
const fft = Array.from({ length: 32 }, (_, i) => {
  const values = Array.from({ length: 2 + (i % 18) }, () => random() * 2 - 1);
  return { values, spectrum: dft(values) };
});
const verifier = fileURLToPath(new URL("../projects/p4/qa_reference.py", import.meta.url));
const result = spawnSync("python3", [verifier], {
  input: JSON.stringify({ binomial, pca, permutations, fft }),
  encoding: "utf8",
  timeout: 30_000,
});
if (result.error || result.status !== 0) throw Error(result.stderr || String(result.error));
console.log(result.stdout.trim());
