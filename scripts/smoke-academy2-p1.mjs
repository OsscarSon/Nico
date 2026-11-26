import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const base=process.env.BASE_URL ?? "http://localhost:4173";
const out=process.env.SCREENSHOT_DIR ?? "test-results/academy2-p1";
mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
const cases=[
 {phase:"p1a",course:"foundation-mathematics",id:"fm-equations",title:"方程与不等式",answers:["-2","-2","6","6"],count:15,project:["1","-4","3"],results:["2","-1","3"]},
 {phase:"p1b",course:"foundation-statistics",id:"fs-variance",title:"方差",answers:["0","4","4","12"],count:17,project:["1","3","setosa"],results:["50","1.462",".267176"]},
 {phase:"p1c",course:"intermediate-mathematics",id:"im-eigen",title:"特征值与特征向量",answers:["5","1","1","9"],count:27,project:["3","0","0","-2","2","1",".1","A-B,B-C,C-D,A-C","A","D"],results:["-6","3.28","2"]},
 {phase:"p1d",course:"intermediate-statistics",id:"is-pvalue",title:"p-value",answers:[".06",".02","否","1"],count:23,project:["200","40","200","63","用户"],results:["11.5",".008537689","3.004342"]},
];
const btn=(p,name)=>p.getByRole("button",{name,exact:true});
const oldRecord=JSON.stringify({schemaVersion:1,lessons:{"a01-binary":{completedAt:"2026-11-26T00:00:00Z",firstTryCorrect:3,quizTotal:4}},resume:null,activeDays:["2026-11-26"]});
const fit=async p=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),p.url());
let passed=0;
try {
 for(const width of [1440,390,360]){
   const context=await browser.newContext({viewport:{width,height:width>800?1000:844},hasTouch:width<800});
   const p=await context.newPage();p.setDefaultTimeout(16000);
   const errors=[];p.on("pageerror",e=>errors.push(e.message));
   const go=async path=>{await p.goto(base+"/#"+path);await p.locator("main h1").waitFor();await fit(p);};
   await go("/");
   await p.evaluate(raw=>localStorage.setItem("nico-progress",raw),oldRecord);
   await p.reload();
   await go("/graph?course=foundation-statistics&topic=fs-correlation");
   await p.locator('[data-kind="related"]').waitFor();
   assert.equal(await p.locator('[data-kind="required"] input').count(),1);
   assert.equal(await p.locator('[data-kind="recommended"] input').count(),1);
   assert.equal(await p.locator('[data-kind="related"] input').count(),0);
   await p.getByRole("checkbox",{name:"我已掌握：向量点积",exact:true}).check();
   await p.reload();
   const self=p.getByRole("checkbox",{name:"我已掌握：向量点积",exact:true});
   await self.waitFor();assert.ok(await self.isChecked());
   const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem("nico-knowledge-progress")));
   assert.equal(stored.selfChecks["fm-dot"],true);
   assert.equal(stored.records["fm-dot"],undefined);
   if(width===1440) await p.screenshot({path:out+"/graph-1440.png"});

   for (const spec of cases) {
     await go("/courses/"+spec.course);
     const banner=p.locator(".a2-course-banner");
     await banner.waitFor();assert.match(await banner.innerText(),new RegExp("0 / "+spec.count));
     await go("/topics/"+spec.id);
     await p.getByRole("heading",{name:spec.title,exact:true}).waitFor();
     const pageStatus=p.locator(".p1-page > .row .p1-state");
     assert.equal(await pageStatus.innerText(),"学习中");
     assert.equal(await p.locator(".p1-teaching > section").count(),4);
     if(width!==360) await p.screenshot({path:out+"/"+spec.phase+"-lesson-"+width+".png"});
     assert.ok(await btn(p,"核验掌握").isDisabled());
     await p.getByLabel("基础题答案",{exact:true}).fill("错误");
     await btn(p,"检查基础题").click();
     assert.match(await p.locator(".p1-exercises .feedback.bad").innerText(),/不同/);
     for(const [index,label] of ["基础题","应用题","挑战题"].entries()){
       await p.getByLabel(label+"答案",{exact:true}).fill(spec.answers[index]);
       await btn(p,"检查"+label).press("Enter");
     }
     assert.equal(await pageStatus.innerText(),"已完成");
     const transfer=p.getByLabel("迁移核验答案",{exact:true});
     await transfer.fill("错误");
     await btn(p,"核验掌握").click();
     assert.equal(await pageStatus.innerText(),"需要复习");
     await transfer.fill(spec.answers[3]);
     await btn(p,"核验掌握").click();
     assert.equal(await pageStatus.innerText(),"已掌握");
     await p.reload();
     await pageStatus.waitFor();assert.equal(await pageStatus.innerText(),"已掌握");
     await p.getByRole("link",{name:/在实验室中打开/}).click();
     await btn(p,"运行计算").waitFor();
     if(width===360) await btn(p,"运行计算").tap(); else await btn(p,"运行计算").click();
     assert.equal(await p.locator(".p1-result dl > div").count()>2,true);
     assert.equal(await p.locator(".p1-code pre").count(),2);
     await fit(p);
     await p.getByRole("link",{name:/返回知识点学习/}).click();
     await p.getByRole("heading",{name:spec.title,exact:true}).waitFor();
     await go("/courses/"+spec.course);
     await p.locator(".a2-course-banner").waitFor();
     assert.match(await p.locator(".a2-course-banner").innerText(),new RegExp("1 / "+spec.count));
     assert.match(await p.locator(".a2-course-banner .p1-state").innerText(),/学习中/);
     assert.ok(await p.locator(".a2-chapter").first().getByText("学习中",{exact:true}).isVisible() ||
       await p.locator(".a2-module .p1-learning").count()>0);

     await go("/projects/"+spec.course);
     await btn(p,"运行计算").click();
     assert.equal(await btn(p,"验证项目结果").count(),0);
     const fields=p.locator(".p1-bench .p1-fields input");
     assert.equal(await fields.count(),spec.project.length);
     for (const [index,value] of spec.project.entries()) await fields.nth(index).fill(value);
     await btn(p,"运行计算").click();
     const got=p.locator(".p1-exercises .p1-fields input");
     await got.first().waitFor();
     for (const [index,value] of spec.results.entries()) await got.nth(index).fill(index===0?"0":value);
     await btn(p,"验证项目结果").click();
     assert.match(await p.locator(".p1-exercises [role=status]").innerText(),/需要复核/);
     await got.first().fill(spec.results[0]);
     await p.getByLabel("分析记录（可选，随报告导出）",{exact:true}).fill("用专业库独立核对数值，记录样本和模型适用条件。");
     await btn(p,"验证项目结果").click();
     assert.match(await p.locator(".p1-exercises [role=status]").innerText(),/三项数值证据通过/);
     const pending=p.waitForEvent("download");
     await btn(p,"导出项目报告").click();
     const download=await pending;
     assert.equal(download.suggestedFilename(),"nico-"+spec.course+"-report.json");
     const report=JSON.parse(readFileSync(await download.path(),"utf8"));
     assert.equal(report.measuredEvidence.length,3);
     if(spec.phase==="p1b") assert.match(report.reference,/uci/);
     if(width===390) {
       await p.locator(".p1-result").evaluate(node=>node.scrollIntoView({block:"start"}));
       await p.screenshot({path:out+"/"+spec.phase+"-project-390.png"});
     }
     assert.equal(await p.evaluate(()=>localStorage.getItem("nico-progress")),oldRecord);
     await fit(p);
     passed++;
     console.log("PASS "+width+"px "+spec.phase+" · 课程进度、掌握核验、实验往返、项目与旧进度");
   }
   assert.deepEqual(errors,[]);
   await context.close();
 }
 console.log(passed+" 组 P1 完整流程通过。");
} finally {
 await browser.close();
}
