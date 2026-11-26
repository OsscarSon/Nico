import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "../../app/router";
import { EmptyState } from "../../components/ui";
import { courseLink, getAcademyCourse } from "../../content/academy2/model";
import { dependenciesOf } from "../../content/academy2/knowledgeGraph";
import { findKnowledge, knowledgeAt, knowledgeLink } from "../../content/academy2/knowledgeRegistry";
import { findP1Lesson } from "../../content/academy2/p1";
import { mathBenches } from "../../content/academy2/p1/mathBenches";
import { statBenches } from "../../content/academy2/p1/statBenches";
import { projectsP1, type Project } from "../../content/academy2/p1/projects";
import { benchLink, projectKey } from "../../content/academy2/p1/navigation";
import { proofPractice } from "../../content/academy2/p1/proofPractice";
import type { Bench, Output } from "../../content/academy2/p1/workbench";
import { gradeExercise, gradeTopic, beginTopic, knowledgeStatus, practicePassed } from "../../grading/academy2/p1/progress";
import { updateKnowledge, useKnowledgeProgress } from "../../progress/knowledge";
import { Prerequisites, PageHeading, LearningStatus } from "./Curriculum";

import { legacyBlocks } from "../../content/academy2/p1/types";
import { RichText } from "./teaching/math";
import { BlockList } from "./teaching/TeachingBlocks";

const P1Teaching = lazy(() => import("./teaching/P1Teaching"));

export const benches = {...mathBenches,...statBenches};

function Plot({ plot }: {plot: NonNullable<Output["plot"]>}) {
  const element = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = element.current,ctx = canvas?.getContext("2d");
    if (!canvas||!ctx) return;
    const {width:w,height:h}=canvas, p=34;
    ctx.fillStyle="#101b30"; ctx.fillRect(0,0,w,h);
    const X=plot.points.map(item=>item[0]),Y=plot.points.map(item=>item[1]);
    const includeZero=plot.kind!=="points";
    const loX=Math.min(...X)-(plot.kind==="bars" ? .4:0);
    const hiX=Math.max(...X)+(plot.kind==="bars" ? .4:0);
    const loY=Math.min(...Y,...(includeZero?[0]:[])),hiY=Math.max(...Y,...(includeZero?[0]:[]));
    const x=(value:number)=>p+(w-2*p)*(loX===hiX?.5:(value-loX)/(hiX-loX));
    const y=(value:number)=>h-p-(h-2*p)*(loY===hiY?.5:(value-loY)/(hiY-loY));
    ctx.strokeStyle="#435775"; ctx.lineWidth=1;
    ctx.strokeRect(p,p,w-2*p,h-2*p);
    ctx.font="15px sans-serif";
    ctx.fillStyle="#d5e1f3";
    const fmt = (value:number) => Number(value.toPrecision(4)).toString();
    ctx.fillText(fmt(loX),p,h-8);
    ctx.fillText(fmt(hiX),w-p-34,h-8);
    ctx.fillText(fmt(hiY),5,p+4);
    ctx.fillText(fmt(loY),5,h-p);
    ctx.strokeStyle="#7ee9be"; ctx.fillStyle="#7ee9be"; ctx.lineWidth=3;
    if(plot.kind==="line") {
      ctx.beginPath();
      plot.points.forEach(([a,b],i)=>i?ctx.lineTo(x(a),y(b)):ctx.moveTo(x(a),y(b)));
      ctx.stroke();
    } else if(plot.kind==="points") {
      for(const [a,b] of plot.points) { ctx.beginPath();ctx.arc(x(a),y(b),3.5,0,2*Math.PI);ctx.fill(); }
    } else {
      const column=(w-2*p)/plot.points.length*.68;
      for(const [a,b] of plot.points) ctx.fillRect(Math.max(p,x(a)-column/2),y(b),Math.min(column,w-p-x(a)+column/2),h-p-y(b));
    }
  },[plot]);
  return <details className="p1-figure" open>
    <summary>{plot.kind==="points"?"散点图":plot.kind==="bars"?"柱形图":"函数图像"}与数值</summary>
    <canvas ref={element} width={660} height={300} role="img" aria-label="实验结果图，坐标也可用下方文本查看" />
    <details><summary>查看绘图坐标</summary>
      <p className="p1-coordinates">{plot.points.map(([x,y])=>"("+Number(x.toPrecision(5))+", "+Number(y.toPrecision(5))+")").join(" · ")}</p>
    </details>
  </details>;
}

export function Workbench({ bench, onResult }: {bench:Bench; onResult?:(result:{values:string[];output:Output}|null)=>void}) {
  const [values,setValues]=useState(()=>bench.fields.map(field=>field.initial));
  const [result,setResult]=useState<Output|null>(null),[error,setError]=useState("");
  function change(index:number,next:string) {
    setValues(current=>current.map((value,i)=>i===index?next:value));
    setResult(null);setError("");onResult?.(null);
  }
  function run(event:FormEvent) {
    event.preventDefault();
    try {
      const output=bench.run(values);
      setResult(output);setError("");onResult?.({values:[...values],output});
    } catch (issue) { setResult(null);setError(issue instanceof Error?issue.message:"无法计算此输入。");onResult?.(null); }
  }
  return <>
    <section className="a2-panel a2-workbench p1-bench">
      <div><h2>{bench.title}</h2><p>{bench.intro}</p></div>
      <form onSubmit={run}>
        <div className="p1-fields">{bench.fields.map((field,i)=><label key={field.name}>{field.name}
          <input value={values[i]} maxLength={560} onChange={event=>change(i,event.target.value)} required />
          {field.hint&&<small>{field.hint}</small>}
        </label>)}</div>
        <button className="btn" type="submit">运行计算</button>
      </form>
      {error&&<p role="alert">{error}</p>}
      {result&&<div className="p1-result" aria-live="polite">
        <dl>{result.values.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {result.source&&<p><a href={result.source} target="_blank" rel="noreferrer">原始测量资料 ↗</a></p>}
        {result.plot&&<Plot plot={result.plot} />}
      </div>}
    </section>
    <section className="a2-panel p1-code">
      <h2>从零实现与专业库对照</h2><p>从零实现栏摘出页面算法的关键步骤，先按默认输入逐行复算，再改变参数。专业库栏的完整示例可在安装相应库的 Python 环境运行。</p>
      <div className="a2-two-col"><div><h3>From Scratch</h3><pre>{bench.scratch}</pre></div><div><h3>Real-world Library</h3><pre>{bench.library}</pre></div></div>
    </section>
    <section className="a2-panel"><h2>教材与参考</h2><ul className="a2-link-list">{bench.sources.map(([title,url])=><li key={url}><a href={url} target="_blank" rel="noreferrer">{title} ↗</a></li>)}</ul></section>
  </>;
}
const scales=["基础题","应用题","挑战题","迁移核验"] as const;
const indexes=[0,1,2,3] as const;

export function KnowledgeLessonPage({ id }:{id:string}) {
  const location=findKnowledge(id), lesson=findP1Lesson(id);
  const {data,warning}=useKnowledgeProgress();
  const [answers,setAnswers]=useState(["","","",""]);
  const [feedback,setFeedback]=useState<boolean[]>([]);
  useEffect(()=>{
    if (lesson) updateKnowledge(state=>beginTopic(state,id,Date.now()));
  },[id,lesson]);
  if (!location||!lesson) return <EmptyState title="这个知识点尚未开课" action={<Link className="btn" to={location?courseLink(location.course,location.module,location.title):"/courses"}>回到课程大纲</Link>}>可查看相关学习路径。</EmptyState>;
  const course=getAcademyCourse(location.course)!;
  const module=course.modules.find(m=>m.id===location.module)!;
  const bench=benches[location.course+"/"+location.module]!;
  const nextTopics=module.chapters.flat();
  const next=nextTopics[nextTopics.indexOf(location.title)+1];
  const nextTopic=next&&knowledgeAt(course.id,module.id,next);
  const record=data.records[id];
  const completed=practicePassed(record);
  const reasoning=proofPractice[id];
  return <div className="a2-page p1-page">
    <div className="a2-crumbs"><Link to={courseLink(course.id,location.module,location.title)}>{course.title}</Link><span>/</span><span>{module.title}</span></div>
    <PageHeading title={location.title} english={id.toUpperCase()} intro="概念、推导、例题与练习" />
    <div className="row"><LearningStatus status={knowledgeStatus(record,Date.now())}/><span className="pill draft">草稿 · 尚未经真实试学</span></div>
    {warning&&<p role="status">{warning}</p>}
    <div className="p1-teaching"><BlockList blocks={legacyBlocks(lesson)} sectionClass="a2-panel"/></div>
    <Suspense fallback={<p role="status">正在加载专题例题与进阶练习…</p>}><P1Teaching id={id}/></Suspense>
    {dependenciesOf(id).length>0&&<section className="a2-panel"><h2>先修与关联</h2><Prerequisites targets={dependenciesOf(id)} /></section>}
    {reasoning&&<section className="a2-panel p1-inside"><h2>开放推理练习</h2><p>{reasoning[0]}</p>
      <details><summary>查看论证检查点（自行核对）</summary><p>{reasoning[1]}</p></details>
    </section>}
    <details className="a2-panel p1-inside"><summary>打开本模块实验、代码与参考资料</summary>
      <Workbench bench={bench} />
    </details>
    <div className="a2-quick-links"><Link to={benchLink(location.course+"/"+location.module,id)}>在实验室中打开 ↗</Link><Link to={"/projects/"+course.id}>打开本课程实践项目 ↗</Link></div>
    <section className="a2-panel p1-exercises">
      <h2>练习与迁移核验</h2>
      <p>三道分层练习答对后记录完成。再通过独立迁移题记录掌握。数字可写分数或小数（近似题保留至少三位小数）。</p>
      {indexes.map(index=>{
        const exercise=lesson.exercises[index], attempted=index===3?record?.verification:record?.practice[index];
        return <form key={index} onSubmit={event=>{
          event.preventDefault();
          if (!answers[index]!.trim()||index===3&&!completed) return;
          const submitted=answers[index]!;
          updateKnowledge(state=>gradeTopic(state,id,index,exercise,submitted,Date.now()));
          setFeedback(old=>{const next=[...old];next[index]=gradeExercise(exercise,submitted);return next;});
        }}>
          <h3>{scales[index]} {attempted&&<small>· {attempted.lastCorrect?"已答对":"请复习后重试"}</small>}</h3><p><RichText text={exercise.prompt}/></p>
          <div className="row"><label className="sr-only" htmlFor={"p1-answer-"+index}>{scales[index]}答案</label><input id={"p1-answer-"+index} value={answers[index]} maxLength={80}
            onChange={event=>setAnswers(old=>old.map((value,i)=>i===index?event.target.value:value))} disabled={index===3&&!completed} required />
            <button className="btn secondary" disabled={index===3&&!completed}>{index===3?"核验掌握":"检查"+scales[index]}</button></div>
          {feedback[index]!==undefined&&<p role="status" className={"feedback "+(feedback[index]?"ok":"bad")}>{feedback[index]?<RichText text={exercise.explanation}/>:"答案和计算结果不同。请回看定义、单位和例题后再试。"}</p>}
        </form>;
      })}
    </section>
    {nextTopic&&<Link className="btn secondary p1-next" to={knowledgeLink(nextTopic.id)}>继续：{nextTopic.title} ↗</Link>}
  </div>;
}

export function AcademyProjectPage({ courseId }: {courseId:string}) {
  const course=getAcademyCourse(courseId), project=projectsP1[courseId];
  if (!course||!project) return <EmptyState title="项目正在规划" action={<Link to="/courses" className="btn">查看课程</Link>}>可从课程大纲查看实践目标。</EmptyState>;
  return <div className="a2-page p1-page">
    <div className="a2-crumbs"><Link to={courseLink(course.id)}>{course.title}</Link><span>/</span><span>实践项目</span></div>
    <PageHeading title={project.bench.title} english="PRACTICAL PROJECT" intro="运行实验、提交数值证据并导出自己的报告。" />
    <section className="a2-panel"><h2>项目任务</h2><ol className="p1-task">{project.steps.map(step=><li key={step}>{step}</li>)}</ol></section>
    <ProjectSession project={project} id={courseId} />
  </div>;
}
function ProjectSession({project,id}: {project:Project;id:string}) {
  const {data,warning}=useKnowledgeProgress();
  const [result,setResult]=useState<{values:string[];output:Output}|null>(null);
  const [answers,setAnswers]=useState(["","",""]),[notes,setNotes]=useState(""),[message,setMessage]=useState("");
  const [report,setReport]=useState<string|null>(null);
  let items:ReturnType<Project["evidence"]>|undefined,problem="";
  if (result) {
    try { items=project.evidence(result.values); }
    catch (issue) { problem=issue instanceof Error ? issue.message : "请检查实验配置。"; }
  }
  function assess(event:FormEvent) {
    event.preventDefault();
    if (!items||!result) return;
    const questions=items;
    const response=answers.map((answer,i)=>gradeExercise(questions[i]!,answer));
    if (!response.every(Boolean)) {
      setMessage("以下证据需要复核："+response.flatMap((ok,i)=>ok?[]:[String(i+1)]).join("、"));
      setReport(null);
      return;
    }
    updateKnowledge(state=>([0,1,2] as const).reduce((p,i)=>gradeTopic(p,projectKey(id),i,questions[i],answers[i]!,Date.now()),state));
    setMessage("配置与三项数值证据通过。文字解释由学习者核对。");
    setReport(JSON.stringify({title:project.bench.title,settings:project.bench.fields.map((field,i)=>[field.name,result.values[i]]),measures:result.output.values,reference:result.output.source,
      note:notes,measuredEvidence:questions.map((question,i)=>({prompt:question.prompt,answer:answers[i]}))},null,2));
  }
  function download() {
    if (!report) return;
    const url=URL.createObjectURL(new Blob([report],{type:"application/json"}));
    const anchor=document.createElement("a");
    anchor.href=url;anchor.download="nico-"+id+"-report.json";anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  return <>
    <Workbench bench={project.bench} onResult={next=>{setResult(next);setAnswers(["","",""]);setMessage("");setReport(null);}} />
    <section className="a2-panel p1-exercises">
      <h2>验证与导出</h2>
      {practicePassed(data.records[projectKey(id)])&&<LearningStatus status="complete" />}
      {warning&&<p role="status">{warning}</p>}
      <p>{project.review}</p>
      {(!result||problem)&&<p role="status">{problem||"运行符合任务要求的案例后，将出现数值验证。"}</p>}
      {items&&<form onSubmit={assess}>
        <div className="p1-fields">{items.map((item,i)=><label key={item.prompt}>{i+1}. {item.prompt}<input maxLength={80} value={answers[i]} onChange={event=>{ const latest=event.target.value;setAnswers(old=>old.map((a,j)=>i===j?latest:a));setReport(null);}} required /></label>)}</div>
        <label className="p1-notes">分析记录（可选，随报告导出）<textarea value={notes} onChange={event=>{setNotes(event.target.value);setReport(null);}} maxLength={3000} rows={4} /></label>
        <button className="btn" type="submit">验证项目结果</button>
      </form>}
      {message&&<p role="status">{message}</p>}
      {report&&<button className="btn secondary" type="button" onClick={download}>导出项目报告</button>}
    </section>
  </>;
}
