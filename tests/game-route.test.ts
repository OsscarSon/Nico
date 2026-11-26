import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { coursesFor, liveLessonFor } from "../src/content/academy";
import { routeView } from "../src/content/route-view";
import { benchPassed, benches, overlap, parseReturn, physicsProbe, probePackage } from "../src/grading/game-route/bench";
import {
  collectFeedback, deliveryPassed, exportDelivery, fallPassed, feedbackPassed, initialDelivery, initialFall,
  initialFeedback, initialRound, moveDelivery, roundPassed, stepFall, transition, type Move, type Transition,
} from "../src/grading/game-route/states";

const supported = [
  ["collision", { x: "3", y: "1" }],
  ["editor", { scene: "entrance", position: "3", trial: "2", save: "on" }],
  ["components", { sprite: "on", movement: "on", collider: "on" }],
  ["scripting", { code: "return grounded && energy >= 3;" }],
  ["physics", { body: "dynamic", platform: "solid", sensor: "trigger" }],
  ["hud", { anchor: "right", inset: "12", value: "state" }],
  ["assets", { mode: "multiple", ppu: "32", sound: "owned" }],
  ["release", { scene: "workshop", pack: "on", path: "relative" }],
] as const;

describe("D-route diagnostic benches", () => {
  for (const [key, answer] of supported) it(`${key} checks results and rejects its own default configuration`, () => {
    const bench = benches[key];
    const initial = Object.fromEntries(bench.fields.map(f => [f.key, f.initial]));
    expect(benchPassed(bench.run(initial))).toBe(false);
    expect(benchPassed(bench.run(answer))).toBe(true);
  });
  it("uses positive width and height overlap independently", () => {
    const wall = { x: 4, y: 1, w: 2, h: 2 };
    expect(overlap({ x: 3, y: -1, w: 2, h: 2 }, wall)).toBe(false);
    expect(overlap({ x: 2, y: 1, w: 2, h: 2 }, wall)).toBe(false);
    expect(overlap({ x: 5, y: 1, w: 0, h: 2 }, wall)).toBe(false);
    expect(overlap({ x: 3, y: 0, w: 2, h: 2 }, wall)).toBe(true);
  });
  it("evaluates boolean precedence and rejects invalid or unsupported C# syntax", () => {
    const evaluate = parseReturn("return energy >= 3 && grounded || energy == 0;");
    expect(evaluate?.({ energy: 0, grounded: false })).toBe(true);
    expect(evaluate?.({ energy: 3, grounded: false })).toBe(false);
    expect(evaluate?.({ energy: 3, grounded: true })).toBe(true);
    expect(parseReturn("return energy = 3;")).toBeUndefined();
    expect(parseReturn("return energy >= 3")).toBeUndefined();
    expect(parseReturn("return alert(1);")).toBeUndefined();
    expect(parseReturn("return energy >= 3; return grounded;")).toBeUndefined();
    expect(benchPassed(benches.scripting.run({ code: "return energy > 2 && grounded;" }))).toBe(true);
  });
  it("separates static, trigger and solid physics outcomes", () => {
    expect(physicsProbe("static", "solid", "trigger")).toEqual({ y: 2, rests: false, enters: false });
    expect(physicsProbe("dynamic", "trigger", "trigger")).toEqual({ y: -.5, rests: false, enters: true });
    expect(physicsProbe("dynamic", "solid", "off")).toEqual({ y: 0, rests: true, enters: false });
  });
  it("does not confuse an existing entry with correct subpath resolution or packed assets", () => {
    expect(probePackage("workshop", false, "./assets/level.json")).toEqual({ index: true, assets: false, resource: "/robot/assets/level.json" });
    expect(probePackage("workshop", true, "/assets/level.json")).toEqual({ index: true, assets: false, resource: "/assets/level.json" });
  });
});

describe("D-route sequential experiences", () => {
  it("keeps float-free quarter-step values for the validated fall", () => {
    const noGravity = stepFall(initialFall(), 0);
    expect(noGravity.y).toBe(2);
    let s = initialFall();
    for (let i = 0; i < 4; i++) s = stepFall(s, 4);
    expect(s.heights).toEqual([1.75, 1.25, .5, 0]);
    expect(s.vy).toBe(0);
    expect(stepFall(s, 4)).toBe(s);
    expect(fallPassed(s)).toBe(true);
  });
  it("blocks movement specifically in a paused half-complete round", () => {
    const begun = transition(initialRound(), "start");
    expect(transition(begun, "dock").phase).toBe("running");
    const paused = transition(transition(begun, "move"), "pause");
    const blocked = transition(paused, "move");
    expect(blocked).toMatchObject({ phase: "paused", energy: 1, sawPausedMove: true });
    expect(transition(transition(begun, "pause"), "move").sawPausedMove).toBe(false);
    const finished = (["resume", "move", "dock"] as Transition[]).reduce(transition, blocked);
    expect(roundPassed(finished)).toBe(true);
    expect(transition(finished, "move").energy).toBe(2);
  });
  it("deduplicates input and proves mute independently of selecting silent mode", () => {
    const enabled = { visual: true, sound: true, muted: false };
    const first = collectFeedback(initialFeedback(), "A", enabled);
    const duplicate = collectFeedback(first, "A", enabled);
    expect(duplicate.receipts).toHaveLength(1);
    expect(duplicate.announcement).toBeUndefined();
    expect(feedbackPassed(collectFeedback(duplicate, "B", { ...enabled, muted: true, sound: false }))).toBe(false);
    expect(feedbackPassed(collectFeedback(duplicate, "B", { ...enabled, muted: true }))).toBe(true);
  });
  it("makes the hole dangerous, requires a real airborne crossing and exports a replayable run", () => {
    const failed = (["right", "right", "right"] as Move[]).reduce(moveDelivery, initialDelivery("gap"));
    expect(failed.phase).toBe("failed");
    expect(exportDelivery(failed)).toBeUndefined();
    expect(moveDelivery(failed, "jump-right")).toBe(failed);
    const bridge = Array<Move>(7).fill("right").reduce(moveDelivery, initialDelivery("bridge"));
    expect(bridge.phase).toBe("won");
    expect(deliveryPassed(bridge)).toBe(false);
    const actions: Move[] = ["right", "right", "jump-right", "land", "right", "right", "right"];
    const won = actions.reduce(moveDelivery, initialDelivery("gap"));
    expect(deliveryPassed(won)).toBe(true);
    const replay = exportDelivery(won)!;
    expect(replay).toMatchObject({ actions, collected: [1, 5], position: 7, crossedGap: true });
    expect(replay.actions.reduce(moveDelivery, initialDelivery(replay.layout))).toEqual(won);
  });
  it("does not collect a battery passed in midair and does not unlock with one battery", () => {
    const actions: Move[] = ["jump-right", "land", "jump-right", "land", "right", "right", "right"];
    const s = actions.reduce(moveDelivery, initialDelivery("gap"));
    expect(s).toMatchObject({ x: 7, collected: [5], phase: "playing" });
    expect(exportDelivery(s)).toBeUndefined();
  });
});

it("integrates sixteen stable Foundation lesson IDs, art and progression while leaving other stages unavailable", () => {
  const courses = coursesFor("Foundation", "D");
  expect(courses).toHaveLength(16);
  expect(routeView("d")?.units.map(unit => unit.nodes.length)).toEqual([4, 4, 4, 4]);
  expect(routeView("d", "Intermediate")?.nodes.some(n => n.available)).toBe(false);
  expect(routeView("d", "Advanced")?.nodes.some(n => n.available)).toBe(false);
  const lessons = courses.map(course => liveLessonFor(course));
  for (const [i, lesson] of lessons.entries()) {
    if (!lesson?.art) throw Error(`Missing lesson or art at index ${i}`);
    expect(lesson.quality).toEqual({ state: "draft" });
    expect(lesson.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    expect(lesson.blocks.find(b => b.type === "quiz")?.items).toHaveLength(3);
    expect(lesson.blocks.at(-1)).toMatchObject({ type: "summary", next: lessons[i + 1]?.id });
    const png = readFileSync(`public/art/${lesson.art}`);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1600, 900]);
  }
});
