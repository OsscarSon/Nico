import curriculum from "./curriculum.json";
import { findKnowledge, knowledgeAt, knowledgeRegistry } from "./knowledgeRegistry";

export type RelationKind = "required" | "recommended" | "related";
export type Target = { course: string; module?: string; topic?: string; id?: string };
export type Dependency = Target & { kind: RelationKind; reason: string };
export type Edge = { from: string; to: string; kind: RelationKind; reason: string };
type Requirement = readonly [source: string, destination: string, reason: string];

const required: Requirement[] = [
 ["fm-algebra","fm-numbers","等式变形在给定数域中运算。"],
 ["fm-equations","fm-algebra","移项、约分与定义域依赖等价变形。"],
 ["fm-inverse","fm-equations","构造代数反函数时要解出原输入并验证定义域。"],
 ["fm-polynomial","fm-algebra","因式分解和 Horner 展开使用分配律。"],
 ["fm-exponential","fm-inverse","对数定义为指数函数的反函数。"],
 ["fm-sequences","fm-algebra","通项和部分和公式需要等价整理。"],
 ["fm-coordinate","fm-algebra","点斜式与圆方程要求能展开与整理。"],
 ["fm-trig","fm-coordinate","单位圆定义用横纵坐标描述正弦与余弦。"],
 ["fm-vector","fm-coordinate","由两点相减取得位移，长度依距离公式。"],
 ["fm-dot","fm-vector","点积的夹角关系依赖向量分量与长度。"],
 ["fm-matrix","fm-algebra","矩阵行作用是标量乘积的线性组合。"],
 ["fm-proof","fm-logic","直接证明、逆否与反证使用不同的逻辑等价关系。"],
 ["fs-scales","fs-variables","先辨别数值和类别含义，再判断可做的运算。"],
 ["fs-mean","fs-variables","均值只能解释有数量意义的属性。"],
 ["fs-variance","fs-mean","离差以均值作为中心。"],
 ["fs-sd","fs-variance","标准差由方差开平方得到。"],
 ["fs-quartiles","fs-median","第二四分位点就是中位数，依赖排序与位置。"],
 ["fs-percentiles","fs-quartiles","用相同的排序与线性分位计算一般概率水平。"],
 ["fs-outliers","fs-quartiles","Tukey 围栏用两个四分位点和 IQR。"],
 ["fs-probability","fm-sets","事件并、交、补是概率公理的对象。"],
 ["fs-conditional","fs-probability","条件概率重新规范化联合事件的概率。"],
 ["fs-bayes","fs-conditional","贝叶斯公式由两种方向的条件概率和全概率推出。"],
 ["fs-correlation","fs-mean","Pearson 系数用两列各自中心化后的数据。"],
 ["fs-charts","fs-variables","变量类型和配对关系决定适合的图表。"],
 ["im-matrix","fm-matrix","行列、转置及矩阵作用在向量上的含义。"],
 ["im-determinant","im-matrix","行列式的规则作用于方阵及其行变换。"],
 ["im-space","fm-vector","子空间例子用线性组合表达封闭性。"],
 ["im-basis","im-space","生成、坐标与线性独立以向量空间为对象。"],
 ["im-rank","im-basis","秩定义为像空间的一组基的大小。"],
 ["im-systems","im-rank","比较系数秩和增广秩鉴别相容与自由变量。"],
 ["im-transformation","im-basis","选取定义域及值域的基才能写矩阵表示。"],
 ["im-eigen","im-determinant","特征多项式将非零核条件变为行列式方程。"],
 ["im-projection","fm-dot","残差和被投影方向的点积必须为零。"],
 ["im-projection","im-space","投影对象要是明确的线性子空间。"],
 ["im-least-squares","im-projection","最小二乘预测是向列空间的正交投影。"],
 ["im-svd","im-eigen","AᵀA 的光谱给出右奇异方向和平方奇异值。"],
 ["im-svd","im-projection","正交基与变换解释奇异分量。"],
 ["im-limit","fm-inverse","极限先区分函数定义域与趋近。"],
 ["im-continuity","im-limit","连续要求极限与点值相等。"],
 ["im-derivative","im-limit","一阶导数定义为差商极限。"],
 ["im-integral","im-limit","Riemann 积分用和的极限定义。"],
 ["im-integral","im-continuity","连续性用于微积分基本定理在这一课的表述。"],
 ["im-multivariable","im-limit","路径比较与多元趋近推广一元极限。"],
 ["im-partial","im-derivative","固定其它坐标后是一元求导。"],
 ["im-partial","im-multivariable","明确每个坐标与变量定义域。"],
 ["im-gradient","im-partial","梯度由各坐标偏导组合。"],
 ["im-gradient","fm-dot","方向导数由梯度与单位方向点积给出。"],
 ["im-jacobian","im-gradient","每个分量梯度为 Jacobian 的一行。"],
 ["im-jacobian","im-matrix","多元链式法通过相容形状的矩阵乘法组合。"],
 ["im-hessian","im-partial","二阶偏导源于连续执行偏导。"],
 ["im-hessian","fm-matrix","二次型 hᵀHh 使用矩阵与向量。"],
 ["im-sets","fm-sets","幂集和笛卡尔积建立在成员与子集定义上。"],
 ["im-logic","fm-logic","谓词和量词扩展命题联结词与否定。"],
 ["im-induction","im-logic","归纳步由一个蕴含与量化陈述组成。"],
 ["im-relations","im-sets","二元关系是笛卡尔积的子集。"],
 ["im-counting","im-sets","容斥把对象划分为可计数集合。"],
 ["im-counting","fs-counting","Pascal 恒等式需要排列数与组合数的基础定义。"],
 ["im-graphs","im-sets","图的顶点集与边集用于定义邻接及路径。"],
 ["im-number-theory","fm-numbers","整除与同余在整数上定义。"],
 ["is-variable","fs-probability","随机变量把事件的概率推到数值空间。"],
 ["is-expectation","is-variable","用随机变量的质量或密度加权。"],
 ["is-variance","is-expectation","方差是中心化平方的期望。"],
 ["is-joint","fs-conditional","条件质量将联合质量按边缘归一化。"],
 ["is-covariance","is-joint","E[XY] 使用联合分布，不能从两个边缘单独取得。"],
 ["is-covariance","is-variance","和的方差包含交叉中心化项。"],
 ["is-bernoulli","is-expectation","单次二元变量的期望与二阶矩都可直接计算。"],
 ["is-binomial","is-bernoulli","独立同概率 Bernoulli 的和形成二项分布。"],
 ["is-binomial","fs-counting","质量函数要计数成功位置的组合。"],
 ["is-poisson","is-binomial","固定期望的二项族极限推导 Poisson。"],
 ["is-poisson","fm-exponential","极限项包含自然指数函数。"],
 ["is-normal","is-variance","标准化将均值平移、用标准差缩放。"],
 ["is-exponential","im-integral","由密度积分得到生存与累积分布。"],
 ["is-exponential","fs-conditional","无记忆性质是条件概率等式。"],
 ["is-sampling","is-variance","独立均值方差经 n 缩放。"],
 ["is-lln","is-sampling","Chebyshev 界依靠均值的抽样方差。"],
 ["is-clt","is-sampling","对均值的抽样分布中心化和缩放。"],
 ["is-clt","is-normal","极限分布与标准正态尾概率。"],
 ["is-ci","is-sampling","区间的覆盖由估计量的抽样分布决定。"],
 ["is-testing","is-sampling","零假设下的参考分布给出决策的错误率。"],
 ["is-pvalue","is-testing","尾部定义依赖在实验前指定的零假设和备择。"],
 ["is-effect","fs-mean","效应量常用两组均值或率之间的有单位差异。"],
 ["is-ztest","is-pvalue","双侧决策需要标准正态尾概率。"],
 ["is-ztest","is-normal","由标准正态分布解释 z 值。"],
 ["is-ttest","is-pvalue","用 t 参考分布进行尾概率推断。"],
 ["is-ttest","fs-sd","样本标准差用于估计均值标准误。"],
 ["is-chisquare","is-joint","独立假设使联合概率等于两边缘相乘。"],
 ["is-chisquare","is-testing","卡方上尾和自由度用于检验独立。"],
 ["is-anova","is-variance","平方和分解与组内、组间均方相联系。"],
 ["is-anova","is-testing","F 统计量用于检验多个均值是否相等。"],
 ["is-regression","im-least-squares","回归系数最小化残差平方和。"],
 ["is-regression","is-covariance","斜率等于配对中心化交乘和除以自变量平方和。"],
 ["is-nonparametric","is-testing","先指定零假设和可交换结构，才有正确的零假设参考分布。"],
 ["is-nonparametric","fs-counting","穷举置换要计算标签可以怎样分配。"],
];

const recommended: Requirement[] = [
 ["fm-inverse","fm-sets","集合符号便于说明定义域和值域。"],
 ["fm-polynomial","fm-equations","掌握根的定义有助于理解余式。"],
 ["fm-matrix","fm-vector","可将矩阵一行作用解释成输入分量的组合。"],
 ["fs-median","fs-scales","顺序尺度适合比较排序位置。"],
 ["fs-mode","fs-scales","众数也适用于名义尺度。"],
 ["fs-correlation","fm-dot","将中心化后的相关系数理解为向量夹角。"],
 ["im-determinant","im-rank","比较行列式为零与秩不足的关系。"],
 ["im-hessian","im-eigen","用 Hessian 特征值判断二次型曲率。"],
 ["im-graphs","im-relations","可把有向边看成顶点集上关系。"],
 ["im-induction","fm-proof","复习一般证明与反例方法。"],
 ["is-expectation","im-integral","连续随机变量需要积分计算。"],
 ["is-normal","im-integral","了解密度的面积如何给出概率。"],
 ["is-ci","is-clt","非正态样本在合适条件下用中心极限定理近似。"],
 ["is-ztest","is-binomial","理解两比例方差的 Bernoulli 来源。"],
 ["is-regression","fs-correlation","用散点与相关初步检查线性关联。"],
];

const related: Requirement[] = [
 ["fm-exponential","is-exponential","指数变换在等待时间模型中得到应用。"],
 ["fs-correlation","is-regression","相关描述关联，回归用于描述条件均值。"],
 ["fs-outliers","is-regression","异常值可能改变残差和拟合。"],
 ["im-graphs","intermediate-algorithms/graphs","邻接表示与遍历在算法课程展开。"],
 ["is-effect","is-ci","同时报告差异及其不确定性。"],
 ["is-anova","is-nonparametric","假设不适合时可考虑基于秩或置换的方法。"],
];

const locationId = (course: string, module: string, topic: string) => {
  const location = knowledgeAt(course, module, topic);
  if (!location) throw Error(course + "/" + module + "/" + topic);
  return location.id;
};
const attention = locationId("advanced-ai", "attention", "Attention");
const softmax = locationId("intermediate-ai", "reasoning", "Softmax");
const regression = locationId("intermediate-ai", "supervised", "线性回归");
const dijkstra = locationId("intermediate-algorithms", "graphs", "Dijkstra");
required.push(
 [attention,"im-matrix","QKᵀ 与加权值向量需要相容的矩阵乘法。"],
 [attention,"fm-dot","查询、键向量通过点积形成相似度得分。"],
 [attention,softmax,"将得分归一化为非负、总和为一的注意力权重。"],
 [regression,"im-least-squares","损失最小化的闭式推导使用正交条件。"],
 [dijkstra,locationId("intermediate-algorithms","graphs","图表示"),"必须能表示边、权重和邻接点，并要求边权非负。"],
);
recommended.push(
 [attention,"is-joint","用条件分布类比每个查询对位置给出的权重，但不把注意力权重当作因果概率。"],
 [attention,"im-gradient","只在从头训练和反向传播时需要梯度，前向计算可先学习。"],
 [regression,"fs-correlation","用相关初步判断配对变量的线性关系。"],
 [dijkstra,locationId("intermediate-algorithms","structures","Heap"),"堆用于高效实现优先队列，也可用线性扫描实现。"],
);

// These learning paths connect concrete academic skills. Unlisted nodes have no asserted dependency.
const courseConnections: Requirement[] = [
 ["foundation-algorithms","foundation-programming/control","循环与条件可用来实现搜索与排序。"],
 ["foundation-data-science","foundation-statistics/data","样本和描述统计帮助解释数据清洗后的汇总。"],
 ["foundation-ai","foundation-mathematics/vectors","向量是相似度与表示学习的数学表示。"],
 ["foundation-ai","foundation-statistics/probability","概率帮助解释模型预测的不确定性。"],
 ["foundation-software","foundation-programming/syntax","已有变量与表达式知识可迁移到 JavaScript。"],
 ["foundation-security","foundation-systems/network","互联网协议帮助理解通信的安全边界。"],
 ["intermediate-mathematics","foundation-mathematics/proof","复习逻辑、证明、函数与向量基础。"],
 ["intermediate-statistics","foundation-statistics/probability","条件概率及概率运算用于建立分布。"],
 ["intermediate-statistics","intermediate-mathematics/calculus","密度积分与趋近概念对连续概率有帮助。"],
 ["intermediate-algorithms","intermediate-mathematics/discrete","图、归纳和组合分析用于正确性与复杂度。"],
 ["intermediate-data-science","intermediate-statistics/inference","统计推断帮助解释数据分析结果。"],
 ["intermediate-ai","intermediate-mathematics/linear-algebra","矩阵和投影用于线性模型、PCA 与特征表示。"],
 ["intermediate-ai","intermediate-statistics/inference","评估模型的误差、不确定性和实验差异。"],
 ["intermediate-ai","intermediate-algorithms/structures","数据结构有助于实现搜索和推理系统。"],
 ["intermediate-software","intermediate-programming/async","并行请求与类型边界用于全栈交互。"],
 ["intermediate-software","intermediate-data-science/database-design","事务与数据建模用于应用持久化。"],
 ["intermediate-security","intermediate-systems/networks","防御分析需要协议和网络分层背景。"],
 ["advanced-programming","intermediate-mathematics/discrete","逻辑与集合便于表达语言语义及证明。"],
 ["advanced-algorithms","intermediate-algorithms/design","常见范式及复杂度分析支持高级算法比较。"],
 ["advanced-systems","intermediate-systems/os","线程与同步是并行及分布式实现的背景。"],
 ["advanced-data-science","intermediate-data-science/database-design","索引与事务为数据库实现提供基础。"],
 ["advanced-ai","intermediate-ai/evaluation","评估、数据泄漏及泛化用于审查深度模型。"],
 ["advanced-ai","intermediate-mathematics/calculus","梯度和链式法用于训练。"],
 ["advanced-software","intermediate-software/delivery","测试、版本绑定和流水线是生产交付的基础。"],
 ["advanced-security","intermediate-statistics/inference","可复现实验需要理解假设检验与区间。"],
 ["advanced-applied","intermediate-mathematics/linear-algebra","矩阵变换用于几何、机器人和模拟。"],
];
const moduleConnections: Requirement[] = [
 ["foundation-mathematics/functions","foundation-mathematics/algebra","函数求值及反函数需要代数和方程。"],
 ["foundation-mathematics/vectors","foundation-mathematics/algebra","坐标几何与矩阵行运算依赖展开和实数运算。"],
 ["foundation-statistics/distribution","foundation-statistics/data","分位数和离群检测先需要排序与中位数。"],
 ["foundation-statistics/visualization","foundation-statistics/data","数据类型决定图表与聚合指标。"],
 ["intermediate-mathematics/linear-algebra","foundation-mathematics/vectors","复习矩阵、线性组合与点积。"],
 ["intermediate-mathematics/calculus","foundation-mathematics/functions","极限与导数针对函数及其定义域。"],
 ["intermediate-mathematics/discrete","foundation-mathematics/proof","量词、反证和证明结构是离散论证的工具。"],
 ["intermediate-statistics/variables","foundation-statistics/probability","联合和条件分布以概率定义为基础。"],
 ["intermediate-statistics/sampling","intermediate-statistics/variables","样本统计量的方差和极限依赖随机变量的矩。"],
 ["intermediate-statistics/inference","intermediate-statistics/sampling","检验和区间需要抽样分布与标准误。"],
 ["intermediate-statistics/models","intermediate-statistics/inference","解释卡方、F 和秩检验需要零假设与 p 值。"],
];

export const knowledgeEdges: readonly Edge[] = [
 ...required.map(([from,to,reason]): Edge => ({from,to,reason,kind:"required"})),
 ...[...recommended,...courseConnections,...moduleConnections].map(([from,to,reason]): Edge => ({from,to,reason,kind:"recommended"})),
 ...related.map(([from,to,reason]): Edge => ({from,to,reason,kind:"related"})),
];
const keys = new Map<string, Target>();
for (const course of curriculum) {
 keys.set(course.id, {course: course.id});
 for (const module of course.modules) keys.set(course.id + "/" + module.id, {course: course.id, module: module.id});
}
for (const topic of knowledgeRegistry) keys.set(topic.id, {course: topic.course, module: topic.module, topic: topic.title, id: topic.id});
const bySource = new Map<string, Edge[]>();
for (const edge of knowledgeEdges) bySource.set(edge.from, [...bySource.get(edge.from) ?? [], edge]);

export function dependenciesOf(key: string): Dependency[] {
 return (bySource.get(key) ?? []).map(edge => {
  const target = keys.get(edge.to);
  if (!target) throw Error("未知先修目标 " + edge.to);
  return { ...target, kind: edge.kind, reason: edge.reason };
 });
}

export function auditGraph(edges: readonly Edge[]): string[] {
 const issues: string[] = [];
 const stages = ["foundation","intermediate","advanced"];
 const directed = new Map<string,string[]>();
 const seen = new Set<string>();
 const reviewedCrossRequired = new Set(["statistics→mathematics", "mathematics→statistics", "ai→mathematics"]);
 for (const { from, to, kind, reason } of edges) {
  const source = keys.get(from), destination = keys.get(to), pair = from + "→" + to;
  if (!source || !destination || from === to || !reason.trim() || !["required","recommended","related"].includes(kind) || seen.has(pair)) issues.push(pair);
  seen.add(pair);
  if (kind === "required" && (!findKnowledge(from) || !findKnowledge(to) || stages.indexOf(destination?.course.split("-")[0] ?? "") > stages.indexOf(source?.course.split("-")[0] ?? ""))) issues.push("Required: " + pair);
  const fromDomain=source?.course.slice(source.course.indexOf("-")+1),toDomain=destination?.course.slice(destination.course.indexOf("-")+1);
  if (kind==="required"&&fromDomain!==toDomain&&!reviewedCrossRequired.has(fromDomain+"→"+toDomain)) issues.push("Unreviewed discipline: "+pair);
  if (kind !== "related") directed.set(from, [...directed.get(from) ?? [], to]);
 }
 const visited = new Set<string>(), active = new Set<string>();
 function visit(node: string) {
  if (active.has(node)) { issues.push("Cycle: " + node); return; }
  if (visited.has(node)) return;
  active.add(node);
  for (const next of directed.get(node) ?? []) visit(next);
  active.delete(node);
  visited.add(node);
 }
 for (const from of directed.keys()) visit(from);
 return issues;
}
