import type { Question, TeachingBlock } from "../schema";

type Example = Extract<TeachingBlock, { type: "example" }>;
type Method = [title: string, body: string, formula?: string];
export type Enrichment = { blocks: TeachingBlock[]; questions: Question[] };
type Case = {
  title: string;
  given: string;
  goal: string;
  method: string;
  steps: Method[];
  answer: string;
  check: string;
  assumptions?: string;
  level?: Example["level"];
};
type Section = {
  title: string;
  prose: string[];
  formulas?: [latex: string, caption: string][];
  cases: Case[];
  extras?: TeachingBlock[];
  questions?: Question[];
};

export function unit({
  title,
  prose,
  formulas = [],
  cases,
  extras = [],
  questions = [],
}: Section): Enrichment {
  const text = prose.map((body) => ({ type: "paragraph", body }) as const);
  const math = formulas.map(
    ([latex, caption]) => ({ type: "math", latex, caption }) as const,
  );
  const examples = cases.map(
    (entry): Example => ({
      ...entry,
      type: "example",
      kind: entry.assumptions ? "statistics" : "math",
      level: entry.level ?? "standard",
      reveal: true,
      steps: entry.steps.map(([title, body, formula]) => ({
        title,
        body,
        formula,
      })),
    }),
  );
  return {
    blocks: [
      {
        type: "section",
        title,
        blocks: [...text, ...math, ...examples, ...extras],
      },
    ],
    questions,
  };
}

export const numeric = (
  id: string,
  prompt: string,
  answer: number,
  explanation: string,
  hint: string,
  options: {
    tolerance?: number;
    allowPercent?: boolean;
    allowFraction?: boolean;
    level?: "calculation" | "application" | "transfer";
  } = {},
): Question => ({
  id,
  type: "number",
  level: "calculation",
  prompt,
  answer,
  explanation,
  hint,
  tolerance: Number.isInteger(answer) ? 0 : 0.0005,
  allowFraction: true,
  ...options,
});
export const truth = (
  id: string,
  prompt: string,
  answer: boolean,
  explanation: string,
  hint: string,
): Question => ({
  id,
  type: "boolean",
  level: "analysis",
  prompt,
  answer,
  explanation,
  hint,
});
export const vector = (
  id: string,
  prompt: string,
  answer: number[],
  explanation: string,
  hint: string,
): Question => ({
  id,
  type: "vector",
  level: "analysis",
  prompt,
  answer,
  explanation,
  hint,
  tolerance: 1e-8,
});
export const open = (
  id: string,
  prompt: string,
  checkpoints: string[],
): Question => ({
  id,
  type: "open",
  level: "transfer",
  prompt,
  checkpoints,
  explanation: "请比较你的论证和下面的检查点。开放题由你或教师复核。",
  hint: "先说明假设，再给出可核查的步骤。",
});

export const worked = (
  title: string,
  given: string,
  goal: string,
  method: string,
  steps: Method[],
  answer: string,
  check: string,
  assumptions?: string,
  level?: Case["level"],
): Case => ({
  title,
  given,
  goal,
  method,
  steps,
  answer,
  check,
  assumptions,
  level,
});
