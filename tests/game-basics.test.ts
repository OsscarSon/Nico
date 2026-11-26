import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveLessonFor, coursesFor } from "../src/content/academy";
import { routeView } from "../src/content/route-view";
import {
  advanceFrame, framePassed, initialFrame, initialKeys, initialMotion, keysPassed,
  markersPassed, motionPassed, placeMarker, recordTrial, setGameKey, stepKeys, stepMotion, trialMatches,
  type TimeStep,
} from "../src/grading/gameBasics";

describe("D01 frame order", () => {
  it("samples, updates and draws separate states, rejecting a skipped or repeated operation", () => {
    const start = initialFrame();
    expect(advanceFrame(start, { type: "update" })).toBe(start);
    expect(advanceFrame(start, { type: "draw" })).toBe(start);
    const sampled = advanceFrame(start, { type: "sample", direction: 1 });
    expect(advanceFrame(sampled, { type: "sample", direction: -1 })).toBe(sampled);
    const updated = advanceFrame(sampled, { type: "update" });
    expect(updated).toMatchObject({ world: 2, drawn: 1 });
    expect(advanceFrame(updated, { type: "update" })).toBe(updated);
    const shown = advanceFrame(updated, { type: "draw" });
    expect(shown).toMatchObject({ world: 2, drawn: 2, history: [2] });
    expect(framePassed(shown)).toBe(false);
    const next = advanceFrame(shown, { type: "sample", direction: 1 });
    const secondUpdate = advanceFrame(next, { type: "update" });
    expect(framePassed(secondUpdate)).toBe(false);
    expect(framePassed(advanceFrame(secondUpdate, { type: "draw" }))).toBe(true);
  });
  it("keeps a character inside the field", () => {
    const start = { ...initialFrame(), world: 5, drawn: 5 };
    const sampled = advanceFrame(start, { type: "sample", direction: 1 });
    expect(advanceFrame(sampled, { type: "update" }).world).toBe(5);
  });
});

describe("D02 coordinate conversion", () => {
  it("translates the local origin and rejects off-field and fractional cell coordinates", () => {
    expect(placeMarker({ x: 0, y: 0 }, "local")).toEqual({ space: "local", world: { x: 2, y: 1 } });
    expect(placeMarker({ x: -1, y: 2 }, "local")?.world).toEqual({ x: 1, y: 3 });
    expect(placeMarker({ x: -1, y: 2 }, "world")).toBeUndefined();
    expect(placeMarker({ x: 4, y: 0 }, "local")).toBeUndefined();
    expect(placeMarker({ x: 1.5, y: 0 }, "world")).toBeUndefined();
  });
  it("requires both independent marker results and their requested frame of reference", () => {
    const supply = placeMarker({ x: 4, y: 2 }, "world");
    const dock = placeMarker({ x: -1, y: 2 }, "local");
    expect(markersPassed({ supply })).toBe(false);
    expect(markersPassed({ supply, dock: placeMarker({ x: 1, y: 3 }, "world") })).toBe(false);
    expect(markersPassed({ supply, dock })).toBe(true);
  });
});

describe("D03 displacement trials", () => {
  const velocity = { x: 4, y: 2 };
  const run = (steps: TimeStep[]) => steps.reduce((state, elapsed) => stepMotion(state, velocity, elapsed), initialMotion());
  it("scales signed velocity by elapsed time and caps the experiment at one second", () => {
    const start = initialMotion();
    const first = stepMotion(start, { x: -3, y: 2 }, 250);
    expect(first.position).toEqual({ x: -.75, y: .5 });
    expect(stepMotion(first, velocity, 1000)).toBe(first);
    expect(stepMotion(first, { x: 6, y: 0 }, 250)).toBe(first);
    expect(recordTrial({}, first)).toEqual({});
  });
  it("compares two real trials at different step sizes with the same endpoint", () => {
    const half = run([500, 500]);
    const quarter = run([250, 250, 250, 250]);
    expect(half.position).toEqual(quarter.position);
    const first = recordTrial({}, half);
    expect(motionPassed(first)).toBe(false);
    expect(motionPassed(recordTrial(first, quarter))).toBe(true);
  });
  it("rejects the same endpoint reached using changing velocities", () => {
    let trial = stepMotion(initialMotion(), { x: 4, y: 4 }, 500);
    trial = stepMotion(trial, { x: 4, y: 0 }, 500);
    expect(trial.position).toEqual({ x: 4, y: 2 });
    expect(trialMatches(trial, 2)).toBe(false);
  });
});

describe("D04 key events", () => {
  it("moves every held frame but signals only on an edge, even after a short tap", () => {
    let state = setGameKey(initialKeys(), "ArrowRight", true);
    state = stepKeys(setGameKey(state, "Space", true));
    expect(setGameKey(state, "Space", true)).toBe(state);
    state = stepKeys(state);
    expect(state).toMatchObject({ x: 2, signals: 1, maxHeldTicks: 2, lastSignal: false });
    expect(keysPassed(state)).toBe(false);
    state = stepKeys(setGameKey(state, "Space", false));
    state = setGameKey(state, "ArrowRight", false);
    state = setGameKey(setGameKey(state, "Space", true), "Space", false);
    expect(keysPassed(state)).toBe(false);
    state = stepKeys(state);
    expect(state).toMatchObject({ x: 3, signals: 2, lastSignal: true });
    expect(keysPassed(state)).toBe(true);
  });
  it("cancels opposite directions, bounds a moving character, and resets a broken hold", () => {
    let state = initialKeys();
    state = setGameKey(setGameKey(state, "ArrowLeft", true), "ArrowRight", true);
    expect(stepKeys(state).x).toBe(0);
    expect(stepKeys(setGameKey(state, "ArrowRight", false)).x).toBe(0);
    state = stepKeys(setGameKey(state, "Space", true));
    state = setGameKey(setGameKey(state, "Space", false), "Space", true);
    expect(stepKeys(state).maxHeldTicks).toBe(1);
  });
});

it("opens only D01–D04, each with a complete illustrated draft and planned successors", () => {
  const courses = coursesFor("Foundation", "D");
  expect(courses).toHaveLength(16);
  const live = courses.flatMap(c => c.status === "live" ? [c.id] : []);
  expect(live).toEqual(["D01", "D02", "D03", "D04"]);
  const view = routeView("d");
  expect(view?.units[0]?.nodes.map(node => node.code)).toEqual(live);
  expect(view?.nodes.filter(node => !node.available)).toHaveLength(12);
  for (const course of courses.slice(0, 4)) {
    const lesson = liveLessonFor(course);
    if (!lesson?.art) throw new Error(`Missing lesson artwork: ${course.id}`);
    expect(lesson.quality).toEqual({ state: "draft" });
    expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
    expect(lesson.blocks.map(b => b.type)).toEqual(["hook", "explain", "explain", "explain", "sim", "sim", "quiz", "transfer", "summary"]);
    expect(lesson.blocks.filter(b => b.type === "sim").map(b => b.mode)).toEqual(["free", "challenge"]);
    const quiz = lesson.blocks.find(b => b.type === "quiz");
    expect(quiz?.items).toHaveLength(3);
    const png = readFileSync(`public/art/${lesson.art}`);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1600, 900]);
  }
});
