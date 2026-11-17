/** Stop-and-wait teaching subset of TCP. ASCII bytes, fixed ISNs, logical clock, no window/congestion/FIN. */
export const CLIENT_ISN = 100;
export const SERVER_ISN = 500;
export const RETRY_TICKS = 3;
export type TcpKind = "SYN" | "SYN-ACK" | "ACK" | "DATA" | "DATA-ACK";
export const tcpKindLabels: Record<TcpKind, string> = { SYN: "SYN", "SYN-ACK": "SYN-ACK", ACK: "ACK（握手确认）", DATA: "数据段（ACK 标志）", "DATA-ACK": "ACK（数据确认）" };
export type Wire = { kind: TcpKind; from: "client" | "server"; seq: number; ack?: number; data: string };
export type Segment = Wire & { id: number; availableAt: number };
type Pending = { wire: Wire; sentAt: number };
export type TcpState = {
  client: "CLOSED" | "SYN-SENT" | "ESTABLISHED";
  server: "LISTEN" | "SYN-RECEIVED" | "ESTABLISHED";
  payload: string; received: string; acked: number; clientNext: number; serverNext: number;
  channel: Segment[]; clientPending: Pending | null; serverPending: Pending | null;
  clock: number; nextId: number; lost: TcpKind[]; retransmitted: TcpKind[]; trace: string[]; note: string;
};
export function initialTcp(payload = "HELLO!"): TcpState {
  if (!/^[\x20-\x7e]{1,12}$/.test(payload)) throw Error("请输入 1–12 个可打印 ASCII 字符；本模型每字符恰为 1 字节。");
  return { client: "CLOSED", server: "LISTEN", payload, received: "", acked: 0, clientNext: CLIENT_ISN, serverNext: CLIENT_ISN + 1, channel: [], clientPending: null, serverPending: null, clock: 0, nextId: 1, lost: [], retransmitted: [], trace: [], note: "服务器监听中。先由客户端启动握手。" };
}
const note = (s: TcpState, text: string): TcpState => ({ ...s, note: text, trace: [...s.trace, `[t=${s.clock}] ${text}`].slice(-60) });
function enqueue(s: TcpState, wire: Wire): TcpState {
  if (s.channel.length >= 32) return note(s, "通道已满，请先处理现有报文。");
  return { ...s, nextId: s.nextId + 1, channel: [...s.channel, { ...wire, id: s.nextId, availableAt: s.clock }] };
}
const synAck = (): Wire => ({ kind: "SYN-ACK", from: "server", seq: SERVER_ISN, ack: CLIENT_ISN + 1, data: "" });
const handshakeAck = (seq = CLIENT_ISN + 1): Wire => ({ kind: "ACK", from: "client", seq, ack: SERVER_ISN + 1, data: "" });
const dataAck = (ack: number): Wire => ({ kind: "DATA-ACK", from: "server", seq: SERVER_ISN + 1, ack, data: "" });
export function startTcp(s: TcpState): TcpState {
  if (s.client !== "CLOSED") return note(s, "当前会话已启动；重置实验才能开启新会话。");
  const wire: Wire = { kind: "SYN", from: "client", seq: CLIENT_ISN, data: "" };
  return note(enqueue({ ...s, client: "SYN-SENT", clientNext: CLIENT_ISN + 1, clientPending: { wire, sentAt: s.clock } }, wire), "客户端发送 SYN seq=100；SYN 消耗一个序号，等待 SYN-ACK。");
}
export function sendTcpData(s: TcpState): TcpState {
  if (s.client !== "ESTABLISHED" || s.server !== "ESTABLISHED") return note(s, "双方尚未建立连接，先完成三次握手。");
  if (s.clientPending) return note(s, "停等模型：上一段尚未确认，不能发送下一段。");
  if (s.acked === s.payload.length) return note(s, "全部数据已确认，无需再次发送。");
  if (s.channel.length >= 32) return note(s, "通道已满，请先处理现有报文。");
  const data = s.payload.slice(s.acked, s.acked + 3);
  const wire: Wire = { kind: "DATA", from: "client", seq: CLIENT_ISN + 1 + s.acked, ack: SERVER_ISN + 1, data };
  return note(enqueue({ ...s, clientNext: wire.seq + data.length, clientPending: { wire, sentAt: s.clock } }, wire), `发送数据段 seq=${wire.seq}，载荷「${data}」${data.length} 字节，期待 ACK=${wire.seq + data.length}。`);
}
export function deliverTcp(s: TcpState, id: number): TcpState {
  const packet = s.channel.find(p => p.id === id);
  if (!packet) return note(s, "该报文已不在通道中。");
  if (packet.availableAt > s.clock) return note(s, `报文被延迟到 t=${packet.availableAt}，请先推进逻辑时钟。`);
  const next = { ...s, channel: s.channel.filter(p => p.id !== id) };
  const p = packet;
  if (p.kind === "SYN" && p.from === "client" && p.seq === CLIENT_ISN && !p.data && (s.server === "LISTEN" || s.server === "SYN-RECEIVED")) {
    const wire = synAck();
    return note(enqueue({ ...next, server: "SYN-RECEIVED", serverPending: { wire, sentAt: s.clock } }, wire), "服务器收到 SYN，发送 SYN-ACK seq=500 ack=101，等待最后的 ACK。");
  }
  if (p.kind === "SYN-ACK" && p.from === "server" && p.seq === SERVER_ISN && p.ack === CLIENT_ISN + 1 && !p.data && (s.client === "SYN-SENT" || s.client === "ESTABLISHED")) {
    return note(enqueue({ ...next, client: "ESTABLISHED", clientPending: s.client === "SYN-SENT" ? null : s.clientPending }, handshakeAck(s.client === "SYN-SENT" ? CLIENT_ISN + 1 : s.clientNext)), s.client === "SYN-SENT" ? "客户端确认服务器 SYN，进入 ESTABLISHED 并发送 ACK seq=101 ack=501。服务器此时仍等待这个 ACK。" : "收到重复 SYN-ACK，再次发送最终 ACK；不重新创建连接。");
  }
  if (p.kind === "ACK" && p.from === "client" && p.seq === CLIENT_ISN + 1 && p.ack === SERVER_ISN + 1 && !p.data && s.server === "SYN-RECEIVED") {
    return note({ ...next, server: "ESTABLISHED", serverPending: null }, "服务器收到最终 ACK，双方连接建立。纯 ACK 不消耗序号。");
  }
  if (p.kind === "DATA" && p.from === "client" && s.server === "ESTABLISHED" && p.ack === SERVER_ISN + 1 && /^[\x20-\x7e]{1,3}$/.test(p.data) && Number.isInteger(p.seq)) {
    if (p.seq === s.serverNext && s.received.length + p.data.length <= s.payload.length) {
      const received = s.received + p.data, serverNext = s.serverNext + p.data.length;
      return note(enqueue({ ...next, received, serverNext }, dataAck(serverNext)), `服务器按序接收「${p.data}」，ACK=${serverNext} 表示下一个期待的字节；应用累计「${received}」。`);
    }
    if (p.seq < s.serverNext && p.seq >= CLIENT_ISN + 1 && p.seq + p.data.length <= s.serverNext && s.received.slice(p.seq - CLIENT_ISN - 1, p.seq - CLIENT_ISN - 1 + p.data.length) === p.data) {
      return note(enqueue(next, dataAck(s.serverNext)), `收到重复数据 seq=${p.seq}：不重复交付应用，重发 ACK=${s.serverNext}。`);
    }
    return note(enqueue(next, dataAck(s.serverNext)), `数据不在期望位置，暂不交付，仍确认下一个期待字节 ACK=${s.serverNext}。本模型不缓存乱序段。`);
  }
  const pending = s.clientPending;
  if (p.kind === "DATA-ACK" && p.from === "server" && s.client === "ESTABLISHED" && p.seq === SERVER_ISN + 1 && !p.data && pending?.wire.kind === "DATA" && p.ack === pending.wire.seq + pending.wire.data.length && p.ack <= s.clientNext) {
    return note({ ...next, acked: p.ack - CLIENT_ISN - 1, clientPending: null }, `客户端收到有效 ACK=${p.ack}，已确认 ${p.ack - CLIENT_ISN - 1} 字节，可以发送下一段。`);
  }
  return note(next, "报文与当前状态、方向或序列号不符，忽略；不推进接收与确认状态。");
}
export function dropTcp(s: TcpState, id: number): TcpState {
  const p = s.channel.find(p => p.id === id);
  return p ? note({ ...s, channel: s.channel.filter(p => p.id !== id), lost: [...new Set([...s.lost, p.kind])] }, `网络丢弃 ${tcpKindLabels[p.kind]} #${id}；发送端不会立即知道丢包，需要等待确认或超时。`) : s;
}
export function delayTcp(s: TcpState, id: number): TcpState {
  if (!s.channel.some(p => p.id === id)) return s;
  return note({ ...s, channel: s.channel.map(p => p.id === id ? { ...p, availableAt: Math.max(p.availableAt, s.clock) + 2 } : p) }, `报文 #${id} 延迟两个逻辑时刻；延迟不等于丢失。`);
}
export function tickTcp(s: TcpState): TcpState {
  return note({ ...s, clock: s.clock + 1 }, "推进一个逻辑时刻，不自动投递或重传。");
}
export function canRetry(s: TcpState, side: "client" | "server"): boolean {
  const pending = side === "client" ? s.clientPending : s.serverPending;
  return !!pending && s.clock - pending.sentAt >= RETRY_TICKS && s.channel.length < 32;
}
export function retryTcp(s: TcpState, side: "client" | "server"): TcpState {
  const pending = side === "client" ? s.clientPending : s.serverPending;
  if (!pending || !canRetry(s, side)) return note(s, "尚无到期的待确认报文；不要把重传当成发送新数据。");
  const update = { ...pending, sentAt: s.clock };
  const next = { ...s, retransmitted: [...new Set([...s.retransmitted, pending.wire.kind])], ...(side === "client" ? { clientPending: update } : { serverPending: update }) };
  return note(enqueue(next, pending.wire), `${side === "client" ? "客户端" : "服务器"}超时重传 ${tcpKindLabels[pending.wire.kind]}，保持原 seq=${pending.wire.seq} 和载荷。`);
}
export type TcpTask = "normal" | "handshake-loss" | "data-loss";
export function gradeTcp(s: TcpState, task: TcpTask) {
  if (s.client !== "ESTABLISHED" || s.server !== "ESTABLISHED" || s.received !== s.payload || s.acked !== s.payload.length || s.clientPending || s.serverPending || s.serverNext !== CLIENT_ISN + 1 + s.payload.length) return { ok: false, message: "尚未完成双方建连、原文按序交付和发送端确认。请检查状态、通道与待确认报文。" };
  const hs = (["SYN", "SYN-ACK", "ACK"] as TcpKind[]).some(k => s.lost.includes(k));
  const hsRetry = (["SYN", "SYN-ACK"] as TcpKind[]).some(k => s.retransmitted.includes(k));
  if (task === "normal" && s.lost.length) return { ok: false, message: "正常任务要求无丢包，重置当前任务后完成正常建立与传输。" };
  if (task === "handshake-loss" && (!hs || !hsRetry)) return { ok: false, message: "还需要实际丢弃一次握手报文，并通过超时重传恢复连接。" };
  if (task === "data-loss" && (!(s.lost.includes("DATA") || s.lost.includes("DATA-ACK")) || !s.retransmitted.includes("DATA"))) return { ok: false, message: "还需要实际丢弃数据或数据 ACK，并重传原数据段完成确认。" };
  return { ok: true, message: `双方连接成立，原文「${s.received}」仅交付一次，${s.acked} 字节已确认；恢复证据符合任务。` };
}
