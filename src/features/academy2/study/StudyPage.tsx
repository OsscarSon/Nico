import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, usePath } from "../../../app/router";
import {
  studyCatalogue,
  searchStudy,
  terminology,
  topicTitle,
} from "../../../content/academy2/teaching/library";
import { changeStudy, useStudy } from "../../../progress/study";
import { algorithmLessons } from "../../../content/academy2/algorithms";
import { p1Lessons } from "../../../content/academy2/p1";
import { MathText, RichText } from "../teaching/math";
import { BookmarkList } from "./StudySaved";
import { CopyFormula, Favorite } from "./reading";
import { PageHeading } from "../Curriculum";
import { readingLink, chooseRecent } from "./readingState";
import "../teaching/teaching.css";
import "./study.css";

const BackupPanel = lazy(() => import("./BackupPanel"));
const panels = [
  ["search", "全文搜索"],
  ["terms", "术语词典"],
  ["formulas", "公式手册"],
  ["summaries", "知识总结"],
  ["saved", "我的资料"],
  ["backup", "完整备份"],
] as const;

export default function StudyPage() {
  const tab = new URLSearchParams(usePath().split("?")[1]).get("view") ?? "search";
  const { data, warning } = useStudy();
  const [query, setQuery] = useState(""),
    [limit, setLimit] = useState(25);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    try {
      const value = sessionStorage.getItem("nico-imported");
      if (value) {
        setNotice(value);
        sessionStorage.removeItem("nico-imported");
      }
    } catch {
      /* status is independent of restored data */
    }
  }, []);
  const results = useMemo(
    () => (tab === "search" && query.trim() ? searchStudy(studyCatalogue().search, query) : []),
    [tab, query],
  );
  const filter = query.toLowerCase().trim();
  const shown =
    tab === "formulas"
      ? studyCatalogue().formula.filter((item) =>
          (item.title + " " + item.latex + " " + (item.caption ?? "")).toLowerCase().includes(filter),
        )
      : [];
  return (
    <div className="a2-page study-library">
      <PageHeading
        title="学习资料"
        english="STUDY LIBRARY"
        intro="找回上次读到的位置、公式与个人资料。"
      />
      <nav className="a2-quick-links" aria-label="学习资料分类">
        {panels.map(([id, name]) => (
          <Link
            key={id}
            to={"/study?view=" + id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setQuery("");
              setLimit(25);
            }}
          >
            {name}
          </Link>
        ))}
      </nav>
      {notice && <p role="status">{notice}</p>}
      {warning && <p role="status">{warning}</p>}
      {tab === "backup" ? (
        <Suspense fallback={<p role="status">正在加载备份工具…</p>}>
          <BackupPanel />
        </Suspense>
      ) : tab === "saved" ? (
        <>
          <BookmarkList data={data} />
          <section className="a2-panel">
            <h2>最近学习</h2>
            <ul className="a2-link-list">
              {chooseRecent(data).map((visit) => (
                <li key={visit.id}>
                  <Link to={readingLink(visit.id, visit.anchor)}>{visit.title}</Link>{" "}
                  <small>{new Date(visit.at).toLocaleString()}</small>
                </li>
              ))}
            </ul>
            {!Object.keys(data.visits).length && <p>打开一节新课后会显示阅读记录。</p>}
          </section>
          <section className="a2-panel">
            <h2>个人笔记</h2>
            <ul className="a2-link-list">
              {Object.entries(data.notes)
                .filter(([, note]) => note.body.trim())
                .map(([id, note]) => (
                  <li key={id}>
                    <Link to={readingLink(id)}>{topicTitle(id)}</Link>
                    <p className="study-report">{note.body}</p>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() =>
                        changeStudy((old) => ({
                          ...old,
                          notes: { ...old.notes, [id]: { body: "", at: Date.now() } },
                        }))
                      }
                    >
                      移除笔记
                    </button>
                  </li>
                ))}
            </ul>
            {!Object.values(data.notes).some((note) => note.body.trim()) && (
              <p>在知识点页写下要点，可在这里回看。</p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="a2-panel">
            <h2>
              {tab === "terms"
                ? "中英文术语词典"
                : tab === "formulas"
                  ? "Formula Handbook"
                  : tab === "summaries"
                    ? "知识点总结"
                    : "全文搜索"}
            </h2>
            <label>
              搜索
              {tab === "terms"
                ? "术语"
                : tab === "formulas"
                  ? "公式"
                  : tab === "summaries"
                    ? "知识点"
                    : "课程与课文"}
              <input
                type="search"
                maxLength={130}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {tab === "search" && (
              <>
                <p role="status">
                  {query.trim()
                    ? results.length + " 条匹配结果（最多显示 40 条）"
                    : "可搜索课程、讲解、公式和练习题面，例如 Welch 或 Gram–Schmidt。"}
                </p>
                <ul className="study-search">
                  {results.map((item) => (
                    <li key={item.id}>
                      <Link to={item.path}>{item.title}</Link> <small>{item.kind}</small>
                      <p>{item.snippet}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {tab === "terms" && (
              <dl>
                {terminology
                  .filter((item) => item.join(" ").toLowerCase().includes(filter))
                  .map(([cn, en, body, id]) => (
                    <div key={cn}>
                      <dt>
                        <strong>{cn}</strong> · {en}
                      </dt>
                      <dd>
                        {body} <Link to={readingLink(id)}>学习 ↗</Link>
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
            {tab === "formulas" && (
              <>
                <p role="status">{shown.length} 条独立公式</p>
                <ul className="study-search">
                  {shown.slice(0, limit).map((item) => (
                    <li key={item.topic + item.anchor}>
                      <Link to={readingLink(item.topic, item.anchor)}>{item.title}</Link>
                      <MathText latex={item.latex} display />
                      {item.caption && <p>{item.caption}</p>}
                      <div className="study-tools">
                        <CopyFormula latex={item.latex} />
                        <Favorite
                          item={{
                            kind: "formula",
                            topic: item.topic,
                            title: item.title,
                            anchor: item.anchor,
                            text: item.latex,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {shown.length > limit && (
                  <button type="button" className="btn secondary" onClick={() => setLimit(limit + 25)}>
                    查看更多公式
                  </button>
                )}
              </>
            )}
            {tab === "summaries" && (
              <ul className="study-search">
                {[...p1Lessons,...algorithmLessons.map(item=>item.base)]
                  .filter((lesson) =>
                    (topicTitle(lesson.id) + " " + lesson.concept).toLowerCase().includes(filter),
                  )
                  .map((lesson) => (
                    <li key={lesson.id}>
                      <Link to={readingLink(lesson.id)}>{topicTitle(lesson.id)}</Link>
                      <p>
                        <RichText text={lesson.concept} />
                      </p>
                      <details>
                        <summary>常见误区</summary>
                        <p>
                          <RichText text={lesson.mistake} />
                        </p>
                      </details>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
