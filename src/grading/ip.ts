/** IPv4 地址与子网计算（教学用，只处理 IPv4）。地址用无符号 32 位整数表示。 */

/** 严格解析点分十进制：恰好 4 段，每段 0–255，不允许前导 0（避免"八进制"歧义）和多余字符。 */
export function parseIPv4(input: string): number | null {
  const parts = input.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export const formatIPv4 = (n: number): string =>
  [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

/** 32 位二进制，按 8 位一组用点隔开。 */
export const toBinaryDotted = (n: number): string =>
  [24, 16, 8, 0].map((s) => (((n >>> s) & 255) >>> 0).toString(2).padStart(8, "0")).join(".");

export function prefixToMask(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new RangeError(`前缀 ${prefix} 不在 0–32 之间`);
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export const networkOf = (ip: number, prefix: number): number => (ip & prefixToMask(prefix)) >>> 0;
export const broadcastOf = (ip: number, prefix: number): number => (networkOf(ip, prefix) | ~prefixToMask(prefix)) >>> 0;

/** 可分配给设备的地址数：总数减去网络地址和广播地址。/31 和 /32 是特殊情况（点对点、单个主机）。 */
export function usableHosts(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new RangeError(`前缀 ${prefix} 不在 0–32 之间`);
  if (prefix === 32) return 1;
  if (prefix === 31) return 2;
  return 2 ** (32 - prefix) - 2;
}

export const sameSubnet = (a: number, b: number, prefix: number): boolean =>
  networkOf(a, prefix) === networkOf(b, prefix);

export function parseCidr(input: string): { ip: number; prefix: number } | null {
  const [addr, pre, ...rest] = input.trim().split("/");
  if (rest.length || addr === undefined || pre === undefined || !/^\d{1,2}$/.test(pre)) return null;
  const ip = parseIPv4(addr);
  const prefix = Number(pre);
  return ip === null || prefix > 32 ? null : { ip, prefix };
}

export type SubnetInfo = {
  ip: number; prefix: number; mask: number; network: number; broadcast: number;
  firstHost: number; lastHost: number; hosts: number;
};

export function describeSubnet(ip: number, prefix: number): SubnetInfo {
  const network = networkOf(ip, prefix);
  const broadcast = broadcastOf(ip, prefix);
  const hosts = usableHosts(prefix);
  return {
    ip, prefix, mask: prefixToMask(prefix), network, broadcast, hosts,
    firstHost: prefix >= 31 ? network : network + 1,
    lastHost: prefix >= 31 ? broadcast : broadcast - 1,
  };
}

export type SubnetTask = { a: string; b: string; prefix: number };

/** 挑战：两个地址在不在同一个网段。包含两个陷阱：/16 跨第三段仍相同；/25 同一段数字却不同网段。 */
export const subnetTasks: SubnetTask[] = [
  { a: "192.168.1.10", b: "192.168.1.200", prefix: 24 },
  { a: "192.168.1.10", b: "192.168.2.10", prefix: 24 },
  { a: "172.16.5.1", b: "172.16.200.9", prefix: 16 },
  { a: "192.168.1.10", b: "192.168.1.200", prefix: 25 },
];

export function gradeSubnetTask(task: SubnetTask, saysSame: boolean): { ok: boolean; message: string } {
  const a = parseIPv4(task.a) as number;
  const b = parseIPv4(task.b) as number;
  const same = sameSubnet(a, b, task.prefix);
  const na = formatIPv4(networkOf(a, task.prefix));
  const nb = formatIPv4(networkOf(b, task.prefix));
  const detail = `/${task.prefix} 时，${task.a} 的网络地址是 ${na}，${task.b} 的网络地址是 ${nb}。`;
  if (saysSame === same)
    return { ok: true, message: `对了。${detail}${same ? "网络地址相同，所以在同一网段。" : "网络地址不同，所以不在同一网段。"}` };
  return {
    ok: false,
    message: `不对。${detail}${same ? "网络地址相同，其实是同一网段。" : "网络地址不同，其实不在同一网段。"}`,
  };
}
