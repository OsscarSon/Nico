import { describe, it, expect } from "vitest";
import {
  bitsToNumber,
  numberToBits,
  placeValues,
  toBinaryString,
  challengeFeedback,
  onSwitches,
} from "../src/grading/binary";

describe("binary grading", () => {
  it("lists place values from the most significant bit", () => {
    expect(placeValues(8)).toEqual([128, 64, 32, 16, 8, 4, 2, 1]);
  });
  it("round-trips every 8-bit value", () => {
    for (let n = 0; n < 256; n++)
      expect(bitsToNumber(numberToBits(n, 8))).toBe(n);
  });
  it("reads 00100101 as 37", () => {
    expect(bitsToNumber(numberToBits(37, 8))).toBe(37);
    expect(toBinaryString(numberToBits(37, 8))).toBe("00100101");
  });
  it("rejects values that do not fit", () => {
    expect(() => numberToBits(256, 8)).toThrow();
    expect(() => numberToBits(-1, 8)).toThrow();
    expect(() => numberToBits(1.5, 8)).toThrow();
  });
  it("lists only the switches that are on", () => {
    expect(onSwitches(numberToBits(37, 8))).toEqual([32, 4, 1]);
  });
  it("gives concrete feedback when too low or too high", () => {
    const low = challengeFeedback(numberToBits(32, 8), 37);
    expect(low.ok).toBe(false);
    expect(low.message).toContain("还差 5");
    const high = challengeFeedback(numberToBits(40, 8), 37);
    expect(high.ok).toBe(false);
    expect(high.message).toContain("多了 3");
    expect(challengeFeedback(numberToBits(37, 8), 37).ok).toBe(true);
  });
});
