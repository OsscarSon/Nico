import { describe, expect, it } from "vitest";
import { algorithmLessons } from "../src/content/academy2/algorithms";
import {
  algorithmTopics,
  algorithmKey,
} from "../src/content/academy2/algorithms/registry";
import {
  algorithmCode,
  algorithmProgramModels,
} from "../src/content/academy2/algorithms/python";
import { academyCourses } from "../src/content/academy2/model";
import { knowledgeRegistry } from "../src/content/academy2/knowledgeRegistry";
import {
  knowledgeEdges,
  auditGraph,
  dependenciesOf,
} from "../src/content/academy2/knowledgeGraph";
import {
  studyCatalogue,
  searchStudy,
} from "../src/content/academy2/teaching/library";
import { topicLessonSchema } from "../src/content/academy2/teaching/schema";
import { renderFormula } from "../src/features/academy2/teaching/renderFormula";
import { arenaModels, modelById } from "../src/grading/academy2/algorithms";
import { algorithmVariant } from "../src/grading/academy2/algorithms/variants";
import {
  benchmarkRange,
  createRangeIndex,
  projectExample,
  sortingProject,
  structuresProject,
  transportProject,
} from "../src/grading/academy2/algorithms/projects";
import {
  emptyKnowledge,
  gradeExercise,
  gradeTopic,
  knowledgeStatus,
  recordIndependentVerification,
} from "../src/grading/academy2/p1/progress";
import { evaluate } from "../src/grading/academy2/teaching/questions";
import { buildTopicContext } from "../src/ai/topicContext";

const run = (id: string, input: string, parameter = "") =>
  modelById(id)!.run(input, parameter);
const registry = knowledgeRegistry.filter((topic) =>
  topic.course.endsWith("-algorithms"),
);
const sort = (a: readonly number[]) => [...a].sort((x, y) => x - y);
const source = [-4, 7, 0, 7, 4, 2, 2, -6, 3, 11, 3];
const pick = (seed: number) => (Math.imul(seed, 1664525) + 1013904223) >>> 0;
const rotate = (a: number[], i: number) => [...a.slice(i), ...a.slice(0, i)];

describe("P2 stable lessons and teaching infrastructure", () => {
  it("covers all 60 existing Word-blueprint IDs and parses every lesson and displayed formula", () => {
    expect(academyCourses).toHaveLength(30);
    expect(algorithmLessons).toHaveLength(60);
    expect(new Set(algorithmLessons.map((lesson) => lesson.id))).toEqual(
      new Set(registry.map((topic) => topic.id)),
    );
    for (const item of algorithmLessons) {
      expect(topicLessonSchema.safeParse(item.lesson).success, item.title).toBe(
        true,
      );
      expect(item.base.exercises, newline(item)).toHaveLength(4);
      expect(
        item.lesson.blocks.some((block) => block.type === "sequence"),
      ).toBe(true);
      expect(item.lesson.blocks.some((block) => block.type === "example")).toBe(
        true,
      );
      for (const match of JSON.stringify(item.lesson).matchAll(
        /\$([^$]+)\$/g,
      )) {
        const latex = JSON.parse('"' + match[1] + '"') as string;
        expect(renderFormula(latex), item.title + " " + latex).not.toBeNull();
      }
      for (const block of item.lesson.blocks.flatMap((block) =>
        "blocks" in block ? block.blocks : [block],
      )) {
        if (block.type === "math")
          expect(
            renderFormula(block.latex, true),
            newline(item) + " " + block.latex,
          ).not.toBeNull();
      }
    }
  });
  it("checks lesson graph, bilingual search, formula links and public tutor question context", () => {
    const id = algorithmKey("dijkstra")!.id;
    expect(auditGraph(knowledgeEdges)).toEqual([]);
    expect(dependenciesOf(id).map((edge) => edge.kind)).toContain("required");
    const library = studyCatalogue();
    expect(
      searchStudy(library.search, "dijkstra").some((item) =>
        item.path.includes(id),
      ),
    ).toBe(true);
    expect(
      library.formula.some(
        (formula) => formula.topic === id && formula.anchor === "advanced-3-1",
      ),
    ).toBe(true);
    const item = algorithmLessons.find((item) => item.id === id)!;
    const prompt = buildTopicContext(item.base, item.lesson, "答题提示", {
      title: "最短路径",
      objective: "输入权重",
    });
    expect(prompt).toContain("最短路径");
    expect(prompt).not.toContain(item.base.exercises[0].explanation);
  });
  it("records practice, independent verification, and wrong verification through existing progress", () => {
    const lesson = algorithmLessons.find((item) => item.key === "sorting")!;
    const id = lesson.id,
      [a, b, c, d] = lesson.base.exercises;
    let state = emptyKnowledge();
    state = recordIndependentVerification(state, id, true, 100);
    expect(knowledgeStatus(state.records[id], 100)).toBe("new");
    state = gradeTopic(state, id, 0, a, "10", 100);
    state = gradeTopic(state, id, 1, b, "是", 110);
    state = gradeTopic(state, id, 2, c, "线性", 120);
    expect(knowledgeStatus(state.records[id], 120)).toBe("complete");
    state = gradeTopic(state, id, 3, d, "3", 130);
    expect(knowledgeStatus(state.records[id], 130)).toBe("review");
    state = gradeTopic(state, id, 3, d, "6", 140);
    expect(knowledgeStatus(state.records[id], 140)).toBe("mastered");
  });
  it("uses valid new-seed variants and separate verification IDs for every supported model", () => {
    for (const model of arenaModels) {
      if (!algorithmVariant(model.id, 1)) continue;
      const prompts = new Set<string>();
      for (let seed = 1; seed < 26; seed++) {
        const trial = algorithmVariant(model.id, seed)!;
        const verification = algorithmVariant(model.id, seed + 2000, true)!;
        expect(trial.type === "number" || trial.type === "text", model.id).toBe(
          true,
        );
        if (trial.type !== "number" && trial.type !== "text")
          throw Error(trial.id);
        const answer =
          typeof trial.answer === "number"
            ? String(trial.answer)
            : trial.answer[0]!;
        expect(evaluate(trial, answer).status).toBe("correct");
        expect(evaluate(trial, "bad-value").status).not.toBe("correct");
        expect(verification.id).not.toEqual(trial.id);
        expect(verification.level).toBe("transfer");
        prompts.add(trial.prompt);
      }
      expect(prompts.size, model.id).toBeGreaterThan(1);
    }
    expect(algorithmProgramModels.length).toBeGreaterThanOrEqual(12);
    for (const name of algorithmProgramModels) {
      const task = algorithmCode(name)!;
      expect(task.question.type).toBe("program");
      const extra = algorithmCode(name, 20261127)!.question;
      if (task.question.type !== "program" || extra.type !== "program")
        throw Error(name);
      expect(extra.id).not.toBe(task.question.id);
      expect(extra.cases).toHaveLength(task.question.cases.length + 2);
    }
  });
});

function newline(item: { id: string; title: string }) {
  return item.id + " " + item.title;
}
describe("real traces against independent oracles", () => {
  it("runs all model examples to a terminal result with stable snapshots and monotone counts", () => {
    expect(new Set(arenaModels.map((model) => model.id)).size).toBe(
      arenaModels.length,
    );
    for (const topic of algorithmTopics) {
      const lesson = algorithmLessons.find((item) => item.id === topic.id)!;
      expect(modelById(lesson.material.model), topic.title).toBeDefined();
    }
    for (const model of arenaModels) {
      const result = model.run(model.input, model.parameter ?? "");
      expect(result.frames.length, model.id).toBeGreaterThan(1);
      expect(result.frames.at(-1)?.variables[0]?.[1]).toBe(result.answer);
      expect(
        result.frames.every(
          (frame, i) => frame.count >= (result.frames[i - 1]?.count ?? 0),
        ),
        model.id,
      ).toBe(true);
      expect(model.run(model.input, model.parameter ?? "")).toEqual(result);
    }
  });
  it("sorts rotations and permutations with duplicate and negative values, and independently counts worst cases", () => {
    for (let i = 0; i < source.length; i++) {
      const a = rotate(source, i);
      for (const method of ["插入", "选择", "归并"])
        expect(run("sort", a.join(), method).answer).toBe(sort(a).join());
      expect(run("random", a.join(), String(i)).answer).toBe(sort(a).join());
      const first = a.indexOf(3);
      expect(run("linear", a.join(), "3").answer).toBe(first);
      expect(sort(a)[Number(run("binary", sort(a).join(), "3").answer)]).toBe(
        3,
      );
    }
    expect(run("sort", "9,8,7,6,5", "选择").frames.at(-1)?.count).toBe(10);
    expect(run("sort", "9,8,7,6,5", "插入").frames.at(-1)?.count).toBe(10);
    expect(run("sort", "1,2,3,4,5", "插入").frames.at(-1)?.count).toBe(4);
    expect(run("linear", "", "3").answer).toBe(-1);
    expect(() => run("binary", "4,2,1", "2")).toThrow(/非递减/);
  });
  it("replays container operations and handles count, hash and tree edge cases", () => {
    expect(run("queue", "push:1,push:2,pop,push:4,front").answer).toBe(2);
    expect(run("stack", "push:1,push:2,pop,push:4,front").answer).toBe(4);
    expect(run("list", "push:1,push:2,insert:1:8,remove:0,front").answer).toBe(
      8,
    );
    expect(run("reverse", "1,2,3").answer).toBe("3,2,1");
    expect(run("hash", "1,5,9,1,6", "4").answer).toBe(2);
    expect(run("recursive", "0", "阶乘").answer).toBe(1);
    expect(run("recursive", "5", "阶乘").frames.at(-1)?.count).toBe(6);
    expect(run("avl", "30,10,20", "20").answer).toBe(0);
    expect(run("avl", "1,2,3", "2").answer).toBe(0);
    expect(run("bst", "1,2,3", "3").answer).toBe(2);
    expect(run("heap", "2,-1,4,-1,0", "5").answer).toBe("-1,-1,0,2,4");
    expect(run("trie", "to,tea,ten,elk", "te").answer).toBe("tea,ten");
    expect(run("union", "A-B,C-D,B-C", "A,D").answer).toBe("相连");
    expect(() => run("queue", "push:3,pop:2")).toThrow(/参数/);
  });
  it("compares shortest paths to independent dynamic distance closure for many graphs", () => {
    const vertices = ["A", "B", "C", "D"];
    for (let seed = 1; seed < 41; seed++) {
      for (const signed of [true, false]) {
        let x = seed;
        const weights = vertices.map((_, i) =>
          vertices.map((_, j) => {
            if (i === j) return 0;
            x = pick(x);
            if ((i > j && signed) || x % 5 === 0) return Infinity;
            return signed ? (x % 18) - 5 : x % 18;
          }),
        );
        const edges = weights.flatMap((line, i) =>
          line.flatMap((w, j) =>
            i === j || !Number.isFinite(w)
              ? []
              : [vertices[i] + ">" + vertices[j] + ":" + w],
          ),
        );
        const graph = [...vertices, ...edges].join(",");
        const closure = weights.map((row) => [...row]);
        for (let k = 0; k < 4; k++)
          for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
              closure[i]![j] = Math.min(
                closure[i]![j]!,
                closure[i]![k]! + closure[k]![j]!,
              );
        const best = closure[0]![3]!,
          expected = Number.isFinite(best) ? best : "不可达";
        expect(run("bellman", graph, "A,D").answer, graph).toBe(expected);
        if (!signed)
          expect(run("dijkstra", graph, "A,D").answer, graph).toBe(expected);
      }
    }
    expect(run("bfs", "A>B,B>D,A>C,C>E,E>D", "A,D").answer).toBe(2);
    expect(run("bellman", "A>B:-1,B>A:0,B>D:3", "A,D").answer).toBe("负环影响");
    expect(run("bellman", "A>B:1,B>C:-4,C>B:2,A>D:2", "A,D").answer).toBe(2);
    expect(() => run("dijkstra", "A>B:-1", "A,B")).toThrow(/非负|负边/);
    expect(run("topo", "A>B,B>A").answer).toBe("有环");
    expect(run("bfs", "A-B,B-C", "C,A").answer).toBe(2);
    expect(() => run("dfs", "A-B,B>C", "A,C")).toThrow(/全有向/);
  });
  it("checks maximum flow by enumerating cuts, including parallel arcs and residual rerouting", () => {
    let x = 13;
    for (let j = 0; j < 50; j++) {
      const nodes = ["S", "A", "B", "T"],
        edges = nodes.flatMap((from, i) =>
          nodes.flatMap((to, k) => {
            if (i === k) return [];
            x = pick(x);
            return [{ from, to, c: x % 9 }];
          }),
        );
      const cut = Array.from(
        { length: 4 },
        (_, mask) =>
          new Set([
            "S",
            ...(mask & 1 ? ["A"] : []),
            ...(mask & 2 ? ["B"] : []),
          ]),
      ).map((left) =>
        edges.reduce(
          (sum, edge) =>
            sum + (left.has(edge.from) && !left.has(edge.to) ? edge.c : 0),
          0,
        ),
      );
      expect(
        run(
          "flow",
          edges.map((e) => e.from + ">" + e.to + ":" + e.c).join(),
          "S,T",
        ).answer,
      ).toBe(Math.min(...cut));
    }
    expect(run("flow", "S>A:3,S>A:4,A>T:11", "S,T").answer).toBe(7);
    expect(
      run("flow", "S>A:1,S>B:1,A>C:1,A>D:1,B>C:1,C>T:1,D>T:1", "S,T").answer,
    ).toBe(2);
    expect(run("matching", "A>X,A>Y,B>X,C>Y,C>Z", "").answer).toBe(3);
    expect(run("mst", "A-B:-5,B-C:2,A-C:0,C-D:3", "").answer).toBe(-2);
  });
  it("differentially checks ranges, string algorithms and dynamic programming", () => {
    for (let i = 1; i < source.length; i++) {
      const a = rotate(source, i),
        l = i - 1,
        r = i + 1;
      const b = [...a];
      b[l] = i;
      const sum = b.slice(l, r).reduce((s, value) => s + value, 0);
      for (const name of ["fenwick", "segment"])
        expect(run(name, a.join(), `u:${l}:${i},q:${l}:${r}`).answer).toBe(sum);
      for (const fenwick of [false, true]) {
        const tree = createRangeIndex(a, fenwick);
        tree.update(l, i);
        expect(tree.sum(l, r)).toBe(sum);
      }
    }
    for (const text of ["banana", "aaaaa", "甲🙂甲🙂", "ababba", "a"]) {
      for (const pattern of ["aa", "aba", "🙂", "z", "a"]) {
        const a = [...text],
          p = [...pattern];
        const expected = a.flatMap((_, i) =>
          p.every((char, j) => a[i + j] === char) ? [i] : [],
        );
        expect(run("kmp", text, pattern).answer).toBe(expected.join());
      }
    }
    expect(run("suffix", "banana").answer).toBe("5,3,1,0,4,2");
    const items = [
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 0],
    ];
    for (let capacity = 0; capacity < 12; capacity++) {
      const feasible = Array.from({ length: 16 }, (_, mask) =>
        items.filter((_, i) => mask & (1 << i)),
      ).filter(
        (selected) =>
          selected.reduce((sum, item) => sum + item[0]!, 0) <= capacity,
      );
      expect(
        run("dp", items.map((item) => item.join()).join(";"), String(capacity))
          .answer,
      ).toBe(
        Math.max(
          ...feasible.map((a) => a.reduce((sum, item) => sum + item[1]!, 0)),
        ),
      );
    }
    expect(() => run("segment", "1,2", "q:1:3")).toThrow();
    expect(() => run("kmp", "test", "")).toThrow();
  });
  it("checks finite simulation, suffix recognition, certificate integrity and the approximation bound", () => {
    for (let i = 0; i < 100; i++) {
      const input = i.toString(2);
      expect(run("dfa", input).answer).toBe(
        input.endsWith("101") ? "接受" : "拒绝",
      );
    }
    expect(run("tm", "111", "加一,4").answer).toBe("1111");
    expect(run("tm", "111", "加一,3").answer).toBe("步限内未停机");
    const clauses = [
      [
        [1, 1, 1],
        [-1, -1, -1],
      ],
      [
        [1, -2, 3],
        [-1, -2, -3],
        [2, 2, 2],
      ],
      [
        [1, -1, 2],
        [1, -1, 3],
      ],
    ];
    for (const formula of clauses) {
      const sat = Array.from({ length: 8 }, (_, assignment) =>
        formula.every((row) =>
          row.some(
            (lit) =>
              Boolean((assignment >> (Math.abs(lit) - 1)) & 1) === lit > 0,
          ),
        ),
      ).some(Boolean);
      const graph = run(
        "sat-clique",
        formula.map((row) => row.join()).join(";"),
      );
      expect(graph.answer === formula.length).toBe(sat);
    }
    expect(run("certificate", "3,7,4,9", "6:0,0").answer).toBe("无效");
    expect(run("certificate", "3,7,4,9", "11:1,2").answer).toBe("有效");
    const edgeList = ["A-B", "B-C", "C-D", "D-A", "A-C"];
    for (let mask = 1; mask < 32; mask++) {
      const edges = edgeList.filter((_, i) => mask & (1 << i)),
        graph = edges.join();
      const covers = Array.from(
        { length: 16 },
        (_, m) => new Set([..."ABCD"].filter((_, i) => m & (1 << i))),
      ).filter((s) => edges.every((e) => s.has(e[0]!) || s.has(e[2]!)));
      const optimal = Math.min(...covers.map((c) => c.size));
      const approximate = Number(run("approx", graph).answer);
      expect(approximate).toBeGreaterThanOrEqual(optimal);
      expect(approximate).toBeLessThanOrEqual(2 * optimal);
      expect(run("fpt", graph, String(optimal)).answer).toBe("是");
      expect(run("fpt", graph, String(optimal - 1)).answer).toBe("否");
    }
  });
  it("validates project evidence independently and rejects bad project inputs", () => {
    expect(sortingProject(...projectExample.foundation)).toHaveLength(2);
    expect(() => sortingProject("1,2,3", "3,2,1")).toThrow(/重复键/);
    const [g, h, data, n] = projectExample.intermediate;
    expect(transportProject(g, h, "dp", data, n)).toHaveLength(4);
    expect(() => transportProject(h, g, "dp", data, n)).toThrow(/非负/);
    expect(structuresProject(...projectExample.advanced)).toHaveLength(2);
    expect(() =>
      structuresProject("1,2,3,4", "q:0:2,u:1:9", "ababa", "aba"),
    ).toThrow(/两次查询/);
    expect(() =>
      structuresProject("1,2,3,4", "q:0:2,u:1:9,q:0:2", "abc", "ab"),
    ).toThrow(/重叠/);
    let time = 0;
    expect(benchmarkRange(129, () => ++time, 128)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ samples: [1, 1, 1, 1, 1], median: 1 }),
      ]),
    );
    expect(() => benchmarkRange(9, () => 0)).toThrow();
  });
  it("keeps checks for formula, boundary and transfer answers tied to resolved problems", () => {
    const samples = [
      ["cost", 3, String((20 * 21) / 2)],
      ["array", 3, String(160 + 4 * 8)],
      ["sorting", 0, String((5 * 4) / 2)],
      [
        "binary",
        3,
        String(run("binary", "1,4,6,8,12,15,18", "4").frames.at(-1)!.count),
      ],
      ["hash", 3, String(run("hash", "1,5,9,6,1", "4").answer)],
    ] as const;
    for (const [key, index, answer] of samples) {
      const lesson = algorithmLessons.find((item) => item.key === key)!;
      expect(gradeExercise(lesson.base.exercises[index], answer), key).toBe(
        true,
      );
      expect(
        gradeExercise(lesson.base.exercises[index], String(Number(answer) + 1)),
        key,
      ).toBe(false);
    }
  });
});
