import { describe, it, expect } from "vitest";
import { gradeWebChecks, previewDocument, type WebProbe } from "../src/grading/web";

const probe = (counts: Record<string, number>, texts: Record<string, string[]> = {}): WebProbe => ({
  count: (s) => counts[s] ?? 0,
  texts: (s) => texts[s] ?? [],
});

describe("gradeWebChecks", () => {
  it("passes when counts meet the minimum", () => {
    const r = gradeWebChecks(
      [{ label: "h1", selector: "h1" }, { label: "li", selector: "ul li", min: 3 }],
      probe({ h1: 1, "ul li": 3 }),
    );
    expect(r.ok).toBe(true);
  });
  it("says how many are missing", () => {
    const r = gradeWebChecks([{ label: "li", selector: "ul li", min: 3, hint: "用 li" }], probe({ "ul li": 1 }));
    expect(r.ok).toBe(false);
    expect(r.results[0]!.detail).toContain("至少 3 个");
    expect(r.results[0]!.detail).toContain("现在只有 1 个");
    expect(r.results[0]!.detail).toContain("用 li");
  });
  it("text must be contained (case-insensitive) in at least one match", () => {
    const checks = [{ label: "h1", selector: "h1", text: "Nico" }];
    expect(gradeWebChecks(checks, probe({ h1: 1 }, { h1: ["hello NICO"] })).ok).toBe(true);
    expect(gradeWebChecks(checks, probe({ h1: 1 }, { h1: ["hello"] })).ok).toBe(false);
  });
  it("a throwing probe (bad selector) fails that check instead of crashing", () => {
    const bad: WebProbe = { count: () => { throw new Error("bad selector"); }, texts: () => [] };
    const r = gradeWebChecks([{ label: "x", selector: "???" }], bad);
    expect(r.ok).toBe(false);
  });
  it("an empty check list is never a pass", () => {
    expect(gradeWebChecks([], probe({})).ok).toBe(false);
  });
});

describe("gradeWebChecks: computed styles", () => {
  const styled = (styles: Record<string, string[]>): WebProbe => ({
    count: () => 1,
    texts: () => [],
    styles: (sel, prop) => styles[`${sel}|${prop}`] ?? [],
    normalize: (_p, v) => ({ red: "rgb(255, 0, 0)", "#f00": "rgb(255, 0, 0)" }[v] ?? v),
  });
  const check = [{ label: "c", selector: "h1", style: { prop: "color", value: "red" }, hint: "写 color" }];
  it("passes when every element has the expected value, whatever way the value was written", () => {
    expect(gradeWebChecks(check, styled({ "h1|color": ["rgb(255, 0, 0)"] })).ok).toBe(true);
    expect(gradeWebChecks([{ ...check[0]!, style: { prop: "color", value: "#f00" } }], styled({ "h1|color": ["rgb(255, 0, 0)"] })).ok).toBe(true);
  });
  it("fails when any matched element differs, and says what it is now", () => {
    const r = gradeWebChecks(check, styled({ "h1|color": ["rgb(255, 0, 0)", "rgb(0, 0, 0)"] }));
    expect(r.ok).toBe(false);
    expect(r.results[0]!.detail).toContain("rgb(0, 0, 0)");
    expect(r.results[0]!.detail).toContain("写 color");
  });
  it("a style check with a probe that cannot read styles fails safely", () => {
    expect(gradeWebChecks(check, { count: () => 1, texts: () => [] }).ok).toBe(false);
  });
});

describe("previewDocument", () => {
  it("puts a content-security-policy before the learner's html and forbids network and scripts", () => {
    const d = previewDocument("<script>alert(1)</script>");
    expect(d.startsWith("<meta http-equiv=\"Content-Security-Policy\"")).toBe(true);
    expect(d).toContain("default-src 'none'");
    expect(d).not.toContain("script-src");
  });
});
