export function samplePolynomial(a: number, b: number, c: number) {
  return Array.from({ length: 161 }, (_, index) => {
    const x = index / 16 - 5;
    return { x, y: a * x * x + b * x + c };
  });
}

export function sampleBernoulliDistribution(probability: number, size: number, repeats: number, seed: number) {
  if (probability < 0 || probability > 1 || !Number.isInteger(size) || size < 1 || !Number.isInteger(repeats) || repeats < 1)
    throw new RangeError("抽样参数超出范围");
  const bins: number[] = Array(10).fill(0);
  let randomState = seed >>> 0;
  let total = 0;
  for (let sample = 0; sample < repeats; sample++) {
    let successes = 0;
    for (let trial = 0; trial < size; trial++) {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      if (randomState / 0x100000000 < probability) successes++;
    }
    const rate = successes / size;
    total += rate;
    const bin = Math.min(9, Math.floor(rate * 10));
    bins[bin] = bins[bin]! + 1;
  }
  return { bins, mean: total / repeats, theoreticalSD: Math.sqrt(probability * (1 - probability) / size) };
}

export const initialSortInput = "7, 3, 8, 1, 5";
export function parseSortInput(text: string) {
  const tokens = text.trim().split(/[\s,，]+/);
  if (tokens.length < 2 || tokens.length > 12 || tokens.some(token => !/^-?\d{1,2}$/.test(token))) return undefined;
  return tokens.map(Number);
}

export type SortFrame = {
  order: number[]; left?: number; right?: number; sorted: number; comparisons: number; message: string;
};
export function insertionFrames(input: readonly number[]) {
  const order = [...input];
  let comparisons = 0;
  const frames: SortFrame[] = [{ order: [...order], sorted: Math.min(1, order.length), comparisons, message: "先把第一个元素作为已排序区。" }];
  for (let index = 1; index < order.length; index++) {
    let at = index;
    while (at > 0) {
      const left = order[at - 1]!, right = order[at]!;
      comparisons++;
      frames.push({ order: [...order], left: at - 1, right: at, sorted: index, comparisons,
        message: left > right ? left + " 大于 " + right + "，下一步向右移。" : left + " 小于等于 " + right + "，插入位置已确定。" });
      if (left <= right) break;
      order[at - 1] = right;
      order[at] = left;
      frames.push({ order: [...order], left: at - 1, right: at, sorted: index, comparisons, message: "相邻值交换，继续向左比较。" });
      at--;
    }
    frames.push({ order: [...order], sorted: index + 1, comparisons, message: "前 " + (index + 1) + " 个元素已排序。" });
  }
  return frames;
}
