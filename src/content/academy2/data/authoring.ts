import type { TeachingBlock, TopicLesson } from "../teaching/schema";
import { exercise, type Exercise, type LegacyTopicLesson } from "../p1/types";
import { dataTopic } from "./registry";
import { codeLesson } from "./python";
import { additionalCodeByTopic } from "./p4Python";

export const q = (
  prompt: string,
  answer: number | string,
  explanation: string,
): Exercise =>
  exercise(
    prompt,
    typeof answer === "string" ? answer.split("|") : answer,
    explanation,
  );
export type Material = {
  english: string;
  lab: string;
  hook: string;
  concept: string;
  method: string;
  mistake: string;
  given: string;
  aim: string;
  steps: string[];
  answer: string;
  check: string;
  exercises: LegacyTopicLesson["exercises"];
  formula?: string;
  reference?: string;
  legacy?: string;
  recipe?: string;
  extra?: TeachingBlock[];
};
export function material(
  english: string,
  lab: string,
  hook: string,
  concept: string,
  method: string,
  mistake: string,
  context: [string, string, string[], string, string],
  exercises: Material["exercises"],
  extras: Pick<
    Material,
    "formula" | "reference" | "legacy" | "recipe" | "extra"
  > = {},
): Material {
  const [given, aim, steps, answer, check] = context;
  return {
    english,
    lab,
    hook,
    concept,
    method,
    mistake,
    given,
    aim,
    steps,
    answer,
    check,
    exercises,
    ...extras,
  };
}
const sources = {
  "foundation-data-science": [
    [
      "Berkeley Data 8 · Computational and Inferential Thinking",
      "https://inferentialthinking.com/",
    ],
    ["UCI Iris", "https://archive.ics.uci.edu/dataset/53/iris"],
  ],
  "intermediate-data-science": [
    ["Berkeley Data 100 · Principles of Data Science", "https://ds100.org/"],
    ["SQLite · SQL Language", "https://sqlite.org/lang.html"],
  ],
  "foundation-ai": [
    [
      "UC Berkeley CS188 · Introduction to AI",
      "https://inst.eecs.berkeley.edu/~cs188/",
    ],
    [
      "NIST · AI Risk Management Framework",
      "https://www.nist.gov/itl/ai-risk-management-framework",
    ],
  ],
  "intermediate-ai": [
    ["Stanford CS229 · Machine Learning", "https://cs229.stanford.edu/"],
    [
      "scikit-learn · User Guide",
      "https://scikit-learn.org/stable/user_guide.html",
    ],
  ],
} as const;
export function teach(id: string, m: Material) {
  const topic = dataTopic(id);
  if (!topic) throw Error("P3 知识点 ID 未注册 " + id);
  const programming = codeLesson(m.recipe ?? m.lab);
  const extension = codeLesson(additionalCodeByTopic[id] ?? "");
  const blocks: TeachingBlock[] = [
    {
      type: "section",
      title: "从实际问题出发",
      blocks: [
        { type: "paragraph", body: m.hook },
        { type: "note", tone: "definition", title: m.english, body: m.concept },
      ],
    },
    {
      type: "section",
      title: "方法与适用条件",
      blocks: [
        { type: "paragraph", body: m.method },
        ...(m.formula
          ? [
              {
                type: "math" as const,
                latex: m.formula,
                caption: "表达本课的计算量或关系",
              },
            ]
          : []),
        {
          type: "note",
          tone: "mistake",
          title: "检查一个常见错误",
          body: m.mistake,
        },
      ],
    },
    {
      type: "example",
      kind: "math",
      level: "standard",
      title: "走完一个案例",
      given: m.given,
      goal: m.aim,
      method: m.method,
      steps: m.steps.map((body, i) => ({ title: "步骤 " + (i + 1), body })),
      answer: m.answer,
      check: m.check,
      reveal: true,
    },
    ...(m.extra ?? []),
    { type: "summary", points: [m.concept, m.mistake, m.check] },
    {
      type: "references",
      items: [
        ...sources[topic.course].map(([title, url]) => ({ title, url })),
        ...(m.reference
          ? [{ title: m.english + " · 原始资料", url: m.reference }]
          : []),
      ],
    },
  ];
  const base: LegacyTopicLesson = {
    id,
    concept: m.concept,
    theory: m.method,
    example: m.given + " " + m.aim,
    mistake: m.mistake,
    exercises: m.exercises,
  };
  const lesson: TopicLesson = {
    id,
    blocks,
    questions: [programming, extension].flatMap((example) =>
      example ? [example.question] : [],
    ),
  };
  return { ...topic, material: m, base, lesson, programming, extension };
}
