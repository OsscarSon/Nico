export type Exercise = { prompt: string; answer: number | readonly string[]; explanation: string };
export type TopicLesson = {
  id: string;
  concept: string;
  theory: string;
  example: string;
  mistake: string;
  exercises: readonly [Exercise, Exercise, Exercise, Exercise];
};
export const exercise = (prompt: string, answer: number | readonly string[], explanation: string): Exercise => ({ prompt, answer, explanation });
export const topic = (id: string, concept: string, theory: string, example: string, mistake: string, exercises: TopicLesson["exercises"]): TopicLesson =>
  ({ id, concept, theory, example, mistake, exercises });
