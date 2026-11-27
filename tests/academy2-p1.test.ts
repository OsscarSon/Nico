import { describe as suite, expect, it } from "vitest";
import { academyCourses } from "../src/content/academy2/model";
import { auditGraph, dependenciesOf, knowledgeEdges } from "../src/content/academy2/knowledgeGraph";
import { knowledgeRegistry, knowledgeAt } from "../src/content/academy2/knowledgeRegistry";
import { p1Courses, p1Lessons } from "../src/content/academy2/p1";
import { mathBenches } from "../src/content/academy2/p1/mathBenches";
import { statBenches, iris } from "../src/content/academy2/p1/statBenches";
import { projectsP1 } from "../src/content/academy2/p1/projects";
import { analyzeMatrix, apply, calculus, gcd, quadratic, shortestPath } from "../src/grading/academy2/p1/math";
import { anova, bayes, binomial, chiSquare2x2, describe, mannWhitney, normalTail, poisson, proportions, quantile, regression, welch } from "../src/grading/academy2/p1/statistics";
import { beginTopic, emptyKnowledge, gradeExercise, gradeTopic, knowledgeStatus, knowledgeProgressSchema, progressSummary, reviewAfterMs } from "../src/grading/academy2/p1/progress";
import { exercise } from "../src/content/academy2/p1/types";
import { loadKnowledge, KNOWLEDGE_KEY } from "../src/progress/knowledge";

const stages = [
 ["foundation-mathematics",15,["1","-4","3"],[2,-1,3]],
 ["foundation-statistics",17,["1","3","setosa"],[50,1.462,.26717575886875733]],
 ["intermediate-mathematics",27,["3","0","0","-2","2","1",".1","A-B,B-C,C-D,A-C","A","D"],[-6,3.28,2]],
 ["intermediate-statistics",23,["200","40","200","63","用户"],[11.5,.0085376889,3.00434173]],
] as const;

suite("four Word stages",()=>{
 for (const [courseId,count,inputs,answers] of stages) it(courseId+" covers every named topic, with evidence and a runnable project",()=>{
   const course=academyCourses.find(c=>c.id===courseId)!;
   const ids=course.modules.flatMap(module=>module.chapters.flat().map(title=>knowledgeAt(course.id,module.id,title)?.id));
   expect(ids.sort()).toEqual(p1Courses[courseId].map(lesson=>lesson.id).sort());
   expect(ids).toHaveLength(count);
   for(const lesson of p1Courses[courseId]){
     expect(lesson.exercises).toHaveLength(4);
     expect(new Set(lesson.exercises.map(item=>item.prompt)).size).toBe(4);
     expect([lesson.concept,lesson.theory,lesson.example,lesson.mistake].every(text=>text.length>20)).toBe(true);
     for(const item of lesson.exercises){
       expect(gradeExercise(item,typeof item.answer==="number"?String(item.answer):item.answer[0]!)).toBe(true);
       expect(gradeExercise(item,"不符合格式9999999")).toBe(false);
     }
   }
   const project=projectsP1[courseId]!;
   expect(project.steps.length).toBeGreaterThanOrEqual(3);
   expect(project.bench.run([...inputs]).values.length).toBeGreaterThanOrEqual(4);
   expect(project.evidence([...inputs]).map((item,i)=>gradeExercise(item,String(answers[i])))).toEqual([true,true,true]);
   expect(()=>project.evidence([])).toThrow();
 });
 it("preserves stable IDs for all existing outlines and tags 82 teachable pages",()=>{
   expect(new Set(knowledgeRegistry.map(row=>row.id)).size).toBe(knowledgeRegistry.length);
   expect(new Set(p1Lessons.map(row=>row.id)).size).toBe(82);
   for(const course of academyCourses)for(const module of course.modules)for(const title of module.chapters.flat())expect(knowledgeAt(course.id,module.id,title),course.id+"/"+title).toBeDefined();
 });
 it("runs every module with honest output, and rejects impossible model inputs",()=>{
   const all=Object.entries({...mathBenches,...statBenches});
   expect(all).toHaveLength(15);
   for(const [id,bench] of all){
     const sample=bench.run(bench.fields.map(field=>field.initial));
     expect(sample.values.length,id).toBeGreaterThanOrEqual(3);
     expect(JSON.stringify(sample),id).not.toMatch(/NaN|Infinity/);
     expect(bench.sources.length).toBeGreaterThanOrEqual(2);
     expect(bench.scratch.length).toBeGreaterThan(15);
     expect(bench.library.length).toBeGreaterThan(15);
   }
   expect(()=>statBenches["foundation-statistics/visualization"]!.run(["1","1","all"])).toThrow();
   expect(()=>projectsP1["intermediate-statistics"]!.evidence(["200","40","200","80","访问"])).toThrow();
 });
 it("uses traceable endpoints and explicit graph relations without an inferred order",()=>{
   expect(auditGraph(knowledgeEdges)).toEqual([]);
   expect(dependenciesOf("fm-trig").map(item=>item.id)).toEqual(["fm-coordinate"]);
   expect(dependenciesOf("fs-correlation").some(item=>item.kind==="related")).toBe(true);
   expect(dependenciesOf("fm-sets")).toEqual([]);
   expect(auditGraph([{from:"fm-vector",to:"fm-dot",kind:"required",reason:"test"},...knowledgeEdges]).some(issue=>issue.startsWith("Cycle"))).toBe(true);
   expect(auditGraph([{from:"fm-inverse",to:"is-covariance",kind:"required",reason:"test"}])).toHaveLength(1);
   const privacy=knowledgeAt("foundation-security","account","数据隐私")!;
   expect(auditGraph([{from:privacy.id,to:"fm-algebra",kind:"required",reason:"test"}])).toContain("Unreviewed discipline: "+privacy.id+"→fm-algebra");
   expect(auditGraph([{from:"fm-inverse",to:"made-up",kind:"recommended",reason:"test"}])).toHaveLength(1);
 });
});

suite("assessment and real computations",()=>{
 it("separates persisted self assessments, exercise evidence, mastery and due review",()=>{
   const id="fm-sets",time=1_000_000;
   let p={...emptyKnowledge(),selfChecks:{"fm-sets":true}};
   expect(knowledgeStatus(p.records[id],time)).toBe("new");
   p=beginTopic(p,id,time) as typeof p;
   const e=exercise("amount",2,"two");
   p=gradeTopic(p,id,3,e,"2",time) as typeof p;
   expect(p.records[id]!.verification).toBeNull();
   for(const index of [0,1,2] as const)p=gradeTopic(p,id,index,e,"2",time+1) as typeof p;
   expect(knowledgeStatus(p.records[id],time+1)).toBe("complete");
   p=gradeTopic(p,id,3,e,"9",time+2) as typeof p;
   expect(knowledgeStatus(p.records[id],time+2)).toBe("review");
   p=gradeTopic(p,id,3,e,"4/2",time+3) as typeof p;
   expect(knowledgeStatus(p.records[id],time+3)).toBe("mastered");
   expect(progressSummary(p,[id,id,"fm-algebra"],time+3)).toMatchObject({total:2,finished:1,status:"learning"});
   expect(knowledgeStatus(p.records[id],time+3+reviewAfterMs)).toBe("review");
   expect(knowledgeProgressSchema.parse(JSON.parse(JSON.stringify(p)))).toEqual(p);
   expect(gradeExercise(e,"1/0")).toBe(false);
   expect(gradeExercise(e,"")).toBe(false);
   const untouched=new Map([[KNOWLEDGE_KEY,'{"version":9}'],["nico-progress","old"]]);
   expect(loadKnowledge({getItem:key=>untouched.get(key)??null,setItem:(key,value)=>{untouched.set(key,value);}}).warning).toContain("保留");
   expect(untouched.get(KNOWLEDGE_KEY)).toBe('{"version":9}');
   expect(untouched.get("nico-progress")).toBe("old");
 });
 it("matches symbolic and numerical algebra results and handles degenerate cases",()=>{
   expect(quadratic(1,-4,3)).toMatchObject({roots:[1,3],vertex:[2,-1]});
   expect(quadratic(0,0,0).constant).toBe(true);
   expect(analyzeMatrix([[2,1],[4,5]]).singular[0]).toBeCloseTo(6.7233625,5);
   expect(analyzeMatrix([[1,2],[2,4]]).rank).toBe(1);
   expect(analyzeMatrix([[0,-1],[1,0]]).realEigen).toEqual([]);
   expect(apply([[2,0],[0,3]],[2,-1])).toEqual([4,-3]);
   expect(calculus(2,1,.1).nextValue).toBeCloseTo(3.28);
   expect(calculus(2,1,1).nextValue).toBeGreaterThan(calculus(2,1,1).value);
   expect(gcd(252,105)).toBe(21);
   expect(shortestPath([["A","B"],["C","D"]],"A","D")).toBeNull();
 });
 it("matches NumPy/SciPy reference values and prevents invalid inference",()=>{
   expect(iris).toHaveLength(150);
   expect(describe(iris.filter(row=>row.species==="setosa").map(row=>row.lengths[2]!)).mean).toBeCloseTo(1.462);
   expect(quantile([1,3,5,9],.75)).toBe(6);
   expect(bayes(0,1,0).posterior).toBeNull();
   expect(binomial(10,.2,2)).toBeCloseTo(.301989888,9);
   expect(poisson(3,2)).toBeCloseTo(.2240418077,9);
   expect(normalTail(1.96)).toBeCloseTo(.0249978951,6);
   expect(proportions(200,40,200,63)?.difference).toBeCloseTo(.115,8);
   expect(proportions(200,40,200,63)?.p).toBeCloseTo(.0085376889,6);
   expect(proportions(4,0,4,1)?.z).toBeNull();
   expect(proportions(10,11,10,5)).toBeNull();
   expect(chiSquare2x2([30,20,20,30])?.stat).toBe(4);
   expect(chiSquare2x2([0,0,2,5])).toBeNull();
   expect(regression([[1,2],[2,4],[3,3]])?.slope).toBe(.5);
   expect(mannWhitney([3,6],[1,3])).toBe(3.5);
   expect(anova([[1,2,3],[2,4,6],[4,6,8]]).f).toBeCloseTo(4,7);
   expect(welch([2,4,6,8,10],[6,8,9,10,12])?.t).toBeCloseTo(1.732050808,8);
 });
});
