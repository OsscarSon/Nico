import { Link, navigate } from "../app/router";
import { routeView } from "../content/route-view";
import { usePreferences } from "../preferences/store";
import { usePath } from "../app/router";
import { type Stage } from "../content/academy";
import { ProfilePage } from "../features/profile/ProfilePage";
import { EmptyState } from "../components/ui";
import { artUrl } from "../art";
import { CoursesCatalog, PathsCatalog } from "../features/academy/AcademyCatalog";
import { PathMap } from "../features/path/PathMap";
import { useProgress } from "../progress/useProgress";
import { streak } from "../progress/store";
import { AcademyDashboard } from "../features/academy2/Guides";
import { useAcademyPath } from "../features/academy2/learningPreference";
import { recommendedLesson, uniqueLiveCount } from "../content/academy2/model";
import { getPersonalPath } from "../content/academy2/paths";

export function HomePage() {
  const progress = useProgress();
  const completedCount = Object.keys(progress.lessons).length;
  const days = streak(progress, new Date());

  const preferences = usePreferences();
  const { id: selected } = useAcademyPath();
  const targetLesson = recommendedLesson(progress, preferences.resumeHome, preferences.learningPath, selected);
  const resume = preferences.resumeHome && progress.resume && targetLesson?.id === progress.resume.lessonId ? progress.resume : null;

  return (
    <div className="a2-page a2-home">
      <div className="home-grid"><section className="academy-hero final-hero">
        <div className="hero-artwork" aria-hidden="true" style={{ backgroundImage: `url(${artUrl("home-hero-left-final.png")})` }} />
        <div className="hero-copy"><span className="academy-eyebrow">NICO ACADEMY 2.0</span>
          <h1>构建你的知识世界</h1>
          <p>从函数与第一行代码，到独立理解数据、算法和人工智能。</p>
          <div className="a2-hero-actions"><button className="btn" onClick={() => navigate("/paths")}>探索学习路线 ↗</button><Link to="/courses" className="a2-hero-secondary">浏览课程</Link></div>
        </div>
        <figure className="home-preview">
          <img src={artUrl("hero-home-1600x900.png")} alt="Nico 原版 Byte 与电路学习路线插画" width={1600} height={900} />
        </figure>
      </section>

      <section className="panel today final-continue" aria-labelledby="today-title">
        <div className="hero-artwork" aria-hidden="true" style={{ backgroundImage: `url(${artUrl("home-continue-final.png")})` }} />
        {targetLesson ? (
          <>
            <span className="pill available" style={{ justifySelf: "start" }}>
              {resume ? "继续上次的位置" : completedCount ? "下一课" : "从这里开始"}
            </span>
            {selected && <Link className="a2-pinned" to="/paths">我的主线 · {getPersonalPath(selected)?.title}</Link>}
            <h2 id="today-title">{targetLesson.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              约 {targetLesson.estimatedMinutes} 分钟 · 有互动、检查题和一道迁移题
            </p>
            <div>
              <Link to={`/lesson/${targetLesson.id}`} className="btn">
                {resume ? "继续这一课" : "开始这一课"}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 id="today-title">目前可学的课都学完了</h2>
            <p className="muted" style={{ margin: 0 }}>
              新的课还在制作中。可以回到实验台继续练习，或看看后面的课程规划。
            </p>
            <div className="row">
              <Link to="/lab" className="btn">去实验台</Link>
              <Link to="/paths" className="btn secondary">看路线</Link>
            </div>
          </>
        )}
        {(completedCount > 0 || days > 0) && (
          <div className="stats">
            <div className="stat"><strong>{completedCount}</strong><span>已完成课时</span></div>
            <div className="stat"><strong>{days}</strong><span>连续学习天数</span></div>
          </div>
        )}
      </section>

      </div>
      <div className="a2-home-summary"><strong>10</strong> 个知识领域 <i /> <strong>30</strong> 个课程入口 <i /> <strong>{uniqueLiveCount}</strong> 节可学课时 <Link to="/lab">打开实验室 ↗</Link></div>
      <AcademyDashboard />
    </div>
  );
}

export function PathsPage() {
  return <><header className="page-head"><h1>学习路线</h1><p>从入门到深入的自学路径。先选阶段和路线，再看路线里的课程。</p></header><PathsCatalog /></>;
}

export function CoursesPage() {
  return <><header className="page-head"><h1>课程目录</h1><p>搜索并筛选所有课程，已上线课程可直接进入学习。</p></header><CoursesCatalog /></>;
}

export function TrackPage({ trackId }: { trackId: string }) {
  const query = new URLSearchParams(usePath().split("?")[1]);
  const stage: Stage = query.get("stage") === "Intermediate" ? "Intermediate" : query.get("stage") === "Advanced" ? "Advanced" : "Foundation";
  const track = routeView(trackId, stage);
  if (!track) return <NotFoundPage />;
  const available = track.nodes.filter(n => n.available).length;
  return <>
    <Link to={`/paths?stage=${stage}&track=${track.id.toUpperCase()}`} className="backlink">← 所有路线</Link>
    <header className="page-head track-head">{track.art && <img className="track-emblem lg" src={artUrl(track.art)} alt="" width={88} height={88} />}<div><span className="eyebrow">{stage} · {track.id.toUpperCase()} 路线</span><h1>{track.title}</h1><p>{track.tagline}</p></div></header>
    <div className="route-overview"><p>共 {track.nodes.length} 门目录，现在可学 {available} 课。规划节点不开放；所有已上线课均可自由学习。</p><img src={artUrl("roadmap-trace-banner.png")} alt="" width={1600} height={900} /></div>
    {track.nodes.length ? <PathMap track={track} /> : <EmptyState title="这个阶段还没有课程目录" action={<Link to="/paths" className="btn">查看其他路线</Link>}>当前没有可学习课程，也不会用虚拟节点冒充上线内容。</EmptyState>}
  </>;
}

export function ProjectsPage() {
  return (
    <>
      <header className="page-head"><h1>作品</h1></header>
      <EmptyState title="作品功能还在准备中" art="empty-no-projects.png" wide action={<Link to="/paths/a" className="btn">去学路线 A</Link>}>
        每条路线结尾都会有一个小项目，做完后会收集在这里。
      </EmptyState>
    </>
  );
}

export function MePage() { return <ProfilePage />; }

export function NotFoundPage() {
  return (
    <EmptyState title="找不到这个页面" art="error-404.png" wide action={<Link to="/" className="btn">回到首页</Link>}>
      地址可能输错了，或者这一课还没有开放。
    </EmptyState>
  );
}
