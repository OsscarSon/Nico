import { useState } from "react";
import { changeStudy, useStudy } from "../../../progress/study";
import { downloadText } from "../study/files";
import { Link } from "../../../app/router";
import { knowledgeLink } from "../../../content/academy2/knowledgeRegistry";

export function saveWorkspace(
  kind: "data" | "ml",
  title: string,
  payload: unknown,
) {
  const content = JSON.stringify(payload);
  if (content.length > 500_000)
    throw Error("当前工作区超过备份文件可恢复的单项大小。可先导出数据和报告。");
  const at = Date.now(),
    id = kind + "-" + crypto.randomUUID();
  const stored = changeStudy((source) => ({
    ...source,
    workspaces: {
      ...source.workspaces,
      [id]: { kind, title, at, payload: content, active: true },
    },
  }));
  if (!stored) throw Error("浏览器存储已满或不可写。请下载报告和数据。");
}
export function saveReport(
  kind: "project" | "experiment",
  topic: string,
  title: string,
  markdown: string,
) {
  const at = Date.now(),
    id = kind === "project" ? "p3-project-" + topic : "p3-" + topic + "-" + at;
  const stored = changeStudy((source) => ({
    ...source,
    reports: {
      ...source.reports,
      [id]: {
        kind,
        topic,
        title,
        markdown: markdown.slice(0, 30_000),
        at,
        active: true,
      },
    },
  }));
  downloadText(id + ".md", markdown);
  return stored;
}
export function Workspaces({
  kind,
  save,
  restore,
  onRestore,
}: {
  kind: "data" | "ml";
  save: (label: string) => void;
  restore: (source: unknown) => void;
  onRestore?: () => void;
}) {
  const { data } = useStudy();
  const [title, setTitle] = useState(""),
    [selected, setSelected] = useState(""),
    [status, setStatus] = useState("");
  const entries = Object.entries(data.workspaces ?? {})
    .filter(([, entry]) => entry.kind === kind && entry.active)
    .sort((a, b) => b[1].at - a[1].at);
  return (
    <details className="a2-panel p3-workspaces">
      <summary>保存和恢复工作区</summary>
      <label>
        工作区名称
        <input
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <button
        className="btn secondary"
        type="button"
        disabled={!title.trim()}
        onClick={() => {
          try {
            save(title.trim());
            setStatus("工作区已保存到统一学习备份。");
          } catch (e) {
            setStatus(e instanceof Error ? e.message : "保存失败。");
          }
        }}
      >
        保存工作区
      </button>
      {entries.length > 0 && (
        <>
          <label>
            已保存版本
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">选择版本</option>
              {entries.map(([key, entry]) => (
                <option value={key} key={key}>
                  {entry.title} · {new Date(entry.at).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn secondary"
            disabled={!selected}
            onClick={() => {
              try {
                const entry = entries.find(([key]) => key === selected);
                if (!entry) throw Error("找不到保存的工作区。");
                const snapshot: unknown = JSON.parse(entry[1].payload);
                restore(snapshot);
                onRestore?.();
                setStatus("工作区已恢复。");
              } catch (e) {
                setStatus(e instanceof Error ? e.message : "无法恢复。");
              }
            }}
          >
            恢复工作区
          </button>
        </>
      )}
      {status && <p role="status">{status}</p>}
    </details>
  );
}
export function LabReturn({ topic }: { topic?: string }) {
  return topic ? <Link to={knowledgeLink(topic)}>← 返回知识点</Link> : null;
}
