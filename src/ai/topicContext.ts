import { LIMITS } from "./protocol";
import type { LegacyTopicLesson } from "../content/academy2/p1/types";
import type { TopicLesson, TeachingBlock } from "../content/academy2/teaching/schema";

type Pieces = { formula: string[]; case: string[]; proof: string[] };
function select(blocks: TeachingBlock[], p: Pieces) {
  for (const block of blocks) {
    if (block.type === "math") p.formula.push(block.latex);
    if (block.type === "example")
      p.case.push([block.title, block.given, block.goal, block.method].join(" / "));
    if (block.type === "sequence")
      p.proof.push([block.title, block.strategy, ...block.steps.map((step) => step.title)].join(" / "));
    if ("blocks" in block) select(block.blocks, p);
  }
}
export type TutorMode = "解释知识" | "解释推导" | "答题提示";
export function buildTopicContext(
  legacy: LegacyTopicLesson,
  lesson: TopicLesson,
  mode: TutorMode,
  experiment?: { title: string; objective: string },
) {
  const parts: Pieces = { formula: [], case: [], proof: [] };
  select(lesson.blocks, parts);
  // For tutoring, project trusted lesson metadata and prompts only. Notes, responses and grades never enter this payload.
  return [
    "目标：" + mode,
    "概念：" + legacy.concept.slice(0, 290),
    "讲解：" + legacy.theory.slice(0, 300),
    "公式：" + parts.formula.join("；").slice(0, 420),
    "推导策略：" + parts.proof.join("；").slice(0, 240),
    "例题条件与思路：" + parts.case.join("；").slice(0, 250),
    "练习题面：" +
      [...legacy.exercises.map((x) => x.prompt), ...lesson.questions.map((x) => x.prompt)]
        .join("；")
        .slice(0, 240),
    ...(experiment
      ? ["实验目标：" + experiment.title + " / " + experiment.objective.slice(0, 155)]
      : []),
  ]
    .join("\n")
    .slice(0, LIMITS.context);
}
