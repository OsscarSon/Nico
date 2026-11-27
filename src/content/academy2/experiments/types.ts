import { display, numberList } from "../p1/workbench";
import type { Pair } from "../../../grading/academy2/p1/math";

export type Control = { label: string; value: string; choices?: readonly string[] };
export const control = (
  label: string,
  value: string | number,
  choices?: readonly string[],
): Control => ({ label, value: String(value), choices });
export type Curve = { label: string; points: Pair[]; type?: "bars" | "dots" | "line"; step?: boolean };
export type Result = {
  values: [string, string | number][];
  curves?: Curve[];
  steps?: { label: string; matrix: number[][] }[];
};
export type Experiment = {
  id: string;
  topic: string;
  title: string;
  objective: string;
  controls: Control[];
  run: (values: string[]) => Result;
};
export const series = (a: number, b: number, n: number, f: (x: number) => number): Pair[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / n;
    return [x, f(x)];
  });
export const coord = (values: readonly number[]) => "(" + values.map(display).join(", ") + ")";
export const tuple = (raw: string | undefined): Pair => {
  const [a, b] = numberList(raw, 2, 2);
  return [a!, b!];
};
export function matrixRows(raw: string | undefined, min = 2, max = 5) {
  const parts = raw?.normalize("NFKC").split(";") ?? [];
  if (parts.length < min || parts.length > max)
    throw Error("输入 " + min + " 至 " + max + " 行，用分号分隔。");
  const rows = parts.map((row) => numberList(row, 1, 6));
  if (rows.some((row) => row.length !== rows[0]!.length)) throw Error("各行长度须相同。");
  return rows;
}
export function histogram(values: number[], bins = 12): Pair[] {
  const min = Math.min(...values),
    max = Math.max(...values);
  const width = max > min ? (max - min) / bins : 1;
  const counts = new Array<number>(bins).fill(0);
  for (const value of values)
    counts[Math.min(bins - 1, Math.max(0, Math.floor((value - min) / width)))]!++;
  return counts.map((count, i) => [min + (i + 0.5) * width, count]);
}
