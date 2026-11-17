import { describe, expect, it } from "vitest";
import { beginFetch, configureFetch, displayFetch, gradeFetch, localApi, newFetchLab, parseFetch, settleFetch, type FetchLabState } from "../src/grading/fetchLab";
import { requestLocalApi } from "../src/runtime/localApi";
const send = (s: FetchLabState) => { const p = beginFetch(s); return settleFetch(p, p.pending!, localApi(p.config)); };
describe("B13 real local API and phase/result grading", () => {
  it("GET query and POST body actually determine different responses", async () => {
    const r = { ...newFetchLab(1).config, override: "" };
    expect(JSON.parse((await requestLocalApi(r, 0)).text)).toEqual({ id: 2, name: "Mina", points: 8 });
    expect(JSON.parse((await requestLocalApi({ ...r, path: "/api/profile?id=1" }, 0)).text).name).toBe("Nico");
    const created = await requestLocalApi({ ...r, method: "POST", body: '{"name":"Ada"}' }, 0);
    expect(created.status).toBe(201); expect(JSON.parse(created.text)).toEqual({ id: 3, name: "Ada" });
  });
  it("HTTP404 fulfills with ok=false while an offline request actually rejects", async () => {
    const r = newFetchLab(3).config;
    await expect(requestLocalApi(r, 0)).resolves.toMatchObject({ status: 404, ok: false });
    await expect(requestLocalApi({ ...r, online: false }, 0)).rejects.toThrow("没有 HTTP Response");
    expect(send(newFetchLab(2))).toMatchObject({ phase: "rejected", response: null });
    expect(send(newFetchLab(3))).toMatchObject({ phase: "response", response: { status: 404 } });
  });
  it("does not conflate JSON text, object parsing, missing fields and HTTP success", () => {
    const bad = parseFetch(send(newFetchLab())); expect(bad.parsedReady).toBe(false); expect(bad.observed).toContain("json");
    const http = parseFetch(send(newFetchLab(3))); expect(http.parsedReady).toBe(true); expect(displayFetch(http).displayed).toBeNull();
    const field = displayFetch(parseFetch(send(newFetchLab(1)))); expect(field.observed).toContain("field"); expect(field.displayed).toBeNull();
    const fixed = displayFetch(configureFetch(field, { field: "name" })); expect(fixed.displayed).toBe("Mina"); expect(gradeFetch(fixed)).toBe(true);
  });
  it("rejects primitive/null/prototype fields without throwing or inventing data", () => {
    for (const override of ["null", "123", '"hello"', "[]", "{}", '{"name":null}']) {
      const s = displayFetch(parseFetch(send(configureFetch(newFetchLab(), { override }))));
      expect(s.displayed).toBeNull(); expect(gradeFetch(s)).toBe(false);
    }
    expect(displayFetch(parseFetch(send(configureFetch(newFetchLab(), { override: "{}", field: "toString" })))).displayed).toBeNull();
  });
  it("ignores stale responses and invalidates old parsed/displayed results on request changes", () => {
    const pending = beginFetch(newFetchLab(1)), edited = configureFetch(pending, { path: "/api/profile?id=1" });
    expect(settleFetch(edited, pending.pending!, localApi(pending.config))).toBe(edited);
    const next = beginFetch(edited); expect(settleFetch(next, pending.pending!, localApi(pending.config))).toBe(next);
    const done = displayFetch(parseFetch(send(configureFetch(newFetchLab(1), { field: "name" }))));
    expect(configureFetch(done, { path: "/api/missing" })).toMatchObject({ parsedReady: false, displayed: null, response: null });
    expect(parseFetch(pending).parsedReady).toBe(false);
  });
  it("all four tasks require their actual error observation and subsequent correct result", () => {
    for (let task = 0; task < 4; task++) {
      let s = newFetchLab(task); expect(gradeFetch(s)).toBe(false);
      s = displayFetch(parseFetch(send(s))); expect(gradeFetch(s)).toBe(false);
      s = configureFetch(s, { path: `/api/profile?id=${task < 2 ? 2 : 1}`, online: true, field: "name", override: "" });
      s = displayFetch(parseFetch(send(s))); expect(gradeFetch(s), `task ${task}`).toBe(true);
      expect(gradeFetch({ ...s, observed: [] })).toBe(false);
      expect(gradeFetch({ ...s, displayed: "写死的假值" })).toBe(false);
    }
  });
  it("handles bad POST, unknown members and limits without changing inputs", () => {
    const s = newFetchLab(1), before = structuredClone(s);
    expect(localApi({ ...s.config, method: "POST", body: "broken" }).response?.status).toBe(400);
    expect(localApi({ ...s.config, method: "POST", body: "null" }).response?.status).toBe(422);
    expect(localApi({ ...s.config, path: "/api/profile?id=99" }).response?.status).toBe(404);
    expect(localApi({ ...s.config, override: "x".repeat(4001) }).response?.status).toBe(413);
    expect(s).toEqual(before);
  });
});
