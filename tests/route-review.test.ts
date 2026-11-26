import { describe, expect, it } from "vitest";
import { buildReview, commitReview, editReview, gradeReview, newReview, publishReview, queryReview, visitReview } from "../src/grading/routeReview";

const update = () => editReview(queryReview(newReview(), "/api/profile?id=2", "points"));
const commit = (state = update()) => commitReview(commitReview(state, "stage"), "commit");

describe("B20 publishing review", () => {
  it("rejects a nonexistent record, the wrong member, and a name instead of the points field", () => {
    const initial = newReview();
    expect(queryReview(initial, "/api/profile?id=9", "points").note).toContain("404");
    for (const invalid of [
      queryReview(initial, "/api/profile?id=1", "points"),
      queryReview(initial, "/api/profile?id=2", "name"),
    ]) {
      expect(editReview(invalid).repo).toBe(invalid.repo);
      expect(gradeReview(invalid).correct).toBe(false);
    }
  });

  it("constructs from committed content instead of a newer worktree or staged file", () => {
    const edited = update();
    expect(commitReview(edited, "commit").repo.branches.main).toBe(edited.repo.branches.main);
    const staged = commitReview(edited, "stage");
    const old = visitReview(publishReview(buildReview(staged), "dist"), "/club/");
    expect(old.site.visit?.html).toContain("积分：3");
    expect(gradeReview(old)).toMatchObject({ correct: true, committed: false, verified: false });
    const later = commitReview(old, "commit");
    expect(gradeReview(later)).toMatchObject({ committed: true, published: false, verified: false });
    expect(gradeReview(publishReview(later, "dist")).published).toBe(false);
  });

  it("checks directory, project path, and the actual published body", () => {
    const built = buildReview(commit());
    expect(visitReview(publishReview(built, "."), "/club/").site.visit?.status).toBe(404);
    const published = publishReview(built, "dist");
    expect(gradeReview(published).verified).toBe(false);
    expect(gradeReview(visitReview(published, "/")).verified).toBe(false);
    const verified = visitReview(published, "/club/");
    expect(verified.site.visit?.html).toContain("积分：8");
    expect(gradeReview(verified)).toEqual({ correct: true, committed: true, published: true, verified: true });
    expect(gradeReview(publishReview(verified, "dist")).verified).toBe(false);
  });
});
