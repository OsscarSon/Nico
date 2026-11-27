import type { TeachingBlock, TopicLesson } from "../teaching/schema";
import { exercise, type Exercise, type LegacyTopicLesson } from "../p1/types";
import { enrichment } from "./enrichment";
import { algorithmCode } from "./python";
import { algorithmKey } from "./registry";

type Case = readonly [
  name: string,
  given: string,
  goal: string,
  steps: readonly string[],
  answer: string,
  check: string,
];
export type ExerciseSet = readonly [Exercise, Exercise, Exercise, Exercise];
export type Material = {
  model: string;
  hook: string;
  definition: string;
  procedure: string;
  term: string;
  proof: readonly [strategy: string, base: string, step: string];
  cost: string;
  formula: string;
  mistake: string;
  example: Case;
  questions: ExerciseSet;
};
export const q = (prompt: string, answer: number | string, reason: string) =>
  exercise(
    prompt,
    typeof answer === "string" ? answer.split("|") : answer,
    reason,
  );
const sourceData = {
  basic: [
    [
      "MIT 6.006 · Introduction to Algorithms",
      "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
    ],
    ["Princeton · Algorithms, 4th Edition", "https://algs4.cs.princeton.edu/"],
  ],
  design: [
    [
      "MIT 6.046J · Design and Analysis of Algorithms",
      "https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/",
    ],
    [
      "Stanford CS161 · Design and Analysis of Algorithms",
      "https://web.stanford.edu/class/cs161/",
    ],
  ],
  theory: [
    [
      "MIT 18.404J · Theory of Computation",
      "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/",
    ],
    [
      "MIT 6.046J · Design and Analysis of Algorithms",
      "https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/",
    ],
  ],
};
export function teaching(key: string, m: Material) {
  const topic = algorithmKey(key);
  if (!topic) throw Error("知识点没有稳定 ID：" + key);
  const [name, given, goal, steps, answer, check] = m.example;
  const books =
    topic.course === "foundation-algorithms"
      ? sourceData.basic
      : topic.course === "advanced-algorithms"
        ? sourceData.theory
        : sourceData.design;
  const blocks: TeachingBlock[] = [
    {
      type: "section",
      title: "从一个问题出发",
      blocks: [
        { type: "paragraph", body: m.hook },
        { type: "note", tone: "definition", title: m.term, body: m.definition },
        { type: "paragraph", body: m.procedure },
      ],
    },
    {
      type: "sequence",
      kind: "proof",
      title: "为什么成立",
      strategy: m.proof[0],
      steps: [
        { title: "先确定对象和边界", body: m.proof[1] },
        { title: "证明关键步骤", body: m.proof[2] },
      ],
    },
    {
      type: "section",
      title: "时间、空间与适用范围",
      blocks: [
        { type: "math", latex: m.formula, caption: "分析模型中的操作或性质" },
        { type: "paragraph", body: m.cost },
        {
          type: "note",
          tone: "mistake",
          title: "用一个反例核查",
          body: m.mistake,
        },
      ],
    },
    {
      type: "example",
      kind: "math",
      level: "standard",
      title: name,
      given,
      goal,
      steps: steps.map((body, i) => ({ title: "步骤 " + (i + 1), body })),
      method: m.proof[0],
      answer,
      check,
      reveal: true,
    },
    ...(enrichment[key] ?? []),
    { type: "summary", points: [m.definition, m.cost, m.mistake] },
    {
      type: "references",
      items: books.map(([title, url]) => ({ title: title!, url: url! })),
    },
  ];
  const programming = algorithmCode(m.model);
  const lesson: TopicLesson = {
    id: topic.id,
    blocks,
    questions: programming ? [programming.question] : [],
  };
  const base: LegacyTopicLesson = {
    id: topic.id,
    concept: m.definition,
    theory: m.procedure + " " + m.proof[2],
    example: given + " " + goal,
    mistake: m.mistake,
    exercises: m.questions,
  };
  return { ...topic, lesson, base, material: m };
}
export function entry(
  model: string,
  term: string,
  hook: string,
  definition: string,
  procedure: string,
  proof: Material["proof"],
  formula: string,
  cost: string,
  mistake: string,
  example: Case,
  questions: ExerciseSet,
): Material {
  return {
    model,
    term,
    hook,
    definition,
    procedure,
    proof,
    formula,
    cost,
    mistake,
    example,
    questions,
  };
}
