import { z } from "zod";
import { ELEMENT_IDS } from "../ai/elements";

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

/** 路线 B：代码互动的配置。python 用 checks 判分，web 用 webChecks 判分。判分逻辑见 src/grading/code.ts、web.ts */
export const codeCheckSchema = z.object({
  label: z.string().min(1),
  stdin: z.string().optional(),
  harness: z.string().optional(),
  expect: z.string(),
  hint: z.string().optional(),
});
export const webCheckSchema = z.object({
  label: z.string().min(1),
  selector: z.string().min(1),
  min: z.number().int().positive().optional(),
  text: z.string().optional(),
  /** 匹配到的每个元素，其「计算后样式」的 prop 必须等于 value（颜色名、#16进制都行，会先由浏览器统一成同一种写法） */
  style: z.object({ prop: z.string().min(1), value: z.string().min(1) }).optional(),
  hint: z.string().optional(),
});
export const codeSpecSchema = z.object({
  /** 编辑器里一开始的代码 */
  starter: z.string(),
  /** 参考答案：单元测试用它证明挑战可解；学习者答错后可以查看 */
  solution: z.string().optional(),
  checks: z.array(codeCheckSchema).optional(),
  webChecks: z.array(webCheckSchema).optional(),
  /** 源码必须满足的写法（正则），例如必须用 for */
  requires: z.array(z.object({ pattern: z.string().min(1), message: z.string().min(1) })).optional(),
  /** js 互动：脚本运行之前就在页面里的 HTML（可以没有，只用 console.log 输出） */
  page: z.string().optional(),
  /** 自由练习时是否显示"程序输入"框（给 input() 用） */
  allowInput: z.boolean().optional(),
});

/** 路线 B：Git 模拟器的配置。判分逻辑见 src/grading/git.ts */
export const gitGoalSchema = z.object({
  kind: z.enum(["initialized", "clean", "onBranch", "branchExists", "commitCount", "fileOnBranch", "merged"]),
  label: z.string().min(1),
  branch: z.string().optional(),
  file: z.string().optional(),
  into: z.string().optional(),
  min: z.number().int().positive().optional(),
});
export const gitSpecSchema = z.object({
  /** 一开始工作区里的文件（内容是一小段文字） */
  files: z.record(z.string(), z.string()),
  /** true：一开始已经有一次提交（Initial commit）；false：还没 git init */
  committed: z.boolean(),
  /** 命令提示：点一下就填进输入框 */
  chips: z.array(z.string()).optional(),
  goals: z.array(gitGoalSchema).optional(),
  /** 参考答案：一行一条命令。测试用它证明挑战可解 */
  solution: z.array(z.string()).optional(),
});

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
    sim: z.enum(["bit-switches", "logic-gate", "half-adder", "mini-cpu", "layers", "subnet", "dns", "python", "web", "js", "git", "prompt-check", "memory", "os", "terminal", "forwarding", "reassembly", "tcp"]),
    mode: z.enum(["free", "challenge"]),
    title: z.string().min(1),
    intro: z.string().min(1),
    /** bit-switches 挑战：依次要拨出的数 */
    targets: z.array(z.number().int().nonnegative()).optional(),
    /** logic-gate 挑战：依次出现的神秘门 */
    gates: z.array(z.enum(["and", "or", "not", "xor"])).optional(),
    /** python / web 互动的配置（路线 B） */
    code: codeSpecSchema.optional(),
    /** git 互动的配置（路线 B，模拟） */
    git: gitSpecSchema.optional(),
    /** prompt-check 互动（路线 C）：场景、必须写到的要素、参考写法 */
    scenario: z.string().min(1).optional(),
    required: z.array(z.enum(ELEMENT_IDS)).optional(),
    sample: z.string().min(1).optional(),
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
    /** 正式插画未提供时保留课头占位，不生成替代图。 */
    artPending: z.boolean().optional(),
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
              : b.sim === "python"
                ? (b.code?.checks?.length ?? 0) > 0 && Boolean(b.code?.solution)
                : b.sim === "git"
                  ? (b.git?.goals?.length ?? 0) > 0 && (b.git?.solution?.length ?? 0) > 0
                  : b.sim === "js"
                  ? (b.code?.checks?.length ?? 0) > 0 && Boolean(b.code?.solution)
                  : b.sim === "web"
                    ? (b.code?.webChecks?.length ?? 0) > 0 && Boolean(b.code?.solution)
                    : b.sim === "prompt-check"
                      ? Boolean(b.scenario) && (b.required?.length ?? 0) > 0 && Boolean(b.sample)
                      : true), // forwarding、reassembly、tcp、memory、os、terminal、half-adder、mini-cpu、layers、subnet、dns 的挑战内容写在各自的模型里，不需要额外配置
      ),
    "互动挑战必须提供目标（targets、gates，代码挑战的 checks / webChecks 与参考答案，或指令挑战的 scenario / required / sample）",
  )
  .refine(
    (l) =>
      l.blocks.every(
        (b) => b.type !== "sim" || (b.sim !== "python" && b.sim !== "web" && b.sim !== "js") || b.code !== undefined,
      ),
    "python / web 互动必须提供 code 配置",
  )
  .refine(
    (l) => l.blocks.every((b) => b.type !== "sim" || b.sim !== "git" || b.git !== undefined),
    "git 互动必须提供 git 配置",
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
export type CodeSpec = z.infer<typeof codeSpecSchema>;
export type QualityState = Lesson["quality"]["state"];
