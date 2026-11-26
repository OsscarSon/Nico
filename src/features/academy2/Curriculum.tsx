import { useEffect, useRef, useState } from "react";
import { Link, navigate, usePath } from "../../app/router";
import { artUrl } from "../../art";
import { EmptyState } from "../../components/ui";
import {
  academyCourses, courseDependencies, courseLink, domains, getAcademyCourse, getDomain, getPhase, labelTarget, liveLessons,
  moduleDependencies, phases, primaryLocation, topicPrerequisites, uniqueLiveCount,
  type AcademyCourse, type AcademyModule, type LegacyEntry, type Phase, type Dependency,
} from "../../content/academy2/model";
import { usePreferences } from "../../preferences/store";
import { useProgress } from "../../progress/useProgress";
import { laboratories } from "../../content/academy2/resources";
import { knowledgeAt, knowledgeLink } from "../../content/academy2/knowledgeRegistry";
import { findP1Lesson, isP1Course, p1Courses } from "../../content/academy2/p1";
import { benchLink, projectKey } from "../../content/academy2/p1/navigation";
import { knowledgeStatus, practicePassed, progressSummary, statusLabel, type KnowledgeStatus } from "../../grading/academy2/p1/progress";
import { setSelfCheck, useKnowledgeProgress } from "../../progress/knowledge";

export function PageHeading({ title, intro, english }: { title: string; intro: string; english: string }) {
  return <header className="a2-heading">
    <p className="a2-kicker">{english}</p>
    <h1>{title}</h1>
    <p>{intro}</p>
  </header>;
}

export function DomainMark({ domain }: { domain: ReturnType<typeof getDomain> }) {
  return <span className={"a2-domain-mark " + domain.accent}><img src={artUrl(domain.art)} alt="" width={80} height={80} /></span>;
}

export function CourseCard({ course, focusModule }: { course: AcademyCourse; focusModule?: string }) {
  const domain = getDomain(course.domain);
  const count = isP1Course(course.id) ? p1Courses[course.id].length : liveLessons(course).length;
  return <Link className={"a2-course-card " + domain.accent} to={courseLink(course.id, focusModule)} data-course={course.id}>
    <div className="a2-course-top"><DomainMark domain={domain} /><span className="a2-arrow" aria-hidden="true">↗</span></div>
    <div className="a2-course-name"><span>{domain.title} · {domain.english}</span><h3>{course.title}</h3></div>
    <div className="a2-card-meta"><span>{course.modules.length} 个模块</span>
      <span className={count ? "a2-live" : "a2-planned"}>{count ? count + (isP1Course(course.id) ? " 个知识点可学" : " 节可学") : "查看大纲"}</span>
    </div>
  </Link>;
}

export function CurriculumPage() {
  const path = usePath();
  const params = new URLSearchParams(path.split("?")[1]);
  const current = params.get("phase");
  const selected = current === "all" || phases.some(phase => phase.id === current) ? current as Phase | "all" : "foundation";
  const [query, setQuery] = useState("");
  const [domainId, setDomain] = useState("");
  const preferences = usePreferences();
  const needle = query.trim().toLocaleLowerCase();
  const precise = needle ? primaryLocation(needle.toUpperCase()) ?? primaryLocation(needle) : undefined;
  const visible = academyCourses.filter(course => {
    if ((selected !== "all" && course.stage !== selected) || (domainId && course.domain !== domainId)) return false;
    if (!preferences.showPlanned && !isP1Course(course.id) && liveLessons(course).length === 0) return false;
    const domain = getDomain(course.domain);
    return !needle || [course.title, course.english, domain.title, domain.english, ...course.modules.flatMap(module => [
      module.title, ...module.chapters.flat(), ...module.entries.flatMap(entry => [entry.course.id, entry.lesson?.title ?? entry.course.title]),
    ])].some(text => text.toLocaleLowerCase().includes(needle));
  });
  return <div className="a2-page">
    <PageHeading title="课程目录" english="CURRICULUM" intro="按阶段探索十个知识领域。从课程入口进入模块、章节、实验与实践项目。" />
    <div className="a2-bar">
      <div className="a2-tabs" aria-label="课程阶段">
        <Link to="/courses?phase=all" aria-current={selected === "all" ? "page" : undefined}>全部阶段</Link>
        {phases.map(phase => <Link key={phase.id} to={"/courses?phase=" + phase.id} aria-current={selected === phase.id ? "page" : undefined}>{phase.title}</Link>)}
      </div>
      <div className="a2-filters">
        <input type="search" aria-label="搜索课程、知识点或旧编号" placeholder="搜索课程、知识点或旧编号" value={query} onChange={event => setQuery(event.target.value)} />
        <select aria-label="知识领域" value={domainId} onChange={event => setDomain(event.target.value)}>
          <option value="">所有领域</option>{domains.map(domain => <option key={domain.id} value={domain.id}>{domain.title}</option>)}
        </select>
      </div>
    </div>
    <div className="a2-catalog-meta"><p role="status">显示 {visible.length} / {academyCourses.length} 个课程入口 · {uniqueLiveCount} 节既有课时 · {Object.values(p1Courses).flat().length} 个数学与统计知识点</p>
      <Link to="/courses?view=legacy">按旧编号查找 ↗</Link>
    </div>
    {phases.map(phase => {
      const list = visible.filter(course => course.stage === phase.id);
      return list.length > 0 && <section key={phase.id} className="a2-phase-section">
        <div className="a2-section-heading"><div><h2>{phase.title}阶段</h2><p>{phase.intro}</p></div><span>{phase.english}</span></div>
        <div className="a2-catalog-grid">{list.map(course => <CourseCard key={course.id} course={course} focusModule={precise?.course.id === course.id ? precise.module.id : undefined} />)}</div>
      </section>;
    })}
    {visible.length === 0 && <EmptyState title="没有符合条件的课程入口" action={<button className="btn" type="button" onClick={() => { setQuery(""); setDomain(""); navigate("/courses?phase=all"); }}>清除筛选</button>}>试试课程编号、知识点或另一个阶段。</EmptyState>}
  </div>;
}

const relationLabels = [
  ["required", "Required · 必备知识"], ["recommended", "Recommended · 建议熟悉"], ["related", "Related · 相关延伸"],
] as const;
const selfKey = (target: Dependency) => target.id ?? (target.module ? target.course + "/" + target.module : target.course);
export function Prerequisites({ targets, label = "建议先修" }: { targets: Dependency[]; label?: string }) {
  const {data,warning} = useKnowledgeProgress();
  if (!targets.length) return <p className="muted">这里没有已声明的先修，可直接开始。</p>;
  const assessable=targets.filter(target=>target.kind!=="related");
  const checked = assessable.filter(target=>data.selfChecks[selfKey(target)]).length;
  return <div className="a2-prereq">
    <p>{label} · 自评 {checked}/{assessable.length}</p>
    {relationLabels.map(([kind,name])=>{
      const items=targets.filter(item=>item.kind===kind);
      return items.length>0&&<div key={kind} className="p1-relation" data-kind={kind}><h4>{name}</h4><ul>{items.map(target=>{
        const key=selfKey(target), title=labelTarget(target);
        return <li key={key}>
          {kind!=="related"&&<input aria-label={"我已掌握："+title} type="checkbox" checked={data.selfChecks[key]===true} onChange={event=>setSelfCheck(key,event.target.checked)}/>}
          <div><Link to={courseLink(target.course,target.module,target.topic)}>{title} ↗</Link><small>{target.reason}</small></div>
        </li>;
      })}</ul></div>;
    })}
    <small>自评保存在本机。掌握状态由练习核验决定。所有学习链接可以自由打开。</small>
    {warning&&<small role="status">{warning}</small>}
  </div>;
}

export function LearningStatus({ status }: {status: KnowledgeStatus}) {
  return <span className={"p1-state p1-"+status}>{statusLabel[status]}</span>;
}

function EntryList({ items }: { items: LegacyEntry[] }) {
  const progress = useProgress();
  if (!items.length) return null;
  return <ul className="a2-entries">{items.map(({ course, lesson }) => {
    const name = lesson?.title ?? course.title;
    return <li key={course.id}>
      {lesson ? <Link to={"/lesson/" + lesson.id}><span>{course.id}</span><strong>{name}</strong><small>{progress.lessons[lesson.id] ? "已完成 · 复习" : progress.resume?.lessonId===lesson.id ? "学习中 · 继续 ↗" : "学习 ↗"}</small></Link>
        : <div><span>{course.id}</span><strong>{name}</strong><small>规划中</small></div>}
    </li>;
  })}</ul>;
}

function ModuleOutline({ course, module, index, targetModule, targetTopic }: { course: AcademyCourse; module: AcademyModule; index: number; targetModule: string | null; targetTopic: string | null }) {
  const detailRef = useRef<HTMLDetailsElement>(null);
  const topicRef = useRef<HTMLAnchorElement>(null);
  const preferences = usePreferences();
  const {data}=useKnowledgeProgress();
  const progress=useProgress();
  const topicsFor = (titles: string[]) => titles.flatMap(title=>{
    const found=knowledgeAt(course.id,module.id,title);
    return found&&findP1Lesson(found.id)?[found.id]:[];
  });
  const now=Date.now(), summary=progressSummary(data,topicsFor(module.chapters.flat()),now);
  const legacyIds=module.entries.flatMap(entry=>entry.lesson?[entry.lesson.id]:[]);
  const legacyDone=legacyIds.filter(id=>progress.lessons[id]).length;
  const legacyStatus=legacyDone===legacyIds.length ? "complete" : legacyDone || legacyIds.includes(progress.resume?.lessonId??"") ? "learning" : "new";
  const selected = module.id === targetModule;
  const shown = module.entries.filter(entry => preferences.showPlanned || entry.lesson);
  const related = module.related.filter(entry => preferences.showPlanned || entry.lesson);
  useEffect(() => {
    const details = detailRef.current;
    if (!selected || !details) return;
    details.open = true;
    const id = requestAnimationFrame(() => {
      const node = topicRef.current ?? details.querySelector("summary");
      node?.scrollIntoView({ block: "center" });
      node?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [selected, targetTopic]);

  return <details ref={detailRef} className="a2-module" data-module={module.id} open={index === 0 || selected}>
    <summary><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{module.title}</h3><small>{module.chapters.length} 个章节 · {summary.total ? summary.finished + "/" + summary.total + " 个知识点完成" : legacyIds.length ? legacyDone+"/"+legacyIds.length+" 节已完成" : "课时规划中"}</small>{summary.total>0 ? <LearningStatus status={summary.status} /> : legacyIds.length>0&&<LearningStatus status={legacyStatus} />}</div><span aria-hidden="true" className="a2-plus">＋</span></summary>
    <div className="a2-module-body">
      {shown.length > 0 && <div><h4>迁入课时</h4><EntryList items={shown} /></div>}
      {(preferences.showPlanned||summary.total>0) && <div><h4>章节与知识点</h4>
        {module.chapters.map((topics, chapter) => {
          const chapterStatus=progressSummary(data,topicsFor(topics),now);
          return <section className="a2-chapter" key={topics[0]}>
          <p>章节 {String(chapter + 1).padStart(2, "0")} {chapterStatus.total>0&&<><LearningStatus status={chapterStatus.status} /> · {chapterStatus.finished}/{chapterStatus.total} 个已完成</>}</p>
          <ul>{topics.map(topic => {
            const active = selected && targetTopic === topic;
            const identity=knowledgeAt(course.id,module.id,topic), lesson=identity&&findP1Lesson(identity.id);
            if (!preferences.showPlanned&&!lesson) return null;
            return <li key={topic}>
              <Link ref={active ? topicRef : undefined} to={lesson ? knowledgeLink(lesson.id) : courseLink(course.id, module.id, topic)} aria-current={active ? "location" : undefined}>{topic}</Link>
              {lesson&&<LearningStatus status={knowledgeStatus(data.records[lesson.id],now)} />}
              {active && <Prerequisites key={topic} targets={topicPrerequisites(course, module, topic)} label="知识点先修" />}
            </li>;
          })}</ul>
        </section>})}
      </div>}
      {summary.total>0&&<Link to={benchLink(course.id+"/"+module.id)}>打开本模块实验 ↗</Link>}
      <details className="a2-module-check"><summary>模块先修与评估</summary>
        <Prerequisites key={course.id + module.id} targets={moduleDependencies(course, module.id)} />
        <p className="muted">{summary.total ? "模块进度汇总各知识点的分层练习与迁移核验。" : shown.some(item => item.lesson) ? "迁入课时内有原有互动、检查题和迁移练习。模块综合评估仍在规划。" : "本模块正在规划，完成的课时与评估会在这里列出。"}</p>
      </details>
      {related.length > 0 && <div><h4>跨领域复习</h4><EntryList items={related} /></div>}
    </div>
  </details>;
}

export function CoursePage({ courseId }: { courseId: string }) {
  const params = new URLSearchParams(usePath().split("?")[1]);
  const { lessons, resume } = useProgress();
  const preferences = usePreferences();
  const {data}=useKnowledgeProgress();
  const course = getAcademyCourse(courseId);
  if (!course) return <div className="a2-page"><EmptyState title="找不到这个课程入口" action={<Link className="btn" to="/courses">回到目录</Link>}>请从新目录选择一个课程。</EmptyState></div>;
  const domain = getDomain(course.domain);
  const phase = getPhase(course.stage);
  const live = liveLessons(course);
  const done = live.filter(lesson => lessons[lesson.id]).length;
  const next = live.find(lesson => !lessons[lesson.id]) ?? live[0];
  const p1 = isP1Course(course.id) ? p1Courses[course.id] : undefined;
  const ids=p1?.map(topic=>topic.id)??[];
  const summary=progressSummary(data,ids,Date.now());
  const capstone=practicePassed(data.records[projectKey(course.id)]);
  const status=(summary.status==="complete"||summary.status==="mastered")&&!capstone?"learning":summary.status;
  const legacyStatus=done===live.length ? "complete" : done || live.some(lesson=>lesson.id===resume?.lessonId) ? "learning" : "new";
  const nextTopic=ids.find(id=>!practicePassed(data.records[id]))??ids[0];
  const shown = preferences.showPlanned || p1 ? course.modules : course.modules.filter(module => [...module.entries, ...module.related].some(entry => entry.lesson));
  const lab = laboratories.find(item => item.course.endsWith("-" + course.domain));
  return <div className="a2-page">
    <div className="a2-crumbs"><Link to={"/courses?phase=" + course.stage}>课程目录</Link><span>/</span><span>{phase.title} · {domain.title}</span></div>
    <header className={"a2-course-banner " + domain.accent}>
      <DomainMark domain={domain} />
      <div><p className="a2-kicker">{course.english}</p><h1>{course.title}</h1><p>{course.modules.length} 个模块 · {p1 ? summary.finished+" / "+summary.total+" 个知识点已完成" : live.length ? done + " / " + live.length + " 节已完成" : "大纲已提供 · 课时规划中"}</p>{p1 ? <><LearningStatus status={status}/><small>已掌握 {summary.counts.mastered} · 需要复习 {summary.counts.review}</small></> : live.length>0&&<LearningStatus status={legacyStatus}/>}</div>
      {nextTopic ? <Link className="btn" to={knowledgeLink(nextTopic)}>{summary.finished===summary.total?"复习知识点":status==="new"?"开始学习":"继续学习"} ↗</Link> : next && <Link className="btn" to={"/lesson/" + next.id}>{done === live.length ? "复习课时" : done ? "继续学习" : "开始学习"} ↗</Link>}
    </header>
    <div className="a2-course-layout">
      <section>
        <div className="a2-section-heading"><div><h2>课程大纲</h2><p>展开模块，查看可学课时、章节和知识点。</p></div></div>
        {shown.map(module => <ModuleOutline key={course.id + module.id} course={course} module={module} index={course.modules.indexOf(module)} targetModule={params.get("module")} targetTopic={params.get("topic")} />)}
        {!shown.length && <p className="a2-panel">课程大纲已按设置隐藏。可在 <Link to="/settings">设置</Link> 中显示规划课程。</p>}
      </section>
      <aside className="a2-course-aside">
        <section className="a2-panel"><p className="a2-kicker">PROJECT</p><h2>实践项目</h2><p>{course.project}</p>{p1 ? <Link to={"/projects/"+course.id}>{capstone?"复习与重新导出":"开始项目"} ↗</Link> : <small className="muted">蓝图中的实践目标</small>}</section>
        {lab && <section className="a2-panel"><h2>相关实验室</h2><p>{lab.primary}</p><Link to={"/lab/" + lab.id}>打开{lab.title} ↗</Link></section>}
        <section className="a2-panel"><h2>开始前</h2><Prerequisites key={course.id} targets={courseDependencies(course)} /><Link to="/graph">查看知识关联 ↗</Link></section>
        <section className="a2-panel"><h2>同领域课程</h2><ul className="a2-link-list">{phases.filter(p => p.id !== course.stage).map(p => <li key={p.id}><Link to={courseLink(p.id + "-" + course.domain)}>{p.title} · {getAcademyCourse(p.id + "-" + course.domain)?.title} ↗</Link></li>)}</ul></section>
      </aside>
    </div>
  </div>;
}
