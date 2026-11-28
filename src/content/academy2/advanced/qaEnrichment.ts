import type { TeachingBlock } from "../teaching/schema";

type ProofStep = [title: string, body: string, latex?: string];
const derivation = (
  title: string,
  strategy: string,
  steps: ProofStep[],
  check: string,
  kind: "proof" | "derivation" = "derivation",
): TeachingBlock => ({
  type: "sequence",
  kind,
  title,
  strategy,
  steps: steps.map(([title, body, formula]) => ({ title, body, formula })),
  check,
});

export const qaEnrichment: Record<string, TeachingBlock[]> = {
  "k-505d9ae0fe3b": [
    derivation(
      "两级误差为何可以带符号相加",
      "设精确目标为 z，离散目标为 z_h，机器结果为 ẑ_h。",
      [
        [
          "加减离散值",
          "总误差拆成两个可解释差。",
          "\\widehat z_h-z=(\\widehat z_h-z_h)+(z_h-z)",
        ],
        [
          "误差界",
          "绝对值由两项绝对值之和控制。两项可同向也可相互抵消。",
          "|\\widehat z_h-z|\\le |\\widehat z_h-z_h|+|z_h-z|",
        ],
        [
          "复核",
          "z=100、z_h=99.9、机器得到 100.02 时，截断为 −0.1、舍入贡献 +0.12、总差 +0.02。",
        ],
      ],
      "单次偶然抵消并不证明算法具有该精度。用减小步长及提高算术精度分别实验。",
      "proof",
    ),
  ],
  "k-6428532dca21": [
    derivation(
      "离散最大值原理和守恒来自不同条件",
      "在周期网格和常系数的假设下，分别解释非负权与全局求和。",
      [
        [
          "凸组合",
          "当 0≤r≤1/2 时，系数 r、1−2r、r 非负且和为 1。每格在三个旧值的最小、最大之间。",
        ],
        [
          "重排求和",
          "周期索引平移只改变读取顺序，各邻值和等于原总和。",
          "\\sum_i u_i^{n+1}=((1-2r)+r+r)\\sum_i u_i^n",
        ],
        [
          "找反例",
          "r=.6，周期三格 [0,1,0] 一步得到 [.6,−.2,.6]。总和仍为 1，但局部出现负值。",
        ],
      ],
      "守恒单独成立不能替代稳定性。非周期边界可能随外部通量改变总量。",
      "proof",
    ),
  ],
  "k-7940731e1a06": [
    derivation(
      "Beta 后验的内部和边界众数",
      "从对数密度而不是背公式开始，避免将内部驻点套在端点。",
      [
        [
          "内点导数",
          "a,b>1 时两端密度趋于零，在内点令导数为零。",
          "\\ell'(p)=\\frac{a-1}{p}-\\frac{b-1}{1-p}",
        ],
        ["驻点与最大", "得 p=(a−1)/(a+b−2)，二阶导严格为负。"],
        [
          "端点对照",
          "a=1,b=5 时密度与 (1−p)^4 成正比，在 p=0 取最大。a=b=1 则所有点同密度。",
        ],
      ],
      "密度的众数取决于参数化，后验均值、预测概率与 MAP 需要分别解释。",
    ),
  ],
  "k-261db48f1b21": [
    derivation(
      "两态链的逐步公式与周期反例",
      "让 b_t 表示时刻 t 处于第二状态的概率。",
      [
        [
          "递推",
          "入流 a(1−b_t) 加留在第二状态的质量 (1−b)b_t。",
          "b_{t+1}=a+(1-a-b)b_t",
        ],
        [
          "平稳值",
          "当 a+b>0，定点 π=a/(a+b)。将定点从递推两侧减去。",
          "b_t-\\pi=(1-a-b)^t(b_0-\\pi)",
        ],
        [
          "边界情形",
          "a=b=1 时因子为 −1。平稳分布为平分，但从任一确定状态开始都会左右交替。a=b=0 则任意初始分布均平稳。",
        ],
      ],
      "若 |1−a−b|<1，误差几何衰减。唯一平稳分布本身不能推出任意初值收敛。",
      "proof",
    ),
  ],
  "k-c47d7505d81e": [
    derivation(
      "用众数附近的概率计算极端上尾",
      "从相邻二项质量之比推导。先用相对权重，再归一化。",
      [
        [
          "相邻质量",
          "对 0<p<1，将共同因子先消除。",
          "\\frac{m_{k+1}}{m_k}=\\frac{n-k}{k+1}\\frac{p}{1-p}",
        ],
        [
          "从众数推进",
          "设 floor((n+1)p) 处的相对质量为 1（至多 n）。用比值向上，取倒数向下。把目标尾部与全部权重分别求和。",
        ],
        [
          "核对极端输入",
          "公平硬币 n=1999 时对称，P(X≥1000)=1/2。从 2⁻¹⁹⁹⁹ 启动的浮点递推会先得到 0。",
        ],
      ],
      "p=0 或 1 是点质量，使用单独分支。研究报告应列出真实实际 α、样本数和备择参数。",
    ),
  ],
  "k-4b2ec24bd26e": [
    derivation(
      "协方差更新的等价式及数值后果",
      "在标量、独立线性直接测量下，对精度和方差分开推导。",
      [
        [
          "精度相加",
          "两个高斯的指数对平方项相加，后验精度是两者之和。",
          "\\frac{1}{P^+}=\\frac{1}{P}+\\frac{1}{R}",
        ],
        [
          "分支计算",
          "符号式 P⁺=PR/(P+R) 可改写为 min(P,R)/(1+min(P,R)/max(P,R))，避免乘积溢出。P=0 时直接得零。",
        ],
        [
          "诊断",
          "P=10²⁰、R=1 时浮点 K 可舍入为 1。直接乘 (1−K)P 得 0，稳定形式仍给近似 1。",
        ],
      ],
      "多维实现通常需保持矩阵对称和半正定，标量例子不能代替矩阵协方差更新的数值检查。",
    ),
  ],
  "k-a6c1950517e3": [
    derivation(
      "为什么网络分区迫使读取作出选择",
      "仅考虑一个初值为 v₀、两个副本的寄存器。用两种对 B 不可区分的执行构造反例。",
      [
        [
          "断开消息",
          "分区隔开 A 和 B。在执行一，客户端在 A 写 v₁ 并收到成功；执行二从未发出该写入。",
        ],
        [
          "从 B 读取",
          "在两种执行中 B 的局部消息和状态相同。若要求每个非故障节点都终止响应，B 无法等待从 A 获得区分信息。",
        ],
        [
          "线性化要求",
          "已成功完成的写入发生在读取之前，执行一应返回 v₁；执行二应返回 v₀。同一可见历史无法同时满足两者。",
        ],
      ],
      "例子说明分区下线性一致和每请求响应不能同时保证，错误响应不等同于完成寄存器读操作。",
      "proof",
    ),
  ],
  "k-c59f6c75c263": [
    derivation(
      "快照隔离仍可能出现 write skew",
      "两个值班医生 A、B 最初都在岗，不变量是至少一人在岗。",
      [
        ["共同快照", "T₁ 与 T₂ 各读到 A、B 都在岗，各自满足离岗规则。"],
        [
          "非冲突写入",
          "T₁ 只改 A，T₂ 只改 B。仅以同一行写写冲突判断，两个提交可以都通过。",
        ],
        [
          "验证不可串行",
          "任何串行先执行一项离岗，后一项都应看到只剩一人并拒绝。实际两人离岗不符合任何串行顺序。",
        ],
      ],
      "用可串行化事务、显式共同锁或在适当粒度表达约束来保护不变量。具体方案按数据库实现验证。",
    ),
  ],
  "k-bc8297361aff": [
    derivation(
      "二维约定决定核的方向和输出维度",
      "以常见深度学习库的有效互相关为课堂约定。",
      [
        [
          "不翻核",
          "在输入窗口维护核索引的方向。数学卷积的传统定义在相应轴上翻转核。",
          "z_{ij}=\\sum_{u=0}^{K_h-1}\\sum_{v=0}^{K_w-1}X_{i+u,j+v}W_{uv}",
        ],
        [
          "约束窗口",
          "stride=1、dilation=1、无 padding 时，高度 H−K_h+1，宽度 W−K_w+1。核比输入大时本课堂拒绝。",
        ],
        [
          "手算对照",
          "输入 [[1,2],[3,4]]、核 [[1,2],[0,−1]] 时互相关为 1+4−4=1；翻转核后为 −1+6+4=9。",
        ],
      ],
      "对称核会掩盖方向误差。用非对称核和独立参考点对照。",
    ),
  ],
  "k-007fd0b037de": [
    derivation(
      "低秩更新的子空间界",
      "将冻结矩阵的更新写成 BA，明确矩阵形状。",
      [
        ["矩阵大小", "给 d_out×r 的 B 与 r×d_in 的 A，乘积与原权重同形。"],
        [
          "列空间",
          "BA 的每一列是 B 的 r 列的线性组合，列空间包含在 B 的列空间中。",
          "\\operatorname{rank}(BA)\\le \\min(\\operatorname{rank}(B),\\operatorname{rank}(A))\\le r",
        ],
        [
          "合并后的秩",
          "这只限定增量。即使原矩阵 I 加上秩一更新，整个结果仍可满秩。",
        ],
      ],
      "冻结参数和减少可训练参数并不自动保证推理更快。部署还要区分是否合并权重。",
      "proof",
    ),
  ],
  "k-c963d05eb91a": [
    derivation(
      "有限假设类的一致偏差界",
      "假设包含 M 个事先固定的预测器，损失每次在 [0,1]，训练样本独立同分布。",
      [
        ["先看一个预测器", "Hoeffding 给 P(|R̂_h−R_h|>ε)≤2exp(−2nε²)。"],
        [
          "联合界",
          "只要任一个模型超出偏差，至少发生一个坏事件。对 M 个概率求和。",
          "\\Pr(\\max_h|\\widehat R_h-R_h|>\\epsilon)\\le2M\\exp(-2n\\epsilon^2)",
        ],
        [
          "允许看训练再选",
          "令右边为 δ，可在概率至少 1−δ 的同一事件上同时控制所有候选，包括根据训练选中的一个。",
        ],
      ],
      "数据依赖地先扩充假设类、使用相关或时间序列样本时不能原样套用。需要重新论证。",
      "proof",
    ),
  ],
  "k-63b3f19df567": [
    derivation(
      "主成分的正交旋转与近重根",
      "以实对称样本协方差为例，区分特征结构与求解器。",
      [
        [
          "最大方差",
          "单位方向 v 的投影方差为 vᵀSv。拉格朗日条件给 Sv=λv，按特征值从大到小选择。",
        ],
        [
          "数值实现",
          "小规模工作台用 Jacobi 平面旋转反复消去非对角元素。每次正交旋转保持谱，累计旋转给出特征向量。",
        ],
        [
          "独立核验",
          "检查 Av−λv 的残差和列向量的内积。相同特征值允许旋转基底，近重根不应只用固定次数幂迭代后就判精确。",
        ],
      ],
      "基向量的正负号不是唯一的；训练集上学习到的投影应固定用于后续验证数据。",
    ),
  ],
};

export const qaSources: Record<string, { title: string; url: string }> = {
  "k-c47d7505d81e": {
    title: "NIST Handbook · Binomial Distribution",
    url: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda366i.htm",
  },
  "k-4b2ec24bd26e": {
    title: "Welch & Bishop · An Introduction to the Kalman Filter",
    url: "https://www.cs.unc.edu/~welch/media/pdf/kalman_intro.pdf",
  },
  "k-e0f6db5129ce": {
    title:
      "Ongaro & Ousterhout · In Search of an Understandable Consensus Algorithm",
    url: "https://raft.github.io/raft.pdf",
  },
  "k-a6c1950517e3": {
    title: "Gilbert & Lynch · Brewer’s Conjecture",
    url: "https://doi.org/10.1145/564585.564601",
  },
  "k-c59f6c75c263": {
    title: "PostgreSQL · Transaction Isolation",
    url: "https://www.postgresql.org/docs/current/transaction-iso.html",
  },
  "k-829a09533faf": {
    title: "Apache Parquet · File Metadata",
    url: "https://parquet.apache.org/docs/file-format/metadata/",
  },
  "k-6566e28410c0": {
    title: "Apache Kafka · Design and guarantees",
    url: "https://kafka.apache.org/documentation/#intro_guarantees",
  },
  "k-bc8297361aff": {
    title: "Dive into Deep Learning · Convolutions for Images",
    url: "https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html",
  },
  "k-bd83fe10c488": {
    title: "Vaswani et al. · Attention Is All You Need",
    url: "https://arxiv.org/abs/1706.03762",
  },
  "k-007fd0b037de": {
    title: "Hu et al. · LoRA",
    url: "https://arxiv.org/abs/2106.09685",
  },
  "k-880ee91be2c8": {
    title: "Ho et al. · Denoising Diffusion Probabilistic Models",
    url: "https://arxiv.org/abs/2006.11239",
  },
  "k-40a5551cd1da": {
    title: "Google SRE · Service Level Objectives",
    url: "https://sre.google/sre-book/service-level-objectives/",
  },
};
