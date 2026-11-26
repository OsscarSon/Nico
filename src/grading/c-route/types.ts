export const cLabKeys = [
  "predict", "context", "sample", "claims", "examples", "format", "pipeline", "verify",
  "iterate", "retrieve", "agent", "evaluate", "local", "fairness", "trust", "delegate", "capstone",
] as const;
export type CLabKey = typeof cLabKeys[number];
export type Values = Readonly<Record<string, string>>;
export type Control = {
  id: string;
  label: string;
  initial: string;
  options?: ReadonlyArray<readonly [string, string]>;
  multiline?: boolean;
};
export type LabReport = { rows: string[]; evidence: string; passed: boolean; csv?: string };
export type CLab = {
  title: string;
  guide: string;
  goal: string;
  controls: Control[];
  run(values: Values): LabReport;
};
export function select(id: string, label: string, options: Control["options"]): Control {
  return { id, label, initial: options?.[0]?.[0] ?? "", options };
}
export function initialValues(lab: CLab): Values {
  return Object.fromEntries(lab.controls.map(control => [control.id, control.initial]));
}
