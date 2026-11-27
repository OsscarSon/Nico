import type { TeachingBlock } from "../teaching/schema";

export type Exercise = { prompt: string; answer: number | readonly string[]; explanation: string };
export type LegacyTopicLesson = {
  id: string;
  concept: string;
  theory: string;
  example: string;
  mistake: string;
  exercises: readonly [Exercise, Exercise, Exercise, Exercise];
};
export const exercise = (prompt: string, answer: number | readonly string[], explanation: string): Exercise => ({ prompt, answer, explanation });
export const topic = (id: string, concept: string, theory: string, example: string, mistake: string, exercises: LegacyTopicLesson["exercises"]): LegacyTopicLesson =>
  ({ id, concept, theory, example, mistake, exercises });

export function legacyBlocks(lesson: LegacyTopicLesson): TeachingBlock[] {
  const sections = [
    ["概念 · Concept",lesson.concept],
    ["原理与推导 · Theory",lesson.theory],
    ["例题 · Worked Example",lesson.example],
    ["常见误区 · Common Mistakes",lesson.mistake],
  ] as const;
  return sections.map(([title,body])=>({type:"section",title,blocks:[{type:"paragraph",body}]}));
}
