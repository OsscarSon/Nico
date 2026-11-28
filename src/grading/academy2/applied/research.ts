export function exactRandomization(text: string, groupSize: number) {
  const entries = text
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !text.trim() ||
    entries.length < 4 ||
    entries.length > 12 ||
    entries.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e6) ||
    !Number.isInteger(groupSize) ||
    groupSize < 2 ||
    groupSize > entries.length - 2
  )
    throw Error("输入 4–12 个有限读数，每组至少 2 个。输入前段为 A。");
  // Re-center and scale before comparing the magnitudes of statistics.
  // An absolute floor on the tolerance changes the result when units change.
  const offsets = entries.map((value) => value - entries[0]!);
  const scale = Math.max(...offsets.map(Math.abs)) || 1;
  const observedA =
    offsets.slice(0, groupSize).reduce((sum, x) => sum + x, 0) / groupSize;
  const observedB =
    offsets.slice(groupSize).reduce((sum, x) => sum + x, 0) /
    (entries.length - groupSize);
  const normalized = offsets.map((value) => value / scale);
  const total = normalized.reduce((sum, value) => sum + value, 0);
  const statistic = (sum: number) =>
    sum / groupSize - (total - sum) / (entries.length - groupSize);
  const observed = statistic(
    normalized.slice(0, groupSize).reduce((sum, value) => sum + value, 0),
  );
  const distribution: number[] = [];
  function choose(index: number, left: number, subtotal: number) {
    if (left === 0) {
      distribution.push(statistic(subtotal));
      return;
    }
    for (let i = index; i <= entries.length - left; i++)
      choose(i + 1, left - 1, subtotal + normalized[i]!);
  }
  choose(0, groupSize, 0);
  const boundary = Math.abs(observed) - 16 * Number.EPSILON;
  const extreme = distribution.filter(
    (value) => Math.abs(value) >= boundary,
  ).length;
  return {
    observed: observedA - observedB,
    p: extreme / distribution.length,
    extreme,
    draws: distribution.length,
    distribution: distribution.map((value) => value * scale),
  };
}
