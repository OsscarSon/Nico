import type { Question } from "../../../content/academy2/teaching/schema";

type Programming = Extract<Question, { type: "program" }>;
export function programHarness(code: string, question: Programming, tag: string) {
  return [
    code,
    "import json as _nico_json",
    "_nico_tests=" + JSON.stringify(question.cases.map((test) => test.args)),
    "print(" +
      JSON.stringify(tag) +
      ", _nico_json.dumps([" +
      question.functionName +
      "(*args) for args in _nico_tests], allow_nan=False))",
  ].join("\n");
}
export function parseProgramOutput(stdout: string, tag: string): string[] | null {
  const line = stdout
    .split("\n")
    .reverse()
    .find((text) => text.startsWith(tag + " "));
  if (!line) return null;
  try {
    const result: unknown = JSON.parse(line.slice(tag.length));
    return Array.isArray(result) &&
      result.every((value) => typeof value === "number" && Number.isFinite(value))
      ? result.map(String)
      : null;
  } catch {
    return null;
  }
}

export function compareOutputs(a: string, b: string) {
  if (a.trim() === b.trim()) return true;
  const scalar = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const x = Number(a),
    y = Number(b);
  return (
    scalar.test(a.trim()) &&
    scalar.test(b.trim()) &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y))
  );
}
