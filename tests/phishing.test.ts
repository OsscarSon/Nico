import { describe, it, expect } from "vitest";
import { initialPhishing, inspectEvidence, verifyContact, decidePhishing, gradePhishing, messageCases, recommendedDecision, belongsToDomain, type CaseId, type Decision } from "../src/grading/phishing";
const examined = (id: CaseId) => {
  let s = initialPhishing(id); for (const k of ["sender", "link", "request", "pressure"] as const) s = inspectEvidence(s, k);
  return verifyContact(s, "directory");
};
describe("A19 actual evidence snapshots and risk decisions", () => {
  it("needs all displayed evidence before the decision; repeating one inspection and later evidence cannot repair old decisions", () => {
    let s = initialPhishing(); for (let i = 0; i < 5; i++) s = inspectEvidence(s, "sender");
    s = decidePhishing(verifyContact(s, "directory"), "report"); expect(gradePhishing(s, "aid").ok).toBe(false);
    for (const k of ["link", "request", "pressure"] as const) s = inspectEvidence(s, k);
    expect(gradePhishing(s, "aid").ok).toBe(false); expect(gradePhishing(decidePhishing(s, "report"), "aid").ok).toBe(true);
  });
  it("does not let a message-provided channel vouch for itself", () => {
    const s = decidePhishing(verifyContact(examined("aid"), "message"), "report"); expect(gradePhishing(s, "aid").ok).toBe(false);
  });
  it("diagnoses a plausible but unsupported safe decision using actual request and independent denial", () => {
    const s = decidePhishing(examined("aid"), "official"); expect(gradePhishing(s, "aid")).toMatchObject({ ok: false });
    expect(gradePhishing(s, "aid").message).toContain("索要秘密"); expect(gradePhishing(s, "urgent").ok).toBe(false);
  });
  it("does not use urgent words or authenticated sender as a fixed classifier", () => {
    expect(messageCases.urgent.pressure).toContain("时间紧"); expect(messageCases.quiet.auth).toBe("pass");
    expect(gradePhishing(decidePhishing(examined("urgent"), "report"), "urgent").ok).toBe(false);
    expect(gradePhishing(decidePhishing(examined("urgent"), "official"), "urgent").ok).toBe(true);
    expect(gradePhishing(decidePhishing(examined("quiet"), "report"), "quiet").ok).toBe(true);
  });
  it("keeps unconfirmed external processes pending but accepts independently confirmed benign partners", () => {
    for (const [id, decision] of [["partner", "hold"], ["survey", "official"]] as [CaseId, Decision][]) {
      expect(recommendedDecision(messageCases[id])).toBe(decision); expect(gradePhishing(decidePhishing(examined(id), decision), id).ok).toBe(true);
    }
    expect(gradePhishing(decidePhishing(examined("partner"), "report"), "partner").ok).toBe(false);
  });
  it("uses hostname boundaries and reserved domains, with no real malicious or third-party target", () => {
    expect(belongsToDomain("portal.campus.example", "campus.example")).toBe(true);
    expect(belongsToDomain("CAMPUS.EXAMPLE", "campus.example")).toBe(true);
    expect(belongsToDomain("campus.example.account-check.example", "campus.example")).toBe(false);
    expect(belongsToDomain("evilcampus.example", "campus.example")).toBe(false);
    for (const c of Object.values(messageCases)) { expect(new URL(c.target).hostname.endsWith(".example")).toBe(true); expect(c.from.endsWith(".example")).toBe(true); }
  });
  it("preserves immutable state and snapshots when later inspection/contact changes", () => {
    const s = examined("aid"), d = decidePhishing(s, "report"), changed = verifyContact(d, "message");
    expect(s.decision).toBeNull(); expect(gradePhishing(changed, "aid").ok).toBe(true); expect(changed.decision?.verification?.channel).toBe("directory");
  });
});
