import type { TeachingBlock } from "../teaching/schema";

const study = (
  title: string,
  strategy: string,
  items: [string, string, string?][],
  check: string,
  kind: "proof" | "derivation" = "derivation",
): TeachingBlock => ({
  type: "sequence",
  kind,
  title,
  strategy,
  steps: items.map(([title, body, formula]) => ({ title, body, formula })),
  check,
});
export const appliedEnrichment: Record<string, TeachingBlock[]> = {
  "k-973542117170": [
    {
      type: "code",
      language: "text",
      title: "C# · 在本地 .NET 或 Unity 中试验",
      code: "enum Mode { Idle, Playing, Finished }\nstatic Mode Next(Mode mode, bool start, bool end)\n{\n    if (mode == Mode.Idle && start) return Mode.Playing;\n    if (mode == Mode.Playing && end) return Mode.Finished;\n    return mode;\n}\n// 仿真器另含 pause/resume/reset，以上是三态最小程序。",
    },
  ],
  "k-b63db2050d47": [
    {
      type: "code",
      language: "cpp",
      title: "C++ · 固定容量下的索引推进",
      code: "#include <cstddef>\n\nconstexpr std::size_t next(std::size_t i) {\n    return (i + 1) % 8;\n}\nstatic_assert(next(7) == 0);\nstatic_assert(next(1) == 2);\n// 如用于 ISR，还需据平台验证同步、原子性与槽位所有权。",
    },
  ],
  "k-f6a9bef3e081": [
    {
      type: "code",
      language: "javascript",
      title: "Apps Script · 将 I/O 与纯计算拆分",
      code: "function totalUnique(rows) {\n  const accepted = new Map();\n  for (const [id, value] of rows) {\n    if (typeof id === 'string' && id && Number.isFinite(value) && !accepted.has(id)) {\n      accepted.set(id, value);\n    }\n  }\n  return [...accepted.values()].reduce((sum, value) => sum + value, 0);\n}\n// 在自己授权的表格中用 getValues 读取，确认范围后再用 setValues 写回。",
    },
  ],
  "k-0866c19cfef3": [
    {
      type: "code",
      language: "text",
      title: "GLSL · 归一化后的漫反射角项",
      code: "vec3 diffuse(vec3 albedo, vec3 normal, vec3 lightDir) {\n    vec3 n = normalize(normal);\n    vec3 l = normalize(lightDir);\n    return albedo * max(0.0, dot(n, l));\n}\n// 输入应为同一坐标系中的非零向量。GPU 编译与显示需外部 WebGL/引擎。",
    },
  ],
  "k-3480cb7f26a7": [
    study(
      "点和向量的翻转不同",
      "先对两个位置做变换并取差，找出位移里的公共项。",
      [
        ["变换点", "令屏幕的转换函数为 T(x,y)=(x,h−y)。"],
        ["两点相减", "端点分别转换，纵向结果 (h−y₂)−(h−y₁)=−(y₂−y₁)。"],
        ["求向量", "纵向分量只翻符号。平移固定值 h 消去了。"],
      ],
      "屏幕参考高度换成 20 后，对于同一对点，屏幕位移保持不变。",
      "proof",
    ),
  ],
  "k-b6c16354b041": [
    study(
      "用仿射条件求重心权重",
      "把坐标与权重和写成线性方程组。",
      [
        ["设点", "对 A=(0,0)、B=(4,0)、C=(0,3)，取 P=(2,2)。"],
        ["解方程", "由 x=4v、y=3w 得 v=.5 与 w=2/3。"],
        ["检查符号", "u=1−v−w=−1/6。出现负权重，样本在边界外。"],
      ],
      "不能只看到 P 落在三角形的矩形包围盒内，就说 P 被三角形覆盖。",
    ),
  ],
  "k-4a7bad0a2367": [
    study(
      "一维离散零输入稳定性",
      "写出任意有限初值的 k 步幅度，再检查极限。",
      [
        ["递推展开", "代入 u=−Kx，连续迭代得到 x_k=(a−bK)^k x_0。"],
        [
          "收敛条件",
          "若极点模长小于 1，几何序列趋零。若模长大于 1，任何非零初值都会发散。",
        ],
        ["边界", "极点 ±1 的幅度不减，零解可保持有界，但不渐近收敛。"],
      ],
      "这个证明限线性离散且没有输入扰动。实际控制还要核对饱和、离散步长与模型误差。",
      "proof",
    ),
  ],
  "k-f83593e899a9": [
    study(
      "增益来自误差方差最小化",
      "把估计写成预测与读数的无偏线性组合，假设两侧误差独立。",
      [
        ["误差拆开", "估计误差为 (1−K)e_p+K e_m。均值均为零。"],
        ["最小化方差", "方差 J=(1−K)^2P+K²R。令 J′=−2P+2K(P+R) 为零。"],
        ["得增益", "K=P/(P+R)。二阶导数 2(P+R)>0，驻点为唯一极小。"],
      ],
      "若误差相关，还要加入协方差项。",
    ),
  ],
  "k-5fc0beb038e9": [
    study(
      "从两个法方程得到地标与位姿",
      "在一维、已知同一地标的假设下，显式消去两项未知。",
      [
        [
          "定义变量",
          "令 x=x₁−x₀，l=L−x₀；则 d、r₀ 和 r₁ 给出 x−d、l−r₀ 与 l−x−r₁。",
        ],
        ["求两偏导", "驻点满足 2x−l=d−r₁ 和 2l−x=r₀+r₁。"],
        ["相加与消元", "解得 x=(2d+r₀−r₁)/3，l=(d+2r₀+r₁)/3。"],
        [
          "核对唯一性",
          "正规矩阵对角为 2，非对角为 −1，特征值 1 和 3，严格正定。",
        ],
      ],
      "改变固定原点会同时平移二者，三个残差不变。",
    ),
  ],
  "k-a607f825c850": [
    study(
      "为何 BFS 首次发现给出最短步数",
      "按出队层级归纳。",
      [
        ["初始层", "S 的长度为 0，是唯一可用零步到达的点。"],
        [
          "扩展",
          "深度 d 出队时新发现的邻点有一条 d+1 步路径。若它有更短路，该路径的前驱早先已出队并发现它。",
        ],
        ["父链接", "父链每次把深度减少一，回到 S 后正好有 d+1 条边。"],
      ],
      "邻边有不同正权时层数不再等于成本，应使用加权搜索。",
      "proof",
    ),
  ],
  "k-74f74b2295b6": [
    study(
      "振幅归一给出概率守恒",
      "对 e^{iφ} 的共轭相乘。",
      [
        ["第一项", "|(1+e^{iφ})/2|²=(2+2cos φ)/4。"],
        ["第二项", "第二项把加号换减号，交叉项变负，得到 (2−2cos φ)/4。"],
        ["相加", "两个交叉项消掉，总概率回到 1。"],
      ],
      "全局相位 e^{iθ} 乘在这两项上时，各自模平方保持不变。",
      "proof",
    ),
  ],
};
