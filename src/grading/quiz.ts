import type { QuizItem } from "../content/schema";

export type ChoiceResult = { correct: boolean; message: string };

export function gradeChoice(item: QuizItem, choice: number): ChoiceResult {
  if (choice === item.answer) return { correct: true, message: item.why };
  return {
    correct: false,
    message: item.wrongHints[String(choice)] ?? "再想一想，对照上面的讲解。",
  };
}

/** 解析学习者输入的整数，允许空格和千分位逗号；其它输入视为无效。 */
export function parseIntegerInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/[,，\s]/g, "");
  if (!/^-?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

export function gradeNumber(
  answer: number,
  raw: string,
): { valid: boolean; correct: boolean } {
  const n = parseIntegerInput(raw);
  if (n === null) return { valid: false, correct: false };
  return { valid: true, correct: n === answer };
}

/** 答错 2 次后允许查看答案，避免学习者卡死。 */
export const REVEAL_AFTER_WRONG = 2;
