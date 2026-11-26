export const labIds = [
  "status", "logs", "register", "linux", "protocol", "routing", "response", "cloud",
  "async-types", "backend", "frontend", "database", "structures", "workflow", "fullstack",
] as const;
export type LabId = typeof labIds[number];

export type Field = { label: string; options: readonly string[] };
export const field = (label: string, ...options: string[]): Field => ({ label, options });
export type Evidence = { label: string; observed: string; expected: string };
export const check = (label: string, observed: string | number, expected: string | number): Evidence =>
  ({ label, observed: String(observed), expected: String(expected) });
export type Lab = {
  task: string;
  fields: readonly Field[];
  run: (values: readonly number[]) => Evidence[];
};

export function evaluateLab(lab: Lab, values: readonly number[]) {
  if (values.length !== lab.fields.length || !lab.fields.every((field, i) => Number.isInteger(values[i]) && values[i]! >= 0 && values[i]! < field.options.length))
    throw new RangeError("实验设置超出范围");
  const checks = lab.run(values);
  return { checks, passed: checks.length > 0 && checks.every(row => row.observed === row.expected) };
}
