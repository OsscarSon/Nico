import { describe, it, expect } from "vitest";
import { ELEMENT_IDS, type ElementId } from "../src/ai/elements";
import { challengeFeedback, requiredMet, scorePrompt } from "../src/grading/promptScore";
import { holdout, samples } from "./fixtures/promptSamples";
import { presets } from "../src/features/prompt-lab/presets";
import { c05 } from "../src/content/lessons/c05-prompt-structure";

const present = (text: string) =>
  Object.fromEntries(scorePrompt(text).results.map((r) => [r.id, r.present])) as Record<ElementId, boolean>;

/** 逐项对比标注，返回不一致的 “样例id:要素”。 */
function disagreements(set: typeof samples) {
  const out: string[] = [];
  for (const s of set) {
    const got = present(s.prompt);
    for (const id of ELEMENT_IDS) if (got[id] !== s.label[id]) out.push(`${s.id}:${id}`);
  }
  return out;
}

/** Spearman 等级相关：只看“规则数出的项数”和“标注的项数”排序是否一致。 */
function spearman(a: number[], b: number[]) {
  const rank = (xs: number[]) => {
    const idx = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = Array<number>(xs.length);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
      for (let k = i; k <= j; k++) r[idx[k]![1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a), rb = rank(b);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

describe("prompt scorer vs labeled samples", () => {
  it("has 20 tuning samples and 10 held-out samples", () => {
    expect(samples.length).toBe(20);
    expect(holdout.length).toBe(10);
  });

  it("agrees with the labels on the 20 tuning samples (they were used to tune the rules, so this is NOT evidence of accuracy)", () => {
    expect(disagreements(samples)).toEqual([]);
  });

  it("held-out samples: the only remaining disagreements are the known English blind spots", () => {
    // 留出集第一次（调规则之前）运行的结果是 49/60 = 81.7%；修了几处通用问题后是 57/60。
    // 剩下的三处是英文写法（“for two people”、“day-by-day list”、“budget of $1500”），规则以中文为主，没有去追。
    expect(disagreements(holdout)).toEqual(["h29:context", "h29:format", "h29:constraints"]);
  });

  it("element-level agreement over all 30 samples is at least 95%", () => {
    const wrong = disagreements([...samples, ...holdout]).length;
    const total = (samples.length + holdout.length) * ELEMENT_IDS.length;
    expect((total - wrong) / total).toBeGreaterThanOrEqual(0.95);
  });

  it("the number of elements the rules find tracks the labeled number (Spearman >= 0.9)", () => {
    const all = [...samples, ...holdout];
    const labeled = all.map((s) => ELEMENT_IDS.filter((id) => s.label[id]).length);
    const found = all.map((s) => scorePrompt(s.prompt).presentCount);
    expect(spearman(labeled, found)).toBeGreaterThanOrEqual(0.9);
  });
});

describe("prompt scorer behaviour", () => {
  it("an empty prompt has no elements and no next step", () => {
    const r = scorePrompt("   ");
    expect(r.level).toBe("empty");
    expect(r.presentCount).toBe(0);
    expect(r.nextStep).toBe(null);
  });

  it("listing the six labels without content does not light anything (keyword stuffing)", () => {
    expect(scorePrompt("角色 任务 背景 格式 约束 示例").presentCount).toBe(0);
    expect(scorePrompt("格式：\n约束：\n示例：").presentCount).toBe(0);
  });

  it("a labelled line with content counts, and the evidence is the original line", () => {
    const r = scorePrompt("角色：资深编辑\n任务：润色这段话");
    const role = r.results.find((x) => x.id === "role")!;
    expect(role.present).toBe(true);
    expect(role.evidence).toContain("资深编辑");
  });

  it("evidence quotes the original text, including full-width punctuation", () => {
    const r = scorePrompt("我是高二学生，请帮我写演讲稿。");
    expect(r.results.find((x) => x.id === "context")!.evidence).toBe("我是高二学生");
  });

  it("“你是不是 / 你是谁” are questions, not role assignments", () => {
    expect(present("你是谁？").role).toBe(false);
    expect(present("你是不是应该先告诉我答案？").role).toBe(false);
    expect(present("你是一位耐心的老师。").role).toBe(true);
  });

  it("a negated verb is not a task", () => {
    expect(present("不要写太长。").task).toBe(false);
    expect(present("请写一首诗。").task).toBe(true);
  });

  it("levels follow the number of elements and require a task", () => {
    expect(scorePrompt("DNS").level).toBe("no-task");
    expect(scorePrompt("写个请假邮件").level).toBe("bare");
    expect(scorePrompt("你是一位老师。请解释 DNS，不超过 100 字。").level).toBe("draft");
    expect(scorePrompt(samples[6]!.prompt).level).toBe("solid");
    expect(scorePrompt(samples[17]!.prompt).level).toBe("full");
  });

  it("nextStep suggests the most useful missing element first, and role last", () => {
    expect(scorePrompt("写个请假邮件").nextStep).toBe("context");
    expect(scorePrompt("DNS").nextStep).toBe("task");
    const onlyRoleMissing = scorePrompt(samples[17]!.prompt.replace("你是一位小学语文老师。", ""));
    expect(onlyRoleMissing.nextStep).toBe("role");
  });

  it("a material pasted after a colon counts as context", () => {
    expect(present("请总结下面这段：\n小王周五前提交报告，小李下周一联系客户并确认报价。").context).toBe(true);
  });
});

describe("presets (weak vs strong)", () => {
  it("every strong example covers at least 4 elements and every weak one at most 2", () => {
    for (const p of presets) {
      expect(scorePrompt(p.strong).presentCount).toBeGreaterThanOrEqual(4);
      expect(scorePrompt(p.weak).presentCount).toBeLessThanOrEqual(2);
    }
  });
  it("preset ids are unique and prompts fit the request limit", () => {
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
    for (const p of presets) expect(p.strong.length).toBeLessThanOrEqual(1200);
  });
});

describe("challenge feedback", () => {
  const required: ElementId[] = ["task", "context", "format", "constraints"];

  it("requiredMet lists what is missing", () => {
    const r = requiredMet(scorePrompt("写个通知"), required);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["context", "format", "constraints"]);
  });

  it("the feedback message names the first missing element and how to fix it", () => {
    const f = challengeFeedback(scorePrompt("写个通知"), required);
    expect(f.ok).toBe(false);
    expect(f.message).toContain("还差：背景、格式、约束");
    expect(f.message).toContain("先补「背景」");
  });

  it("passes once every required element is present", () => {
    expect(challengeFeedback(scorePrompt(samples[6]!.prompt), ["task", "context", "format", "constraints"]).ok).toBe(true);
  });

  it("the C05 reference answer passes its own challenge, and a lazy answer does not", () => {
    const sim = c05.blocks.find((b) => b.type === "sim" && b.mode === "challenge");
    if (sim?.type !== "sim" || !sim.required || !sim.sample) throw new Error("c05 challenge is misconfigured");
    expect(challengeFeedback(scorePrompt(sim.sample), sim.required).ok).toBe(true);
    expect(challengeFeedback(scorePrompt("写个通知"), sim.required).ok).toBe(false);
  });
});

describe("pasted material", () => {
  it("“名称：一长段内容” counts as attached material", () => {
    expect(present("请整理成待办。\n会议记录：小王周五前提交报告，小李下周一联系客户并确认报价。").context).toBe(true);
  });
  it("a short “请回答：……” is not mistaken for material", () => {
    expect(present("请回答：为什么天空是蓝色的而不是别的颜色呢").context).toBe(false);
  });
});
