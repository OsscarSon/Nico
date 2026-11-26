import { describe, expect, it } from "vitest";
import { matchRoute } from "../src/app/router";
import { getLesson, lessons } from "../src/content";
import { curriculum } from "../src/content/academy";
import {
  academyCourses, courseDependencies, courseLink, domains, getAcademyCourse, lessonDependencies,
  liveLessons, moduleDependencies, moduleLessons, phases, primaryLocation, recommendedLesson, topicDependencies, topicPrerequisites,
  uniqueLiveCount, type Target,
} from "../src/content/academy2/model";
import { placements, relatedEntries } from "../src/content/academy2/migration";
import { personalPaths, studyAllocation } from "../src/content/academy2/paths";
import { laboratories, roadmap, teachingStandard, universityResources } from "../src/content/academy2/resources";
import { emptyProgress } from "../src/progress/store";
import { insertionFrames, parseSortInput, sampleBernoulliDistribution, samplePolynomial } from "../src/grading/academy2/labs";

function validTarget(target: Target) {
  const course = getAcademyCourse(target.course);
  expect(course, target.course).toBeDefined();
  if (target.module) {
    const module = course?.modules.find(module => module.id === target.module);
    expect(module, target.course + "/" + target.module).toBeDefined();
    if (target.topic) expect(module?.chapters.flat()).toContain(target.topic);
  }
}

describe("Academy 2.0 curriculum migration", () => {
  it("creates exactly 30 unique entrances, each with named modules, chapters, topics and a project", () => {
    expect(academyCourses).toHaveLength(30);
    expect(new Set(academyCourses.map(course => course.id)).size).toBe(30);
    expect(domains).toHaveLength(10);
    expect(phases).toHaveLength(3);
    for (const domain of domains) for (const phase of phases) {
      const course = getAcademyCourse(phase.id + "-" + domain.id);
      expect(course?.project.length).toBeGreaterThan(5);
      expect(course?.modules.length).toBeGreaterThanOrEqual(3);
      for (const module of course?.modules ?? []) {
        expect(module.chapters.length).toBeGreaterThan(0);
        expect(module.chapters.every(chapter => chapter.every(topic => topic.length > 0))).toBe(true);
      }
    }
  });

  it("migrates every old record exactly once, and never treats references or planned records as new live lessons", () => {
    const codes = academyCourses.flatMap(course => course.modules.flatMap(module => module.entries.map(entry => entry.course.id)));
    expect(codes.sort()).toEqual(curriculum.map(course => course.id).sort());
    const loaded = academyCourses.flatMap(liveLessons);
    expect(loaded.map(lesson => lesson.id).sort()).toEqual(Object.keys(lessons).sort());
    expect(uniqueLiveCount).toBe(116);
    expect(loaded.every(lesson => getLesson(lesson.id) === lesson)).toBe(true);
    for (const [courseId, mapping] of Object.entries(placements)) {
      const course = getAcademyCourse(courseId);
      for (const module of Object.keys(mapping)) expect(course?.modules.map(item => item.id)).toContain(module);
    }
    for (const key of Object.keys(relatedEntries)) {
      const [course, module] = key.split("/");
      validTarget({ course: course!, module });
    }
    expect(primaryLocation("a21-http-status")?.course.id).toBe("foundation-systems");
    expect(primaryLocation("a18-passwords")?.course.id).toBe("foundation-security");
    expect(primaryLocation("b-i06")?.course.id).toBe("intermediate-algorithms");
    expect(primaryLocation("b-i05")?.course.id).toBe("intermediate-data-science");
    expect(primaryLocation("B-U05")?.course.id).toBe("advanced-programming");
    expect(primaryLocation("E10")?.course.id).toBe("foundation-applied");
    expect(primaryLocation("M05")?.module.id).toBe("discrete");
    expect(primaryLocation("M02")?.module.id).toBe("linear-algebra");
    expect(lessonDependencies("a22-error-logs").map(prior => prior.lesson?.id)).toContain("a21-http-status");
    expect(moduleLessons(getAcademyCourse("intermediate-data-science")!, "sql").map(lesson => lesson.id)).toContain("b-i05");
  });

  it("links every recommended prerequisite to a real destination, including Attention's five topics", () => {
    for (const course of academyCourses) {
      courseDependencies(course).forEach(validTarget);
      for (const module of course.modules) {
        moduleDependencies(course, module.id).forEach(validTarget);
        for (const topic of module.chapters.flat()) topicPrerequisites(course, module, topic).forEach(validTarget);
      }
    }
    const dependencies = topicDependencies["advanced-ai/attention/Attention"]!;
    expect(dependencies).toHaveLength(5);
    dependencies.forEach(validTarget);
    expect(courseLink("advanced-ai", "attention", "Attention")).toBe("/courses/advanced-ai?module=attention&topic=Attention");
    expect(curriculum.find(course => course.id === "B-U02")?.prerequisites).toBe("B-U01、M05");
    expect(curriculum.find(course => course.id === "C-U02")?.prerequisites).toContain("M02");
    expect(matchRoute("/courses/advanced-ai?module=attention")).toEqual({ name: "course", courseId: "advanced-ai" });
    expect(matchRoute("/lab/prompt")).toEqual({ name: "prompt-lab" });
    expect(matchRoute("/lab/tutor/a01-binary")).toEqual({ name: "tutor", lessonId: "a01-binary" });
  });

  it("offers six shared paths, real resources and labs, with existing resume taking priority", () => {
    expect(personalPaths).toHaveLength(6);
    for (const path of personalPaths) {
      expect(path.steps).toHaveLength(7);
      for (const [, course, module] of path.steps) validTarget({ course, module });
    }
    expect(studyAllocation.reduce((sum, [, percent]) => sum + percent, 0)).toBe(100);
    expect(laboratories).toHaveLength(7);
    for (const lab of laboratories) {
      validTarget({ course: lab.course });
      for (const [, href] of lab.links) {
        const parsed = matchRoute(href);
        expect(parsed.name).not.toBe("notfound");
        if (parsed.name === "lesson") expect(getLesson(parsed.lessonId), href).toBeDefined();
      }
    }
    expect(teachingStandard).toHaveLength(12);
    expect(roadmap).toHaveLength(6);
    expect(universityResources).toHaveLength(15);
    expect(recommendedLesson(emptyProgress(), true, "a", "data-science")?.id).toBe("b01-variables");
    const progress = { ...emptyProgress(), resume: { lessonId: "a22-error-logs", step: 2 } };
    expect(recommendedLesson(progress, true, "a", "data-science")?.id).toBe("a22-error-logs");
    expect(recommendedLesson(progress, false, "a", "data-science")?.id).toBe("b01-variables");
  });
});

describe("starter laboratories", () => {
  it("plots polynomial samples including the intercept", () => {
    const points = samplePolynomial(2, -3, 4);
    expect(points[0]).toEqual({ x: -5, y: 69 });
    expect(points[80]).toEqual({ x: 0, y: 4 });
    expect(samplePolynomial(0, -2, 0).at(-1)?.y).toBe(-10);
  });
  it("has reproducible sampling, correct endpoint bins and reduced dispersion with larger samples", () => {
    const data = sampleBernoulliDistribution(.5, 20, 120, 2027);
    expect(data).toEqual(sampleBernoulliDistribution(.5, 20, 120, 2027));
    expect(data.bins.reduce((sum, value) => sum + value, 0)).toBe(120);
    expect(sampleBernoulliDistribution(0, 20, 30, 42).bins[0]).toBe(30);
    expect(sampleBernoulliDistribution(1, 20, 30, 42).bins[9]).toBe(30);
    expect(sampleBernoulliDistribution(.5, 80, 120, 2027).theoreticalSD).toBeCloseTo(data.theoreticalSD / 2);
  });
  it("applies actual insertion operations and handles duplicate, negative and invalid values", () => {
    const input = parseSortInput("5，-1, 4  -1")!;
    const frames = insertionFrames(input);
    expect(frames[0]?.order).toEqual([5, -1, 4, -1]);
    expect(frames.at(-1)).toMatchObject({ order: [-1, -1, 4, 5], sorted: 4, comparisons: 6 });
    expect(input).toEqual([5, -1, 4, -1]);
    expect(parseSortInput("2,100")).toBeUndefined();
    expect(parseSortInput("broken")).toBeUndefined();
  });
});
