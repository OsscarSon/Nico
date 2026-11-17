import { describe, expect, it } from "vitest";
import { initialTcp, startTcp, sendTcpData, deliverTcp, dropTcp, delayTcp, tickTcp, retryTcp, canRetry, gradeTcp, CLIENT_ISN, type TcpState, type TcpKind } from "../src/grading/tcp";
const deliver = (s: TcpState, kind: TcpKind) => deliverTcp(s, s.channel.find(p => p.kind === kind)!.id);
const ticks = (s: TcpState) => tickTcp(tickTcp(tickTcp(s)));
function connect(s = initialTcp()) { s = startTcp(s); s = deliver(s, "SYN"); s = deliver(s, "SYN-ACK"); return deliver(s, "ACK"); }
function finish(s: TcpState) { while (s.acked < s.payload.length) { s = sendTcpData(s); s = deliver(s, "DATA"); s = deliver(s, "DATA-ACK"); } return s; }
describe("TCP teaching state machine", () => {
  it("three-way handshake consumes SYN sequence numbers, not pure ACK", () => {
    let s = startTcp(initialTcp()); expect(s.client).toBe("SYN-SENT"); expect(s.channel[0]!.seq).toBe(100);
    s = deliver(s, "SYN"); expect(s.server).toBe("SYN-RECEIVED"); expect(s.channel[0]).toMatchObject({ seq: 500, ack: 101 });
    s = deliver(s, "SYN-ACK"); expect(s.client).toBe("ESTABLISHED"); expect(s.server).toBe("SYN-RECEIVED"); expect(s.channel[0]).toMatchObject({ seq: 101, ack: 501 });
    s = deliver(s, "ACK"); expect(s.server).toBe("ESTABLISHED"); expect(s.clientNext).toBe(101); expect(s.serverPending).toBeNull();
  });
  it.each(["SYN", "SYN-ACK", "ACK"] as const)("recovers lost handshake %s from correct sender timer", kind => {
    let s = startTcp(initialTcp());
    if (kind !== "SYN") s = deliver(s, "SYN");
    if (kind === "ACK") s = deliver(s, "SYN-ACK");
    s = dropTcp(s, s.channel.find(p => p.kind === kind)!.id);
    const side = kind === "SYN" ? "client" : "server";
    expect(canRetry(s, side)).toBe(false); s = ticks(s); expect(canRetry(s, side)).toBe(true); s = retryTcp(s, side);
    if (kind === "SYN") s = deliver(s, "SYN");
    s = deliver(s, "SYN-ACK"); s = deliver(s, "ACK");
    s = finish(s); expect(gradeTcp(s, "handshake-loss").ok).toBe(true); expect(gradeTcp(s, "normal").ok).toBe(false);
  });
  it("ASCII byte stream: sequence advances by bytes and is confirmed end to end", () => {
    let s = sendTcpData(connect(initialTcp("HELLO!")));
    expect(s.channel[0]).toMatchObject({ seq: 101, data: "HEL" }); expect(s.clientNext).toBe(104); expect(s.acked).toBe(0);
    s = deliver(s, "DATA"); expect(s.received).toBe("HEL"); expect(s.channel[0]!.ack).toBe(104);
    s = deliver(s, "DATA-ACK"); s = finish(s); expect(s.serverNext).toBe(107); expect(s.acked).toBe(6); expect(gradeTcp(s, "normal").ok).toBe(true);
  });
  it.each(["DATA", "DATA-ACK"] as const)("recovers lost %s without duplicate application delivery", kind => {
    let s = sendTcpData(connect());
    if (kind === "DATA-ACK") s = deliver(s, "DATA");
    const data = s.clientPending!.wire; s = dropTcp(s, s.channel.find(p => p.kind === kind)!.id);
    s = retryTcp(ticks(s), "client"); expect(s.channel[0]).toMatchObject(data);
    s = deliver(s, "DATA"); expect(s.received).toBe("HEL"); s = deliver(s, "DATA-ACK"); s = finish(s);
    expect(s.received).toBe("HELLO!"); expect(gradeTcp(s, "data-loss").ok).toBe(true);
  });
  it("delay differs from loss; stale duplicate is not delivered twice", () => {
    let s = sendTcpData(connect()); const id = s.channel[0]!.id;
    s = delayTcp(s, id); expect(deliverTcp(s, id).received).toBe(""); expect(s.lost).toEqual([]);
    s = retryTcp(ticks(s), "client"); s = deliverTcp(s, s.channel.at(-1)!.id); s = deliver(s, "DATA-ACK");
    s = deliverTcp(s, id); expect(s.received).toBe("HEL"); s = deliver(s, "DATA-ACK");
    expect(s.acked).toBe(3); expect(s.clientPending).toBeNull();
  });
  it("a delayed SYN-ACK after data uses the current sending sequence in its reply", () => {
    let s = startTcp(initialTcp()); s = deliver(s, "SYN");
    const old = s.channel[0]!.id; s = delayTcp(s, old); s = retryTcp(ticks(s), "server");
    s = deliverTcp(s, s.channel.at(-1)!.id); s = deliver(s, "ACK"); s = finish(s);
    s = deliverTcp(s, old); expect(s.channel.at(-1)).toMatchObject({ kind: "ACK", seq: 107, ack: 501 });
    expect(s.received).toBe("HELLO!"); expect(s.acked).toBe(6);
  });
  it("rejects future or incorrect ACK, premature data and invalid directions", () => {
    let s = initialTcp(); expect(sendTcpData(s).channel).toEqual([]);
    s = startTcp(s); s = { ...s, channel: s.channel.map(p => ({ ...p, from: "server" as const })) }; expect(deliver(s, "SYN").server).toBe("LISTEN");
    s = sendTcpData(connect()); s = deliver(s, "DATA");
    const altered = { ...s, channel: s.channel.map(p => ({ ...p, ack: 1000 })) }; expect(deliver(altered, "DATA-ACK").acked).toBe(0);
    expect(sendTcpData(s).clientNext).toBe(104); expect(sendTcpData(s).channel).toEqual(s.channel);
  });
  it("out-of-order DATA does not advance application state", () => {
    const s = sendTcpData(connect()); const changed = { ...s, channel: s.channel.map(p => ({ ...p, seq: p.seq + 3 })) };
    const r = deliver(changed, "DATA"); expect(r.received).toBe(""); expect(r.channel[0]!.ack).toBe(101);
  });
  it("challenge cannot pass from clicks, only receive and confirm plus required loss evidence", () => {
    let s = ticks(initialTcp()); expect(gradeTcp(s, "normal").ok).toBe(false); s = finish(connect(s));
    expect(gradeTcp(s, "normal").ok).toBe(true); expect(gradeTcp(s, "handshake-loss").ok).toBe(false); expect(gradeTcp(s, "data-loss").ok).toBe(false);
    expect(gradeTcp({ ...s, received: "wrong" }, "normal").ok).toBe(false); expect(gradeTcp({ ...s, acked: 0 }, "normal").ok).toBe(false);
  });
  it.each(["x", "ABCD", "123456789012"])("different byte counts %s", text => {
    const s = finish(connect(initialTcp(text))); expect(s.received).toBe(text); expect(s.acked).toBe(text.length); expect(s.serverNext).toBe(CLIENT_ISN + 1 + text.length);
  });
  it.each(["", "中文", "x".repeat(13), "\n", "🙂"])("rejects unsupported input %j", text => expect(() => initialTcp(text)).toThrow());
  it("preserves snapshots, handles empty queue and caps channel growth", () => {
    const base = initialTcp(), copy = structuredClone(base); connect(base); expect(base).toEqual(copy);
    expect(dropTcp(base, 99)).toBe(base); expect(delayTcp(base, 99)).toBe(base); expect(deliverTcp(base, 99).channel).toEqual([]);
    let s = startTcp(base); for (let i = 0; i < 40; i++) s = retryTcp(ticks(s), "client");
    expect(s.channel).toHaveLength(32); expect(canRetry(s, "client")).toBe(false);
  });
});
