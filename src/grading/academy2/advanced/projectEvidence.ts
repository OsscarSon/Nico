import { projectLabs } from "../../../content/academy2/advanced/projects";
import type { LabOutput } from "./labs";

export type LabRecord = {
  inputs: Record<string, number>;
  text: string;
  result: LabOutput;
};
export function projectValue(course: string, record: LabRecord) {
  return record.result.metrics.find(
    ([name]) => name === projectLabs[course]?.primary,
  )?.[1];
}
export function verifyProject(course: string, records: LabRecord[]) {
  const [a, b] = records;
  if (!projectLabs[course] || !a || !b) return false;
  const parameters = new Set([
    ...Object.keys(a.inputs),
    ...Object.keys(b.inputs),
  ]);
  const changed = [...parameters].filter(
    (key) => a.inputs[key] !== b.inputs[key],
  );
  const differentInputs = Number(a.text !== b.text) + changed.length;
  const first = projectValue(course, a),
    second = projectValue(course, b);
  if (
    differentInputs !== 1 ||
    first == null ||
    second == null ||
    (typeof first === "number" && !Number.isFinite(first)) ||
    (typeof second === "number" && !Number.isFinite(second)) ||
    first === second
  )
    return false;
  if (course === "advanced-data-science") return Number(first) > Number(second);
  if (course === "advanced-software")
    return (
      Math.min(Number(first), Number(second)) < 0 &&
      Math.max(Number(first), Number(second)) >= 0
    );
  if (course === "foundation-applied")
    return (
      typeof first === "number" &&
      typeof second === "number" &&
      Math.min(first, second) === 0 &&
      Math.max(first, second) > 0 &&
      [a, b].some(
        (record) =>
          projectValue(course, record) === 0 &&
          record.result.metrics.some(
            ([name, value]) => name === "共享边界线段" && value === "是",
          ),
      )
    );
  if (course === "intermediate-applied") return changed[0] === "integral";
  if (course === "advanced-applied")
    return (
      typeof first === "number" &&
      typeof second === "number" &&
      Math.min(first, second) >= 0 &&
      Math.min(first, second) <= 1e-12 &&
      Math.max(first, second) > 1e-12
    );
  return true;
}
