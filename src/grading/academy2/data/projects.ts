import { grouped, type Table } from "./table";
import type { MLResult } from "./ml";

export function verifyMonthly(raw: Table, result: Table) {
  if (result.columns.length !== 4 || result.rows.length !== 5) return false;
  const rows = grouped(raw, "month", "ozone"),
    month = new Map(rows.map((row) => [row.group, row]));
  let cumulative = 0;
  const sorted = [...result.rows].sort((a, b) => Number(a[0]) - Number(b[0]));
  return sorted.every(([m, valid, mean, total], i) => {
    const expected = month.get(i + 5);
    if (!expected || m !== i + 5) return false;
    cumulative += expected.valid;
    return (
      valid === expected.valid &&
      total === cumulative &&
      typeof mean === "number" &&
      expected.mean !== null &&
      Math.abs(mean - expected.mean) < 1e-6
    );
  });
}
export function compareOnHoldout(a: MLResult, b: MLResult) {
  return Boolean(
    a.model !== b.model &&
    a.partition &&
    b.partition &&
    !a.options.leakDemo &&
    !b.options.leakDemo &&
    JSON.stringify(a.partition) === JSON.stringify(b.partition) &&
    a.options.mode === b.options.mode &&
    a.options.target === b.options.target &&
    a.options.positive === b.options.positive &&
    a.options.standard === b.options.standard &&
    a.options.pca === b.options.pca &&
    a.options.balance === b.options.balance &&
    a.options.selfTrain === b.options.selfTrain &&
    a.options.features.join("\0") === b.options.features.join("\0"),
  );
}
