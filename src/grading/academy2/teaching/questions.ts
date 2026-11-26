import type { Question } from "../../../content/academy2/teaching/schema";

export type Response = string | boolean | readonly string[];
type Feedback = {
  status: "correct" | "incorrect" | "invalid" | "review";
  message: string;
};

const normalize = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase().replace(/−/g, "-");
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/;
export function readNumber(
  raw: string,
  { fraction = false, percent = false } = {},
): number | null {
  let value = normalize(raw);
  const isPercent = value.endsWith("%");
  if (isPercent) {
    if (!percent) return null;
    value = value.slice(0, -1).trim();
  }
  const parts = value.split("/").map((part) => part.trim());
  if (
    parts.length > (fraction ? 2 : 1) ||
    !parts.every((part) => decimal.test(part))
  )
    return null;
  const numerator = Number(parts[0]),
    denominator = parts.length === 2 ? Number(parts[1]) : 1;
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  )
    return null;
  const parsed = numerator / denominator / (isPercent ? 100 : 1);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluate(question: Question, response: Response): Feedback {
  const invalid: Feedback = {
    status: "invalid",
    message: "请按题目的格式输入完整答案。",
  };
  const result = (correct: boolean, hint = question.hint): Feedback =>
    correct
      ? { status: "correct", message: question.explanation }
      : { status: "incorrect", message: hint };
  switch (question.type) {
    case "single": {
      const option = question.options.find((item) => item.id === response);
      return option
        ? result(option.id === question.answer, option.feedback)
        : invalid;
    }
    case "multi": {
      if (
        typeof response === "string" ||
        typeof response === "boolean" ||
        !response.length
      )
        return invalid;
      const selected = new Set(response);
      if (
        selected.size !== response.length ||
        response.some((id) => !question.options.some((item) => item.id === id))
      )
        return invalid;
      const wrong = question.options.find(
        (item) => selected.has(item.id) && !question.answer.includes(item.id),
      );
      return result(
        !wrong && question.answer.every((id) => selected.has(id)),
        wrong?.feedback,
      );
    }
    case "boolean":
      return typeof response === "boolean"
        ? result(response === question.answer)
        : invalid;
    case "number": {
      const value =
        typeof response === "string"
          ? readNumber(response, {
              fraction: question.allowFraction,
              percent: question.allowPercent,
            })
          : null;
      return value === null
        ? invalid
        : result(Math.abs(value - question.answer) <= question.tolerance);
    }
    case "vector": {
      if (typeof response !== "string") return invalid;
      const value = normalize(response);
      const components = (
        /^\[.*\]$|^\(.*\)$/.test(value) ? value.slice(1, -1) : value
      ).split(/[,，]/);
      const values = components.map((part) =>
        readNumber(part, { fraction: true }),
      );
      if (
        values.length !== question.answer.length ||
        values.some((part) => part === null)
      )
        return invalid;
      return result(
        values.every(
          (part, i) =>
            Math.abs(part! - question.answer[i]!) <= question.tolerance,
        ),
      );
    }
    case "text":
      return typeof response === "string" && normalize(response)
        ? result(
            question.answer.some(
              (answer) => normalize(answer) === normalize(response),
            ),
          )
        : invalid;
    case "open":
      return typeof response === "string" && response.trim()
        ? { status: "review", message: question.explanation }
        : invalid;
  }
}

export type QuestionAttempt = {
  count: number;
  lastCorrect: boolean;
  passed: boolean;
  at: number;
};
export type QuestionRecords = Record<string, QuestionAttempt>;
export function recordAnswer(
  records: QuestionRecords,
  question: Question,
  response: Response,
  at: number,
): QuestionRecords {
  const outcome = evaluate(question, response);
  if (outcome.status !== "correct" && outcome.status !== "incorrect")
    return records;
  const prior = records[question.id],
    correct = outcome.status === "correct";
  return {
    ...records,
    [question.id]: {
      count: (prior?.count ?? 0) + 1,
      lastCorrect: correct,
      passed: correct || prior?.passed === true,
      at,
    },
  };
}

export function summarizeBank(
  questions: readonly Question[],
  records: QuestionRecords | undefined,
) {
  const assessed = questions.filter((question) => question.type !== "open");
  return {
    scored: assessed.length,
    passed: assessed.filter(
      (question) => records?.[question.id]?.lastCorrect === true,
    ).length,
    needsReview: assessed.filter(
      (question) => records?.[question.id]?.lastCorrect === false,
    ).length,
    open: questions.length - assessed.length,
  };
}
