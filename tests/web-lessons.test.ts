import { describe, it, expect } from "vitest";
import { lessons, nextAvailableAfter, validateContent } from "../src/content";
import { lessonSchema } from "../src/content/schema";
import { gradeChoice, gradeNumber } from "../src/grading/quiz";
import { initialHttp, sendHttp, processHttp, receiveHttp } from "../src/grading/http";
import { initialJourney, navigateJourney, stepJourneyDns, tickJourney, type JourneyState } from "../src/grading/journey";
const answer = (id: string) => { const b = lessons[id]!.blocks.find(b => b.type === "transfer"); return b?.type === "transfer" ? b.answer : NaN; };
describe("A15–A17 complete draft lessons", () => {
  for (const id of ["a15-udp", "a16-http-https", "a17-web-journey"]) it(`${id}: full teaching sequence, real lab, diagnostics, sources and formal art placeholder`, () => {
    const s = lessons[id]!; expect(lessonSchema.safeParse(s).success).toBe(true); expect(s.quality).toEqual({ state: "draft" }); expect(s.artPending).toBe(true); expect(s.art).toBeUndefined();
    expect(s.blocks[0]?.type).toBe("hook"); expect(s.blocks.filter(b => b.type === "explain")).toHaveLength(4);
    expect(s.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    const q = s.blocks.find(b => b.type === "quiz"); if (q?.type !== "quiz") throw Error("missing quiz"); expect(q.items).toHaveLength(3);
    for (const question of q.items) question.options.forEach((_, index) => { const result = gradeChoice(question, index); expect(result.correct).toBe(index === question.answer); expect(result.message.length).toBeGreaterThan(15); });
    expect(gradeNumber(answer(id), "unknown").valid).toBe(false); expect(gradeNumber(answer(id), String(answer(id) + 1)).correct).toBe(false); expect(gradeNumber(answer(id), String(answer(id))).correct).toBe(true);
    expect(s.sources.length).toBeGreaterThanOrEqual(2); expect(s.sources.every(source => new URL(source.url).hostname === "www.rfc-editor.org")).toBe(true);
    expect(lessonSchema.safeParse({ ...s, quality: { state: "published" } }).success).toBe(false);
  });
  it("derives transfer rules from HEAD's actual empty body and TTL-aware resolver behavior", () => {
    const head = receiveHttp(processHttp(sendHttp(initialHttp(), "HEAD", "/lesson", "Host: www.example.com")));
    expect(head.response?.body).toBe(""); expect(answer("a16-http-https")).toBe(1200 + 800 + head.response!.body.length);
    const query = (s: JourneyState, url: string) => { s = navigateJourney(s, url); while (s.phase === "dns") s = stepJourneyDns(s); return s; };
    let s = query(initialJourney(), "https://www.example.com/lesson"); const prime = s.externalQueries;
    s = tickJourney(tickJourney(s)); s = query(s, "https://www.example.com/missing"); expect(s.resolution?.serversAsked).toBe(0);
    s = tickJourney(tickJourney(tickJourney(s))); s = query(s, "https://www.example.com/lesson");
    expect(answer("a17-web-journey")).toBe(s.externalQueries - prime); expect(s.resolution?.serversAsked).toBe(1);
  });
  it("extends existing IDs from A14 to A17 and leaves A18 unimplemented", () => {
    const chain = ["a14-tcp", "a15-udp", "a16-http-https", "a17-web-journey"];
    for (let i = 0; i < chain.length - 1; i++) expect(nextAvailableAfter(chain[i]!)?.id).toBe(chain[i + 1]);
    expect(nextAvailableAfter("a17-web-journey")).toBeUndefined(); expect(lessons["a18-passwords"]).toBeUndefined(); expect(validateContent()).toEqual([]);
  });
});
