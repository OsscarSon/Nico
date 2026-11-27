import { Link } from "../../../app/router";
import { changeStudy, type Study } from "../../../progress/study";
import { bookmarkPath, readingLink } from "./readingState";
import { downloadText } from "./files";

export function BookmarkList({ data }: { data: Study }) {
  const favorites = Object.entries(data.bookmarks)
    .filter(([, row]) => row.active)
    .sort((a, b) => b[1].at - a[1].at);
  const reports = Object.entries(data.reports)
    .filter(([, row]) => row.active)
    .sort((a, b) => b[1].at - a[1].at);
  return (
    <>
      <section className="a2-panel">
        <h2>收藏</h2>
        {!favorites.length && <p>可在课程、知识点、例题和公式旁收藏。</p>}
        <ul className="a2-link-list">
          {favorites.map(([id, item]) => (
            <li key={id}>
              <Link to={bookmarkPath(item)}>{item.title}</Link>{" "}
              <small>
                {{ course: "课程", topic: "知识点", example: "例题", formula: "公式" }[item.kind]}
              </small>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  changeStudy((old) => ({
                    ...old,
                    bookmarks: { ...old.bookmarks, [id]: { ...item, active: false, at: Date.now() } },
                  }))
                }
              >
                取消收藏
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="a2-panel">
        <h2>实验与项目报告</h2>
        {!reports.length && <p>完成实验或验证项目时，可以保存实际输出和分析。</p>}
        {reports.map(([id, item]) => (
          <details key={id}>
            <summary>
              {item.title} · {item.kind === "experiment" ? "实验" : "项目"} ·{" "}
              {new Date(item.at).toLocaleDateString()}
            </summary>
            <pre className="study-report">{item.markdown}</pre>
            {item.topic && (
              <Link to={item.kind === "project" ? "/projects/" + item.topic : ["algorithms","data","ml","research"].includes(item.topic)?"/lab/"+item.topic:readingLink(item.topic)}>
                相关教学 ↗
              </Link>
            )}
            <div className="row">
              <button
                className="btn secondary"
                onClick={() => downloadText("nico-report-" + id + ".md", item.markdown)}
              >
                下载报告
              </button>
              <button
                className="btn ghost"
                onClick={() =>
                  changeStudy((old) => ({
                    ...old,
                    reports: { ...old.reports, [id]: { ...item, active: false, at: Date.now() } },
                  }))
                }
              >
                移除报告
              </button>
            </div>
          </details>
        ))}
      </section>
    </>
  );
}
