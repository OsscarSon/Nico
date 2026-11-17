/** UDP data is delivered as datagrams. Sequence/timestamp/deadline are APPLICATION metadata. */
import { gradeTcp, type TcpState } from "./tcp";
export type UdpPolicy = "arrival" | "fresh";
export type Datagram = { id: number; seq: number; value: number; createdAt: number; availableAt: number; sourcePort: 53000; destinationPort: 5000 };
export type Arrival = { seq: number; value: number; at: number; applied: boolean; reason: "displayed" | "older" | "expired" };
export type UdpState = {
  positions: number[]; policy: UdpPolicy; clock: number; nextId: number; sent: Datagram[]; channel: Datagram[];
  lost: Datagram[]; lostSeq: number[]; retransmitted: number[]; arrivals: Arrival[]; archive: Record<number, number>;
  display: { seq: number; value: number } | null; note: string; trace: string[];
};
export const UDP_DEADLINE = 3;
export function initialUdp(positions = [10, 20, 30]): UdpState {
  if (positions.length !== 3 || positions.some(n => !Number.isInteger(n) || n < 0 || n > 99)) throw Error("请输入三个0–99的整数位置。");
  return { positions: [...positions], policy: "arrival", clock: 0, nextId: 1, sent: [], channel: [], lost: [], lostSeq: [], retransmitted: [], arrivals: [], archive: {}, display: null, note: "发送三个独立的位置快照；UDP本身不等待确认或重传。", trace: [] };
}
export const positionStream = (s: UdpState): string => s.positions.map(n => String(n).padStart(2, "0") + "|").join("");
const note = (s: UdpState, text: string): UdpState => ({ ...s, note: text, trace: [...s.trace, `[t=${s.clock}] ${text}`].slice(-60) });
export function setUdpPolicy(s: UdpState, policy: UdpPolicy): UdpState {
  return note({ ...s, policy }, policy === "fresh" ? "应用启用编号/时间戳策略：旧序号或超过3逻辑时刻截止期的更新不显示；UDP交付规则没有改变。" : "应用按到达顺序直接显示，旧位置可能覆盖新位置。");
}
export function sendUdp(s: UdpState): UdpState {
  const seq = s.sent.length + 1;
  if (seq > s.positions.length || s.channel.length >= 12) return note(s, "当前三个快照均已发送；重置可开始新实验。");
  const packet: Datagram = { id: s.nextId, seq, value: s.positions[seq - 1]!, createdAt: s.clock, availableAt: s.clock, sourcePort: 53000, destinationPort: 5000 };
  return note({ ...s, nextId: s.nextId + 1, sent: [...s.sent, packet], channel: [...s.channel, packet] }, `发送独立UDP数据报 #${packet.id}，应用编号${seq}，位置${packet.value}；不等待之前数据报的ACK。`);
}
export function deliverUdp(s: UdpState, id: number): UdpState {
  const packet = s.channel.find(p => p.id === id);
  if (!packet) return note(s, "该数据报已不在通道中。");
  if (packet.availableAt > s.clock) return note(s, "数据报仍在延迟中，先推进逻辑时钟。");
  const reason: Arrival["reason"] = s.policy === "fresh" && s.clock - packet.createdAt >= UDP_DEADLINE ? "expired" : s.policy === "fresh" && s.display && packet.seq <= s.display.seq ? "older" : "displayed";
  const arrival: Arrival = { seq: packet.seq, value: packet.value, at: s.clock, applied: reason === "displayed", reason };
  const display = arrival.applied ? { seq: packet.seq, value: packet.value } : s.display;
  return note({ ...s, channel: s.channel.filter(p => p.id !== id), arrivals: [...s.arrivals, arrival].slice(-64), archive: { ...s.archive, [packet.seq]: packet.value }, display }, `UDP已交付编号${packet.seq}到应用；${reason === "displayed" ? `应用显示位置${packet.value}` : reason === "older" ? "应用丢弃旧编号，保留较新的位置" : "应用丢弃超过截止期的更新"}。`);
}
export function dropUdp(s: UdpState, id: number): UdpState {
  const packet = s.channel.find(p => p.id === id);
  return packet ? note({ ...s, channel: s.channel.filter(p => p.id !== id), lost: [...s.lost, packet].slice(-12), lostSeq: [...new Set([...s.lostSeq, packet.seq])] }, `控制台丢弃UDP数据报 #${id}；UDP不会自动确认或重传。真实端点不会立即知道这次丢失。`) : s;
}
export function delayUdp(s: UdpState, id: number): UdpState {
  if (!s.channel.some(p => p.id === id)) return s;
  return note({ ...s, channel: s.channel.map(p => p.id === id ? { ...p, availableAt: Math.max(s.clock, p.availableAt) + 2 } : p) }, `数据报 #${id} 延迟2个逻辑时刻，不会自动投递。`);
}
export function tickUdp(s: UdpState): UdpState { return note({ ...s, clock: s.clock + 1 }, "推进1个逻辑时刻；没有任何UDP自动重传。"); }
export function resendUdp(s: UdpState, seq: number): UdpState {
  const packet = s.lost.find(p => p.seq === seq);
  if (!packet || s.channel.length >= 12) return note(s, "没有可重发的缺失记录，或通道已满。");
  return note({ ...s, nextId: s.nextId + 1, lost: s.lost.filter(p => p.seq !== seq), channel: [...s.channel, { ...packet, id: s.nextId, availableAt: s.clock }], retransmitted: [...new Set([...s.retransmitted, seq])] }, `应用重发编号${seq}，原测量时间不变；这需要应用自行设计反馈/超时，本控制台代替该机制，不是UDP自带可靠性。`);
}
export type RealtimeTask = "raw" | "fresh" | "tcp";
export function gradeRealtime(s: UdpState, tcp: TcpState, task: RealtimeTask) {
  if (task === "tcp") {
    if (tcp.payload !== positionStream(s)) return { ok: false, message: "TCP对照需要传输与本实验相同的三个位置文本。" };
    return gradeTcp(tcp, "data-loss");
  }
  if (s.sent.length !== 3 || s.channel.length) return { ok: false, message: "请发送三个实际快照，并处理完当前通道中的数据报。" };
  if (task === "raw" && !(s.policy === "arrival" && s.lostSeq.includes(2) && s.arrivals.some((a, i) => i > 0 && a.seq < s.arrivals[i - 1]!.seq) && s.display && s.display.seq < 3)) return { ok: false, message: "按到达直接显示：丢弃中间编号2，先投递3再投递1，观察实际显示倒退；不能只点检查。" };
  if (task === "fresh" && !(s.policy === "fresh" && s.display?.seq === 3 && s.display.value === s.positions[2] && s.arrivals.some(a => a.reason === "older") && s.arrivals.some(a => a.reason === "expired"))) return { ok: false, message: "启用新鲜更新策略，先显示3；让旧编号被应用拒绝，再让一个被延迟的数据报超过截止期实际到达。" };
  return { ok: true, message: task === "raw" ? "实际丢失与乱序让位置倒退，记录显示UDP没有自动补齐或排序。" : "UDP仍交付数据报，应用按实际编号和年龄拒绝旧/过期更新，保留最新位置。" };
}
