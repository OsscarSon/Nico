/** Two /24 Ethernet LANs; static ARP oracle and directly connected routes. No NAT/VLAN/STP. */
import { parseIPv4, sameSubnet } from "./ip";
export const connectedRoutes = [{ network: "192.168.1.0", prefix: 24, lan: 1 }, { network: "192.168.2.0", prefix: 24, lan: 2 }] as const;
export const hosts = [
  { id: "A", lan: 1, ip: "192.168.1.10", mac: "02:00:00:01:00:0a" },
  { id: "B", lan: 1, ip: "192.168.1.20", mac: "02:00:00:01:00:14" },
  { id: "C", lan: 2, ip: "192.168.2.10", mac: "02:00:00:02:00:0a" },
  { id: "D", lan: 2, ip: "192.168.2.20", mac: "02:00:00:02:00:14" },
] as const;
export type HostId = typeof hosts[number]["id"];
export type Lan = 1 | 2;
export const routerMac = (lan: Lan) => `02:00:00:0${lan}:00:01`;
export const host = (id: HostId) => hosts.find(h => h.id === id)!;
type Frame = { at: string; ingress: string; srcMac: string; dstMac: string; src: HostId; dst: HostId; ttl: number; path: string[] };
export type Delivery = { src: HostId; dst: HostId; path: string[]; sourceIp: string; destinationIp: string; firstMac: string; finalMac: string; flooded: boolean; routed: boolean };
export type ForwardState = { tables: Record<Lan, Record<string, string>>; queue: Frame[]; deliveries: Delivery[]; trace: string[]; firstMac: string; flooded: boolean; routed: boolean; note: string };
export const initialForward = (): ForwardState => ({ tables: { 1: {}, 2: {} }, queue: [], deliveries: [], trace: [], firstMac: "", flooded: false, routed: false, note: "选择发送端和目标端，再开始发送。MAC 表只从收到帧的源地址学习。" });
const withNote = (s: ForwardState, note: string): ForwardState => ({ ...s, note, trace: [...s.trace, note].slice(-60) });
export function startForward(s: ForwardState, src: HostId, dst: HostId, mode: "auto" | "direct" | "gateway" = "auto"): ForwardState {
  if (s.queue.length) return withNote(s, "当前传输尚未结束，请先逐跳处理完通道。");
  if (!host(src) || !host(dst) || src === dst) return withNote(s, "请选择两个不同的有效端点。");
  const a = host(src), b = host(dst);
  const gateway = mode === "gateway" || (mode === "auto" && !sameSubnet(parseIPv4(a.ip)!, parseIPv4(b.ip)!, 24));
  const dstMac = gateway ? routerMac(a.lan) : b.mac;
  // Direct remote MAC is an intentionally incorrect experiment: it cannot leave its LAN.
  return withNote({ ...s, deliveries: [], trace: [], flooded: false, routed: false, firstMac: dstMac, queue: [{ at: `S${a.lan}`, ingress: src, srcMac: a.mac, dstMac, src, dst, ttl: 4, path: [src] }] },
    `${src} → ${dst}：IP ${a.ip} → ${b.ip} 保持端到端；首帧目标 MAC 为${gateway ? "默认网关" : "目标电脑"} ${dstMac}。ARP 映射由已知表直接提供。`);
}
export function forwardStep(s: ForwardState): ForwardState {
  const [frame, ...rest] = s.queue;
  if (!frame) return withNote(s, "通道已空，可以检查送达结果或发起新传输。");
  let next: ForwardState = { ...s, queue: rest };
  if (frame.at === "S1" || frame.at === "S2") {
    const lan: Lan = frame.at === "S1" ? 1 : 2;
    const table = { ...s.tables[lan], [frame.srcMac]: frame.ingress };
    next = { ...next, tables: { ...s.tables, [lan]: table } };
    const known = table[frame.dstMac];
    const ports = [...hosts.filter(h => h.lan === lan).map(h => h.id), `R${lan}`];
    const outputs = known ? ports.filter(p => p === known && p !== frame.ingress) : ports.filter(p => p !== frame.ingress);
    next.queue = [...rest, ...outputs.map(at => ({ ...frame, at, path: [...frame.path, frame.at] }))];
    next.flooded ||= !known;
    return withNote(next, `${frame.at} 学习源 ${frame.srcMac} → 端口 ${frame.ingress}；${known ? `已知单播 → ${outputs.join("、") || "过滤同入口帧"}` : `未知单播泛洪 → ${outputs.join("、")}（不回入口，帧目标 MAC 没变）`}。`);
  }
  if (frame.at === "R1" || frame.at === "R2") {
    const ingressLan: Lan = frame.at === "R1" ? 1 : 2;
    if (frame.dstMac !== routerMac(ingressLan)) return withNote(next, `${frame.at} 丢弃：帧目标 MAC 不是本接口，泛洪副本不会被路由出去。`);
    if (frame.ttl <= 1) return withNote(next, "路由器丢弃：TTL 已耗尽。");
    const b = host(frame.dst);
    const route = connectedRoutes.find(r => sameSubnet(parseIPv4(b.ip)!, parseIPv4(r.network)!, r.prefix));
    if (!route) return withNote(next, "路由器没有匹配的出口路由，丢弃数据包。");
    const out = route.lan;
    next.queue = [...rest, { ...frame, at: `S${out}`, ingress: `R${out}`, srcMac: routerMac(out), dstMac: b.mac, ttl: frame.ttl - 1, path: [...frame.path, "R"] }];
    next.routed = true;
    return withNote(next, `R 按目标 IP ${b.ip} 匹配直连 /24 路由 → LAN ${out}；重新封装：源 MAC ${routerMac(out)}、目标 MAC ${b.mac}；IP 不变，TTL 减 1。`);
  }
  const target = hosts.find(h => h.id === frame.at);
  if (!target || target.mac !== frame.dstMac || target.id !== frame.dst) return withNote(next, `${frame.at} 忽略不是发给自己的帧。`);
  next.deliveries = [...s.deliveries, { src: frame.src, dst: frame.dst, path: [...frame.path, target.id], sourceIp: host(frame.src).ip, destinationIp: target.ip, firstMac: s.firstMac, finalMac: frame.dstMac, flooded: s.flooded, routed: s.routed }];
  return withNote(next, `${target.id} 收到正确的帧与 IP 数据包；路径 ${[...frame.path, target.id].join(" → ")}。`);
}
export type ForwardTask = { title: string; src: HostId; dst: HostId; flood?: boolean; routed: boolean; gateway?: boolean };
export const forwardTasks: ForwardTask[] = [
  { title: "同一 LAN：从 A 送达 B，不经过路由器", src: "A", dst: "B", routed: false },
  { title: "跨 LAN：从 A 送达 C", src: "A", dst: "C", routed: true },
  { title: "冷 MAC 表：从 B 送达 A，观察未知单播泛洪", src: "B", dst: "A", routed: false, flood: true },
  { title: "远端目标：从 D 经默认网关送达 B", src: "D", dst: "B", routed: true, gateway: true },
];
export function gradeForward(s: ForwardState, task: ForwardTask) {
  const d = s.deliveries.find(d => d.src === task.src && d.dst === task.dst);
  if (!d || s.queue.length) return { ok: false, message: "还没有完成指定端点的送达。检查发送端、目标端、首跳 MAC，再处理完通道。" };
  if (d.sourceIp !== host(task.src).ip || d.destinationIp !== host(task.dst).ip || d.finalMac !== host(task.dst).mac || d.path[0] !== task.src || d.path.at(-1) !== task.dst || d.path.includes("R") !== task.routed) return { ok: false, message: "实际帧地址、IP 或转发路径不符合任务。" };
  if (d.routed !== task.routed || (task.flood && !d.flooded) || (task.gateway && d.firstMac !== routerMac(host(task.src).lan))) return { ok: false, message: "送达路径不满足任务：请核对同/跨网段、冷 MAC 表泛洪或默认网关。" };
  return { ok: true, message: `实际送达 ${d.src} → ${d.dst}，路径 ${d.path.join(" → ")}；IP 保持，逐跳 MAC 正确。` };
}
