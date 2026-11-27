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
  const differentInputs =
    Number(a.text !== b.text) +
    Object.keys(a.inputs).filter((key) => a.inputs[key] !== b.inputs[key])
      .length;
  const first = projectValue(course, a),
    second = projectValue(course, b);
  if (
    differentInputs !== 1 ||
    first == null ||
    second == null ||
    first === second
  )
    return false;
  if (course === "advanced-data-science") return Number(first) > Number(second);
  if (course === "advanced-software")
    return (
      Math.min(Number(first), Number(second)) < 0 &&
      Math.max(Number(first), Number(second)) >= 0
    );
  return true;
}
