import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { allCatalogLessons, getLesson, validateContent } from "../src/content";
import { coursesFor, liveLessonFor, stageSummary } from "../src/content/academy";
import { continuation, routeView } from "../src/content/route-view";
import { lessonSchema } from "../src/content/schema";
import { programFor } from "../src/grading/code";
import { buildIndex, cosine, embed, evaluatePrompt, evaluateRag, readContract } from "../src/grading/intermediate/evidence";
import { pythonChallenge, pythonFree } from "../src/content/lessons/intermediate/pythonLab";
import { emptyProgress } from "../src/progress/store";

describe("中阶目录接入", () => {
  it("only opens the three intended intermediate records and keeps their stable identifiers", () => {
    expect(coursesFor("Intermediate").filter(c => c.status === "live").map(c => c.id)).toEqual(["B-I01", "C-I04", "C-I05"]);
    expect(coursesFor("Advanced").some(c => liveLessonFor(c))).toBe(false);
    expect(stageSummary("Intermediate")).toBe("已上线 3 / 46");
    expect(routeView("b", "Intermediate")?.units[0]?.nodes.map(n => n.id)).toEqual(["b-i01"]);
    expect(routeView("c", "Intermediate")?.units[0]?.nodes.map(n => n.id)).toEqual(["c-i04", "c-i05"]);
    const future = coursesFor("Intermediate", "B").find(c => c.id === "B-I02")!;
    expect(liveLessonFor({ ...future, status: "live" })).toBeUndefined();
    expect(routeView("c", "Foundation")?.nodes.some(n => n.id === "c-i04")).toBe(false);
    expect(allCatalogLessons().some(c => c.id === "c-i05" && c.status === "available")).toBe(true);
    expect(validateContent()).toEqual([]);
  });

  it("resumes a new lesson via existing storage data while keeping the Foundation default", () => {
    expect(continuation(emptyProgress(), true, "b")?.id).toBe("b01-variables");
    expect(continuation({ ...emptyProgress(), resume: { lessonId: "c-i05", step: 3 } })?.id).toBe("c-i05");
    expect(continuation({ ...emptyProgress(), resume: { lessonId: "c-i02", step: 3 } })?.id).toBe("a01-binary");
  });

  for (const id of ["b-i01", "c-i04", "c-i05"]) it(id + " is a complete illustrated draft", () => {
    const l = getLesson(id)!;
    expect(l.stage).toBe("Intermediate");
    expect(l.quality).toEqual({ state: "draft" });
    expect(lessonSchema.safeParse({ ...l, stage: undefined }).success).toBe(false);
    expect(l.blocks.map(b => b.type)).toEqual(["hook", "explain", "explain", "explain", "explain", "sim", "sim", "quiz", "transfer", "summary"]);
    expect(l.blocks.find(b => b.type === "quiz")?.items).toHaveLength(3);
    expect(l.sources).toHaveLength(3);
    const image = readFileSync("public/art/" + l.art);
    expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([1600, 900]);
  });
});

const run = (code: string) => spawnSync("python3", ["-I", "-c", code], { encoding: "utf8", timeout: 2000 });
const pythonAvailable = run("pass").status === 0;
it.skipIf(!pythonAvailable)("runs the Python example and every challenge check in real CPython", () => {
  expect(run(pythonFree.starter).stdout.trim()).toBe("17\n0");
  for (const check of pythonChallenge.checks!) {
    const result = run(programFor(pythonChallenge.solution!, check));
    expect(result.status, check.label + " " + result.stderr).toBe(0);
    expect(result.stdout.trim(), check.label).toBe(check.expect);
  }
  expect(run(programFor(pythonChallenge.starter, pythonChallenge.checks![0]!)).stdout.trim()).toBe("2");
});

describe("结构化输出与证据", () => {
  it("rejects invalid envelopes and extra fields", () => {
    expect(readContract('{"status":"answer","text":"例","citations":["H-2026"]}')).toMatchObject({ status: "answer" });
    for (const source of ["{", "null", "[]", '{"status":"answer","text":"例","citations":[5]}',
      '{"status":"answer","text":"例","citations":[],"action":"applied"}']) expect(readContract(source)).toBeUndefined();
  });

  it("keeps schema format, evidence priority and operation outcomes independent", () => {
    const mixed = evaluatePrompt({ priority: "merged", tool: "wide", format: "json" });
    expect(mixed.every(r => !r.accepted)).toBe(true);
    expect(mixed[0]?.raw).toContain("H-2024");
    expect(mixed[2]?.permission).toContain("拒绝");
    const proper = evaluatePrompt({ priority: "bounded", tool: "read", format: "json" });
    expect(proper.map(r => r.accepted)).toEqual([true, true, true]);
    expect(proper[0]?.raw).toContain("H-2026");
    expect(evaluatePrompt({ priority: "bounded", tool: "read", format: "text" }).every(r => !r.accepted)).toBe(true);
  });

  it("computes embeddings, cosine and source chunk boundaries", () => {
    expect(embed(["周六", "周六", "开放"])).toEqual([2, 1, 0, 0, 0, 0]);
    expect(cosine(embed(["周六"]), embed(["周六", "开放"]))).toBeCloseTo(Math.SQRT1_2);
    expect(cosine(embed(["不在词表"]), embed(["开放"]))).toBe(0);
    expect(buildIndex(1).map(r => r.id)).toContain("馆规-2026/2");
    expect(buildIndex(2)).toHaveLength(3);
  });

  it("requires the current passage to be recalled before reranking", () => {
    const topOne = evaluateRag({ size: 1, top: 1, rerank: true, abstain: true });
    expect(topOne.recall).toBe(0);
    expect(topOne.rows[0]?.evidence).toBe("馆规-2024/1");
    const valid = evaluateRag({ size: 1, top: 2, rerank: true, abstain: true });
    expect(valid).toMatchObject({ indexSize: 5, recall: 2, supported: 2, accepted: 3 });
    expect(valid.rows.map(r => r.evidence)).toEqual(["馆规-2026/1", "馆规-2026/2", null]);
    expect(evaluateRag({ size: 2, top: 2, rerank: true, abstain: true }).accepted).toBe(1);
    expect(evaluateRag({ size: 1, top: 2, rerank: true, abstain: false }).accepted).toBe(2);
  });
});
