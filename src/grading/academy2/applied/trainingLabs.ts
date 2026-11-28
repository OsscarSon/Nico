import type { LabDefinition } from "../advanced/labs";
import { trainMicro, trainSlippingPolicy } from "./training";

const control = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  initial: number,
) => ({ key, label, min, max, step, initial });
function training(
  title: string,
  objective: string,
  task: Parameters<typeof trainMicro>[0],
): LabDefinition {
  return {
    area: "ml",
    kind: "计算",
    title,
    objective,
    controls: [
      control("epochs", "梯度更新次数", 10, 160, 10, 120),
      control("rate", "学习率", 0.01, 0.2, 0.01, 0.06),
      control("seed", "合成数据种子", 1, 99, 1, 13),
    ],
    run: ({ epochs = 120, rate = 0.06, seed = 13 }) => {
      const result = trainMicro(task, epochs, rate, seed);
      return {
        metrics: [
          ["初始训练损失", result.records[0]!.y],
          ["最终训练损失", result.records.at(-1)!.y],
          ["留出集基线损失", result.initialTest],
          ["留出集训练后损失", result.evaluated],
          ["训练样本数", result.training],
          ["留出样本数", result.test],
        ],
        trace: result,
        points: result.records,
      };
    },
  };
}
export const trainingLabs: Record<string, LabDefinition> = {
  "train-cnn": training(
    "卷积核端到端训练",
    "训练共享 1D 卷积核和偏置，用独立输入检查回归损失。",
    "cnn",
  ),
  "train-transformer": training(
    "因果注意力层训练",
    "改变学习步长和种子，训练 Q/K/V 完成前缀内的软检索。",
    "decoder",
  ),
  "train-vae": training(
    "高斯 VAE 训练",
    "优化重构与 KL，报告独立生成样本上的目标。每个样本成对使用正负高斯噪声。",
    "vae",
  ),
  "train-diffusion": training(
    "小型扩散噪声模型训练",
    "训练按时间级数预测噪声的参数，用冻结参数在另一随机种子上逆向采样。",
    "diffusion",
  ),
  "train-lora": training(
    "冻结权重上的 LoRA 训练",
    "单独优化 A/B 因子、检查冻结的基矩阵与秩一增量。",
    "lora",
  ),
  "train-policy": {
    area: "ml",
    kind: "计算",
    title: "滑移走廊的真实策略训练",
    objective:
      "模拟环境具有已知随机滑移。Q-learning 从实际状态转移更新，对照值迭代及独立种子评估。",
    controls: [
      control("length", "走廊状态数", 3, 12, 1, 6),
      control("slip", "反向滑移概率", 0, 0.4, 0.05, 0.15),
      control("episodes", "训练回合数", 20, 400, 20, 240),
      control("seed", "训练种子", 1, 99, 1, 13),
    ],
    run: ({ length = 6, slip = 0.15, episodes = 240, seed = 13 }) => {
      const o = trainSlippingPolicy(length, slip, episodes, seed);
      return {
        metrics: [
          ["独立回合中到达数（共 60）", o.solved],
          ["独立回合平均折扣回报", o.heldOut],
          ["值迭代最优期望", o.analytic],
          ["贪心动作", o.policy.join(", ")],
        ],
        trace: o,
        points: o.schedule,
      };
    },
  },
};
