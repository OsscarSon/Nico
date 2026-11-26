import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { academyTracks, coursesFor, liveLessonFor } from "../src/content/academy";
import { routeView } from "../src/content/route-view";
import { benches, passed, type BenchKey } from "../src/grading/f-route/bench";
import { adc, circuit, distanceFixture, exchange, indicator, pwm, readDistance, testMotion } from "../src/grading/f-route/circuits";
import { runSketch, sketchPassed, starter } from "../src/grading/f-route/arduino";
import { initialRover, playScenario, roverPassed, roverReplay, stepRover, type RoverRules } from "../src/grading/f-route/rover";

const answers: Record<BenchKey, Record<string, string>> = {
  series: { voltage: "3", r1: "100", r2: "200", switch: "closed" },
  io: { sensor: "light", actor: "lamp", rule: "dual" },
  signals: { reference: "3.3", voltage: "1.65", slots: "2" },
  reading: { filter: "median", missing: "unknown" },
  motors: { driver: "on", direction: "forward", duty: "60", angle: "90" },
  bus: { baud: "9600", address: "2a", register: "01" },
};
describe("electronics", () => {
  for (const key of Object.keys(answers) as BenchKey[]) it(key + " fails its default settings and checks actual outputs", () => {
    const bench = benches[key];
    const defaultFields = Object.fromEntries(bench.fields.map(field => [field.key, field.initial]));
    expect(passed(bench.run(defaultFields))).toBe(false);
    expect(passed(bench.run(answers[key]))).toBe(true);
  });

  it("tracks the series current and voltage drops without accepting a zero resistance closed model", () => {
    expect(circuit(3, [100, 200], true)).toMatchObject({ current: 10, resistance: 300, drops: [1, 2] });
    expect(circuit(3, [0, 0], true)).toMatchObject({ fault: true, current: null });
    expect(circuit(3, [0, 0], false)).toMatchObject({ fault: false, current: 0 });
  });

  it("uses hysteresis boundaries and keeps prior state within the band", () => {
    const result = indicator([59, 30, 59, 60, 45], 30, 60);
    expect(result.map(r => r.enabled)).toEqual([false, true, true, false, false]);
  });

  it("computes quantization and keeps PWM cycles independent", () => {
    expect(adc(1.65, 3.3, 10)).toBe(512);
    expect(adc(3.3, 3.3, 10)).toBe(1023);
    expect(adc(1, 0, 10)).toBeNull();
    expect(pwm(2)).toEqual([true, true, false, false, false, false, false, false, true, true, false, false, false, false, false, false]);
  });

  it("rejects transient noise, reports missing samples and rebuilds a clean window", () => {
    const filtered = readDistance(distanceFixture, "median", "unknown").map(row => row.value);
    expect(filtered).toEqual([null, null, 49, 18, 19, null, null, null, 45]);
    expect(readDistance(distanceFixture, "latest", "zero")[5]?.value).toBe(0);
  });

  it("checks motor driver, direction and servo command separately", () => {
    expect(testMotion(false, "forward", 60, 90)).toEqual({ effort: 0, target: 90, blocked: true });
    expect(testMotion(true, "reverse", 40, 90)).toEqual({ effort: -40, target: 90, blocked: false });
    expect(testMotion(true, "reverse", 0, 90).effort).toBe(0);
  });

  it("distinguishes incorrect UART speed, no ACK and the wrong register", () => {
    expect(exchange(115200, "2a", "01")).toEqual({ serial: null, ack: true, value: 42 });
    expect(exchange(9600, "2b", "01")).toEqual({ serial: "READY", ack: false, value: null });
    expect(exchange(9600, "2a", "02")).toEqual({ serial: "READY", ack: true, value: 17 });
    expect(exchange(9600, "2a", "03")).toEqual({ serial: "READY", ack: true, value: null });
  });
});

describe("Arduino timing", () => {
  const edited = starter.replace("delay(500);", "delay(250);").replace("delay(500);", "delay(750);");
  it("runs two actual rounds and accepts equivalent consecutive delays", () => {
    expect(sketchPassed(runSketch(starter))).toBe(false);
    expect(runSketch(edited)).toEqual({
      ok: true, period: 1000, elapsed: 2000,
      spans: [{ start: 0, end: 250, level: "HIGH" }, { start: 250, end: 1000, level: "LOW" },
        { start: 1000, end: 1250, level: "HIGH" }, { start: 1250, end: 2000, level: "LOW" }],
    });
    expect(sketchPassed(runSketch(edited.replace("delay(250);", "delay(100); delay(150);")))).toBe(true);
  });
  it("requires a configured output, valid syntax and at least one observable interval", () => {
    expect(runSketch(edited.replace("OUTPUT", "INPUT")).ok).toBe(false);
    expect(runSketch(edited.replace("delay(250);", "delay(250)")).ok).toBe(false);
    expect(runSketch(edited.replace("delay(250);", "delay(25000);")).ok).toBe(false);
    expect(runSketch(edited.replace("delay(250)", "delay(0)").replace("delay(750)", "delay(0)")).ok).toBe(false);
  });
});

describe("rover verification", () => {
  const rules: RoverRules = { threshold: 20, side: "lower", failsafe: true };
  it("arrives in two different obstacle layouts and stops at the missing sample", () => {
    const first = playScenario(initialRover("first"), rules);
    const second = playScenario(initialRover("second"), rules);
    const missing = playScenario(initialRover("missing"), rules);
    expect(first).toMatchObject({ status: "arrived", x: 5, y: 2 });
    expect(second).toMatchObject({ status: "arrived", x: 5, y: 2 });
    expect(missing).toMatchObject({ status: "parked", x: 1, y: 1 });
    expect(missing.trace.at(-1)).toMatchObject({ distance: null, action: "无读数，停车" });
    expect(stepRover(missing, rules)).toBe(missing);
    expect(roverPassed({ first, second, missing })).toBe(true);
    expect(roverReplay({ first, second, missing }, rules)).toMatchObject({ version: 1, rules, trials: { first, second, missing } });
  });
  it("keeps wrong routes and ignored missing data out of a passing replay", () => {
    const early = playScenario(initialRover("second"), { ...rules, threshold: 30 });
    const wrongSide = playScenario(initialRover("first"), { ...rules, side: "upper" });
    expect(early.status).toBe("blocked");
    expect(wrongSide.status).toBe("missed");
    expect(playScenario(initialRover("missing"), { ...rules, failsafe: false }).status).not.toBe("parked");
    expect(roverReplay({ second: early }, rules)).toBeUndefined();
  });
});

it("opens all eight Foundation F lessons without duplicating its emblem or opening future stages", () => {
  const records = coursesFor("Foundation", "F");
  const lessons = records.map(liveLessonFor);
  expect(records).toHaveLength(8);
  expect(academyTracks.filter(t => t.id === "F")).toEqual([{ id: "F", title: "硬件与机器人", subtitle: "连接软件与现实。", art: "track-f-hardware.png" }]);
  expect(routeView("f")?.units.map(unit => unit.nodes.length)).toEqual([4, 4]);
  expect(routeView("f", "Advanced")?.nodes.some(node => node.available)).toBe(false);
  expect(routeView("f", "Intermediate")?.nodes.some(node => node.available)).toBe(false);
  for (const [index, lesson] of lessons.entries()) {
    if (!lesson?.art) throw new Error("Missing lesson or illustration: " + index);
    expect(lesson.quality).toEqual({ state: "draft" });
    expect(lesson.blocks.map(block => block.type)).toEqual(["hook", "explain", "explain", "explain", "sim", "sim", "quiz", "transfer", "summary"]);
    expect(lesson.blocks.filter(block => block.type === "sim").map(block => block.mode)).toEqual(["free", "challenge"]);
    expect(lesson.blocks.find(block => block.type === "quiz")?.items).toHaveLength(3);
    expect(lesson.blocks.at(-1)).toMatchObject({ type: "summary", next: lessons[index + 1]?.id });
    const art = readFileSync("public/art/" + lesson.art);
    expect([art.readUInt32BE(16), art.readUInt32BE(20)]).toEqual([1600, 900]);
  }
});
