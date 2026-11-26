import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULT_PREFERENCES as defaults, PREFERENCES_KEY, readPreferences, resolvedTheme, validNickname, isCurrentPreferences } from "../src/preferences/model";
import { routeView, routeNode, routeCounts, nodeState, continuation } from "../src/content/route-view";
import { curriculum } from "../src/content/academy";
import { emptyProgress, completeLesson } from "../src/progress/store";
import { getLesson } from "../src/content";
import protectedArt from "../docs/p2/PROTECTED_ART.json";
import protectedImplementation from "../docs/p2/PROTECTED_IMPLEMENTATION.json";
import installed from "../docs/p2/ASSET_INSTALLATION.json";
const storage = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
describe("P2 versioned independent preferences", () => {
  it("defaults dark regardless of OS and conservatively reads legacy theme/font without writes", () => {
    expect(readPreferences(storage({}))).toEqual(defaults);
    expect(readPreferences(storage({ "nico-settings": '{"font":"large","theme":"light"}' }))).toMatchObject({ font: "large", theme: "light" });
    expect(readPreferences({ getItem: () => { throw Error("blocked"); } })).toEqual(defaults);
    expect(resolvedTheme(defaults, false)).toBe("dark");
  });
  it("round-trips every real preference and responds to system choice only when requested", () => {
    const p = { ...defaults, theme: "system" as const, font: "large" as const, density: "compact" as const, motion: "reduce" as const, landing: "/me" as const, nickname: "Nico 学习者", learningPath: "b" as const, showPlanned: false, resumeHome: false, showAiLinks: false };
    expect(readPreferences(storage({ [PREFERENCES_KEY]: JSON.stringify(p) }))).toEqual(p); expect(isCurrentPreferences(JSON.stringify(p))).toBe(true);
    expect(resolvedTheme(p, true)).toBe("dark"); expect(resolvedTheme(p, false)).toBe("light"); expect(resolvedTheme({ ...p, theme: "dark" }, false)).toBe("dark");
  });
  it("handles malformed/old/future versions without interpreting unsafe landing or fake setting values", () => {
    expect(readPreferences(storage({ [PREFERENCES_KEY]: "broken", "nico-theme": "light" })).theme).toBe("light");
    expect(readPreferences(storage({ [PREFERENCES_KEY]: '{"schemaVersion":0,"nickname":"迁移昵称","showPlanned":false}' }))).toMatchObject({ schemaVersion: 1, nickname: "迁移昵称", showPlanned: false });
    expect(readPreferences(storage({ [PREFERENCES_KEY]: '{"schemaVersion":2,"nickname":"future"}' })).nickname).toBe("");
    expect(readPreferences(storage({ [PREFERENCES_KEY]: '{"schemaVersion":1,"landing":"https://bad.example","showPlanned":"false","density":"huge"}' }))).toMatchObject({ landing: "/", showPlanned: true, density: "comfortable" });
    expect(isCurrentPreferences("broken")).toBe(false); expect(isCurrentPreferences('{"schemaVersion":2}')).toBe(false);
  });
  it("validates nickname length/hidden characters while preserving Chinese names and empty fallback", () => {
    expect(validNickname("学习者".repeat(8))).toBe(true); expect(validNickname("x".repeat(25))).toBe(false); expect(validNickname("a\nb")).toBe(false); expect(validNickname("a\u202Eb")).toBe(false); expect(validNickname("")).toBe(true);
  });
});
describe("P2 deterministic route consistency without new lesson semantics", () => {
  it("keeps A21/A22 in A3 as learnable draft lessons and preserves four units", () => {
    const a = routeView("a")!; expect(a.units.map(u => u.id)).toEqual(["a1", "a2", "a3", "a4"]); expect(a.nodes).toHaveLength(22);
    expect(routeCounts(a.nodes, emptyProgress())).toEqual({ total: 22, available: 22, planned: 0, completed: 0 });
    for (const code of ["A21", "A22"]) { const c = curriculum.find(c => c.id === code)!; const n = a.nodes.find(n => n.code === code)!; expect(n).toEqual(routeNode(c)); expect(n.unit).toBe("a3"); expect(n.available).toBe(true); expect(n.lesson?.quality.state).toBe("draft"); expect(n.plannedArt).toBeUndefined(); expect(getLesson(n.id)?.art).toBe(code === "A21" ? "lesson-a21-http-status-centered.png" : "planned-a22-error-logs.png"); }
    expect(a.units.flatMap(u => u.nodes).map(n => n.code).sort()).toEqual(a.nodes.map(n => n.code).sort());
  });
  it("distinguishes availability, real completion, next state and draft/pilot quality", () => {
    const a = routeView("a")!, p = completeLesson(emptyProgress(), "a01-binary", { firstTryCorrect: 3, quizTotal: 4 }, new Date("2026-11-17T00:00:00Z"));
    expect(nodeState(a.nodes[0]!, p, a.nodes[0]!.id)).toBe("completed"); expect(nodeState(a.nodes[1]!, p, a.nodes[1]!.id)).toBe("current"); expect(nodeState(a.nodes[2]!, p)).toBe("available");
    const planned = routeView("c", "Intermediate")!.nodes.find(n => n.code === "C-I03")!; expect(nodeState(planned, { ...p, lessons: { ...p.lessons, [planned.id]: p.lessons["a01-binary"]! } })).toBe("planned");
    expect(routeCounts(a.nodes, p).completed).toBe(1); expect(a.nodes[0]!.lesson?.quality.state).toBe("draft");
  });
  it("scales all stages/routes with no invented availability and rejects unknown identities", () => {
    for (const stage of ["Foundation", "Intermediate", "Advanced"] as const) for (const track of ["a", "b", "c", "d", "e", "f", "m"]) {
      const r = routeView(track, stage)!; expect(r.nodes).toHaveLength(curriculum.filter(c => c.stage === stage && c.track.toLowerCase() === track).length);
      expect(r.nodes.every(n => n.available === Boolean(n.lesson))).toBe(true); expect(r.nodes.filter(n => n.available).map(n => n.code)).toEqual(r.nodes.filter(n => n.course.status === "live").map(n => n.code));
    }
    expect(routeView("unknown")).toBeUndefined();
  });
  it("recommendations use actual resume/unfinished lessons and a nonempty preferred route only when available", () => {
    const p = { ...emptyProgress(), resume: { lessonId: "a07-os", step: 3 } };
    expect(continuation(p)?.id).toBe("a07-os"); expect(continuation(p, false)?.id).toBe("a01-binary"); expect(continuation(p, false, "b")?.id).toBe("b01-variables"); expect(continuation(p, false, "f")?.id).toBe("f01-circuits-current"); expect(continuation(p, false, "m")?.id).toBe("a01-binary");
  });
});
describe("P2 art and implementation protection", () => {
  it("preserves all 86 baseline art files byte for byte", () => { expect(Object.keys(protectedArt)).toHaveLength(86); for (const [file, digest] of Object.entries(protectedArt)) expect(hash(readFileSync(file)), file).toBe(digest); });
  it("preserves all teaching, grading, simulator, AI and progress implementations, permitting only art metadata", () => {
    for (const [file, entry] of Object.entries(protectedImplementation.files)) { let b: Buffer | string = readFileSync(file); if (entry.mode === "lesson-art") b = b.toString().replace(/\bart(?:Pending)?\s*:\s*(?:"[^"]+"|true|false)\s*,?/g, "ART_METADATA,"); expect(hash(b), file).toBe(entry.sha256); }
  });
  it("installs exact independent PNG/SVG resources, 16:9 course canvases and never the contact sheet", () => {
    expect(installed.files).toHaveLength(28);
    for (const f of installed.files) { const b = readFileSync(f.installed); expect(hash(b), f.installed).toBe(f.sha256); expect(f.source).toMatch(/^assets\//); if (f.source.startsWith("assets/course/") && f.installed.endsWith(".png")) { expect(b.readUInt32BE(16)).toBe(1600); expect(b.readUInt32BE(20)).toBe(900); } }
  });
});
