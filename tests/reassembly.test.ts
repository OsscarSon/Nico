import { describe, expect, it } from "vitest";
import { initialReassembly, deliverChunk, resendChunk, moveChunk, inspectAssembly, assembleChunks, gradeReassembly, type ReassemblyState } from "../src/grading/reassembly";
function deliverAll(s: ReassemblyState) { while (s.wire.length) s = deliverChunk(s); return s; }
function order(s: ReassemblyState) { for (let i = 0; i < s.chunks.length; i++) { let j = s.received.findIndex(c => c.seq === i + 1); while (j > i) { s = moveChunk(s, j, -1); j--; } } return s; }
describe("numbered message chunks", () => {
  it("splits by code point and preserves surrogate pairs, spaces and final short chunk", () => {
    const s = initialReassembly("A🙂中 B", 2); expect(s.chunks.map(c => c.content)).toEqual(["A🙂", "中 ", "B"]);
    expect(s.chunks.map(c => c.seq)).toEqual([1, 2, 3]); expect(s.chunks.map(c => c.content).join("")).toBe(s.original);
  });
  it("shuffle is reproducible, complete and genuinely out of order for many seeds", () => {
    for (let seed = 0; seed < 100; seed++) {
      const a = initialReassembly("abcdefghijkl", 2, seed), b = initialReassembly("abcdefghijkl", 2, seed);
      expect(a.wire).toEqual(b.wire); expect(a.wire.map(c => c.seq).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(a.wire).not.toEqual(a.chunks);
      const restored = assembleChunks(order(deliverAll(a))); expect(restored.result?.text).toBe("abcdefghijkl"); expect(gradeReassembly(restored, false).ok).toBe(true);
    }
  });
  it.each([["", 3, 1], ["   ", 3, 1], ["x".repeat(37), 3, 1], ["abc", 1, 1], ["abc", 9, 1], ["abc", 2.5, 1], ["abc", 3, -1], ["abc", 3, NaN], ["abc", 3, 2 ** 32]])("rejects invalid input %j", (message, size, seed) => expect(() => initialReassembly(String(message), Number(size), Number(seed))).toThrow());
  it("cannot reconstruct missing data or fabricate original text", () => {
    let s = initialReassembly(); const missing = s.wire[0]!.seq;
    s = deliverAll(deliverChunk(s, true)); s = assembleChunks(s);
    expect(s.result?.text).toBeNull(); expect(s.result?.message).toContain(`#${missing}`); expect(s.sawMissing).toBe(true);
    expect(gradeReassembly(s, true).ok).toBe(false);
    s = resendChunk(s, missing); expect(s.wire).toHaveLength(1); expect(s.lost).toHaveLength(0);
    s = assembleChunks(order(deliverAll(s))); expect(s.result?.text).toBe(s.original); expect(gradeReassembly(s, true).ok).toBe(true);
  });
  it("wrong order, duplicate seq, content mismatch, extra packet are rejected", () => {
    const unordered = deliverAll(initialReassembly()); expect(inspectAssembly(unordered).ok).toBe(false);
    const s = order(unordered); expect(inspectAssembly(s).ok).toBe(true);
    expect(inspectAssembly({ ...s, received: [...s.received, s.received[0]!] }).text).toBeNull();
    expect(inspectAssembly({ ...s, received: s.received.map((c, i) => i ? c : { ...c, content: "伪造" }) }).text).toBeNull();
  });
  it("loss challenge needs observation of failure and actual recovery", () => {
    const s = assembleChunks(order(deliverAll(initialReassembly())));
    expect(gradeReassembly(s, false).ok).toBe(true); expect(gradeReassembly(s, true).ok).toBe(false);
  });
  it("single chunk works without pretending it arrived out of order", () => {
    const s = assembleChunks(deliverAll(initialReassembly("好", 2))); expect(s.result?.text).toBe("好"); expect(gradeReassembly(s, false).ok).toBe(false);
  });
  it("bounds moves, ignores duplicate delivery, invalidates stale results and keeps snapshots", () => {
    const initial = initialReassembly(), copy = structuredClone(initial); let s = deliverAll(initial);
    expect(initial).toEqual(copy); expect(moveChunk(s, -1, 1)).toBe(s); expect(moveChunk(s, 0, -1)).toBe(s);
    expect(moveChunk(s, s.received.length - 1, 1)).toBe(s);
    s = assembleChunks(order(s)); expect(moveChunk(s, 0, 1).result).toBeNull();
    const duplicate = deliverChunk({ ...s, wire: [s.chunks[0]!] }); expect(duplicate.received).toHaveLength(s.received.length); expect(duplicate.result).toBeNull();
    expect(resendChunk(s, 999)).toBe(s); expect(deliverChunk(s)).toBe(s);
  });
});
