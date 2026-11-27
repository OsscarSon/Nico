import type { TeachingBlock } from "../teaching/schema";
type Step = { title: string; body: string; formula?: string };
const step = (title: string, body: string, formula?: string): Step => ({
  title,
  body,
  formula,
});
const example = (
  title: string,
  given: string,
  goal: string,
  method: string,
  steps: Step[],
  answer: string,
  check: string,
): TeachingBlock => ({
  type: "example",
  kind: "math",
  level: "application",
  title,
  given,
  goal,
  method,
  steps,
  answer,
  check,
  reveal: true,
});
const proof = (
  title: string,
  strategy: string,
  steps: Step[],
  check: string,
): TeachingBlock => ({
  type: "sequence",
  kind: "proof",
  title,
  strategy,
  steps,
  check,
});

export const enrichment: Record<string, TeachingBlock[]> = {
  "k-fbd42f2ffb88": [
    {
      type: "note",
      tone: "application",
      title: "在本机检查已冻结的模型服务",
      body: "在项目根目录运行 python scripts/p4-model-serving.py。它先以六个合成点训练并保存模型，再重载 JSON，在临时本机端口提供 HTTP 推理。四个独立留出点走真实请求检查。另发送错误特征长度与过期版本，分别验证推理质量与请求契约。脚本退出后关闭服务。",
    },
  ],
  "k-d18c520a0205": [
    example(
      "变式 · 避免二次方程小根的抵消",
      "求 x²−10⁸x+1=0 的两个实根。",
      "保留小根的有效数字。",
      "直接公式有两个接近数相减。利用根的乘积恢复小根。",
      [
        step(
          "求较大根",
          "使用同号加法，避免相减。",
          String.raw`r_1=\tfrac12(10^8+\sqrt{10^{16}-4})`,
        ),
        step(
          "使用韦达定理",
          "乘积为 1，计算倒数得到另一根。",
          String.raw`r_2=1/r_1`,
        ),
        step("核对尺度", "大根约 10⁸，小根约 10⁻⁸，均应是正数。"),
      ],
      "稳定表达式给出相差约十六数量级的根。",
      "仅看相对残差时要确认系数尺度。",
    ),
  ],
  "k-26792901cd39": [
    example(
      "变式 · QR 解超定最小二乘",
      "A 的列为 (1,0,1) 与 (0,1,0)，b=(2,3,4)。",
      "求最小二乘解并检查残差。",
      "两列已正交，只需正规化首列。",
      [
        step("分解", "Q 第一列除 √2，第二列不变。R=diag(√2,1)。"),
        step("投影", "Qᵀb=(6/√2,3)。"),
        step("回代", "两行分别除对角项，得到 x=(3,3)。"),
      ],
      "拟合 (3,3,3)，残差 (−1,0,1)。",
      "残差与两列各自点积为 0。",
    ),
  ],
  "k-ec0de2c9e5b0": [
    example(
      "变式 · Simpson 对非光滑函数的行为",
      "在 [−1,1] 积分 |x|，用两等分。",
      "比较两个规则与真实值。",
      "原函数可先按 0 分片。",
      [
        step("参考值", "两个面积为 .5 的三角形，总为 1。"),
        step("三点样本", "节点值为 1,0,1。梯形按两段给 1。"),
        step("Simpson", "h=1，加权为 (1+4·0+1)/3。"),
      ],
      "梯形本例恰好为 1，Simpson 为 2/3。",
      "在不光滑处切分，或调整分组使每二段不跨尖点。",
    ),
  ],
  "k-de4fbf9ecdf5": [
    example(
      "变式 · 两种负载的代价不同",
      "最小化 2x²+y²，x+y=6。",
      "求最优分工。",
      "建立等式约束后再用严格凸性检查。",
      [
        step("求偏导", "驻点条件 4x+λ=0、2y+λ=0。"),
        step("联合约束", "消去 λ 得 y=2x，故 x=2、y=4。"),
        step("算实际代价", "2·4+16=24，比平分时的 27 小。"),
      ],
      "最优分配 (2,4)，目标值 24。",
      "代入约束求一元二次函数，可复核唯一极小。",
    ),
  ],
  "k-7c498f0ff058": [
    proof(
      "细致平衡如何给出平稳分布",
      "把可接受移动和留在原地的转移概率分别处理。",
      [
        step(
          "两向成对比较",
          "对 x≠y，同一条转移的正向和反向质量相等。",
          String.raw`\pi(x)q(y\mid x)a(x,y)=\min\{\pi(x)q(y\mid x),\pi(y)q(x\mid y)\}`,
        ),
        step("自环", "拒绝造成停在 x；自环方向相同，不破坏对称。"),
        step(
          "求和或积分",
          "固定目标 y，沿 x 积分。利用转移核从 y 出发总概率为一，得到平稳分布仍为 π。",
        ),
      ],
      "平稳不本身保证从任意初值快速混合。",
    ),
  ],
  "k-f9cc7290740d": [
    example(
      "变式 · 同刻事件和删失",
      "六人在开始时均有风险。在第 2 天发生两个事件及一个删失，第 4 天再一个事件。",
      "找第 4 天的估计。",
      "同刻事件使用该时刻刚开始的完整风险集。",
      [
        step("第 2 天", "先算因子 1−2/6=2/3，移走共三项。"),
        step("第 4 天", "风险集剩三，因子 1−1/3=2/3。"),
        step("累乘", "(2/3)^2=4/9。"),
      ],
      "第 4 天生存率 4/9。",
      "不能先移走同刻删失再把分母写为 5。",
    ),
  ],
  "k-4b6444ddfd1d": [
    proof(
      "编译器的净栈效果引理",
      "命题对任意正常初始栈成立。对表达式树结构归纳。",
      [
        step(
          "叶节点",
          "常量推入该值。已绑定变量加载值。两者都不消费先前栈项。",
        ),
        step(
          "组合节点",
          "先运行左子代码，净增其值；再运行右子代码，净增加另一个，并保持已经推入的左值。",
        ),
        step(
          "保持顺序",
          "操作指令先取右值、再取左值，推入同一算子的结果。原先栈前缀保持不变。",
        ),
      ],
      "安全整数边界和未绑定错误声明单独核对，不能在优化里悄悄吞掉异常。",
    ),
  ],
  "k-e0f6db5129ce": [
    example(
      "变式 · 选举通过和复制提交",
      "五节点候选人取得三票。当前任期的一条记录只有两个节点持久化。",
      "分别判定选举与提交。",
      "两个动作分别需要自己的多数证据。",
      [
        step("选举", "固定五节点，三票可选举。"),
        step("复制", "两项耐久确认低于三。"),
        step("恢复", "再一项复制持久化后才可以通过本次提交门槛。"),
      ],
      "领导者可以存在，当前条目仍未提交。",
      "本案例限给定任期，不处理成员变化和过去任期日志。",
    ),
  ],
  "k-829a09533faf": [
    {
      type: "code",
      language: "sql",
      title: "外部环境 · DuckDB 读 Parquet",
      code: "SELECT region, count(*) AS n, sum(amount) AS total\nFROM read_parquet('events.parquet')\nWHERE region IN (1, 3)\nGROUP BY region ORDER BY region;\n-- 仓库脚本 scripts/p4-parquet.py 生成并独立核对合成文件。",
    },
  ],
  "k-e618e14a8bed": [
    example(
      "变式 · 因果掩码先于归一化",
      "首 token 的两个未处理 logits 为 (0,ln 3)，对应值 (2,6)。",
      "比较允许、禁止第二位置。",
      "将禁止位置排除于分母。",
      [
        step("双位置", "权重 (1/4,3/4)，混合结果 5。"),
        step("只允许首位置", "第一个指数值 1，分母仅有 1，权重变 (1,0)。"),
        step("对照错误办法", "先归一化再抹除第二项会剩 (1/4,0)，总和小于 1。"),
      ],
      "掩码后输出 2。",
      "首位置输出任意修改未来值也应相同。",
    ),
  ],
  "k-4c987da02542": [
    example(
      "变式 · 相同均值下不同潜在方差",
      "q=N(0,4)，先验 p=N(0,1)，噪声 ε=1。",
      "核对潜变量及 KL。",
      "对角正态的 KL 有解析式。",
      [
        step("标准差", "σ=2，潜变量 z=2。"),
        step("代入 KL", "(4−1−ln4)/2。"),
        step("分别识别指标", "重构还需要解码器输出与观测值，KL 单项可直接算。"),
      ],
      "KL 约 .80685 nat。",
      "仅把方差换回 1 时两分布重合，KL 为 0。",
    ),
  ],
  "k-3cb614ed175b": [
    proof(
      "Laplace 计数机制的点态密度界",
      "比较两个相邻输入在同一个可能发布输出 z 的密度。",
      [
        step(
          "写出比值",
          "相同尺度取消归一化因子。",
          String.raw`\frac{f_D(z)}{f_{D'}(z)}=\exp((|z-q(D')|-|z-q(D)|)/b)`,
        ),
        step(
          "三角不等式",
          "指数分子的差最多为 |q(D)−q(D′)|，受全局敏感度 Δ 约束。",
        ),
        step(
          "代入尺度",
          "当 b=Δ/ε，点态密度比不超过 exp(ε)。对任意可测事件积分即得同一概率界。",
        ),
      ],
      "证明针对真正遵守分布的机制，公开教学种子没有生产隐私保证。",
    ),
  ],
};
