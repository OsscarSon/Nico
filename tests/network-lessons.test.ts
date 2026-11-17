import { describe, expect, it } from "vitest";
import { lessons, nextAvailableAfter, validateContent } from "../src/content";
import { lessonSchema } from "../src/content/schema";
import { gradeChoice, gradeNumber } from "../src/grading/quiz";
import { initialForward, startForward, forwardStep } from "../src/grading/forwarding";
import { initialReassembly } from "../src/grading/reassembly";
import { initialTcp, startTcp, deliverTcp, sendTcpData } from "../src/grading/tcp";

describe("network lessons keep the full existing template", () => {
  for (const id of ["a11-devices", "a12-packets", "a14-tcp"]) it(`${id}: draft, explanations, real sims, diagnostics, transfer and traceable sources`, () => {
    const l = lessons[id]!; expect(lessonSchema.safeParse(l).success).toBe(true);
    expect(l.quality).toEqual({ state: "draft" }); expect(l.artPending).toBeUndefined(); expect(l.art).toBe(id === "a12-packets" ? "lesson-a12-packets-centered-batch02.png" : `lesson-${id}.png`);
    expect(l.blocks.filter(b => b.type === "explain")).toHaveLength(4);
    expect(l.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    const quiz = l.blocks.find(b => b.type === "quiz"); if (quiz?.type !== "quiz") throw Error("missing quiz");
    expect(quiz.items).toHaveLength(3);
    for (const q of quiz.items) q.options.forEach((_, i) => { expect(gradeChoice(q, i).correct).toBe(i === q.answer); expect(gradeChoice(q, i).message.length).toBeGreaterThan(10); });
    const t = l.blocks.find(b => b.type === "transfer"); if (t?.type !== "transfer") throw Error("missing transfer");
    expect(gradeNumber(t.answer, "unknown").valid).toBe(false); expect(gradeNumber(t.answer, String(t.answer + 1)).correct).toBe(false); expect(gradeNumber(t.answer, String(t.answer)).correct).toBe(true);
    expect(l.sources.length).toBeGreaterThanOrEqual(2); expect(l.sources.every(s => new URL(s.url).hostname === "www.rfc-editor.org")).toBe(true);
    expect(lessonSchema.safeParse({ ...l, quality: { state: "published" } }).success).toBe(false);
  });
  it("independently derives transfer answers from models", () => {
    const answer = (id: string) => { const b = lessons[id]!.blocks.find(b => b.type === "transfer"); return b?.type === "transfer" ? b.answer : NaN; };
    let f = startForward(initialForward(), "A", "C"); while (f.queue.length) f = forwardStep(f);
    expect(answer("a11-devices")).toBe(f.deliveries[0]!.path.filter(n => n === "R").length + 1);
    expect(answer("a12-packets")).toBe(initialReassembly("x".repeat(17), 4).chunks.length);
    let t = startTcp(initialTcp("ABCDE"));
    for (let i = 0; i < 3; i++) t = deliverTcp(t, t.channel[0]!.id);
    while (t.acked < 5) { t = sendTcpData(t); t = deliverTcp(t, t.channel[0]!.id); t = deliverTcp(t, t.channel[0]!.id); }
    // Same 5-byte span, translated from the demo ISN to the transfer's first byte 1001.
    expect(answer("a14-tcp")).toBe(1001 + (t.serverNext - 101));
  });
  it("connects A10 through A17 while leaving A18 planned", () => {
    const chain = ["a10-ip-subnet", "a11-devices", "a12-packets", "a13-dns", "a14-tcp", "a15-udp", "a16-http-https", "a17-web-journey"];
    for (let i = 0; i < chain.length - 1; i++) expect(nextAvailableAfter(chain[i]!)?.id).toBe(chain[i + 1]);
    expect(nextAvailableAfter("a17-web-journey")).toBeUndefined(); expect(validateContent()).toEqual([]);
  });
});
