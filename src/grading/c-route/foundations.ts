import { select, type CLab } from "./types";

const predictions = {
  rain: { "雨伞": .7, "外套": .2, "书包": .1 },
  class: { "书包": .6, "外套": .3, "雨伞": .1 },
  trip: { "外套": .5, "书包": .35, "雨伞": .15 },
};

export const predict: CLab = {
  title: "让上下文改变预测",
  guide: "切换句子前半段，观察同一候选词在不同上下文中的权重。",
  goal: "让「书包」成为概率最高的续写，再检查分布。",
  controls: [select("prefix", "前半句", [["rain", "下雨了，出门带上"], ["class", "去上课前，带上"], ["trip", "山里很冷，最好带上"]])],
  run({ prefix }) {
    const entries = Object.entries(predictions[prefix as keyof typeof predictions] ?? predictions.rain);
    const [top] = entries.reduce((best, row) => row[1] > best[1] ? row : best);
    return {
      rows: entries.map(([word, probability]) => `${word} · ${Math.round(probability * 100)}%`),
      evidence: `最高项是「${top}」。权重来自教学样例表。`,
      passed: top === "书包",
    };
  },
};

export const context: CLab = {
  title: "给有效证据留预算",
  guide: "输入最多 120 字。模拟分词把连续英数字视为一块，其余非空白字符逐个计数。预算为 16，其中 4 留给答复。",
  goal: "让最后进入上下文的 12 个输入块同时包含「雨天改室内」和「周六见」。",
  controls: [{ id: "text", label: "输入资料", initial: "雨天改室内 今天先收拾器材再去大厅等同学 周六见", multiline: true }],
  run({ text }) {
    const tokens = (text ?? "").slice(0, 120).match(/[a-zA-Z0-9]+|[^\s]/gu) ?? [];
    const kept = tokens.slice(-12);
    const visible = kept.join("");
    const passed = visible.includes("雨天改室内") && visible.includes("周六见");
    return {
      rows: [`输入 ${tokens.length} 块，保留 ${kept.length} 块，舍弃 ${Math.max(0, tokens.length - 12)} 块`, kept.join(" / ") || "空"],
      evidence: passed ? "两条证据都进入了预算。" : "检查保留内容。删减闲聊可为必要事实留位置。",
      passed,
    };
  },
};

export function probabilities(weights: number[], temperature: number): number[] {
  if (temperature === 0) {
    const best = weights.indexOf(Math.max(...weights));
    return weights.map((_, index) => Number(index === best));
  }
  const scaled = weights.map(weight => weight ** (1 / temperature));
  const sum = scaled.reduce((a, b) => a + b, 0);
  return scaled.map(value => value / sum);
}
export const sample: CLab = {
  title: "比较同一组随机点",
  guide: "模拟器对同一组权重调温，并以相同的 8 个随机点做抽样，便于比较。",
  goal: "在首选词仍是「清爽」的前提下，让 8 次采样出现 3 种续写。",
  controls: [select("temp", "温度", [["0", "0（取最高项）"], [".5", "0.5"], ["1", "1.0"], ["2", "2.0"]])],
  run({ temp }) {
    const names = ["清爽", "凉快", "闷热"];
    const ps = probabilities([.72, .22, .06], Number(temp ?? 0));
    const draws = [.1, .42, .73, .75, .51, .85, .9, .33].map(point =>
      names[point < ps[0]! ? 0 : point < ps[0]! + ps[1]! ? 1 : 2]);
    const unique = new Set(draws).size;
    return {
      rows: [...names.map((name, i) => `${name} · ${(ps[i]! * 100).toFixed(1)}%`), draws.join(" → ")],
      evidence: `观察到 ${unique} 种续写。提高温度增加较低权重词的机会，不能校正事实。`,
      passed: unique === 3 && ps[0]! > ps[1]!,
    };
  },
};

const claimsSource = [
  { label: "集合时间", proposed: "星期六 9:00", actual: "星期六 9:00" },
  { label: "集合地点", proposed: "东门", actual: "西门" },
  { label: "票价", proposed: "免费", actual: null },
];
export const claims: CLab = {
  title: "逐条核对事实",
  guide: "主办方原文：「星期六 9:00 在西门集合」。原文没有说明票价。",
  goal: "提交逐条验收。确认时间、修正地点，将未知票价标为待核实。",
  controls: claimsSource.map(row => select(row.label, `${row.label} · 草稿写的是${row.proposed}`, [
    ["keep", "保留草稿"], ["correct", "用来源值替换"], ["unknown", "标为待核实"],
  ])),
  run(values) {
    const entries = claimsSource.map(row => {
      const decision = values[row.label];
      return decision === "correct" ? row.actual ?? "来源无值" : decision === "unknown" ? "待核实" : row.proposed;
    });
    return {
      rows: entries.map((value, i) => `${claimsSource[i]!.label} · ${value}（来源：${claimsSource[i]!.actual ?? "未提供"}）`),
      evidence: "只有来源中的事实可确认。来源缺失时保留待核实标记。",
      passed: entries[0] === "星期六 9:00" && entries[1] === "西门" && entries[2] === "待核实",
    };
  },
};
