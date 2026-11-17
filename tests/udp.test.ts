import { describe, it, expect } from "vitest";
import { initialUdp, sendUdp, deliverUdp, dropUdp, delayUdp, tickUdp, resendUdp, setUdpPolicy, positionStream, gradeRealtime } from "../src/grading/udp";
import { initialTcp, startTcp, deliverTcp, sendTcpData, dropTcp, tickTcp, retryTcp } from "../src/grading/tcp";
const sent = () => [0, 1, 2].reduce(s => sendUdp(s), initialUdp());
describe("UDP transport versus application policy", () => {
  it("sends independent datagrams without waiting for earlier delivery, with application metadata and ports", () => {
    const s = sent(); expect(s.channel.map(p => [p.seq, p.value, p.sourcePort, p.destinationPort])).toEqual([[1, 10, 53000, 5000], [2, 20, 53000, 5000], [3, 30, 53000, 5000]]);
    expect(sendUdp(s).sent).toHaveLength(3); expect(s.display).toBeNull();
  });
  it("raw arrival display actually regresses after out-of-order delivery", () => {
    let s = dropUdp(sent(), 2); s = deliverUdp(s, 3); expect(s.display?.value).toBe(30); s = deliverUdp(s, 1);
    expect(s.display?.value).toBe(10); expect(s.arrivals.map(a => a.seq)).toEqual([3, 1]); expect(gradeRealtime(s, initialTcp(), "raw").ok).toBe(true);
  });
  it("UDP itself never retransmits or fills a lost record when time advances", () => {
    let s = dropUdp(sent(), 2); for (let i = 0; i < 8; i++) s = tickUdp(s);
    expect(s.channel.map(p => p.seq)).toEqual([1, 3]); expect(s.retransmitted).toEqual([]); expect(s.archive[2]).toBeUndefined();
  });
  it("application compensation can explicitly recover a missing archival record", () => {
    let s = dropUdp(sent(), 2); s = deliverUdp(s, 1); s = deliverUdp(s, 3); s = resendUdp(s, 2); s = deliverUdp(s, 4);
    expect(s.archive).toEqual({ 1: 10, 2: 20, 3: 30 }); expect(s.retransmitted).toEqual([2]); expect(s.lost).toEqual([]);
  });
  it("freshness preserves newest data while recording raw delivery of old and expired datagrams", () => {
    let s = setUdpPolicy(sent(), "fresh"); s = deliverUdp(s, 3); s = deliverUdp(s, 2); s = delayUdp(delayUdp(s, 1), 1);
    expect(deliverUdp(s, 1).arrivals).toHaveLength(2);
    for (let i = 0; i < 4; i++) s = tickUdp(s); s = deliverUdp(s, 1);
    expect(s.display).toEqual({ seq: 3, value: 30 }); expect(s.arrivals.map(a => a.reason)).toEqual(["displayed", "older", "expired"]);
    expect(gradeRealtime(s, initialTcp(), "fresh").ok).toBe(true); expect(Object.keys(s.archive)).toHaveLength(3);
  });
  it("deadline is expired at exactly 3, and an application resend cannot pretend an old measurement is fresh", () => {
    let s = setUdpPolicy(dropUdp(sent(), 1), "fresh"); for (let i = 0; i < 3; i++) s = tickUdp(s); s = resendUdp(s, 1); s = deliverUdp(s, 4);
    expect(s.arrivals[0]?.reason).toBe("expired"); expect(s.display).toBeNull(); expect(s.channel.find(p => p.id === 2)?.createdAt).toBe(0);
  });
  it("no-op checks and the wrong application policy cannot satisfy challenges", () => {
    for (const task of ["raw", "fresh", "tcp"] as const) expect(gradeRealtime(initialUdp(), initialTcp(), task).ok).toBe(false);
    let s = sent(); s = deliverUdp(deliverUdp(deliverUdp(s, 1), 2), 3); expect(gradeRealtime(s, initialTcp(), "fresh").ok).toBe(false);
  });
  it("TCP contrast uses the existing actual state machine, recovers a dropped segment, and confirms the exact same stream", () => {
    const udp = initialUdp(); let t = startTcp(initialTcp(positionStream(udp)));
    for (let i = 0; i < 3; i++) t = deliverTcp(t, t.channel[0]!.id);
    t = sendTcpData(t); t = dropTcp(t, t.channel[0]!.id); expect(sendTcpData(t).clientNext).toBe(104);
    for (let i = 0; i < 3; i++) t = tickTcp(t); t = retryTcp(t, "client");
    t = deliverTcp(t, t.channel[0]!.id); t = deliverTcp(t, t.channel[0]!.id);
    for (let i = 0; i < 2; i++) { t = sendTcpData(t); t = deliverTcp(t, t.channel[0]!.id); t = deliverTcp(t, t.channel[0]!.id); }
    expect(t.received).toBe("10|20|30|"); expect(gradeRealtime(udp, t, "tcp").ok).toBe(true);
    expect(gradeRealtime(initialUdp([1, 2, 3]), t, "tcp").ok).toBe(false);
  });
  it("invalid packet operations preserve state and prior snapshots stay immutable", () => {
    const s = sent(), copy = structuredClone(s); deliverUdp(s, 999); delayUdp(s, 1); dropUdp(s, 2); setUdpPolicy(s, "fresh");
    expect(s).toEqual(copy); expect(resendUdp(s, 99).channel).toEqual(s.channel); expect(delayUdp(s, 999)).toBe(s); expect(dropUdp(s, 999)).toBe(s);
  });
  it.each([[], [1, 2], [1, 2, 100], [1, -1, 2], [1, 2.5, 3], [NaN, 1, 2]].map(positions => ({ positions })))("rejects invalid position list $positions", ({ positions }) => expect(() => initialUdp(positions)).toThrow());
  it("keeps bounded trace and arrival history under repeated experimental recovery", () => {
    let s = sendUdp(initialUdp()); for (let i = 0; i < 100; i++) { s = dropUdp(s, s.channel[0]!.id); s = resendUdp(s, 1); }
    expect(s.trace.length).toBeLessThanOrEqual(60); expect(s.channel).toHaveLength(1); expect(s.lostSeq).toEqual([1]);
  });
});
