import { z } from "zod";

/** 选择题：每个错误选项都必须有"诊断提示"，说明它对应的常见误解。 */
export const quizItemSchema = z
  .object({
    q: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(5),
    answer: z.number().int().nonnegative(),
    why: z.string().min(1),
    wrongHints: z.record(z.string(), z.string().min(1)),
  })
  .refine((i) => i.answer < i.options.length, "answer 超出选项范围")
  .refine(
    (i) =>
      i.options.every(
        (_, idx) => idx === i.answer || Boolean(i.wrongHints[String(idx)]),
      ),
    "每个错误选项都需要 wrongHints 诊断提示",
  );

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hook"), text: z.string().min(1) }),
  z.object({
    type: z.literal("explain"),
    title: z.string().min(1),
    body: z.array(z.string().min(1)).min(1),
    callout: z.string().optional(),
  }),
  z.object({
    type: z.literal("sim"),
    sim: z.enum(["bit-switches", "logic-gate", "half-adder"]),
    mode: z.enum(["free", "challenge"]),
    title: z.string().min(1),
    intro: z.string().min(1),
    /** bit-switches 挑战：依次要拨出的数 */
    targets: z.array(z.number().int().nonnegative()).optional(),
    /** logic-gate 挑战：依次出现的神秘门 */
    gates: z.array(z.enum(["and", "or", "not", "xor"])).optional(),
  }),
  z.object({ type: z.literal("quiz"), items: z.array(quizItemSchema).min(1) }),
  z.object({
    type: z.literal("transfer"),
    prompt: z.string().min(1),
    answer: z.number(),
    why: z.string().min(1),
    hint: z.string().optional(),
  }),
  z.object({
    type: z.literal("summary"),
    points: z.array(z.string().min(1)).length(3),
    next: z.string().optional(),
  }),
]);

export const lessonSchema = z
  .object({
    id: z.string().regex(/^[a-e]\d{2}-[a-z0-9-]+$/),
    track: z.enum(["a", "b", "c", "d", "e"]),
    unit: z.string().min(1),
    title: z.string().min(1),
    /** public/art/ 下的课头插图文件名（可选，纯装饰） */
    art: z.string().regex(/^[a-z0-9-]+\.png$/).optional(),
    objectives: z.array(z.string().min(1)).min(1),
    prerequisites: z.array(z.string()),
    estimatedMinutes: z.number().int().min(3).max(15),
    blocks: z.array(blockSchema).min(1),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })),
    quality: z.object({
      state: z.enum(["draft", "pilot", "published"]),
      evidenceRef: z.string().optional(),
    }),
  })
  .refine((l) => l.blocks[0]?.type === "hook", "第一个块必须是 hook")
  .refine((l) => l.blocks.at(-1)?.type === "summary", "最后一个块必须是 summary")
  .refine(
    (l) =>
      ["sim", "quiz", "transfer"].every((t) =>
        l.blocks.some((b) => b.type === t),
      ),
    "课时模板要求：至少一个互动、一组检查题、一道迁移题",
  )
  .refine(
    (l) =>
      l.blocks.every(
        (b) =>
          b.type !== "sim" ||
          b.mode !== "challenge" ||
          (b.sim === "bit-switches"
            ? (b.targets?.length ?? 0) > 0
            : b.sim === "logic-gate"
              ? (b.gates?.length ?? 0) > 0
              : true),
      ),
    "互动挑战必须提供目标（targets 或 gates）",
  )
  .refine(
    (l) =>
      l.quality.state === "draft" ||
      (l.sources.length > 0 && Boolean(l.quality.evidenceRef)),
    "非草稿课时必须有来源和试学证据引用",
  );

export type Lesson = z.infer<typeof lessonSchema>;
export type Block = z.infer<typeof blockSchema>;
export type QuizItem = z.infer<typeof quizItemSchema>;
export type QualityState = Lesson["quality"]["state"];
