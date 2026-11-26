import { useState } from "react";
import { Link, navigate, usePath } from "../../app/router";
import { artUrl } from "../../art";
import { academyTracks, coursesFor, curriculum, filterCourses, stages, stageSummary, statusLabels, type AcademyTrackId, type Course, type CourseStatus, type Stage } from "../../content/academy";
import { routeNode } from "../../content/route-view";
import { usePreferences } from "../../preferences/store";
import { useProgress } from "../../progress/useProgress";

function CourseRow({ course }: { course: Course }) {
  const progress = useProgress();
  const node = routeNode(course);
  const lesson = node.lesson;
  const tag = <span className={`course-tag ${course.status}`}>{statusLabels[course.status]}</span>;
  if (lesson) return (
    <li className="academy-course live-course">
      <Link to={`/lesson/${lesson.id}`}>
        <span className="course-code mono">{course.id}</span>
        <span className="course-title"><strong>{course.title}</strong><small>{lesson.estimatedMinutes} 分钟 · {progress.lessons[lesson.id] ? "已完成 · 可复习" : "动手练习与检查题"} · {lesson.quality.state === "draft" ? "草稿" : lesson.quality.state === "pilot" ? "试学中" : "正式"}</small></span>
        {tag}<span className="course-arrow" aria-hidden="true">↗</span>
      </Link>
    </li>
  );
  return (
    <li className="academy-course">
      <details>
        <summary><span className="course-code mono">{course.id}</span><span className="course-title"><strong>{course.title}</strong><small>查看规划说明</small></span>{tag}<span className="course-arrow" aria-hidden="true">＋</span></summary>
        <div className="course-details">{node.plannedArt && <img className="planned-preview" src={artUrl(node.plannedArt)} alt={`${course.id}规划预览插画，尚未开放`} width={1600} height={900} />}
          <p>{course.status === "reading" ? "资料路径尚未发布，学习顺序与权威资源仍在整理。" : "此课程尚未开放，以下为未来规划。"}</p>
          {course.units && <p>规划单元：{course.units.join(" · ")}</p>}
          {course.prerequisites && <p>建议先修：{course.prerequisites}（不设硬性门槛）</p>}
          {course.project && <p>项目方向：{course.project}</p>}
          <p>实施批次：P{course.phase} · {statusLabels[course.status]}</p>
        </div>
      </details>
    </li>
  );
}

/** 首页：只给三个阶段的概览，点进「路线」再展开细节，避免和路线/课程页重复。 */
export function StageOverview() {
  return (
    <>
      <div className="academy-section-head"><div><h2 id="stages-heading">选择你的学习阶段</h2><p>从基础起步，逐渐深入。每个阶段都可以自由探索。</p></div><span className="academy-eyebrow">3 PHASES</span></div>
      <div className="academy-stages" role="group" aria-labelledby="stages-heading">
        {stages.map((s, i) => <Link key={s.id} to={`/paths?stage=${s.id}`} className="academy-stage">
          <span className="academy-eyebrow">PHASE 0{i + 1}<span>{s.id}</span></span>
          <strong>{s.title}</strong><span className="muted">{s.subtitle}</span><span className="stage-count">{stageSummary(s.id)}</span>
        </Link>)}
      </div>
    </>
  );
}

/** 路线页：先选阶段，再选路线，右侧看这条路线下的课程（不带搜索，搜索归「课程」页）。 */
export function PathsCatalog() {
  const params = new URLSearchParams(usePath().split("?")[1]);
  const stage = stages.find(s => s.id === params.get("stage"))?.id ?? "Foundation";
  const trackId = (academyTracks.find(t => t.id === params.get("track"))?.id ?? "A") as AcademyTrackId;
  const setStage = (value: Stage) => navigate(`/paths?stage=${value}&track=${trackId}`);
  const setTrackId = (value: AcademyTrackId) => navigate(`/paths?stage=${stage}&track=${value}`);
  const preferences = usePreferences();
  const stageCourses = coursesFor(stage);
  const visibleTracks = academyTracks.filter(t => stageCourses.some(c => c.track === t.id));
  const selected = visibleTracks.find(t => t.id === trackId) ?? visibleTracks[0]!;
  const selectedCourses = coursesFor(stage, selected.id);
  const stageInfo = stages.find(s => s.id === stage)!;

  return (
    <div className="academy-catalog">
      <div className="academy-section-head" style={{ marginTop: 0 }}><div><h2 id="stages-heading">选择阶段</h2><p>阶段与先修仅作建议，可以自由探索。</p></div><span className="academy-eyebrow">3 PHASES</span></div>
      <div className="academy-stages" role="group" aria-labelledby="stages-heading">
        {stages.map((s, i) => <button key={s.id} className="academy-stage" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>
          <span className="academy-eyebrow">PHASE 0{i + 1}<span>{s.id}</span></span>
          <strong>{s.title}</strong><span className="muted">{s.subtitle}</span><span className="stage-count">{stageSummary(s.id)}</span>
        </button>)}
      </div>
      <div className="academy-section-head" id="academy-tracks"><div><h2 id="tracks-heading">学习路线</h2><p>{stageInfo.subtitle} · 按规划逐步建设</p></div><span className="academy-eyebrow">{visibleTracks.length} TRACKS</span></div>
      <div className="academy-workspace">
        <div className="academy-tracklist" role="group" aria-labelledby="tracks-heading">
          {visibleTracks.map(t => {
            const entries = coursesFor(stage, t.id);
            return <button className="academy-track" key={t.id} aria-pressed={selected.id === t.id} onClick={() => setTrackId(t.id)}>
              {t.art ? <img className="track-emblem" src={artUrl(t.art)} alt="" width={64} height={64} /> : <span className="art-placeholder" aria-label={`${t.title}官方插画待提供`}>插画<br />待提供</span>}
              <span className="academy-track-text"><strong>{t.id} · {t.title}</strong><small>{stage === "Foundation" ? `${entries.filter(c => c.status === "live").length} / ${entries.length} 已上线` : `${entries.length} 门课程`}</small></span>
              <span aria-hidden="true" className="muted">›</span>
            </button>;
          })}
        </div>
        <section className="panel academy-course-panel" aria-labelledby="course-panel-title">
          <header className="academy-panel-head"><div><h3 id="course-panel-title">{selected.title}</h3><p>{selected.subtitle} · {stage}</p></div><span className="course-tag">{selectedCourses.length} 门课程</span></header>
          <p className="academy-notice">{stageInfo.note}</p>
          <Link className="academy-map-link" to={`/paths/${selected.id.toLowerCase()}?stage=${stage}`}>打开 {selected.id} 路线图 →</Link>
          <ul className="academy-courses">{selectedCourses.filter(c => preferences.showPlanned || routeNode(c).available).map(c => <CourseRow key={c.id} course={c} />)}</ul>
          {!selectedCourses.some(c => preferences.showPlanned || routeNode(c).available) && <div className="academy-empty"><p>此路线尚无已上线课程，规划内容已按设置隐藏。</p><Link to="/settings" className="btn secondary">管理规划显示</Link></div>}
        </section>
      </div>
      <p className="academy-footnote">上线数量表示课程可访问，不代表个人学习进度。下一批、精选主题与资料路径仍属规划。</p>
    </div>
  );
}

const PAGE_SIZE = 30;

/** 课程页：一份可搜索、可筛选的课程总目录（阶段 / 路线 / 状态），不再重复路线页的卡片。 */
export function CoursesCatalog() {
  const [stage, setStage] = useState<Stage | "all">("Foundation");
  const [trackId, setTrackId] = useState<AcademyTrackId | "all">("all");
  const [status, setStatus] = useState<CourseStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const pool = curriculum
    .filter(c => (stage === "all" || c.stage === stage) && (trackId === "all" || c.track === trackId))
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  const preferences = usePreferences();
  const results = filterCourses(pool, query, status).filter(c => preferences.showPlanned || routeNode(c).available);
  const reset = () => { setQuery(""); setStatus("all"); setTrackId("all"); setShown(PAGE_SIZE); };
  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(PAGE_SIZE); };

  return (
    <div className="academy-catalog">
      <div className="academy-stage-tabs" role="group" aria-label="按阶段筛选">
        {([{ id: "all", title: "全部" }, ...stages] as { id: Stage | "all"; title: string }[]).map(s =>
          <button key={s.id} type="button" className="academy-chip" aria-pressed={stage === s.id} onClick={() => change(setStage)(s.id)}>{s.title}</button>)}
      </div>
      <section className="panel academy-course-panel" aria-labelledby="course-panel-title">
        <header className="academy-panel-head"><div><h3 id="course-panel-title">全部课程</h3><p>共 {curriculum.length} 门目录，已上线课程可直接进入学习</p></div></header>
        <div className="academy-search">
          <label className="academy-search-input"><span className="sr-only">搜索课程标题或编号</span><input type="search" placeholder="搜索课程标题或编号…" value={query} onChange={e => change(setQuery)(e.target.value)} /></label>
          <select aria-label="筛选路线" value={trackId} onChange={e => change(setTrackId)(e.target.value as AcademyTrackId | "all")}><option value="all">全部路线</option>{academyTracks.map(t => <option key={t.id} value={t.id}>{t.id} · {t.title}</option>)}</select>
          <select aria-label="筛选课程状态" value={status} onChange={e => change(setStatus)(e.target.value as CourseStatus | "all")}><option value="all">全部状态</option>{Object.entries(statusLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select>
        </div>
        <p className="academy-result-count" role="status">找到 {results.length} 门课程{query && ` · “${query}”`}</p>
        {results.length ? <>
          <ul className="academy-courses">{results.slice(0, shown).map(c => <CourseRow key={c.id} course={c} />)}</ul>
          {results.length > shown && <button type="button" className="btn secondary" onClick={() => setShown(n => n + PAGE_SIZE)}>显示更多（还有 {results.length - shown} 门）</button>}
        </> : <div className="academy-empty"><p>没有符合条件的课程</p><button className="btn secondary" onClick={reset}>清除搜索与筛选</button></div>}
      </section>
      <p className="academy-footnote">上线数量表示课程可访问，不代表个人学习进度。下一批、精选主题与资料路径仍属规划。</p>
    </div>
  );
}
