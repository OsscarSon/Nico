import { describe, it, expect } from "vitest";
import {
  broadcastOf, describeSubnet, formatIPv4, gradeSubnetTask, networkOf, parseCidr, parseIPv4,
  prefixToMask, sameSubnet, subnetTasks, toBinaryDotted, usableHosts,
} from "../src/grading/ip";
import { dnsNames, dnsScenario, emptyCache, resolve, scenarioAnswers } from "../src/grading/dns";
import {
  DATA_BYTES, HEADER_BYTES, demoStates, gradeLayer, layerTasks, layers, type LayerId,
} from "../src/grading/layers";

const ip = (s: string) => parseIPv4(s) as number;

// 下面的期望值由 Python 的 ipaddress 标准库独立算出（另外还用 5000 组随机数据核对过实现）。
describe("IPv4 parsing and formatting", () => {
  it("round-trips", () => {
    for (const s of ["0.0.0.0", "192.168.1.10", "255.255.255.255", "10.0.0.1"])
      expect(formatIPv4(ip(s))).toBe(s);
  });
  it("rejects malformed addresses", () => {
    for (const bad of ["", "192.168.1", "192.168.1.256", "192.168.01.1", "a.b.c.d", "1.2.3.4.5", "1..2.3", "1.2.3.-4", "1.2.3.4/24", "1.2.3.4 5"])
      expect(parseIPv4(bad)).toBe(null);
  });
  it("tolerates surrounding spaces", () => {
    expect(parseIPv4(" 192.168.1.10 ")).toBe(ip("192.168.1.10"));
  });
  it("writes 32 bits in four groups of eight", () => {
    expect(toBinaryDotted(ip("192.168.1.10"))).toBe("11000000.10101000.00000001.00001010");
  });
  it("parses CIDR notation", () => {
    expect(parseCidr("192.168.1.10/24")).toEqual({ ip: ip("192.168.1.10"), prefix: 24 });
    for (const bad of ["192.168.1.10", "192.168.1.10/33", "192.168.1.10/", "192.168.1.10/24/1", "x/24"])
      expect(parseCidr(bad)).toBe(null);
  });
});

describe("subnet maths", () => {
  it("masks", () => {
    expect(formatIPv4(prefixToMask(0))).toBe("0.0.0.0");
    expect(formatIPv4(prefixToMask(8))).toBe("255.0.0.0");
    expect(formatIPv4(prefixToMask(24))).toBe("255.255.255.0");
    expect(formatIPv4(prefixToMask(26))).toBe("255.255.255.192");
    expect(formatIPv4(prefixToMask(32))).toBe("255.255.255.255");
    expect(() => prefixToMask(33)).toThrow();
    expect(() => prefixToMask(-1)).toThrow();
  });
  it("192.168.1.10/24", () => {
    const d = describeSubnet(ip("192.168.1.10"), 24);
    expect(formatIPv4(d.network)).toBe("192.168.1.0");
    expect(formatIPv4(d.broadcast)).toBe("192.168.1.255");
    expect(d.hosts).toBe(254);
    expect(formatIPv4(d.firstHost)).toBe("192.168.1.1");
    expect(formatIPv4(d.lastHost)).toBe("192.168.1.254");
  });
  it("10.0.0.70/26 belongs to the 10.0.0.64 block", () => {
    const d = describeSubnet(ip("10.0.0.70"), 26);
    expect(formatIPv4(d.network)).toBe("10.0.0.64");
    expect(formatIPv4(d.broadcast)).toBe("10.0.0.127");
    expect(d.hosts).toBe(62);
    expect(formatIPv4(d.firstHost)).toBe("10.0.0.65");
    expect(formatIPv4(d.lastHost)).toBe("10.0.0.126");
  });
  it("192.168.1.200/25 is in the upper half", () => {
    expect(formatIPv4(networkOf(ip("192.168.1.200"), 25))).toBe("192.168.1.128");
    expect(formatIPv4(broadcastOf(ip("192.168.1.200"), 25))).toBe("192.168.1.255");
  });
  it("172.16.200.9/16", () => {
    expect(formatIPv4(networkOf(ip("172.16.200.9"), 16))).toBe("172.16.0.0");
    expect(formatIPv4(broadcastOf(ip("172.16.200.9"), 16))).toBe("172.16.255.255");
    expect(usableHosts(16)).toBe(65534);
  });
  it("usable hosts = 2^(32-prefix) - 2, with /31 and /32 as special cases", () => {
    expect(usableHosts(24)).toBe(254);
    expect(usableHosts(28)).toBe(14); // A10 迁移题的答案
    expect(usableHosts(30)).toBe(2);
    expect(usableHosts(31)).toBe(2);
    expect(usableHosts(32)).toBe(1);
    expect(() => usableHosts(40)).toThrow();
  });
  it("network address = address AND mask (the AND gate from A03)", () => {
    const a = ip("192.168.1.10");
    expect(networkOf(a, 24)).toBe((a & prefixToMask(24)) >>> 0);
  });
  it("the network address always has all host bits 0 and broadcast all 1", () => {
    for (const p of [8, 16, 20, 24, 26, 30]) {
      const a = ip("203.0.113.77");
      const host = 2 ** (32 - p) - 1;
      expect(networkOf(a, p) % (host + 1)).toBe(0);
      expect((broadcastOf(a, p) % (host + 1)) === host).toBe(true);
    }
  });
});

describe("subnet challenge tasks", () => {
  it("answers are same, different, same, different (two of them are traps)", () => {
    expect(subnetTasks.map((t) => sameSubnet(ip(t.a), ip(t.b), t.prefix))).toEqual([true, false, true, false]);
  });
  it("the /25 trap: same first three numbers but different subnets", () => {
    const t = subnetTasks[3]!;
    expect(t.a.split(".").slice(0, 3).join(".")).toBe(t.b.split(".").slice(0, 3).join("."));
    expect(sameSubnet(ip(t.a), ip(t.b), t.prefix)).toBe(false);
  });
  it("the /16 trap: different third number but the same subnet", () => {
    const t = subnetTasks[2]!;
    expect(t.a.split(".")[2]).not.toBe(t.b.split(".")[2]);
    expect(sameSubnet(ip(t.a), ip(t.b), t.prefix)).toBe(true);
  });
  it("feedback names both network addresses, right or wrong", () => {
    const t = subnetTasks[3]!;
    const wrong = gradeSubnetTask(t, true);
    expect(wrong.ok).toBe(false);
    expect(wrong.message).toContain("192.168.1.0");
    expect(wrong.message).toContain("192.168.1.128");
    const right = gradeSubnetTask(t, false);
    expect(right.ok).toBe(true);
    expect(right.message).toContain("不在同一网段");
  });
});

describe("DNS model", () => {
  it("a cold lookup asks root, TLD, then the authoritative server", () => {
    const r = resolve("www.example.com", emptyCache());
    expect(r.ip).toBe("203.0.113.10");
    expect(r.serversAsked).toBe(3);
    expect(r.steps.map((s) => `${s.from}>${s.to}`)).toEqual([
      "你>解析器", "解析器>根服务器", "解析器>TLD 服务器", "解析器>权威服务器", "解析器>你",
    ]);
  });
  it("a repeated lookup is answered from the cache with no server asked", () => {
    const first = resolve("www.example.com", emptyCache());
    const again = resolve("www.example.com", first.cache);
    expect(again.serversAsked).toBe(0);
    expect(again.steps.some((s) => s.kind === "cache")).toBe(true);
  });
  it("another name in the same domain only needs the authoritative server", () => {
    const first = resolve("www.example.com", emptyCache());
    const mail = resolve("mail.example.com", first.cache);
    expect(mail.serversAsked).toBe(1);
    expect(mail.steps.map((s) => s.to)).toEqual(["解析器", "权威服务器", "你"]);
    expect(mail.ip).toBe("203.0.113.25");
  });
  it("a different domain under another TLD starts from the root again", () => {
    const first = resolve("www.example.com", emptyCache());
    const org = resolve("www.example.org", first.cache);
    expect(org.serversAsked).toBe(3);
    expect(org.steps.some((s) => s.to === "根服务器")).toBe(true);
  });
  it("the scenario answers are 3, 0, 1, 3 (computed by running the model)", () => {
    expect(dnsScenario.length).toBe(4);
    expect(scenarioAnswers()).toEqual([3, 0, 1, 3]);
  });
  it("the transfer answer: root is asked once across www.example.com then mail.example.com", () => {
    const a = resolve("www.example.com", emptyCache());
    const b = resolve("mail.example.com", a.cache);
    const rootAsks = [...a.steps, ...b.steps].filter((s) => s.to === "根服务器").length;
    expect(rootAsks).toBe(1);
  });
  it("a name that does not exist is reported, not invented", () => {
    const r = resolve("nope.example.com", emptyCache());
    expect(r.ip).toBe(null);
    expect(r.steps.at(-1)!.kind).toBe("missing");
    expect(r.cache.answers["nope.example.com"]).toBe(undefined);
  });
  it("names are case-insensitive", () => {
    expect(resolve("WWW.Example.COM", emptyCache()).ip).toBe("203.0.113.10");
  });
  it("does not mutate the cache it is given", () => {
    const c = emptyCache();
    const snap = JSON.stringify(c);
    resolve("www.example.com", c);
    expect(JSON.stringify(c)).toBe(snap);
  });
  it("only reserved documentation names and addresses are used", () => {
    for (const n of dnsNames) expect(/\.example\.(com|org)$/.test(n)).toBe(true);
    for (const n of dnsNames) {
      const a = resolve(n, emptyCache()).ip as string;
      expect(a.startsWith("203.0.113.") || a.startsWith("198.51.100.")).toBe(true);
    }
  });
});

describe("network layers", () => {
  it("has four layers in order", () => {
    expect(layers.map((l) => l.id)).toEqual(["app", "transport", "network", "link"]);
  });
  it("100 + 20 + 20 + 14 = 154 bytes on the wire (the A09 transfer answer)", () => {
    expect(DATA_BYTES + HEADER_BYTES.transport + HEADER_BYTES.network + HEADER_BYTES.link).toBe(154);
    expect(demoStates[3]!.bytes).toBe(154);
  });
  it("sending wraps one layer at a time, receiving unwraps back to the data", () => {
    expect(demoStates.map((s) => s.bytes)).toEqual([100, 120, 140, 154, 140, 120, 100]);
    expect(demoStates.map((s) => s.sending)).toEqual([true, true, true, true, false, false, false]);
    expect(demoStates[3]!.frames).toEqual(["link", "network", "transport", "app"]);
    expect(demoStates[6]!.frames).toEqual(["app"]);
  });
  it("every task has exactly one right layer and a hint for each wrong one", () => {
    const ids: LayerId[] = ["app", "transport", "network", "link"];
    for (const t of layerTasks) {
      for (const id of ids) {
        if (id === t.answer) expect(t.hints[id]).toBe("");
        else expect(t.hints[id].length > 5).toBe(true);
      }
    }
  });
  it("task answers cover all four layers", () => {
    expect(new Set(layerTasks.map((t) => t.answer)).size).toBe(4);
  });
  it("grading names the layer and explains", () => {
    const t = layerTasks[4]!; // TCP 重传
    expect(gradeLayer(t, "transport").ok).toBe(true);
    const bad = gradeLayer(t, "network");
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain("网络层");
    expect(bad.message).toContain("尽力转发");
  });
});
