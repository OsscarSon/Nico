import type { TeachingBlock } from "../teaching/schema";
import type { Exercise } from "../p1/types";
import { exercise } from "../p1/types";

type Input = [question: string, answer: string | number, explanation: string];
export type Draft = {
  hook: string;
  definition: string;
  theory: string[];
  mistake: string;
  example: {
    given: string;
    goal: string;
    steps: string[];
    check: string;
    answer: string;
  };
  questions: [Exercise, Exercise, Exercise, Exercise];
  lab: string;
  formulas: string[];
  extra?: TeachingBlock[];
};
export function lesson(
  lab: string,
  hook: string,
  definition: string,
  theory: string[],
  mistake: string,
  example: [
    given: string,
    goal: string,
    steps: string[],
    answer: string,
    check: string,
  ],
  questions: [Input, Input, Input, Input],
  formulas: string[] = [],
  extra?: TeachingBlock[],
): Draft {
  const [given, goal, steps, answer, check] = example;
  const toExercise = ([prompt, result, explanation]: Input) =>
    exercise(
      prompt,
      typeof result === "string" ? result.split("|") : result,
      explanation,
    );
  return {
    lab,
    hook,
    definition,
    theory,
    mistake,
    example: { given, goal, steps, answer, check },
    formulas,
    extra,
    questions: [
      toExercise(questions[0]),
      toExercise(questions[1]),
      toExercise(questions[2]),
      toExercise(questions[3]),
    ],
  };
}
