import type { Question } from "../teaching/schema";
import { qaFixedQuestions, qaVariants } from "../advanced/qaQuestions";

const help = (
  id: string,
  prompt: string,
  explanation: string,
  hint: string,
) => ({ id, prompt, explanation, hint, level: "analysis" as const });
const field = (label: string, answer: number, hint: string) => ({
  label,
  answer,
  hint,
  tolerance: 1e-6,
});
function order(
  id: string,
  prompt: string,
  labels: string[],
  indices: number[],
  explanation: string,
): Question {
  const options = labels.map((label, i) => ({ id: "choice-" + i, label }));
  return {
    ...help(id, prompt, explanation, "先确认下一步运行需要哪些输入和状态。"),
    type: "order",
    options,
    answer: indices.map((i) => options[i]!.id),
  };
}
function match(
  id: string,
  prompt: string,
  labels: string[],
  rows: [string, number][],
  explanation: string,
): Question {
  const options = labels.map((label, i) => ({ id: "choice-" + i, label }));
  return {
    ...help(id, prompt, explanation, "用每个量的分母、定义域或所属阶段判断。"),
    type: "match",
    options,
    rows: rows.map(([label, i]) => ({ label, answer: options[i]!.id })),
  };
}
function sequence(
  id: string,
  prompt: string,
  fields: ReturnType<typeof field>[],
  explanation: string,
): Question {
  return {
    ...help(id, prompt, explanation, "逐步核对中间量，最后再写结论。"),
    type: "steps",
    fields,
  };
}
function matrix(
  id: string,
  prompt: string,
  answer: number[][],
  explanation: string,
): Question {
  return {
    ...help(id, prompt, explanation, "按题目给出的行列约定填写。"),
    type: "matrix",
    answer,
    tolerance: 1e-6,
  };
}

const known: Record<string, Question> = {
  "k-26792901cd39": matrix(
    "p5-lu-pivot-matrix",
    "对 A=[[0,2],[3,1]] 用部分主元法。只填第一次行交换后的 PA。",
    [
      [3, 1],
      [0, 2],
    ],
    "第一列绝对值 3 大于 0，因此交换两行；此例下面已为 0。",
  ),
  "k-7c498f0ff058": match(
    "p5-markov-proof",
    "为 Metropolis–Hastings 的各项匹配角色。",
    ["候选分布", "拒绝质量", "两方向共同上界"],
    [
      ["q(y|x)", 0],
      ["留在 x 的自环", 1],
      ["两向 πq 的最小值", 2],
    ],
    "不同状态间流量相等，自环补足概率；两者共同给平稳性。",
  ),
  "k-f9cc7290740d": sequence(
    "p5-km-ties",
    "第 1 天开头 8 人有风险，当天 2 次死亡与 1 次删失。第 3 天再 1 次死亡。逐步核对。",
    [
      field("第 1 天因子", 0.75, "事件分母先包括同刻删失。"),
      field("第 3 天在险人数", 5, "8 减 2 减 1。"),
      field("第 3 天生存率", 0.6, "第一天 .75 乘 4/5。"),
    ],
    "同刻事件先用未删失风险集算因子，其后才将两类记录移出。",
  ),
  "k-f85bfced2ed8": order(
    "p5-compiler-order",
    "将源表达式转成语义相同的栈程序，包含常量折叠。",
    ["生成字节码", "词法分析", "折叠合法子树", "构建 AST"],
    [1, 3, 2, 0],
    "token 是语法分析输入，折叠在树上做，再生成字节码。",
  ),
  "k-a950e7b7e641": match(
    "p5-deadlock-map",
    "区分死锁场景中的三种证据。",
    ["等待边", "持有关系", "有向循环"],
    [
      ["A 正等待由 B 持有的唯一锁", 0],
      ["B 当前持有锁但没等待别人", 1],
      ["A 等 B、B 等 C、C 等 A", 2],
    ],
    "单向等待不同于循环；在单实例资源假设下，循环给出死锁。",
  ),
  "k-e0f6db5129ce": sequence(
    "p5-quorum-count",
    "固定 7 节点，一候选人得 4 票；新日志记录仅经 3 节点耐久确认。按单任期模型算。",
    [
      field("所需多数", 4, "floor(7/2)+1。"),
      field("选举票差（现有减门槛）", 0, "正好到达门槛。"),
      field("提交还缺的确认数", 1, "记录提交与选举分开统计。"),
    ],
    "当选候选者可以没有足够的日志复制。",
  ),
  "k-c2bc39bddbca": order(
    "p5-wal-order",
    "为了用 durable WAL 提交一笔修改，按简化 redo 模型排序。",
    [
      "返回提交确认",
      "产生变更及提交日志",
      "保证相关日志持久",
      "把修改的数据页刷到磁盘亦可稍后做",
    ],
    [1, 2, 0, 3],
    "提交确认只在 commit 记录耐久后返回；数据页按 WAL 规则稍后可刷出。题中选择的是这种合法时序。",
  ),
  "k-3224259a7c23": sequence(
    "p5-watermark-fields",
    "窗口宽 10，允许迟延 4。当前见到的最大事件时间为 18，又来一条 t=9。按窗口末端≤水位视为关闭。",
    [
      field("水位", 14, "最大事件时间减允许迟延。"),
      field("新事件所属窗口起点", 0, "floor(9/10)×10。"),
      field("该窗口末端", 10, "起点加窗口宽度。"),
    ],
    "窗口末端早于水位，因此这条迟到事件走拒收或补偿路径。",
  ),
  "k-e618e14a8bed": sequence(
    "p5-attention-mask",
    "首位置两个 logits 为 0、ln3，值为 2、6。先算无掩码输出，再遮住第二项。",
    [
      field("无掩码时的第二项权重", 0.75, "分母为 1+3。"),
      field("无掩码输出", 5, ".25×2+.75×6。"),
      field("因果遮住未来项后的输出", 2, "未来项在归一化之前被排除。"),
    ],
    "在 Softmax 后简单抹零不会重新归一化。",
  ),
  "k-4c987da02542": sequence(
    "p5-vae-fields",
    "标准正态先验。q 的均值 1、标准差 2，从标准噪声取 ε=−1。算三步。",
    [
      field("潜变量 z", -1, "1+2×(-1)。"),
      field("方差", 4, "标准差平方。"),
      field("KL（nat）", (4 - Math.log(4)) / 2, "(μ²+σ²−1−lnσ²)/2。"),
    ],
    "单次 z 与确定性的解析 KL 分别应用，KL 不是某一次重构误差。",
  ),
  "k-fbd42f2ffb88": order(
    "p5-ml-final-order",
    "按留出评估规范安排模型工作流。",
    [
      "冻结方案，记录模型和数据指纹",
      "划分互斥训练、验证和留出测试集",
      "在验证集对照候选",
      "用独立测试集只做最终报告",
    ],
    [1, 2, 0, 3],
    "测试属于冻结方案的验证证据。",
  ),
  "k-bd9b81be9853": sequence(
    "p5-fairness-rates",
    "A 组 8 个真实正类中命中 4；B 有 5 个真实正类中命中 3。求机会均等诊断。",
    [
      field("TPR A", 0.5, "4/8。"),
      field("TPR B", 0.6, "3/5。"),
      field("差值 A−B", -0.1, "保留方向和分母。"),
    ],
    "同一组的总体选择率使用不同分母。",
  ),
  "k-84d207bb0d06": match(
    "p5-game-transitions",
    "对照本课状态表，匹配目标状态。",
    ["idle", "running", "paused", "finished"],
    [
      ["running 收到 finish", 3],
      ["paused 收到 finish", 2],
      ["finished 收到 reset", 0],
      ["paused 收到 resume", 1],
    ],
    "paused 中不允许 finish；非法事件保留状态。",
  ),
  "k-8671fc7fd000": match(
    "p5-board-measure",
    "按设备模型匹配物理量或过程。",
    ["模拟电压", "无量纲码", "输出占空比"],
    [
      ["旋钮连接到 ADC 的输入", 0],
      ["analogRead 返回值", 1],
      ["高脉冲宽除以周期", 2],
    ],
    "量纲不同，ADC、PWM 也分别承担输入和输出。",
  ),
  "k-b694a5f5007a": order(
    "p5-hook-order",
    "在本地模型的业务步骤外加入服务端核源。按正确顺序从已接收的 HTTP 请求开始。",
    [
      "原子业务写入或读取已知重放结果",
      "核对原始字节及来源",
      "解析并校验契约",
      "返回写入或重放结果",
    ],
    [1, 2, 0, 3],
    "先检查来源与数据，再进入有持久去重键的原子操作。",
  ),
  "k-a7656824dac0": sequence(
    "p5-pose-steps",
    "左轮 .5、右轮 1.5 m/s；轮距 .5 m、持续 2 s。按无打滑模型。",
    [
      field("中心速度", 1, "轮速平均。"),
      field("角速度", 2, "速度之差除轮距。"),
      field("走过的转角", 4, "角速度乘时间。"),
    ],
    "此处转角保留累计弧度，没按 2π 取模。",
  ),
  "k-b6c16354b041": order(
    "p5-render-order",
    "排出简化的顶点到像素流水线。",
    ["栅格化取样", "齐次裁剪", "顶点变换", "透视除法"],
    [2, 1, 3, 0],
    "先在齐次空间处理跨边界图元，再在二维做覆盖。",
  ),
  "k-5fc0beb038e9": sequence(
    "p5-frame-residuals",
    "固定 x₀=0，位移 4，两次到同一地标的有符号距离为 8、1。求同权最小二乘。",
    [
      field("不一致量 δ", 3, "8−4−1。"),
      field("第二姿态", 5, "4+δ/3。"),
      field("地标坐标", 7, "8−δ/3。"),
    ],
    "三个残差分别为 1、−1、1，平方和 3。",
  ),
  "k-64d9c29d15fc": sequence(
    "p5-edf-budget",
    "理想单核，任务 A 每 5 单位执行 2，B 每 8 单位执行 4。",
    [
      field("A 利用率", 0.4, "2/5。"),
      field("B 利用率", 0.5, "4/8。"),
      field("利用率总需求", 0.9, "独立可抢占任务加总。"),
    ],
    "独立、可抢占、相对截止等于周期时，EDF 可满足期限。",
  ),
  "k-74f74b2295b6": matrix(
    "p5-quantum-amplitudes",
    "对初态 |0⟩ 施加 H、相位 φ=π/2、H。矩阵每行填一个振幅，列为实部、虚部。先 |0⟩ 后 |1⟩。",
    [
      [0.5, 0.5],
      [0.5, -0.5],
    ],
    "由 (1+i)/2 和 (1−i)/2 得到两个复振幅，模平方各为 1/2。",
  ),
};
function generated(id: string, seed: number): Question | undefined {
  const tag = "-variant-" + seed;
  if (id === "k-ec0de2c9e5b0") {
    const length = seed + 2,
      exact = length ** 3 / 3;
    return sequence(
      "p5-integral" + tag,
      `在 [0,${length}] 用两个等长区间积分 x²，逐步给出步长、中点值及 Simpson 结果。`,
      [
        field("网格步长", length / 2, "区间宽除以 2。"),
        field("中点采样值", length ** 2 / 4, "将中点代入 x²。"),
        field("积分", exact, "按权重 1、4、1 加权并乘 h/3。"),
      ],
      "Simpson 对此二次多项式精确。独立用原函数 x³/3 复核。",
    );
  }
  if (id === "k-46fe981be8f5") {
    const width = seed + 2;
    return sequence(
      "p5-aabb" + tag,
      `A=[0,${width}]×[0,5]，B=[${seed},${width + 3}]×[2,8]。计算交叠长度和面积。`,
      [
        field("横向交叠", 2, "取端点公共段。"),
        field("纵向交叠", 3, "共有 [2,5]。"),
        field("交集面积", 6, "两个方向正交叠相乘。"),
      ],
      "把第二个矩形的左边界移动到 A 的右边界，面积应降为零。",
    );
  }
  if (id === "k-f83593e899a9") {
    const start = seed + 2,
      p = 2 * seed,
      r = seed;
    return sequence(
      "p5-kalman" + tag,
      `先验 ${start}，读数 ${start + 3}，预测方差 ${p}，测量方差 ${r}。按一维观测计算。`,
      [
        field("K", 2 / 3, "P/(P+R)。"),
        field("后验位置", start + 2, "用 K 乘创新。"),
        field("后验方差", (2 * seed) / 3, "可用逆方差相加独立核对。"),
      ],
      "后验位于两个观测值之间，方差收缩。",
    );
  }
  return undefined;
}
export const reasoningQuestions = (id: string, seed = 1): Question[] => {
  return [
    known[id],
    generated(id, seed),
    qaFixedQuestions[id],
    qaVariants[id]?.(seed),
  ].filter((question) => question !== undefined);
};
export const seededReasoning = new Set([
  "k-ec0de2c9e5b0",
  "k-46fe981be8f5",
  "k-f83593e899a9",
  ...Object.keys(qaVariants),
]);
