import type { Enrichment } from "./authoring";
import { unit, worked, numeric, open, vector } from "./authoring";

export const extras: Readonly<Record<string, Enrichment>> = {
  "fm-equations": unit({
    title: "进阶应用：超出容差时报警",
    prose: [
      "容差的两端是绝对值条件的自然几何解释。如果不等号方向改成大于，解集合变成两条射线。",
    ],
    cases: [
      worked(
        "一条有两个开端点的约束",
        "设定目标 15，允许误差 0.4。",
        "给出所有触发报警的数值。",
        "写成 $|x-15|>0.4$，展开成左右两个条件。",
        [
          ["左侧", "$x-15<-0.4$，故 x<14.6。"],
          ["右侧", "$x-15>0.4$，故 x>15.4。"],
        ],
        "$(-\\infty,14.6)\\cup(15.4,\\infty)$。",
        "相差刚好 0.4 仍在规定范围内。",
        undefined,
        "application",
      ),
    ],
    questions: [
      {
        id: "alarm-regions",
        type: "single",
        level: "concept",
        prompt: "哪条规则可表示‘距离 15 小于 1’？",
        options: [
          { id: "inside", label: "$14<x<16$" },
          {
            id: "outside",
            label: "$x<14$ 或 $x>16$",
            feedback: "该规则表示距离大于 1。",
          },
          {
            id: "closed",
            label: "$14\\le x\\le16$",
            feedback: "等号会把距离恰好为 1 也纳入。",
          },
        ],
        answer: "inside",
        explanation: "严格小于形成中心附近的开区间。",
        hint: "画出中心和两侧相距 1 的点。",
      },
    ],
  }),
  "fm-trig": {
    blocks: [
      {
        type: "code",
        language: "python",
        title: "用单位圆核对正弦和角公式",
        code: "from math import sin, cos, pi, isclose\nu, v = pi / 6, pi / 3\nprint(isclose(sin(u + v), sin(u)*cos(v) + cos(u)*sin(v)))",
        expected: "True",
        runnable: "python",
      },
    ],
    questions: [],
  },
  "fm-proof": {
    blocks: [
      {
        type: "summary",
        points: [
          "逆否将结论的否定变成证明起点。",
          "反证需要推导出真正互斥的陈述。",
          "用反例推翻全称命题时，先确认例子满足论域和前件。",
        ],
      },
    ],
    questions: [],
  },
  "fs-probability": {
    blocks: [
      {
        type: "image",
        src: "art/p15-venn.svg",
        alt: "两个集合部分相交。左侧 A 独有区、中央交集和右侧 B 独有区均属于并集，两个圆外属于并集的补集。",
        caption: "并集由三个互斥区域构成，共有部分只计算一次。",
      },
    ],
    questions: [],
  },
  "fs-bayes": {
    blocks: [
      {
        type: "interactive",
        id: "probability-tree",
        title: "打开交互式概率树",
      },
    ],
    questions: [],
  },
  "fs-charts": {
    blocks: [
      {
        type: "code",
        language: "sql",
        title: "用 SQL 为直方图准备分组频数",
        code: "WITH observations(x) AS (VALUES (4), (7), (12), (19), (22)),\ncounts AS (\n  SELECT CASE WHEN x < 10 THEN '0–9' WHEN x < 20 THEN '10–19' ELSE '20–29' END AS band,\n         COUNT(*) AS n, MIN(x) AS first_x\n  FROM observations\n  GROUP BY 1\n)\nSELECT band, n FROM counts ORDER BY first_x;",
        expected: "0–9       2\n10–19     2\n20–29     1",
      },
    ],
    questions: [],
  },
  "im-svd": {
    blocks: [
      {
        type: "disclosure",
        title: "为什么截断误差无法比下一奇异值更小？",
        blocks: [
          {
            type: "sequence",
            kind: "proof",
            title: "最优谱范数误差的下界",
            strategy:
              "任意秩 k 的竞争矩阵在前 k+1 个右奇异方向张成的空间中必有一个核向量。",
            steps: [
              {
                title: "找见证向量",
                body: "若 $\\operatorname{rank}B\\le k$，$B$ 在 $\\operatorname{span}(v_1,\\ldots,v_{k+1})$ 上不可能单射。选满足 $Bw=0$ 的单位向量 $w$。",
              },
              {
                title: "作误差下界",
                body: "此时 $(A-B)w=Aw$。在这些正交右奇异方向中，每个方向伸缩至少为 $\\sigma_{k+1}$，所以 $\\|Aw\\|_2\\ge\\sigma_{k+1}$。",
              },
              {
                title: "匹配可实现上界",
                body: "截断矩阵 $A_k$ 的残余恰由其余奇异项组成，最大奇异值为 $\\sigma_{k+1}$。",
              },
            ],
            check:
              "这给出谱范数版本的最优性；Frobenius 版本的误差平方是被舍弃奇异值的平方和。",
          },
        ],
      },
      {
        type: "links",
        title: "相关知识",
        topics: [
          { id: "im-projection", title: "正交投影与 Gram–Schmidt" },
          { id: "im-eigen", title: "特征值与实谱定理" },
        ],
      },
      {
        type: "references",
        items: [
          {
            title: "MIT 18.06 · Singular Value Decomposition",
            url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
          },
        ],
      },
    ],
    questions: [
      open(
        "gap-reconstruction",
        "若测量矩阵的头两个奇异值相同，能否把第一主方向解释成唯一的物理方向？",
        [
          "相同奇异值的子空间可用不同正交基表示。",
          "该子空间的投影较稳定，个别方向的解释需要额外信息。",
        ],
      ),
    ],
  },
  "im-number-theory": {
    blocks: [
      {
        type: "code",
        language: "cpp",
        title: "Euclidean Algorithm 的整数实现",
        code: "#include <iostream>\n\nint gcd(int a, int b) {\n    // 输入非负，且不同时为零。\n    while (b != 0) {\n        int r = a % b;\n        a = b;\n        b = r;\n    }\n    return a;\n}\n\nint main() { std::cout << gcd(35, 12) << '\\n'; }",
        expected: "1",
      },
    ],
    questions: [],
  },
  "is-ci": unit({
    title: "两个独立比例之差",
    prose: [
      "先明确差的方向和分组单位，一个人在单一观察窗口只计一次。区间在备择下估计各组方差，再相加；在零假设两比例相等时做检验才可以合并。",
    ],
    formulas: [
      [
        "(\\hat p_B-\\hat p_A)\\pm z_{1-\\alpha/2}\\sqrt{\\frac{\\hat p_A(1-\\hat p_A)}{n_A}+\\frac{\\hat p_B(1-\\hat p_B)}{n_B}}",
        "这是近似 Wald 区间；稀少事件与小样本宜考虑得分或精确方法。",
      ],
    ],
    cases: [
      worked(
        "区间携带的是效果大小",
        "A 40/200，B 60/200；事前定义 B−A 为效应。",
        "求 95% 区间并解释最小可接受提升。",
        "用各组各自的比例计算差的标准误。",
        [
          [
            "标准误",
            "$\\sqrt{0.20\\cdot0.80/200+0.30\\cdot0.70/200}\\approx0.0430$。",
          ],
          ["区间", "中心 0.10，半宽约 0.0843。"],
        ],
        "约 [1.57,18.43] 个百分点。如果工程门槛是 5，区间也允许低于门槛的提升。",
        "这是独立分流课堂数值；多次查看或同人多曝都需额外调整。",
        "组间独立、计数充足，采固定 95% 近似区间。",
        "application",
      ),
    ],
    questions: [
      open(
        "interval-decision",
        "若新功能效果区间为 [−1,7] 个百分点，业务门槛为 +2，应如何报告？",
        [
          "点估计和区间均需提供。",
          "指出可能轻微变差，也允许超过门槛；当前数据未把低于门槛排除。",
          "说明预定观察窗口和合适的后续采样策略。",
        ],
      ),
    ],
  }),
  "is-testing": {
    blocks: [
      {
        type: "markdown",
        body: "### 写成可复核的分析记录\n\n1. **问题与设计**：写随机化单位、目标人群、主指标和停止规则。\n2. **统计方法**：写明零假设、方向、显著性水平、检验假设。\n3. **结果**：报告组的样本量、估计效应、置信区间和 p 值。\n4. **限制**：报告数据缺失、重复查看、可能违反的假设与适用人群。",
      },
    ],
    questions: [],
  },
  "is-ttest": unit({
    title: "变式：标准单样本检验与可复核输出",
    prose: [
      "小样本时观察的尾概率有自由度依赖。检验是否等于预定基线，与直接比较两个样本的统计问题不同。",
    ],
    cases: [
      worked(
        "校验校准偏差",
        "均值为 11、样本标准差 2、n=16，假设均值为 10。",
        "给出 t 和自由度。",
        "用样本标准误，并与双侧参考分布比较。",
        [
          ["标准误", "$2/\\sqrt{16}=0.5$。"],
          ["统计量", "$(11-10)/0.5=2$，df=15。"],
        ],
        "双侧 p 约 0.064，按 0.05 水平不能拒绝。",
        "仍可报告正向差估计和区间；结论不证明设备准确。",
        "独立样本，偏差的过程分布近似正态。",
        "variant",
      ),
    ],
    extras: [
      {
        type: "code",
        language: "python",
        title: "用样本标准差重算 t 与自由度",
        code: "from statistics import mean, stdev\nfrom math import sqrt\ndifferences = [1, 2, 3, 4]\nt = mean(differences) / (stdev(differences) / sqrt(len(differences)))\nprint(round(t, 6), len(differences) - 1)",
        expected: "3.872983 3",
        runnable: "python",
      },
    ],
  }),
  "is-chisquare": unit({
    title: "变式：一个变量的拟合优度",
    prose: [
      "如果零假设已给定全部类别概率，先用总数乘各比例。期望数加总必须等于总次数。",
    ],
    cases: [
      worked(
        "检验三色是否等可能",
        "三色观察 40、35、15 次，零假设各为 1/3。",
        "求卡方统计量和自由度。",
        "每类期望 30，平方偏差除以期望。",
        [
          ["计算", "$(100+25+225)/30=35/3\\approx11.67$。"],
          ["解释", "自由度 2，参考上尾约 0.0029。"],
        ],
        "有不等概率的证据，第三类偏低贡献最大。",
        "对哪个类别作正式比较要说明是否预先计划，并作适当多重校正。",
        "独立抽次，每次只落入一类，比例事先给定。",
        "variant",
      ),
    ],
    questions: [
      numeric(
        "gof-degrees",
        "四类概率均事先指定，拟合优度卡方的自由度是多少？",
        3,
        "总计数固定，四格只有三格的独立波动。",
        "本题未从数据拟合参数。",
      ),
    ],
  }),
  "is-regression": unit({
    title: "从三点回归到系数推断",
    prose: [
      "斜率是用偏差乘积衡量的趋势。在线性模型下，用估计的残差方差和设计矩阵给系数标准误，检验值对照 t 参考。残差随拟合值出现弧线提示遗漏曲率，扇形提示异方差。预测应区分区间宽度变大与模型外推失效。",
    ],
    formulas: [
      [
        "\\hat\\beta_1=\\frac{\\sum_i(x_i-\\bar x)(y_i-\\bar y)}{\\sum_i(x_i-\\bar x)^2},\\quad s^2=\\frac{SSE}{n-2},\\quad \\operatorname{SE}(\\hat\\beta_1)=\\frac{s}{\\sqrt{\\sum_i(x_i-\\bar x)^2}}",
        "单预测变量、有截距时有效；若所有 x 相同则不能估计斜率。",
      ],
    ],
    cases: [
      worked(
        "求斜率、残差与新点预测",
        "三个点 (0,1)、(1,3)、(2,4)。",
        "手算拟合式与 x=3 时的点预测。",
        "先用居中的乘积算斜率，再反解截距。",
        [
          [
            "斜率与截距",
            "x 均值 1，y 均值 8/3，交叉乘积 3，x 平方和 2。斜率 3/2，截距 7/6。",
          ],
          [
            "残差与预测",
            "残差 (−1/6,1/3,−1/6)，和为零且与 x 轴数据向量内积为零。x=3 点预测为 17/3。",
          ],
        ],
        "拟合为 $\\hat y=7/6+(3/2)x$，预测约 5.67。",
        "残差自由度只有 1，且 3 超出观测 x 范围。不能把点预测当高置信的观测值。",
        "用于演示拟合，独立同方差正态假设需要更多资料核查。",
        "variant",
      ),
    ],
    questions: [
      vector(
        "regression-residual",
        "模型 $\\hat y=2+x$，两点 $(1,4),(2,3)$。按次序输出两个残差。",
        [1, -1],
        "残差用实际 y 减预测。",
        "先代入 x 求两点的拟合值。",
      ),
    ],
  }),
  "is-nonparametric": unit({
    title: "从符号与秩手算到多组对照",
    prose: [
      "Wilcoxon 符号秩可先去除零差并对绝对差排名，常用统计为正秩和与负秩和中较小者；需说明零差、并列处理和软件约定。Kruskal–Wallis 拒绝后仍需多重比较方案。",
    ],
    cases: [
      worked(
        "按差值符号汇总秩",
        "配对差为 −1、2、3、−4。",
        "计算符号秩和，并指出它和符号检验的区别。",
        "按绝对值 1、2、3、4 排秩，保留原符号。",
        [
          ["正秩", "$W_+=2+3=5$。"],
          ["负秩", "$W_-=1+4=5$，较小者也是 5。"],
        ],
        "这个样本的正负秩和相同。",
        "不能由此证明零效应；不同参与者独立以及差值在零假设下的对称性很重要。",
        "四个独立配对，差值无零、无并列。",
        "variant",
      ),
    ],
    questions: [
      numeric(
        "rank-sum",
        "配对差 −2、1、3，没有零或并列，正秩和是多少？",
        4,
        "正差绝对值 1、3 对应秩 1、3。",
        "按绝对值取秩，但按原符号求和。",
      ),
    ],
  }),
};
