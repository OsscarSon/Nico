import type { LabDefinition } from "../advanced/labs";
import { exactRandomization } from "./research";
import * as model from "./compute";
import {
  closedLoop,
  mobileRestore,
  recordTelemetry,
  scheduleWorkflow,
  sensorCalibration,
} from "./workflows";

const control = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  initial: number,
) => ({ key, label, min, max, step, initial });
const simulation = (
  title: string,
  objective: string,
  controls: LabDefinition["controls"],
  run: LabDefinition["run"],
  text?: LabDefinition["text"],
): LabDefinition => ({
  area: "systems",
  kind: "模拟",
  title,
  objective,
  controls,
  run,
  text,
});
const compute = (
  area: LabDefinition["area"],
  title: string,
  objective: string,
  controls: LabDefinition["controls"],
  run: LabDefinition["run"],
  text?: LabDefinition["text"],
): LabDefinition => ({
  area,
  kind: "计算",
  title,
  objective,
  controls,
  run,
  text,
});
export const appliedLabs = {
  "research-permutation": compute(
    "research",
    "穷举随机分配检验",
    "锁定两组样本量，枚举所有可能分组。适用于随机分配或在零假设下标签可交换的课堂数据。",
    [control("size", "A 组人数", 2, 10, 1, 3)],
    ({ size = 3 }, text) => {
      const trace = exactRandomization(text, size);
      return {
        metrics: [
          ["A−B 均值差", trace.observed],
          ["有效分组数", trace.draws],
          ["精确双侧 p 值", trace.p],
        ],
        trace,
        points: trace.distribution.map((y, x) => ({ x, y, group: 0 })),
      };
    },
    { label: "输入读数，前 n 个属于 A", initial: "1 2 3 7 8 9" },
  ),
  "collision-3d": simulation(
    "投影重叠与三维碰撞",
    "固定前两个轴，沿深度轴拖动第二个盒，检验体积如何从正变为零。",
    [control("depth", "第二盒深度起点", -4, 10, 1, 3)],
    ({ depth = 3 }) => {
      const area = model.overlap(0, 0, 4, 3, 2, 1, 3, 3).area;
      const span = Math.max(0, Math.min(4, depth + 3) - Math.max(0, depth));
      return {
        metrics: [
          ["投影面积", area],
          ["深度交叠", span],
          ["真实交叠体积", area * span],
        ],
        trace: { depth, area, span },
      };
    },
  ),
  "workflow-dag": compute(
    "algorithms",
    "工作流依赖与关键路径",
    "编辑任务时长及上游依赖。模型假设可用工人充足，给出最早完成时间并拒绝循环。",
    [],
    (_, text) => {
      const trace = scheduleWorkflow(text);
      return {
        metrics: [
          ["最早完成时刻", trace.elapsed],
          ["已调度任务数", trace.tasks.length],
        ],
        trace,
      };
    },
    {
      label: "每行任务名,时长,上游1,上游2",
      initial: "A,3\nB,5\nC,4,A,B\nD,2,C",
    },
  ),
  "mobile-restore": simulation(
    "页面的进程回收与恢复",
    "编辑草稿、保存、关闭模拟进程再重开，核对持久状态和临时状态。",
    [],
    (_, text) => {
      const trace = mobileRestore(text.trim().split(/\s+/));
      return {
        metrics: [
          ["当前草稿", trace.draft],
          ["可恢复持久值", trace.storage],
          ["进程状态", trace.alive ? "运行" : "回收"],
        ],
        trace,
      };
    },
    {
      label: "依次输入 edit:数字、save、kill、open",
      initial: "edit:4 save edit:8 kill open",
    },
  ),
  "sensor-calibration": compute(
    "data",
    "两点线性传感器标定",
    "用 5℃ 和 45℃ 两个参考点反算斜率及温度。改变读数偏置，比较内插与外推。",
    [
      control("low", "低温参考码", 0, 900, 10, 100),
      control("high", "高温参考码", 10, 1020, 10, 500),
      control("reading", "原始码值", 0, 1020, 10, 280),
      control("offset", "已知偏移码值", -100, 100, 5, 0),
    ],
    ({ low = 100, high = 500, reading = 280, offset = 0 }) => {
      const trace = sensorCalibration(low, high, reading, offset);
      return {
        metrics: [
          ["估计温度 ℃", trace.temperature],
          ["斜率 ℃/码", trace.slope],
          ["解释范围", trace.inRange ? "标定区间内" : "外推"],
        ],
        trace,
      };
    },
  ),
  "telemetry-ids": simulation(
    "离线遥测与重发",
    "输入接收顺序并对照事件序号。重复记录去重，按最终已知范围报告缺口。",
    [],
    (_, text) => {
      const trace = recordTelemetry(text);
      return {
        metrics: [
          ["独立事件数", trace.unique],
          ["缺口数量", trace.missing.length],
          ["重放次数", trace.trace.length - trace.unique],
        ],
        trace,
      };
    },
    { label: "接收到的序号", initial: "7 8 8 10" },
  ),
  "closed-loop": compute(
    "math",
    "离散反馈的稳定边界",
    "调节反馈增益，检查闭环极点、交替符号和幅度是否衰减。",
    [
      control("a", "自由响应系数 a", -1, 2, 0.1, 0.9),
      control("b", "控制系数 b", 0.1, 1, 0.1, 0.4),
      control("gain", "比例反馈增益", 0, 5, 0.1, 3),
    ],
    ({ a = 0.9, b = 0.4, gain = 3 }) => {
      const trace = closedLoop(a, b, gain, 2);
      return {
        metrics: [
          ["闭环极点", trace.pole],
          ["模型渐近稳定", trace.stable ? "是" : "否"],
          ["第二步状态", trace.points[2]!.y],
        ],
        trace,
        points: trace.points,
      };
    },
  ),
  "game-loop": simulation(
    "固定步长的小游戏",
    "改变渲染间隔，比较物理步数、最终位置和渲染次数。",
    [control("frame", "渲染间隔 ms", 10, 90, 5, 30)],
    ({ frame = 30 }) => {
      const trace = model.gameFrames(frame);
      return {
        metrics: [
          ["渲染次数", trace.length],
          ["终点位移", trace.at(-1)!.position],
          ["剩余毫秒", trace.at(-1)!.accumulator],
        ],
        trace,
        points: trace.map((row) => ({ x: row.time, y: row.position })),
      };
    },
  ),
  "game-movement": compute(
    "math",
    "屏幕上的方向与位移",
    "比较数学坐标与向下递增的屏幕纵坐标。",
    [
      control("heading", "方向（度）", -180, 180, 5, 30),
      control("speed", "速度", 0, 10, 1, 4),
      control("duration", "时长（秒）", 1, 10, 1, 2),
    ],
    ({ heading = 30, speed = 4, duration = 2 }) => {
      const trace = model.movement(2, 3, speed, duration, heading);
      return {
        metrics: [
          ["终点 x", trace.x],
          ["数学 y", trace.y],
          ["屏幕 y", 6 - trace.y],
        ],
        trace,
        points: [{ x: 2, y: 3 }, trace],
      };
    },
  ),
  "game-collision": simulation(
    "两个矩形相撞吗",
    "拖动移动盒，比较接触与具有正面积的重叠。",
    [
      control("x", "移动盒横坐标", 0, 10, 1, 3),
      control("y", "移动盒纵坐标", 0, 8, 1, 3),
    ],
    ({ x = 3, y = 3 }) => {
      const trace = model.overlap(x, y, 3, 2, 5, 3, 2, 2);
      return {
        metrics: [
          ["交集面积", trace.area],
          ["水平交叠", trace.horizontal],
          ["垂直交叠", trace.vertical],
        ],
        trace,
      };
    },
  ),
  "game-state": simulation(
    "游戏状态与合法事件",
    "编辑事件顺序，观察不合法事件保留原状态。",
    [],
    (_, text) => {
      const trace = model.stateTrace(text.split(/\s+/).filter(Boolean));
      return {
        metrics: [
          ["最终状态", trace.at(-1)?.state ?? "idle"],
          ["拒绝事件", trace.filter((o) => !o.accepted).length],
        ],
        trace,
      };
    },
    {
      label: "依次输入 start、pause、resume、finish、reset",
      initial: "start pause finish resume finish",
    },
  ),
  "game-behavior": simulation(
    "守卫的行为树",
    "提升威胁或降低电量，观察优先分支和短路。",
    [
      control("threat", "威胁值", 0, 10, 1, 4),
      control("energy", "电量", 0, 10, 1, 2),
    ],
    ({ threat = 4, energy = 2 }) => {
      const trace = model.behavior(threat, energy);
      return {
        metrics: [
          ["选择行为", trace.choice],
          ["检查条件数", trace.tested.length],
        ],
        trace,
      };
    },
  ),
  "game-network": simulation(
    "快照和插值",
    "改变快照年龄和插值权重，对照权威状态与显示位置。",
    [
      control("lag", "快照年龄（秒）", 0, 3, 0.25, 0.5),
      control("blend", "插值权重", 0, 1, 0.1, 0.5),
      control("speed", "速度", 0, 8, 1, 4),
    ],
    ({ lag = 0.5, blend = 0.5, speed = 4 }) => {
      const trace = model.snapshot(0, speed, lag, blend);
      return {
        metrics: [
          ["下一快照", trace.next],
          ["外推估计", trace.arrivalPosition],
          ["插值显示", trace.predicted],
        ],
        trace,
      };
    },
  ),
  "graphics-projection": compute(
    "math",
    "透视投影和采样覆盖",
    "调节物体深度，检查投影顶点与覆盖的网格中心。",
    [
      control("depth", "正向深度", 1, 12, 1, 4),
      control("width", "模型宽度", 1, 6, 0.5, 3),
      control("light", "受光角（度）", 0, 180, 5, 30),
    ],
    ({ depth = 4, width = 3, light = 30 }) => {
      const trace = model.raster(width, depth, light);
      return {
        metrics: [
          ["覆盖采样数", trace.pixels.length],
          ["投影宽度", trace.vertices[1]!.x - trace.vertices[0]!.x],
          ["亮度", trace.pixels[0]?.illumination ?? null],
        ],
        trace,
        points: trace.pixels.map((p) => ({ x: p.x, y: p.y, group: 0 })),
      };
    },
  ),
  "graphics-material": compute(
    "math",
    "材料的角度响应",
    "同一扫描余弦分别代入 Fresnel 与 GGX 法线分布，检查入射角和粗糙度的不同作用。",
    [
      control("base", "漫反射颜色分量", 0, 1, 0.05, 0.6),
      control("cosine", "方向点积", 0, 1, 0.05, 0.5),
      control("roughness", "粗糙度", 0.1, 1, 0.05, 0.5),
    ],
    ({ base = 0.6, cosine = 0.5, roughness = 0.5 }) => {
      const trace = model.dielectric(base, cosine, roughness);
      return {
        metrics: [
          ["Fresnel 反射系数", trace.reflectance],
          ["剩余漫反射权重", trace.diffuseWeight],
          ["GGX 法线分布密度", trace.normalDensity],
        ],
        trace,
        points: Array.from({ length: 21 }, (_, i) => ({
          x: i / 20,
          y: model.dielectric(base, i / 20, roughness).reflectance,
        })),
      };
    },
  ),
  "physics-fall": simulation(
    "离散重力与反弹",
    "调节时间步和恢复系数。模型在穿过地面后纠正位置。",
    [
      control("height", "初始高度", 1, 9, 1, 4),
      control("elasticity", "恢复系数", 0, 1, 0.05, 0.5),
      control("step", "更新时间步（秒）", 0.01, 0.1, 0.01, 0.04),
    ],
    ({ height = 4, elasticity = 0.5, step = 0.04 }) => {
      const o = model.fall(height, 9.81, elasticity, step);
      return {
        metrics: [
          ["向地面冲击计数", o.impacts],
          ["最终高度", o.points.at(-1)!.y],
          ["模拟时长", o.points.at(-1)!.x],
        ],
        trace: o,
        points: o.points,
      };
    },
  ),
  "procedural-terrain": compute(
    "algorithms",
    "带种子的地形生成",
    "先固定种子，单独修改细节幅度，再检查控制点和随机结果。",
    [
      control("seed", "种子", 1, 99, 1, 11),
      control("noise", "细节幅度", 0, 2, 0.1, 0.4),
    ],
    ({ seed = 11, noise = 0.4 }) => {
      const trace = model.terrain(seed, noise);
      return {
        metrics: [
          ["最高点", Math.max(...trace.map((p) => p.y))],
          ["中心高度", trace[16]!.y],
        ],
        trace,
        points: trace,
      };
    },
  ),
  "arduino-board": simulation(
    "分压、ADC 和 PWM",
    "使用理想电源和已知电阻计算电流，ADC 与 PWM 分别建模。请在真实设备查对应数据手册。",
    [
      control("supply", "供电与 ADC 基准（V）", 3, 5, 0.5, 5),
      control("resistance", "电阻（Ω）", 100, 1000, 50, 250),
      control("input", "采样电压（V）", 0, 5, 0.25, 2.5),
      control("pwm", "占空比 %", 0, 100, 5, 40),
    ],
    ({ supply = 5, resistance = 250, input = 2.5, pwm = 40 }) => {
      const trace = model.electronics(supply, resistance, input, pwm);
      return {
        metrics: [
          ["电流 mA", trace.milliamps],
          ["电阻功率 W", trace.watts],
          ["ADC 读数", trace.adc],
          ["PWM 平均电压", trace.average],
        ],
        trace,
      };
    },
  ),
  "embedded-queue": simulation(
    "中断事件与缓冲区",
    "改变事件频率或消费频率，观察积压与溢出。每个时间格先消费再入队。",
    [
      control("period", "事件间隔", 1, 12, 1, 3),
      control("service", "消费间隔", 1, 12, 1, 4),
      control("size", "缓冲上限", 1, 12, 1, 4),
    ],
    ({ period = 3, service = 4, size = 4 }) => {
      const o = model.mailbox(period, service, size);
      return {
        metrics: [
          ["丢弃事件", o.drops],
          ["已处理", o.completed],
          ["最终队长", o.backlog],
        ],
        trace: o.trace,
        points: o.trace.map((v) => ({ x: v.tick, y: v.backlog })),
      };
    },
  ),
  "signal-sampling": compute(
    "math",
    "抽样与混叠",
    "比较实际频率和采样后不可辨别的折叠频率。",
    [
      control("rate", "采样率 Hz", 4, 40, 1, 10),
      control("frequency", "输入 Hz", 1, 40, 1, 7),
    ],
    ({ rate = 10, frequency = 7 }) => {
      const trace = model.sampleSignals(rate, frequency);
      return {
        metrics: [
          ["混叠频率 Hz", trace.fold],
          ["含两端的采样点数", trace.points.length],
        ],
        trace,
        points: trace.points,
      };
    },
  ),
  "robot-control": simulation(
    "带负载扰动的 PID",
    "改变比例、积分和微分增益，检验稳态误差、输出上限及轨迹。",
    [
      control("target", "目标", 1, 6, 0.25, 3),
      control("gain", "比例增益", 0, 5, 0.25, 2),
      control("integral", "积分增益", 0, 3, 0.25, 1),
      control("derivative", "微分增益", 0, 1, 0.05, 0.1),
      control("external", "后段扰动", -2, 2, 0.25, -1),
    ],
    ({
      target = 3,
      gain = 2,
      integral = 1,
      derivative = 0.1,
      external = -1,
    }) => {
      const trace = model.controller(
        target,
        gain,
        integral,
        derivative,
        external,
      );
      return {
        metrics: [
          ["终点误差", trace.error],
          ["最高位置", trace.max],
          ["输出绝对峰值", Math.max(...trace.actions.map(Math.abs))],
        ],
        trace,
        points: trace.points,
      };
    },
  ),
  "robot-pose": compute(
    "math",
    "差速车的弧线与直线",
    "单独改变一侧轮速，比较车体姿态及终点。",
    [
      control("left", "左轮速度 m/s", -2, 2, 0.1, 0.4),
      control("right", "右轮速度 m/s", -2, 2, 0.1, 0.6),
      control("spacing", "轮间距 m", 0.2, 2, 0.1, 0.5),
      control("seconds", "时间 s", 0.5, 6, 0.5, 2),
    ],
    ({ left = 0.4, right = 0.6, spacing = 0.5, seconds = 2 }) => {
      const trace = model.robotPose(left, right, spacing, seconds);
      return {
        metrics: [
          ["终点 x", trace.x],
          ["终点 y", trace.y],
          ["朝向 rad", trace.angle],
        ],
        trace,
        points: Array.from({ length: 21 }, (_, i) =>
          model.robotPose(left, right, spacing, (i * seconds) / 20),
        ),
      };
    },
  ),
  "robot-filter": compute(
    "statistics",
    "测量融合与不确定性",
    "用同一位置读数对比不同测量方差，观察 Kalman 增益与后验。",
    [
      control("prior", "预测位置", 0, 10, 0.5, 4),
      control("observed", "测量位置", 0, 10, 0.5, 7),
      control("uncertainty", "预测方差", 0.25, 10, 0.25, 2),
      control("noise", "测量方差", 0.25, 10, 0.25, 1),
    ],
    ({ prior = 4, observed = 7, uncertainty = 2, noise = 1 }) => {
      const trace = model.bayesSensor(prior, observed, uncertainty, noise);
      return {
        metrics: [
          ["后验位置", trace.posterior],
          ["增益", trace.gain],
          ["后验方差", trace.uncertainty],
        ],
        trace,
      };
    },
  ),
  "robot-particles": compute(
    "statistics",
    "粒子加权与系统重采样",
    "固定随机种子，比较不同测量噪声下的有效样本数。",
    [
      control("seed", "种子", 1, 99, 1, 13),
      control("observed", "传感器位置", -6, 6, 0.25, 2),
      control("spread", "测量标准差", 0.25, 5, 0.25, 1),
      control("count", "粒子数", 8, 96, 8, 32),
    ],
    ({ seed = 13, observed = 2, spread = 1, count = 32 }) => {
      const trace = model.particleSensor(seed, observed, spread, count);
      return {
        metrics: [
          ["加权位置", trace.estimate],
          ["有效样本数", trace.effective],
        ],
        trace,
        points: trace.particles.map((x, i) => ({
          x,
          y: trace.residues[i]!,
          group: 0,
        })),
      };
    },
  ),
  "robot-slam": compute(
    "math",
    "同一地标的两个距离",
    "把原点固定，变化一条测量，检查二维未知量的最小二乘残差。",
    [
      control("displacement", "里程计位移", 1, 8, 0.5, 3),
      control("before", "第一次有符号距离", 1, 12, 0.5, 7),
      control("after", "第二次有符号距离", -3, 10, 0.5, 2),
      control("origin", "固定原点", -5, 5, 1, 0),
    ],
    ({ displacement = 3, before = 7, after = 2, origin = 0 }) => {
      const trace = model.landmarkMap(displacement, before, after, origin);
      return {
        metrics: [
          ["第二姿态", trace.pose],
          ["地标坐标", trace.landmark],
          ["平方误差", trace.residuals.reduce((s, r) => s + r * r, 0)],
        ],
        trace,
      };
    },
  ),
  "robot-route": compute(
    "algorithms",
    "网格路径搜索",
    "编辑障碍，比较路径存在性、步数和搜索范围。",
    [],
    (_, text) => {
      const trace = model.planGrid(text);
      return {
        metrics: [
          ["最短步数", trace.path.length ? trace.path.length - 1 : null],
          ["访问格数", trace.visited],
        ],
        trace,
        points: trace.path,
      };
    },
    { label: "路网（S 起点，G 终点，# 障碍）", initial: "S....\n.###.\n....G" },
  ),
  "robot-vision": compute(
    "data",
    "从灰度图计算目标质心",
    "编辑小型像素矩阵并修改阈值。没有选中像素时质心未定义。",
    [control("threshold", "灰度阈值", 0, 9, 1, 6)],
    ({ threshold = 6 }, text) => {
      const trace = model.vision(text, threshold);
      return {
        metrics: [
          ["横向质心", trace.centroid?.x ?? null],
          ["纵向质心", trace.centroid?.y ?? null],
          ["阈值内点数", trace.points.length],
        ],
        trace,
        points: trace.points,
      };
    },
    { label: "灰度矩阵（0–9）", initial: "01221\n04691\n01781\n00100" },
  ),
  "rtos-schedule": simulation(
    "两个周期任务的实时调度",
    "在理想单核上按最早截止期优先模拟 60 个时间格。",
    [
      control("period", "A 周期", 4, 20, 1, 5),
      control("cost", "A 执行时长", 1, 15, 1, 2),
      control("other", "B 周期", 4, 30, 1, 10),
      control("second", "B 执行时长", 1, 20, 1, 3),
    ],
    ({ period = 5, cost = 2, other = 10, second = 3 }) => {
      const trace = model.periodicSchedule(period, cost, other, second);
      return {
        metrics: [
          ["截止期限违约", trace.misses],
          ["利用率需求", trace.utilization],
        ],
        trace: trace.trace,
      };
    },
  ),
  "office-automation": simulation(
    "自动化事件的校验与幂等写入",
    "重放输入并核对去重。实验不联系 Google 或任何外部服务。",
    [
      control("minimum", "最低接受数值", 0, 100, 1, 0),
      control("retry", "首条重放（0/1）", 0, 1, 1, 1),
    ],
    ({ minimum = 0, retry = 1 }, text) => {
      const trace = model.workflow(text, minimum, Boolean(retry));
      return {
        metrics: [
          ["独立写入数", trace.count],
          ["合计", trace.total],
          ["正常重放", trace.trace.filter((row) => row.status === 200).length],
        ],
        trace,
      };
    },
    {
      label: "输入 ID,数值,record（每行一条）",
      initial: "jam-01,12,record\njam-02,4,record\njam-02,16,record",
    },
  ),
  "sequence-align": compute(
    "algorithms",
    "抽象字母序列对齐",
    "用单价插入、删除和替换比较两条字母序列。",
    [],
    (_, text) => {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length !== 2) throw Error("输入恰好两行抽象字母序列。");
      const trace = model.alignSequences(lines[0]!, lines[1]!);
      return {
        metrics: [
          ["最少编辑数", trace.distance],
          ["DP 表格项", trace.costs.length * trace.costs[0]!.length],
        ],
        trace,
      };
    },
    { label: "抽象序列（两行）", initial: "ABCD\nADC" },
  ),
  "gis-distance": compute(
    "data",
    "两地的大圆距离",
    "比较经纬差、距离及接近反经线时的行为。",
    [
      control("la", "A 纬度", -90, 90, 1, 0),
      control("lo", "A 经度", -180, 180, 1, 179),
      control("lb", "B 纬度", -90, 90, 1, 0),
      control("ln", "B 经度", -180, 180, 1, -179),
    ],
    ({ la = 0, lo = 179, lb = 0, ln = -179 }) => {
      const distance = model.geoDistance(la, lo, lb, ln);
      return {
        metrics: [
          ["球面距离 km", distance],
          ["原始经度差", ln - lo],
        ],
        trace: { la, lo, lb, ln, distance },
      };
    },
  ),
  "finance-npv": compute(
    "statistics",
    "现金流折现",
    "改变每期折现率，比较回收额和现值。样本为虚构现金流。",
    [control("rate", "折现率 %", 0, 30, 0.5, 10)],
    ({ rate = 10 }, text) => {
      const fields = text.trim().split(/[ ,\n]+/);
      const values = fields.map(Number);
      if (
        values.length < 2 ||
        values.length > 24 ||
        !text.trim() ||
        values.some((x) => !Number.isFinite(x) || Math.abs(x) > 1e9)
      )
        throw Error("输入 2–24 个有限现金流，第一项为当期现金流。");
      const net = model.discounted(values, rate / 100);
      return {
        metrics: [
          ["净现值", net],
          ["未折现合计", model.discounted(values, 0)],
        ],
        trace: { values, net },
        points: values.map((_, i) => ({
          x: i,
          y: model.discounted(values.slice(0, i + 1), rate / 100),
        })),
      };
    },
    { label: "现金流（空格分隔）", initial: "-100 60 60" },
  ),
  "quantum-phase": compute(
    "math",
    "单量子位干涉计算",
    "改变相位并切换末尾 Hadamard 门，对照振幅和测量概率。经典计算机上直接计算复振幅。",
    [
      control("angle", "相位（度）", 0, 360, 5, 90),
      control("gate", "末尾 H（0/1）", 0, 1, 1, 1),
    ],
    ({ angle = 90, gate = 1 }) => {
      const trace = model.quantumInterference(angle, Boolean(gate));
      return {
        metrics: [
          ["测得 0 的概率", trace.probabilities[0]!],
          ["测得 1 的概率", trace.probabilities[1]!],
          ["概率总和", trace.probabilities.reduce((a, b) => a + b)],
        ],
        trace,
      };
    },
  ),
} satisfies Record<string, LabDefinition>;
