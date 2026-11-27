import type { LabRecord } from "./projectEvidence";

export type Direction = "up" | "down" | "same";
export function evaluateComparison(
  before: LabRecord,
  after: LabRecord,
  metric: string,
  prediction: Direction,
) {
  const changed =
    Number(before.text !== after.text) +
    Object.keys(before.inputs).filter(
      (key) => before.inputs[key] !== after.inputs[key],
    ).length;
  if (changed !== 1)
    return {
      status: "invalid" as const,
      message: "对比实验需要只改变一个参数或一份输入，然后重新执行。",
    };
  const pick = (record: LabRecord) =>
    record.result.metrics.find(([label]) => label === metric)?.[1];
  const a = pick(before),
    b = pick(after);
  if (
    typeof a !== "number" ||
    typeof b !== "number" ||
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  )
    return {
      status: "invalid" as const,
      message: "该指标在两次实验中必须都具有有限数值。",
    };
  const margin = 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
  const actual: Direction =
    Math.abs(a - b) <= margin ? "same" : b > a ? "up" : "down";
  return {
    status:
      actual === prediction ? ("correct" as const) : ("incorrect" as const),
    actual,
    before: a,
    after: b,
  };
}

export const directionLabel: Record<Direction, string> = {
  up: "上升",
  down: "下降",
  same: "近似不变",
};
