import { Link, navigate } from "../app/router";
import { continuation, routeView } from "../content/route-view";
import { usePreferences } from "../preferences/store";
import { usePath } from "../app/router";
import { type Stage } from "../content/academy";
import { ProfilePage } from "../features/profile/ProfilePage";
import { Device, EmptyState } from "../components/ui";
import { artUrl } from "../art";
import { CoursesCatalog, PathsCatalog, StageOverview } from "../features/academy/AcademyCatalog";
import { PathMap } from "../features/path/PathMap";
import { BitSwitches } from "../sims/BitSwitches";
import { useProgress } from "../progress/useProgress";
import { streak } from "../progress/store";

export function HomePage() {
  const progress = useProgress();
  const completedCount = Object.keys(progress.lessons).length;
  const days = streak(progress, new Date());

  const preferences = usePreferences();
  const targetLesson = continuation(progress, preferences.resumeHome, preferences.learningPath);
  const resume = preferences.resumeHome && progress.resume && targetLesson?.id === progress.resume.lessonId ? progress.resume : null;

  return (
    <>
      <div className="home-grid"><section className="academy-hero final-hero">
        <div className="hero-artwork" aria-hidden="true" style={{ backgroundImage: `url(${artUrl("home-hero-left-final.png")})` }} />
        <div className="hero-copy"><span className="academy-eyebrow">EXPLORE · BUILD · UNDERSTAND</span>
          <h1>每一步，都在构建<br />你的知识世界。</h1>
          <p>从第一行代码，到理解复杂系统。<br />选择你的路线，让学习真正发生。</p>
          <button className="btn" onClick={() => navigate("/paths")}>探索学习路线 ↗</button>
        </div>
      </section>

      <section className="panel today final-continue" aria-labelledby="today-title">
        <div className="hero-artwork" aria-hidden="true" style={{ backgroundImage: `url(${artUrl("home-continue-final.png")})` }} />
        {targetLesson ? (
          <>
            <span className="pill available" style={{ justifySelf: "start" }}>
              {resume ? "继续上次的位置" : completedCount ? "下一课" : "从这里开始"}
            </span>
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
      <figure className="home-preview">
        <img src={artUrl("hero-home-1600x900.png")} alt="Nico 原版 Byte 与电路学习路线插画" width={1600} height={900} />
        <figcaption><span className="eyebrow">从好奇到理解</span><p>认识 Byte，一起把知识连成路线。<br />读一读，动手试，再用自己的话讲明白。</p></figcaption>
      </figure>
      <StageOverview />
    </>
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

export function LabPage() {
  const planned = ["子网计算器", "DNS 解析动画", "TCP 握手时序图", "公式沙盒"];
  return (
    <>
      <header className="page-head">
        <h1>实验台</h1>
        <p>不用上课，直接动手。这里放所有可以单独使用的小器件。</p>
      </header>
      <Device title="位开关" label="模拟">
        <p className="muted">点开关，看二进制怎么变成十进制。</p>
        <BitSwitches mode="free" />
      </Device>
      <h2 className="section-title">AI 与提示词</h2>
      <div className="grid cols-2">
        <Link to="/lab/prompt" className="panel trackcard">
          <h3>Prompt 训练场</h3>
          <p>写一条给 AI 的指令，检查六个要素有没有写到。不联网也能用。</p>
        </Link>
        <Link to="/lab/tutor" className="panel trackcard ai-shortcut">
          <h3>AI 导师</h3>
          <p>围绕一节课向 AI 提问。需要接上 AI 服务才能用。</p>
        </Link>
      </div>
      <h2 className="section-title">制作中</h2>
      <div className="grid cols-3">
        {planned.map((p) => (
          <div key={p} className="panel" style={{ borderStyle: "dashed" }}>
            <h3 style={{ marginBottom: 4 }}>{p}</h3>
            <span className="pill">规划中</span>
          </div>
        ))}
      </div>
    </>
  );
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
