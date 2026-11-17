import { describe, expect, it } from "vitest";
import { hosts, host, routerMac, initialForward, startForward, forwardStep, gradeForward, forwardTasks, type ForwardState, type HostId } from "../src/grading/forwarding";
function drain(s: ForwardState) { for (let i = 0; s.queue.length && i < 30; i++) s = forwardStep(s); expect(s.queue).toHaveLength(0); return s; }
describe("Ethernet learning and IP forwarding", () => {
  for (const a of hosts) for (const b of hosts.filter(h => h.id !== a.id)) it(`${a.id}→${b.id}: actual paths, end-to-end IP and per-hop MAC`, () => {
    const s = drain(startForward(initialForward(), a.id, b.id)); const d = s.deliveries[0]!;
    expect(s.deliveries).toHaveLength(1);
    expect(d.path).toEqual(a.lan === b.lan ? [a.id, `S${a.lan}`, b.id] : [a.id, `S${a.lan}`, "R", `S${b.lan}`, b.id]);
    expect(d.sourceIp).toBe(a.ip); expect(d.destinationIp).toBe(b.ip); expect(d.finalMac).toBe(b.mac);
    expect(d.firstMac).toBe(a.lan === b.lan ? b.mac : routerMac(a.lan));
  });
  it("learns source only, floods unknown unicast excluding ingress", () => {
    const s = forwardStep(startForward(initialForward(), "A", "B"));
    expect(s.tables[1]).toEqual({ [host("A").mac]: "A" });
    expect(s.tables[1][host("B").mac]).toBeUndefined();
    expect(s.queue.map(f => f.at)).toEqual(["B", "R1"]);
    expect(s.queue.every(f => f.dstMac === host("B").mac)).toBe(true);
    expect(drain(s).routed).toBe(false);
  });
  it("a reply teaches B; subsequent A→B becomes known unicast", () => {
    let s = drain(startForward(initialForward(), "A", "B"));
    s = drain(startForward(s, "B", "A"));
    s = forwardStep(startForward(s, "A", "B"));
    expect(s.queue.map(f => f.at)).toEqual(["B"]); expect(s.flooded).toBe(false);
  });
  it("cannot send to remote MAC directly across a router", () => {
    const s = drain(startForward(initialForward(), "A", "C", "direct"));
    expect(s.deliveries).toEqual([]); expect(s.routed).toBe(false);
    expect(s.trace.some(t => t.includes("不会被路由出去"))).toBe(true);
  });
  it("decrements TTL at router, drops when exhausted", () => {
    let s = startForward(initialForward(), "A", "C"); s = { ...s, queue: s.queue.map(f => ({ ...f, ttl: 1 })) };
    s = drain(s); expect(s.deliveries).toEqual([]); expect(s.trace.some(t => t.includes("TTL"))).toBe(true);
  });
  it("all tasks require genuine results; unrelated endpoints or forged IP cannot pass", () => {
    for (const task of forwardTasks) {
      expect(gradeForward(initialForward(), task).ok).toBe(false);
      const s = drain(startForward(initialForward(), task.src, task.dst)); expect(gradeForward(s, task).ok).toBe(true);
      expect(gradeForward({ ...s, deliveries: s.deliveries.map(d => ({ ...d, destinationIp: "0.0.0.0" })) }, task).ok).toBe(false);
    }
    expect(gradeForward(drain(startForward(initialForward(), "C", "D")), forwardTasks[0]!).ok).toBe(false);
    expect(gradeForward(drain(startForward(initialForward(), "A", "B", "gateway")), forwardTasks[0]!).ok).toBe(false);
  });
  it("rejects same/invalid host, preserves active transfer and immutable tables", () => {
    const base = initialForward(), copy = structuredClone(base);
    expect(startForward(base, "A", "A").queue).toEqual([]);
    expect(startForward(base, "bad" as HostId, "A").queue).toEqual([]);
    const active = startForward(base, "A", "C");
    expect(startForward(active, "B", "D").queue).toEqual(active.queue);
    drain(active); expect(base).toEqual(copy);
    expect(forwardStep(base).queue).toEqual([]);
  });
});
