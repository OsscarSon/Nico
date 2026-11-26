import { Link, navigate, usePath } from "../../app/router";
import { artUrl } from "../../art";
import { academyCourses, courseDependencies, courseLink, getAcademyCourse, getDomain, getPhase, labelTarget, moduleLessons, phases, uniqueLiveCount } from "../../content/academy2/model";
import { getPersonalPath, personalPaths, studyAllocation, studyTimeline } from "../../content/academy2/paths";
import { laboratories, roadmap, teachingStandard, universityResources } from "../../content/academy2/resources";
import { useProgress } from "../../progress/useProgress";
import { PageHeading, Prerequisites } from "./Curriculum";
import { setAcademyPath, useAcademyPath } from "./learningPreference";

export function AcademyDashboard() {
  const spotlight = [
    ["mathematics", "数学", "理解函数、向量与证明", "lime"],
    ["statistics", "统计学", "从描述数据到判断不确定性", "mint"],
    ["algorithms", "算法", "从搜索排序到设计策略", "violet"],
    ["data-science", "数据科学", "从原始数据到可靠结论", "sky"],
  ] as const;
  return <>
    <section className="a2-dashboard-section a2-foundations">
      <div className="a2-section-heading"><div><h2>先把根基打稳</h2><p>从第一天就接触数学、统计、算法和数据。</p></div><Link to="/courses?phase=all">全部 30 个入口 ↗</Link></div>
      <div className="a2-spotlights">{spotlight.map(([id, title, desc, tone]) =>
        <Link to={courseLink("foundation-" + id)} className={tone} key={id}>
          <span className="a2-spot-art"><img src={artUrl(getDomain(id).art)} alt="" width={140} height={100} /></span>
          <span className="a2-spot-copy"><strong>{title}</strong><small>{desc}</small></span><span aria-hidden="true">↗</span>
        </Link>
      )}</div>
    </section>
    <section className="a2-dashboard-section">
      <div className="a2-section-heading"><div><h2>选择一个阶段</h2><p>按当前能力进入，也可以跨阶段复习。</p></div></div>
      <div className="a2-stage-grid">{phases.map(phase => <Link key={phase.id} to={"/courses?phase=" + phase.id} className="a2-panel">
        <small>{phase.english}</small><h3>{phase.title}阶段 <span aria-hidden="true">↗</span></h3><p>{phase.intro}</p>
      </Link>)}</div>
    </section>
    <div className="a2-quick-links">
      <Link to="/graph">知识关联图 ↗</Link><Link to="/paths">选择专业主线 ↗</Link><Link to="/lab">7 个实验室 ↗</Link><Link to="/resources">公开教材与建设计划 ↗</Link>
    </div>
  </>;
}

export function LearningPathsPage() {
  const path = usePath();
  const preference = useAcademyPath();
  const { lessons } = useProgress();
  const id = new URLSearchParams(path.split("?")[1]).get("path") ?? preference.id;
  const selected = getPersonalPath(id) ?? personalPaths[0];
  const pinned = preference.id === selected.id;
  return <div className="a2-page">
    <PageHeading title="专业学习路线" english="LEARNING PATHS" intro="六条主线共用同一课程体系。按目标选课，根据自己的节奏调整顺序。" />
    <div className="a2-guide-layout">
      <nav aria-label="选择专业路线" className="a2-guide-nav">
        {personalPaths.map(item => <Link key={item.id} to={"/paths?path=" + item.id} aria-current={item.id === selected.id ? "page" : undefined}><strong>{item.title}</strong><small>{item.english}</small></Link>)}
      </nav>
      <section className="a2-panel a2-guide-detail">
        <p className="a2-kicker">{selected.english}</p><h2>{selected.title}</h2><p>{selected.intro}</p>
        <button className={"btn " + (pinned ? "secondary" : "")} type="button" aria-pressed={pinned} onClick={() => setAcademyPath(pinned ? "" : selected.id)}>{pinned ? "取消设为我的主线" : "设为我的主线"}</button>
        {!preference.persistent && <p role="status">浏览器暂时无法保存，此次选择仅在当前窗口生效。</p>}
        <ol className="a2-guide-steps">{selected.steps.map(([name, id, module]) => {
          const course = getAcademyCourse(id)!;
          const available = moduleLessons(course, module);
          const completed = available.filter(lesson => lessons[lesson.id]).length;
          return <li key={name}><Link to={courseLink(id, module)}><div><strong>{name}</strong><small>{getPhase(course.stage).title} · {course.title}</small></div><span>{available.length ? completed + "/" + available.length + " 节已完成" : "查看大纲"} ↗</span></Link></li>;
        })}</ol>
      </section>
    </div>
    <section className="a2-panel a2-study" aria-labelledby="a2-study-title">
      <div><p className="a2-kicker">STUDY PLAN</p><h2 id="a2-study-title">数据科学与 AI 学习建议</h2><p>高中阶段可结合现有数学复习安排起步，逐步进入大学核心与选修内容。</p>
        <ul className="a2-alloc">{studyAllocation.map(([name, share]) => <li key={name}><span>{name}</span><progress max="100" value={share} aria-label={name + "建议投入"} /><strong>{share}%</strong></li>)}</ul>
      </div>
      <dl className="a2-timeline">{studyTimeline.map(([period, text]) => <div key={period}><dt>{period}</dt><dd>{text}</dd></div>)}</dl>
    </section>
    <div className="a2-quick-links"><Link to="/graph">查看知识关联 ↗</Link><Link to="/paths?view=legacy">访问原 A–F 路线目录 ↗</Link></div>
  </div>;
}

const chain = [
  ["打基础", ["foundation-mathematics", "foundation-programming"]],
  ["补工具", ["intermediate-mathematics", "intermediate-algorithms"]],
  ["建模型", ["intermediate-statistics", "intermediate-ai", "advanced-data-science"]],
  ["做系统", ["advanced-ai", "advanced-systems"]],
] as const;

export function KnowledgeGraphPage() {
  const id = new URLSearchParams(usePath().split("?")[1]).get("course") ?? "intermediate-ai";
  const course = getAcademyCourse(id) ?? getAcademyCourse("intermediate-ai")!;
  const dependents = academyCourses.filter(item => courseDependencies(item).some(target => target.course === course.id));
  return <div className="a2-page">
    <PageHeading title="知识关联图" english="KNOWLEDGE GRAPH" intro="从学习目标往前看所需知识，或从已会的内容找到下一步。先修可自评，也可直接开始。" />
    <section className="a2-panel a2-graph-overview">
      <div className="a2-section-heading"><div><h2>数据科学与 AI 主线</h2><p>点击任一节点，查看它的先修与后续课程。</p></div></div>
      <div className="a2-graph-grid">{chain.map(([title, ids]) => <section key={title}><h3>{title}</h3>
        {ids.map(id => <Link key={id} aria-current={course.id === id ? "page" : undefined} to={"/graph?course=" + id}>{getAcademyCourse(id)?.title}</Link>)}
      </section>)}</div>
      <div className="a2-quick-links"><Link to="/paths?path=data-science">查看数据科学主线 ↗</Link><Link to={courseLink("advanced-ai", "mlops")}>Data Science &amp; AI 综合项目 · 规划 ↗</Link></div>
    </section>
    <div className="a2-graph-controls">
      <label>选择课程<select value={course.id} onChange={event => navigate("/graph?course=" + event.target.value)}>
        {phases.map(phase => <optgroup key={phase.id} label={phase.title + "阶段"}>{academyCourses.filter(item => item.stage === phase.id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup>)}
      </select></label>
      <Link className="btn secondary" to={courseLink(course.id)}>打开课程入口 ↗</Link>
    </div>
    <div className="a2-two-col">
      <section className="a2-panel"><h2>{course.title} · 建议先修</h2><Prerequisites key={course.id} targets={courseDependencies(course)} /></section>
      <section className="a2-panel"><h2>接续课程</h2>
        <ul className="a2-link-list">{dependents.map(item => <li key={item.id}><Link to={"/graph?course=" + item.id}>{labelTarget({ course: item.id })} ↗</Link></li>)}</ul>
        {!dependents.length && <p className="muted">可转向实践项目，或通过相关模块继续探索。</p>}
      </section>
    </div>
    <p><Link to={courseLink("advanced-ai", "attention", "Attention")}>查看示例：Attention 的五项先修 ↗</Link></p>
  </div>;
}

export function ResourcesPage() {
  return <div className="a2-page">
    <PageHeading title="教材、教学标准与建设计划" english="ACADEMIC RESOURCES" intro="用公开课程、教材及大学框架核对内容范围。每个领域的正式课时持续建设。" />
    <section className="a2-resource-section"><h2>大学公开资源</h2><div className="a2-resource-grid">{universityResources.map(([title, area, url]) => <a className="a2-panel" key={title} href={url} target="_blank" rel="noreferrer"><strong>{title} <span aria-hidden="true">↗</span></strong><p>{area}</p></a>)}</div></section>
    <section className="a2-resource-section"><h2>模块教学标准</h2><p>算法和 AI 采用先从零理解与实现，再用专业库实践的教学方式。</p>
      <dl className="a2-resource-grid">{teachingStandard.map(([title, en, detail]) => <div className="a2-panel" key={en}><dt><strong>{title}</strong> <small>{en}</small></dt><dd>{detail}</dd></div>)}</dl>
    </section>
    <section className="a2-resource-section"><h2>开发优先顺序</h2>
      <ol className="a2-roadmap">{roadmap.map(([id, title, detail, status]) => <li className="a2-panel" key={id}><span>{id}</span><div><strong>{title}</strong><p>{detail}</p></div><small>{status}</small></li>)}</ol>
    </section>
    <p className="muted">Nico Academy · 10 个知识领域 · 3 个难度阶段 · {uniqueLiveCount} 节现有课时。</p>
  </div>;
}

export function LabsHomePage() {
  return <div className="a2-page">
    <PageHeading title="专业实验室" english="LABORATORIES" intro="用可操作的工具观察函数、抽样、排序和计算机系统。七个实验空间持续扩展。" />
    <div className="a2-resource-grid a2-labs">{laboratories.map((item, index) => <Link to={"/lab/" + item.id} className="a2-panel" key={item.id}>
      <p className="a2-kicker">{String(index + 1).padStart(2, "0")} · {item.english}</p>
      <h2>{item.title} <span aria-hidden="true">↗</span></h2><p>{item.intro}</p>
      <small className={item.available ? "a2-live" : "a2-planned"}>{item.available ? item.primary : "已有学习资源 · 工具规划中"}</small>
    </Link>)}</div>
    <div className="a2-quick-links"><Link to="/lab/prompt">Prompt 训练场 ↗</Link><Link to="/lab/tutor" className="ai-shortcut">AI 导师 ↗</Link><Link to="/resources">公开教材 ↗</Link></div>
  </div>;
}
