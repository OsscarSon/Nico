import { writeFileSync } from "node:fs";
import { academyCourses } from "../src/content/academy2/model";
import { knowledgeRegistry } from "../src/content/academy2/knowledgeRegistry";
import { findP1Lesson } from "../src/content/academy2/p1";
import { enhanceLesson } from "../src/content/academy2/teaching/p1";
import { extendedQuestions } from "../src/content/academy2/teaching/p1/variants";
import { mathBenches } from "../src/content/academy2/p1/mathBenches";
import { statBenches } from "../src/content/academy2/p1/statBenches";
import { findAlgorithmLesson } from "../src/content/academy2/algorithms";
import { algorithmCode } from "../src/content/academy2/algorithms/python";
import { findDataLesson } from "../src/content/academy2/data";
import { findP4Lesson } from "../src/content/academy2/advanced";
import { p4LegacyLesson } from "../src/content/academy2/advanced/legacy";
import {
  qaFixedQuestions,
  qaVariants,
} from "../src/content/academy2/advanced/qaQuestions";
import {
  qaEnrichment,
  qaSources,
} from "../src/content/academy2/advanced/qaEnrichment";
import { qaPrograms } from "../src/content/academy2/advanced/qaPrograms";
import { getLesson } from "../src/content";
import { lessonSchema } from "../src/content/schema";
import {
  topicLessonSchema,
  type TeachingBlock,
} from "../src/content/academy2/teaching/schema";
import { renderFormula } from "../src/features/academy2/teaching/renderFormula";

const measured: Record<string, string> = {
  "k-c47d7505d81e": "二项尾部按整数枚举与 SciPy 对照，含 n=1999 和 p=.99。",
  "k-4b2ec24bd26e": "用倒数精度与连续观测核对后验方差，含 10²⁰ 与 10³⁰⁸。",
  "k-261db48f1b21": "解析定点与两步周期反例。",
  "k-373f23ff9e76": "近重根与三种输入尺度对照解析协方差谱、NumPy 特征分解。",
  "k-63b3f19df567": "解析协方差谱、NumPy 特征分解与正交性。",
  "k-f78393575f88": "按正负样本对核 AUC 平局，单类和恒定 R² 核对。",
  "k-cd535a64202f": "编译与解释独立核对溢出前错误顺序。",
  "k-78e350cdc83e": "两种执行器核验乘法优先与减法左结合。",
  "k-4b6444ddfd1d": "未绑定和安全整数测试验证部分语义，不覆盖一般语言。",
  "k-46fe981be8f5": "独立核验交集面积、贴边、完全分离及项目门槛。",
  "k-5fc0beb038e9": "独立核验一致/不一致观测及项目门槛。",
  "k-74f74b2295b6": "相位干涉已核对模平方、H 门、基测量。",
  "k-bc8297361aff": "非对称核与互相关顺序，卷积训练有限差分。",
  "k-bd83fe10c488": "改变后续向量，验证早期位置保持输出。",
  "k-007fd0b037de": "训练冻结底座并核对秩一行列式。",
  "k-0866c19cfef3": "GLSL ES 3.00 实际编译、运行与像素校验。",
  "k-73ad252fb2c7": "C# 时间推进内核实跑，Unity 场景未核验。",
  "k-973542117170": "C# 编译和运行基础示例；Unity 绑定未核验。",
  "k-8671fc7fd000": "Uno AVR 编译通过；实物 ADC 未核验。",
  "k-07387eec8e2c": "重新运行八位无符号编码、边界与合法输入测试；补课程引用。",
  "k-1f3336d21ec6": "独立核对 0x2F=47、0x80=128，按 CSS Color 4 区分 sRGB 编码与亮度。",
  "k-8fb0277cef3f": "对照 RFC 20 与独立运行时检查 ASCII A/a 的十进制和十六进制值。",
  "k-ed782d0c4990": "按 Unicode 标准复核码位与用户感知字符区别，独立检查 U+4F60。",
  "k-c1efaf083d26": "独立重算全部输入组合的布尔函数值：加法模二、乘积、最大值和取反。",
  "k-31012821f86c": "重新穷举 AND、OR、XOR 与 NOT 的输入、输出与诊断。",
  "k-f2051e941b56": "重新穷举四组输入与九种门组合，核对进位、结果和九位迁移答案。",
  "k-4314b0affdf8": "复跑 IPv4 掩码算例并对照 RFC 3021 核对 /31 例外。实验仍只允许 /8–/30。",
  "k-b2d166f7263c": "对照 RFC 1034 与 RFC 2308，核对无缓存路径、别名与否定结果缓存的适用边界。",
  "k-353ad87ed5a1": "复跑固定入栈、出栈序列，末尾读数按后进先出核对。",
  "k-712306d0d959": "复跑指定下标插删，独立检查剩余表头和反转顺序。",
  "k-51f26af537a1": "复跑 LR 与 RR 旋转算例，核对旋转后中间键处于根。",
  "k-07f40cb22cea": "复跑有重复数和负数的最小堆提取顺序。",
  "k-93d860c2f0b2": "复跑限定前缀 te 的筛选，预期只返回 tea 与 ten。",
  "k-46aa2ef31b1f": "独立比较两条路径的边数并复跑无向反向搜索。",
  "k-58cba2ff9cb8": "复跑 40 个非负图与距离闭包对照，并核对负边拒绝。",
  "k-d6de0d96fe9c": "复跑 80 个有向图与距离闭包对照，并核对影响或不影响目的点的负环。",
  "k-1033fdacd4cc": "复跑含负权的小图，按所需三条边核对总权重 −2。",
  "k-984b15fbdf16": "复跑 12 个容量，与枚举 16 个物品子集的独立最优值对照。",
  "k-11496b028938": "复跑更新与区间和，直接切片求和独立验值。",
  "k-f719d4373c12": "复跑更新与区间和，直接切片求和独立验值。",
  "k-a90d4d853482": "复跑 banana 的六个后缀，核对手工字典序。",
  "k-fbe92b8acc17": "复跑 25 对文本和图样，用逐位置扫描核对，包含 Unicode 和重叠匹配。",
  "k-41bc6d738bbe": "复跑 50 张图及割枚举，另外检查平行弧与残量回退。",
  "k-ccace5f80830": "复跑需改配的小图，核对存在大小 3 的匹配且左侧仅 3 点。",
  "k-aa1d8f08a6ec": "复跑 31 个子图的覆盖比，与所有顶点子集最优对照。",
  "k-bfa7cb28f42b": "复跑 31 个子图最优参数及少一的边界，与穷举对照。",
  "k-713d4f2ab857": "复跑 100 个二进制串，用后缀判断独立核对是否接受。",
  "k-06e5ea0dfc81": "复跑三个小实例的归约，用八种真值赋值独立核对团存在性，通用证明仍需核对。",
  "k-8e3c17ec3572": "复跑 y=2x+1 的真实训练，留出 R² 接近 1，x=8 时预测约 17。",
  "k-15b0d9a0d324": "复跑两组人工分离的一维点，按几何核分组及每步损失非增。",
  "k-26792901cd39": "复跑 PLU 重构、奇异矩阵拒绝、QᵀQ 和 QR 重构。",
  "k-ec0de2c9e5b0": "用解析原函数核对 Simpson 正向、反向及非法区间数。",
  "k-597e14981a0f": "以解析二次多项式核对插值点及新题系数。",
  "k-946bcb1832cc": "对照指数解析解复跑 RK4，Euler 两步和时刻精确值分别验证。",
  "k-6428532dca21": "周期网格手算、稳定区间拒绝及能量总量与局部非负的条件对照。",
  "k-546ec0001b2b": "32 组频谱与 NumPy FFT 对照，另核对四点复数算例的符号。",
  "k-8188da31f891": "用手算核对有限 KL 值及有支持缺失时的无穷。",
  "k-f9cc7290740d": "复跑三条观测的 Kaplan–Meier 乘积，交叉检查删失不立即改变生存率。",
};
const safe = (value: string) =>
  value.replaceAll("|", "\\|").replaceAll("\n", " ");
function leaves(blocks: TeachingBlock[]): TeachingBlock[] {
  return blocks.flatMap((item) =>
    "blocks" in item ? [item, ...leaves(item.blocks)] : [item],
  );
}
const all = knowledgeRegistry.map((topic) => {
  const algorithm = findAlgorithmLesson(topic.id),
    data = findDataLesson(topic.id),
    advanced = findP4Lesson(topic.id),
    p1 = findP1Lesson(topic.id);
  const modern =
    algorithm?.lesson ??
    data?.lesson ??
    advanced?.lesson ??
    (p1 ? enhanceLesson(topic.id) : undefined);
  const legacyId = p4LegacyLesson(topic.id);
  const legacy = !modern && legacyId ? getLesson(legacyId) : undefined;
  if (!modern && !legacy) throw Error("无法定位课时 " + topic.id);
  const allBlocks = leaves(modern?.blocks ?? []);
  const formulas = allBlocks.flatMap((block) =>
    block.type === "math"
      ? [block.latex]
      : block.type === "sequence" || block.type === "example"
        ? block.steps.flatMap((step) => (step.formula ? [step.formula] : []))
        : [],
  );
  const benchKey = topic.course + "/" + topic.module;
  const benchReferences =
    (mathBenches[benchKey] ?? statBenches[benchKey])?.sources ?? [];
  const official = modern
    ? [
        ...allBlocks
          .filter((block) => block.type === "references")
          .flatMap((block) => block.items),
        ...(p1 ? benchReferences.map(([title, url]) => ({ title, url })) : []),
      ]
    : (legacy?.sources ?? []);
  const structural = modern
    ? topicLessonSchema.safeParse(modern).success
    : lessonSchema.safeParse(legacy).success;
  if (!structural) throw Error("Schema 校验失败 " + topic.id);
  const current = [
    ...(modern?.questions ?? []),
    ...(p1 ? (extendedQuestions[topic.id] ?? []) : []),
  ];
  const base =
    (p1 ?? algorithm?.base ?? data?.base ?? advanced?.base)?.exercises.length ??
    legacy!.blocks.reduce(
      (sum, block) =>
        sum +
        (block.type === "quiz"
          ? block.items.length
          : block.type === "transfer"
            ? 1
            : 0),
      0,
    );
  const programming =
    current.filter((question) => question.type === "program").length +
    Number(Boolean(algorithm && algorithmCode(algorithm.material.model))) +
    (legacy?.blocks.filter(
      (block) =>
        block.type === "sim" && block.mode === "challenge" && block.code,
    ).length ?? 0);
  const typed = current.filter((q) =>
    ["matrix", "vector", "fields", "steps", "order", "match", "multi"].includes(
      q.type,
    ),
  ).length;
  const hasNewCode = Boolean(
    advanced && Object.hasOwn(qaPrograms, advanced.spec.lab),
  );
  const notes = [
    measured[topic.id],
    p1 ? "P1 独立答案夹具覆盖主练习和闭合补充题，理论与例题仍需逐条核对。" : "",
    qaEnrichment[topic.id] ? "新增推导并核对前提。" : "",
    qaSources[topic.id] ? "补专项参考。" : "",
    qaFixedQuestions[topic.id] || qaVariants[topic.id]
      ? "新增专属结构化题。"
      : "",
    hasNewCode ? "新增代码双实现和固定/种子用例。" : "",
  ].filter(Boolean);
  return {
    ...topic,
    legacyId: legacy?.id,
    stage: advanced
      ? topic.course.endsWith("-applied")
        ? "P5"
        : "P4"
      : undefined,
    formulas: formulas.length,
    malformed: formulas.filter((latex) => !renderFormula(latex, true)).length,
    examples: allBlocks.filter((block) => block.type === "example").length,
    proofs: allBlocks.filter((block) => block.type === "sequence").length,
    sources: new Set(official.map((reference) => reference.url)).size,
    base,
    typed,
    programming,
    checked: Boolean(measured[topic.id]),
    work: notes.join(" ") || "本轮仅核结构与材料索引，学术结论待逐条。",
  };
});
if (all.length !== 604 || academyCourses.length !== 30)
  throw Error("新目录大小异常");
const pages = [
  "# 604 个知识点逐项台账",
  "",
  "目录以 Word 蓝图对应的稳定 ID 为索引。结构检查包含内容绑定和 Schema，公式列只登记数目与解析结果。个别知识点可引用旧互动课。每行最后一栏列具体证据；如只列出新增材料或结构统计，学术正确性仍待核对。",
  "",
  "列内斜线依次表示独立项目数。练习列为旧检查/结构化/编程，三列不含开放题及其他题型。旧课例题和证明散在旧教学块中，本表不将其自动计为现代结构块。",
  "",
];
for (const course of academyCourses) {
  const rows = all.filter((row) => row.course === course.id);
  pages.push(
    "## " + course.title + " · " + course.id,
    "",
    "| ID / 原课 | 知识点 | 公式 / 例题 / 推导 | 参考 | 练习 | 本轮证据与仍待查项 |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  );
  for (const row of rows)
    pages.push(
      "| `" +
        row.id +
        "`" +
        (row.legacyId ? " → `" + row.legacyId + "`" : "") +
        " | " +
        safe(row.title) +
        " | " +
        [row.formulas, row.examples, row.proofs].join(" / ") +
        " | " +
        row.sources +
        " | " +
        [row.base, row.typed, row.programming].join(" / ") +
        " | " +
        safe(
          row.work +
            (row.malformed
              ? " 公式解析失败 " + String(row.malformed) + " 项。"
              : ""),
        ) +
        " |",
    );
  pages.push("");
}
const summary = (rows: typeof all) => ({
  nodes: rows.length,
  counterexamples: rows.filter((row) => row.checked).length,
  typed: rows.filter((row) => row.typed > 0).length,
  programming: rows.filter((row) => row.programming > 0).length,
  structuredQuestions: rows.reduce((sum, row) => sum + row.typed, 0),
  formulaBlocks: rows.reduce((sum, row) => sum + row.formulas, 0),
  parseFailures: rows.reduce((sum, row) => sum + row.malformed, 0),
  zeroSource: rows.filter((row) => row.sources === 0).length,
});
const counts = {
  all: summary(all),
  p4: summary(all.filter((row) => row.stage === "P4")),
  p5: summary(all.filter((row) => row.stage === "P5")),
  legacy: summary(all.filter((row) => row.legacyId)),
};
writeFileSync(
  new URL("../docs/academy-2-final-qa/LEDGER.md", import.meta.url),
  pages.join("\n"),
);
console.log(JSON.stringify(counts, null, 2));
