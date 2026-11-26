import { describe, expect, it } from "vitest";
import { renderFormula } from "../src/features/academy2/teaching/renderFormula";
import { legacyBlocks } from "../src/content/academy2/p1/types";
import { p1Lessons } from "../src/content/academy2/p1";
import { enhanceLesson, upgrades } from "../src/content/academy2/teaching/p1";
import {
  questionSchema,
  teachingBlock,
  topicLessonSchema,
  type Question,
  type TeachingBlock,
} from "../src/content/academy2/teaching/schema";
import {
  evaluate,
  readNumber,
  recordAnswer,
  summarizeBank,
} from "../src/grading/academy2/teaching/questions";
import {
  emptyKnowledge,
  knowledgeProgressSchema,
  knowledgeStatus,
} from "../src/grading/academy2/p1/progress";
import { treeProbabilities } from "../src/grading/academy2/p1/statistics";

const stem = {
  id: "item-test",
  level: "analysis",
  prompt: "求值",
  hint: "核对输入",
  explanation: "计算正确",
} as const;
const questions: Question[] = [
  {
    ...stem,
    type: "number",
    answer: 0.25,
    tolerance: 0,
    allowFraction: true,
    allowPercent: true,
  },
  { ...stem, type: "vector", answer: [1, 0.5, -2], tolerance: 1e-6 },
  {
    ...stem,
    type: "multi",
    options: [
      { id: "choice-a", label: "A" },
      { id: "choice-b", label: "B", feedback: "B 与条件冲突" },
      { id: "choice-c", label: "C" },
    ],
    answer: ["choice-a", "choice-c"],
  },
  {
    ...stem,
    type: "single",
    options: [
      { id: "choice-a", label: "A" },
      { id: "choice-b", label: "B" },
    ],
    answer: "choice-b",
  },
  { ...stem, type: "boolean", answer: false },
  { ...stem, type: "open", checkpoints: ["说明至少一个成立条件"] },
  { ...stem, type: "text", answer: ["无解"] },
];

describe("教学引擎内容合同", () => {
  it("验证 82 页、每页的系列例题、可用题目与 KaTeX 表达式", () => {
    const counts = { formulas: 0, cases: 0, questions: 0 };
    function verifyFormula(formula: string, id: string) {
      expect(renderFormula(formula, true), id + ": " + formula).toContain(
        "katex-mathml",
      );
      counts.formulas++;
    }
    function visit(value: unknown, id: string) {
      if (typeof value === "string") {
        for (const segment of value.matchAll(/(?<!\\)\$([^$\r\n]+?)(?<!\\)\$/g))
          verifyFormula(segment[1]!, id);
      } else if (Array.isArray(value)) {
        value.forEach((item) => visit(item, id));
      } else if (value && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) {
          if (
            (key === "latex" || key === "formula") &&
            typeof item === "string"
          )
            verifyFormula(item, id);
          else visit(item, id);
        }
      }
    }
    function countCases(blocks: TeachingBlock[]): number {
      return blocks.reduce(
        (n, block) =>
          n +
          (block.type === "example"
            ? 1
            : "blocks" in block
              ? countCases(block.blocks)
              : 0),
        0,
      );
    }
    expect(Object.keys(upgrades).sort()).toEqual(
      p1Lessons.map((lesson) => lesson.id).sort(),
    );
    for (const legacy of p1Lessons) {
      const lesson = topicLessonSchema.parse(enhanceLesson(legacy.id));
      expect(lesson.questions.length, lesson.id).toBeGreaterThan(0);
      expect(countCases(lesson.blocks), lesson.id).toBeGreaterThan(0);
      counts.cases += countCases(lesson.blocks);
      counts.questions += lesson.questions.length;
      visit(lesson, lesson.id);
      visit(legacyBlocks(legacy), lesson.id);
      visit(legacy.exercises, lesson.id);
    }
    expect(counts.formulas).toBeGreaterThan(300);
    expect(counts.cases).toBeGreaterThan(90);
    expect(counts.questions).toBeGreaterThan(85);
  });
  it("为非法公式提供回退并拦截 URL，支持编程课程需要的专业数学排版", () => {
    expect(renderFormula("}")).toBeNull();
    expect(
      renderFormula(String.raw`\href{javascript:alert(1)}{text}`) ?? "",
    ).not.toContain("href=");
    const examples = [
      String.raw`\prod_{i=1}^{n}x_i`,
      String.raw`T^i_{jk}=\sum_l A^i_l B^l_{jk}`,
      String.raw`\left|\begin{matrix}a&b\\c&d\end{matrix}\right|`,
      String.raw`\left\{\begin{aligned}x+y&=3\\x-y&=1\end{aligned}\right.`,
    ];
    for (const formula of examples)
      expect(renderFormula(formula, true)).toContain("<math");
  });
  it("拦截不可信 URL、错位表格、非法运行时和错误题目引用", () => {
    expect(
      teachingBlock.safeParse({
        type: "image",
        src: "https://example.test/diagram.svg",
        alt: "图",
      }).success,
    ).toBe(false);
    expect(
      teachingBlock.safeParse({
        type: "references",
        items: [{ title: "示例", url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
    expect(
      teachingBlock.safeParse({
        type: "table",
        title: "对照",
        columns: ["左", "右"],
        rows: [["空"]],
      }).success,
    ).toBe(false);
    expect(
      teachingBlock.safeParse({
        type: "code",
        language: "sql",
        runnable: "python",
        title: "演示",
        code: "select 1",
      }).success,
    ).toBe(false);
    expect(
      questionSchema.safeParse({ ...questions[3], answer: "not-present" })
        .success,
    ).toBe(false);
    expect(
      topicLessonSchema.safeParse({
        id: "test-lesson",
        blocks: [{ type: "paragraph", body: "内容" }],
        questions: [questions[0], questions[1]],
      }).success,
    ).toBe(false);
  });
});

describe("题库纯函数与证据边界", () => {
  it("判对分数、全角百分比和向量，拒绝非有限与畸形输入", () => {
    const [decimal, vector] = questions as [Question, Question];
    for (const answer of ["1 / 4", "２５％", ".25", "2.5e-1"])
      expect(evaluate(decimal, answer).status).toBe("correct");
    for (const answer of [
      "2/0",
      "1//4",
      "Infinity",
      "0x10",
      "1e-8000",
      "1/1e999",
    ])
      expect(evaluate(decimal, answer).status).toBe("invalid");
    expect(readNumber("25%")).toBeNull();
    expect(evaluate(vector, "（1，1/2，−2）").status).toBe("correct");
    expect(evaluate(vector, "1,0.5").status).toBe("invalid");
    expect(evaluate(vector, "0.5,1,-2").status).toBe("incorrect");
  });
  it("多选按集合判分，单选有独立反馈，开放题无自动得分", () => {
    expect(evaluate(questions[2]!, ["choice-c", "choice-a"]).status).toBe(
      "correct",
    );
    expect(evaluate(questions[2]!, ["choice-a", "choice-b"]).message).toBe(
      "B 与条件冲突",
    );
    expect(evaluate(questions[2]!, ["choice-a", "choice-a"]).status).toBe(
      "invalid",
    );
    expect(evaluate(questions[3]!, "choice-b").status).toBe("correct");
    expect(evaluate(questions[4]!, false).status).toBe("correct");
    expect(evaluate(questions[5]!, "论证").status).toBe("review");
    expect(evaluate(questions[6]!, " 无解 ").status).toBe("correct");
    expect(recordAnswer({}, questions[5]!, "论证", 10)).toEqual({});
  });
  it("旧版知识点记录逐字段保留，强化题不修改掌握状态", () => {
    const legacy = emptyKnowledge();
    const before = knowledgeProgressSchema.parse(legacy);
    expect(before).toEqual(legacy);
    const question = questions[0]!;
    const correct = recordAnswer({}, question, "1/4", 1);
    const retry = recordAnswer(correct, question, "1/3", 2);
    const next = { ...legacy, questionBank: { "fs-correlation": retry } };
    expect(knowledgeProgressSchema.parse(next)).toEqual(next);
    expect(summarizeBank([question], retry)).toEqual({
      scored: 1,
      passed: 0,
      needsReview: 1,
      open: 0,
    });
    expect(retry[question.id]).toEqual({
      count: 2,
      lastCorrect: false,
      passed: true,
      at: 2,
    });
    expect(knowledgeStatus(next.records["fs-correlation"], 2)).toBe("new");
  });
  it("概率树的零概率边界与贝叶斯路径", () => {
    expect(treeProbabilities(0.02, 0.9, 0.1)).toMatchObject({
      posterior: expect.closeTo(18 / 116, 10),
    });
    expect(treeProbabilities(0.02, 0.9, 0).posterior).toBe(1);
    expect(treeProbabilities(0.02, 0, 0).posterior).toBeNull();
    expect(() => treeProbabilities(-0.01, 0.9, 0.1)).toThrow(RangeError);
  });
});
