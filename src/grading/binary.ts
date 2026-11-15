/** 位序：下标 0 是最高位（最左边）。 */
export const placeValues = (width: number): number[] =>
  Array.from({ length: width }, (_, i) => 2 ** (width - 1 - i));

export const bitsToNumber = (bits: boolean[]): number =>
  bits.reduce((sum, on, i) => (on ? sum + 2 ** (bits.length - 1 - i) : sum), 0);

export function numberToBits(n: number, width: number): boolean[] {
  if (!Number.isInteger(n) || n < 0 || n >= 2 ** width)
    throw new RangeError(`${n} 无法用 ${width} 位表示`);
  return Array.from({ length: width }, (_, i) =>
    Boolean(Math.floor(n / 2 ** (width - 1 - i)) % 2),
  );
}

export const toBinaryString = (bits: boolean[]): string =>
  bits.map((b) => (b ? "1" : "0")).join("");

/** 给挑战一个具体、能指导下一步的反馈，而不是只说"错了"。 */
export function challengeFeedback(
  bits: boolean[],
  target: number,
): { ok: boolean; message: string } {
  const value = bitsToNumber(bits);
  if (value === target) return { ok: true, message: `正确：${value}。` };
  const diff = target - value;
  return {
    ok: false,
    message:
      diff > 0
        ? `现在是 ${value}，还差 ${diff}。再打开几个开关，让分量加起来补上这 ${diff}。`
        : `现在是 ${value}，比目标 ${target} 多了 ${-diff}。关掉一些分量，让总数减少 ${-diff}。`,
  };
}

export function onSwitches(bits: boolean[]): number[] {
  const pv = placeValues(bits.length);
  return bits.flatMap((on, i) => (on ? [pv[i] as number] : []));
}
