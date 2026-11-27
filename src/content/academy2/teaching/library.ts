import { academyCourses, courseLink } from "../model";
import { knowledgeRegistry } from "../knowledgeRegistry";
import { dataLessons,findDataLesson } from "../data";
import { findP4Lesson,p4Glossary } from "../advanced";
import { p4LegacyLesson } from "../advanced/legacy";
import { algorithmLessons,findAlgorithmLesson } from "../algorithms";
import { p1Lessons } from "../p1";
import { allCatalogLessons, getLesson } from "../../index";
import { enhanceLesson } from "./p1";
import type { TeachingBlock } from "./schema";

const p1Terminology = [
  ["集合", "Set", "由元素决定的对象。重复和顺序不影响成员资格。", "fm-sets"],
  ["定义域", "Domain", "函数允许的输入集合。复合需要兼顾内外两层。", "fm-inverse"],
  ["单位圆", "Unit circle", "半径为一的圆，坐标与正弦、余弦有关。", "fm-trig"],
  ["点积", "Dot product", "两个向量的乘积和，结果是标量。", "fm-dot"],
  ["逆否", "Contrapositive", "交换蕴含前后件并各自否定，与原命题等价。", "fm-proof"],
  ["标准差", "Standard deviation", "方差的平方根，以原始单位度量离散程度。", "fs-sd"],
  ["四分位距", "Interquartile range · IQR", "第三与第一四分位之差。", "fs-quartiles"],
  ["贝叶斯更新", "Bayesian update", "把先验与条件似然结合得到后验。", "fs-bayes"],
  ["秩相关", "Spearman rank correlation", "对两个变量的秩求 Pearson 相关。", "fs-correlation"],
  ["行最简形", "Reduced row echelon form · RREF", "主元为 1，且每个主元列其余位置为零。", "im-rank"],
  ["正交投影", "Orthogonal projection", "使误差与目标子空间正交的最近点。", "im-projection"],
  ["奇异值分解", "Singular value decomposition · SVD", "用两个正交基及非负奇异值分解矩阵。", "im-svd"],
  ["梯度", "Gradient", "各输入方向偏导数组成的向量，给出局部最陡上升方向。", "im-gradient"],
  ["雅可比矩阵", "Jacobian", "向量值函数的一阶偏导矩阵。", "im-jacobian"],
  ["海森矩阵", "Hessian", "标量函数的二阶偏导矩阵。", "im-hessian"],
  ["概率质量函数", "Probability mass function · PMF", "给离散变量的点概率。", "is-variable"],
  [
    "概率密度函数",
    "Probability density function · PDF",
    "在区间积分得到连续变量的概率。",
    "is-variable",
  ],
  [
    "累积分布函数",
    "Cumulative distribution function · CDF",
    "给随机变量不大于某阈值的概率。",
    "is-variable",
  ],
  [
    "最大似然",
    "Maximum likelihood estimation · MLE",
    "选择使观察数据的似然最大的参数。",
    "is-expectation",
  ],
  [
    "中心极限定理",
    "Central limit theorem · CLT",
    "在相应条件下标准化的和或均值趋近正态分布。",
    "is-clt",
  ],
  ["置信区间", "Confidence interval", "按重复抽样覆盖率定义的区间程序。", "is-ci"],
  ["检验力", "Statistical power", "在所指定备择成立时拒绝零假设的概率。", "is-testing"],
  ["残差", "Residual", "实际观察值减去模型拟合值。", "is-regression"],
  ["方差分析", "Analysis of variance · ANOVA", "以组间与组内变异比较组均值。", "is-anova"],
] as const;
export const terminology = [
  ...p4Glossary,
  ...p1Terminology,
  ...dataLessons.map(lesson=>[lesson.title,lesson.material.english,lesson.material.concept,lesson.id] as const),
  ...algorithmLessons.map(lesson => [lesson.title, lesson.material.term, lesson.material.definition, lesson.id] as const),
];

type Entry = { id: string; title: string; body: string; kind: string; path: string };
type Formula = { title: string; topic: string; anchor: string; latex: string; caption?: string };
const lessonTitle = new Map(knowledgeRegistry.map((item) => [item.id, item.title]));
const pathFor = (id: string, anchor?: string) => "/topics/" + id + (anchor ? "?at=" + anchor : "");
export function collectBlocks(
  blocks: TeachingBlock[],
  visit: (block: TeachingBlock, anchor: string) => void,
  prefix = "advanced",
) {
  blocks.forEach((block, index) => {
    const anchor = prefix + "-" + (index + 1);
    visit(block, anchor);
    if ("blocks" in block) collectBlocks(block.blocks, visit, anchor);
  });
}
const readBlock = (block: TeachingBlock): string => {
  switch (block.type) {
    case "paragraph":
    case "markdown":
      return block.body;
    case "math":
      return [block.latex, block.caption].join(" ");
    case "section":
    case "disclosure":
    case "interactive":
      return block.title;
    case "note":
      return block.title + " " + block.body;
    case "image":
      return block.alt + " " + (block.caption ?? "");
    case "example":
      return [
        block.title,
        block.given,
        block.goal,
        block.method,
        block.assumptions,
        ...block.steps.map((step) => step.title + " " + step.body),
        block.check,
      ].join(" ");
    case "sequence":
      return [
        block.title,
        block.strategy,
        ...block.steps.map((step) => step.title + " " + step.body),
        block.check,
      ].join(" ");
    case "code":
      return block.title + " " + block.language + " " + block.code;
    case "table":
      return [block.title, ...block.columns, ...block.rows.flat()].join(" ");
    case "summary":
      return block.points.join(" ");
    case "references":
      return block.items.map((source) => source.title).join(" ");
    case "links":
      return block.title + " " + block.topics.map((topic) => topic.title).join(" ");
  }
};

function valuesOfText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(valuesOfText);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    /^(answer|correct|expected|solution)/i.test(key) ? [] : valuesOfText(item),
  );
}
let cached: { search: Entry[]; formula: Formula[] } | undefined;
export function studyCatalogue() {
  if (cached) return cached;
  const search: Entry[] = academyCourses.map((course) => ({
    id: course.id,
    title: course.title,
    body: [course.english, course.project, ...course.modules.map((module) => module.title)].join(" "),
    kind: "课程",
    path: courseLink(course.id),
  }));
  const formula: Formula[] = [];
  for (const topic of knowledgeRegistry) {
    const algorithm=findAlgorithmLesson(topic.id)??findDataLesson(topic.id)??findP4Lesson(topic.id);
    const taught = algorithm?.base ?? p1Lessons.find((lesson) => lesson.id === topic.id);
    if (!taught)
      search.push({
        id: topic.id,
        title: topic.title,
        body: topic.module,
        kind: "知识点",
        path: p4LegacyLesson(topic.id) ? "/lesson/"+p4LegacyLesson(topic.id) : courseLink(topic.course, topic.module, topic.title),
      });
    else {
      search.push({
        id: topic.id,
        title: topic.title,
        body: [
          taught.concept,
          taught.theory,
          taught.example,
          taught.mistake,
          ...taught.exercises.map((e) => e.prompt),
        ].join(" "),
        kind: "知识点",
        path: pathFor(topic.id),
      });
      const enhanced = algorithm?.lesson ?? enhanceLesson(topic.id);
      collectBlocks(enhanced.blocks, (block, anchor) => {
        const body = readBlock(block);
        if (block.type === "math")
          formula.push({
            title: topic.title,
            topic: topic.id,
            anchor,
            latex: block.latex,
            caption: block.caption,
          });
        if (body)
          search.push({
            id: topic.id + ":" + anchor,
            title: topic.title,
            body,
            kind: block.type === "math" ? "公式" : "讲解",
            path: pathFor(
              topic.id,
              ["math", "example"].includes(block.type) ? anchor : "reading-enhanced",
            ),
          });
      });
      for (const question of enhanced.questions)
        search.push({
          id: topic.id + ":" + question.id,
          title: topic.title,
          body: question.prompt,
          kind: "练习",
          path: pathFor(topic.id, "reading-practice"),
        });
    }
  }
  for (const listing of allCatalogLessons()) {
    const lesson = getLesson(listing.id);
    if (lesson && listing.status === "available")
      search.push({
        id: listing.id,
        title: listing.title,
        body: valuesOfText(lesson.blocks).join(" "),
        kind: "旧课时",
        path: "/lesson/" + listing.id,
      });
  }
  for (const [cn, en, body, id] of terminology)
    search.push({
      id: "term:" + id + cn,
      title: cn,
      body: en + " " + body,
      kind: "术语",
      path: pathFor(id),
    });
  return (cached = { search, formula });
}

export function searchStudy(source: Entry[], raw: string) {
  const tokens = raw.normalize("NFKC").toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0, 10);
  if (!tokens.length) return [];
  return source
    .flatMap((item) => {
      const corpus = (item.title + " " + item.body).normalize("NFKC").toLowerCase(),
        title = item.title.toLowerCase();
      if (!tokens.every((token) => corpus.includes(token))) return [];
      const position = item.body.toLowerCase().indexOf(tokens[0]!);
      return [
        {
          ...item,
          score: tokens.reduce((sum, token) => sum + (title.includes(token) ? 3 : 1), 0),
          snippet: item.body.slice(Math.max(0, position - 28), Math.max(0, position - 28) + 135),
        },
      ];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
}
export const topicTitle = (id: string) => lessonTitle.get(id) ?? id;
