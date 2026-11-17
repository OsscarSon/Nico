import { describe, expect, it } from "vitest";
import { buildDeployment, configureDeployment, editDeployment, gradeDeployment, inspectDeployment, newDeployment, publishDeployment, recordRuntime, serveStatic, SITE_MESSAGE, SITE_ORIGIN, STATIC_HTML, staticReferences, visitDeployment, type DeploymentState } from "../src/grading/deployment";
const build = (s: DeploymentState) => buildDeployment(inspectDeployment(s));
function proof(s: DeploymentState) { return recordRuntime(s, { deployment: s.deployed!.id, url: s.visit!.url, heading: "编程社", message: SITE_MESSAGE, color: "rgb(36, 87, 245)", error: null }); }
function solved(task: number) {
  let s = visitDeployment(publishDeployment(build(newDeployment(task))));
  s = configureDeployment(editDeployment(s, "src/index.html", STATIC_HTML), { publishDir: "dist" });
  return proof(visitDeployment(publishDeployment(build(s))));
}
describe("B17 copy build, immutable deployment, real URL probes and runtime-proof grading", () => {
  it("publishing the wrong directory yields a real missing index, not a canned animation", () => {
    const s = visitDeployment(publishDeployment(build(newDeployment())));
    expect(s.visit?.status).toBe(404); expect(s.observed).toContain("page404"); expect(gradeDeployment(s)).toBe(false);
    expect(s.deployed!.files["dist/index.html"]).toBeDefined(); expect(s.deployed!.files["index.html"]).toBeUndefined();
  });
  it("resolves relative, root and case-sensitive paths against the deployed URL", () => {
    const s = publishDeployment(build(newDeployment(1))), v = visitDeployment(s).visit!;
    expect(v.status).toBe(200); expect(v.resources.map(r => [r.url, r.status])).toEqual([[`${SITE_ORIGIN}/style.css`, 404], [`${SITE_ORIGIN}/app.js`, 404]]);
    const good = solved(1);
    expect(serveStatic(good, "/club/style.css?version=2").status).toBe(200);
    expect(serveStatic(good, "/club/Style.css").status).toBe(404);
    expect(serveStatic(good, "https://other.example/club/index.html").status).toBe(404);
    expect(serveStatic(good, "/club/../style.css").status).toBe(404);
    expect(serveStatic(good, "/club/__proto__").status).toBe(404);
    expect(serveStatic(good, "/club/%E0%A4").status).toBe(400);
    const otherURL = visitDeployment(publishDeployment(build(newDeployment())), "/wrong-project/");
    expect(otherURL.observed).toEqual([]); // An unrelated URL error is not the required target's failure.
  });
  it("requires current inspection/build, but editing cannot silently change published files", () => {
    let s = solved(0); const original = structuredClone(s.deployed);
    s = editDeployment(s, "src/app.js", "throw new Error('broken')");
    expect(s.deployed).toEqual(original); expect(buildDeployment(s).message).toContain("先检查"); expect(gradeDeployment(s)).toBe(false);
    s = build(s); expect(gradeDeployment(s)).toBe(false); // new output alone is not deployed
    s = publishDeployment(s); expect(s.proof).toBeNull(); expect(gradeDeployment(s)).toBe(false);
  });
  it("all three challenges reject no-ops, missing observed errors, stale and failed runtime evidence", () => {
    for (let task = 0; task < 3; task++) {
      expect(gradeDeployment(newDeployment(task))).toBe(false);
      const s = solved(task); expect(gradeDeployment(s), `task ${task}`).toBe(true);
      expect(gradeDeployment({ ...s, observed: [] })).toBe(false);
      expect(gradeDeployment({ ...s, proof: { ...s.proof!, message: "等待脚本" } })).toBe(false);
      expect(gradeDeployment({ ...s, proof: { ...s.proof!, color: "rgb(0, 0, 0)" } })).toBe(false);
      expect(gradeDeployment({ ...s, proof: { ...s.proof!, error: "TypeError" } })).toBe(false);
      expect(recordRuntime(s, { ...s.proof!, deployment: -1 })).toBe(s);
    }
  });
  it("rejects unsafe/missing build directories and unsupported edits without destroying state", () => {
    const s = newDeployment(2), before = structuredClone(s);
    for (const dir of ["../src", "", "src", "/dist"]) expect(inspectDeployment(configureDeployment(s, { output: dir })).inspected).toBeNull();
    expect(inspectDeployment(configureDeployment(s, { source: "missing" })).inspected).toBeNull();
    expect(publishDeployment(s).deployed).toBeNull(); expect(editDeployment(s, "../evil", "x").files).toEqual(s.files); expect(s).toEqual(before);
  });
  it("parses supported quoted/unquoted resource attributes and reports malformed URLs safely", () => {
    expect(staticReferences('<LINK href="./a.css" REL="stylesheet"><script src=./b.js></script>')).toEqual([{ ref: "./a.css", kind: "style" }, { ref: "./b.js", kind: "script" }]);
    const s = editDeployment(newDeployment(1), "src/index.html", '<script src="http://["></script>');
    expect(visitDeployment(publishDeployment(build(s))).visit?.resources[0]?.status).toBe(400);
  });
});
