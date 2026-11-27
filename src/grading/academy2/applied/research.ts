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
  const total = entries.reduce((sum, value) => sum + value, 0);
  const statistic = (sum: number) =>
    sum / groupSize - (total - sum) / (entries.length - groupSize);
  const observed = statistic(
    entries.slice(0, groupSize).reduce((sum, value) => sum + value, 0),
  );
  const distribution: number[] = [];
  function choose(index: number, left: number, subtotal: number) {
    if (left === 0) {
      distribution.push(statistic(subtotal));
      return;
    }
    for (let i = index; i <= entries.length - left; i++)
      choose(i + 1, left - 1, subtotal + entries[i]!);
  }
  choose(0, groupSize, 0);
  const boundary = Math.abs(observed) - 1e-9 * Math.max(1, Math.abs(observed));
  const extreme = distribution.filter(
    (value) => Math.abs(value) >= boundary,
  ).length;
  return {
    observed,
    p: extreme / distribution.length,
    extreme,
    draws: distribution.length,
    distribution,
  };
}
