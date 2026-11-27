import { useState } from "react";
import { Link } from "../../../app/router";
import { saveReport } from "../data/workspaces";

type Entry = { label: string; url: string };
const permitted = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};
export default function Research() {
  const [title, setTitle] = useState(""),
    [question, setQuestion] = useState(""),
    [procedure, setProcedure] = useState(""),
    [findings, setFindings] = useState("");
  const [label, setLabel] = useState(""),
    [url, setUrl] = useState(""),
    [entries, setEntries] = useState<Entry[]>([]),
    [notice, setNotice] = useState("");
  const canExport =
    title.trim() &&
    question.trim() &&
    procedure.trim() &&
    findings.trim() &&
    entries.length;
  return (
    <section className="a2-panel p3-card p3-lab">
      <h2>研究复现记录</h2>
      <p>
        保存原始问题、可复现条件和实际观察。书目至少收录一项来源，区分文献主张与本次观察。
      </p>
      <label>
        研究名称
        <input
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        研究问题和待验证主张
        <textarea
          maxLength={1500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </label>
      <label>
        数据版本、环境、种子与步骤
        <textarea
          maxLength={4000}
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
        />
      </label>
      <label>
        实际输出、差异与局限
        <textarea
          maxLength={4000}
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
        />
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !label.trim() ||
            !permitted(url.trim()) ||
            entries.some((x) => x.url === url.trim())
          )
            return;
          setEntries([...entries, { label: label.trim(), url: url.trim() }]);
          setLabel("");
          setUrl("");
        }}
      >
        <label>
          书目标题
          <input
            maxLength={180}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label>
          书目 HTTPS 地址
          <input
            type="url"
            maxLength={500}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn secondary"
          disabled={
            !label.trim() || !permitted(url.trim()) || entries.length >= 20
          }
        >
          添加书目
        </button>
      </form>
      {entries.length > 0 && (
        <ol>
          {entries.map((c) => (
            <li key={c.url}>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.label} ↗
              </a>{" "}
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  setEntries(entries.filter((x) => x.url !== c.url))
                }
              >
                移除书目
              </button>
            </li>
          ))}
        </ol>
      )}
      <button
        className="btn"
        type="button"
        disabled={!canExport}
        onClick={() => {
          const output = [
            "# " + title.trim(),
            "## 问题与主张",
            question.trim(),
            "## 复现条件与步骤",
            procedure.trim(),
            "## 实际观察与局限",
            findings.trim(),
            "## 书目",
            ...entries.map(
              (c, i) => i + 1 + ". " + c.label + " · <" + c.url + ">",
            ),
          ].join("\n\n");
          setNotice(
            saveReport("experiment", "research", title.trim(), output)
              ? "已保存并下载研究记录。"
              : "已下载研究记录。浏览器储存暂不可用。",
          );
        }}
      >
        保存并下载研究记录
      </button>
      {notice && <p role="status">{notice}</p>}
      <p>
        <Link to="/study?view=saved">浏览已保存的研究报告 ↗</Link>
      </p>
    </section>
  );
}
