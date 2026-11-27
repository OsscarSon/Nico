import { z } from "zod";

const text = z.string().trim().min(1);
const nonempty = z.array(text).min(1);
export const stableId = z.string().regex(/^[a-z][a-z0-9-]{1,89}$/);
const source = z.object({ title: text, url: z.url({ protocol: /^https?$/ }) });
const step = z.object({ title: text, body: text, formula: text.optional() });
const seconds = z.object({ title: text, body: text });
const asset = text.regex(
  /^art\/[\w-]+(?:\/[\w-]+)*\.(?:png|avif|jpe?g|webp|svg)$/i,
);

const leaf = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), body: text }),
  z.object({
    type: z.literal("math"),
    latex: text.max(3500),
    caption: text.optional(),
  }),
  z.object({
    type: z.literal("note"),
    tone: z.enum([
      "definition",
      "theorem",
      "warning",
      "mistake",
      "term",
      "application",
    ]),
    ...seconds.shape,
  }),
  z.object({
    type: z.literal("sequence"),
    kind: z.enum(["derivation", "proof"]),
    title: text,
    strategy: text,
    steps: z.array(step).min(2),
    check: text.optional(),
  }),
  z.object({
    type: z.literal("example"),
    kind: z.enum(["math", "statistics"]),
    level: z.enum([
      "basic",
      "standard",
      "variant",
      "application",
      "challenge",
      "correction",
    ]),
    title: text,
    given: text,
    goal: text,
    method: text,
    assumptions: text.optional(),
    steps: z.array(step).min(1),
    answer: text,
    check: text,
    reveal: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("table"),
    title: text,
    columns: nonempty,
    rows: z.array(nonempty).min(1),
  }),
  z.object({
    type: z.literal("image"),
    src: asset,
    alt: text,
    caption: text.optional(),
  }),
  z.object({ type: z.literal("interactive"), id: stableId, title: text }),
  z.object({
    type: z.literal("code"),
    language: z.enum(["python", "sql", "cpp", "javascript", "text"]),
    title: text,
    code: text,
    expected: text.optional(),
    runnable: z.literal("python").optional(),
  }),
  z.object({ type: z.literal("markdown"), body: text }),
  z.object({
    type: z.literal("links"),
    title: text,
    topics: z.array(z.object({ id: stableId, title: text })).min(1),
  }),
  z.object({ type: z.literal("summary"), points: nonempty }),
  z.object({ type: z.literal("references"), items: z.array(source).min(1) }),
]);
type Leaf = z.infer<typeof leaf>;
export type TeachingBlock =
  | Leaf
  | { type: "section" | "disclosure"; title: string; blocks: TeachingBlock[] };
export const teachingBlock: z.ZodType<TeachingBlock> = z
  .lazy(() =>
    z.union([
      leaf,
      z.object({
        type: z.enum(["section", "disclosure"]),
        title: text,
        blocks: z.array(teachingBlock).min(1),
      }),
    ]),
  )
  .superRefine((block, context) => {
    if (
      block.type === "table" &&
      block.rows.some((row) => row.length !== block.columns.length)
    ) {
      context.addIssue({ code: "custom", message: "表格每行必须与标题列对应" });
    }
    if (
      block.type === "example" &&
      block.kind === "statistics" &&
      !block.assumptions
    ) {
      context.addIssue({ code: "custom", message: "统计例题必须列出模型假设" });
    }
    if (
      block.type === "code" &&
      block.runnable &&
      block.language !== block.runnable
    ) {
      context.addIssue({
        code: "custom",
        message: "代码语言与可用运行时不匹配",
      });
    }
  });

export const levels = [
  "concept",
  "calculation",
  "application",
  "analysis",
  "transfer",
] as const;
const q = {
  id: stableId,
  level: z.enum(levels),
  prompt: text,
  explanation: text,
  hint: text,
};
const option = z.object({
  id: stableId,
  label: text,
  feedback: text.optional(),
});
const choices = z.array(option).min(2);
const tolerance = z.number().finite().nonnegative();
export const questionSchema = z
  .discriminatedUnion("type", [
    z.object({
      ...q,
      type: z.literal("single"),
      options: choices,
      answer: stableId,
    }),
    z.object({
      ...q,
      type: z.literal("multi"),
      options: choices,
      answer: z.array(stableId).min(1),
    }),
    z.object({ ...q, type: z.literal("boolean"), answer: z.boolean() }),
    z.object({
      ...q,
      type: z.literal("number"),
      answer: z.number().finite(),
      tolerance,
      allowFraction: z.boolean().optional(),
      allowPercent: z.boolean().optional(),
    }),
    z.object({
      ...q,
      type: z.literal("vector"),
      answer: z.array(z.number().finite()).min(2).max(16),
      tolerance,
    }),
    z.object({...q, type:z.literal("matrix"), answer:z.array(z.array(z.number().finite()).min(1).max(8)).min(1).max(8), tolerance}),
    z.object({...q, type:z.literal("order"), options:choices, answer:z.array(stableId).min(2)}),
    z.object({...q, type:z.literal("match"), options:choices, rows:z.array(z.object({label:text,answer:stableId})).min(2).max(12)}),
    z.object({...q, type:z.literal("fields"), fields:z.array(z.object({label:text, answer:z.number().finite(), tolerance, hint:text})).min(2).max(12)}),
    z.object({...q, type:z.literal("steps"), fields:z.array(z.object({label:text, answer:z.number().finite(), tolerance, hint:text})).min(2).max(12)}),
    z.object({...q, type:z.literal("program"), starter:text, functionName:text.regex(/^[a-z][a-z0-9_]*$/),
      cases:z.array(z.object({args:z.array(z.array(z.number().finite()).max(100)).max(3),expected:z.number().finite()})).min(2).max(12),tolerance}),
    z.object({ ...q, type: z.literal("text"), answer: nonempty }),
    z.object({ ...q, type: z.literal("open"), checkpoints: nonempty }),
  ])
  .superRefine((question, context) => {
    if(question.type==="matrix"&&question.answer.some(row=>row.length!==question.answer[0]!.length))
      context.addIssue({code:"custom",message:"矩阵各行须等宽"});
    if (question.type !== "single" && question.type !== "multi" && question.type!=="order"&&question.type!=="match") return;
    const ids = new Set(question.options.map((item) => item.id));
    const expected =
      question.type === "single" ? [question.answer] : question.type==="match"?question.rows.map(row=>row.answer):question.answer;
    if (
      ids.size !== question.options.length ||
      (question.type!=="match"&&new Set(expected).size !== expected.length) ||
      (question.type==="order"&&expected.length!==ids.size) ||
      expected.some((id) => !ids.has(id))
    ) {
      context.addIssue({
        code: "custom",
        message: "选项和答案必须引用有效且唯一的 ID",
      });
    }
  });
export type Question = z.infer<typeof questionSchema>;
export const topicLessonSchema = z
  .object({
    id: stableId,
    blocks: z.array(teachingBlock).min(1),
    questions: z.array(questionSchema),
  })
  .superRefine((lesson, context) => {
    if (
      new Set(lesson.questions.map((question) => question.id)).size !==
      lesson.questions.length
    ) {
      context.addIssue({ code: "custom", message: "课内题目 ID 必须唯一" });
    }
  });
export type TopicLesson = z.infer<typeof topicLessonSchema>;
