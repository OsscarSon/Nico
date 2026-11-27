import { useState } from "react";
import {
  astar,
  documents,
  evaluateAssistant,
  infer,
  minimax,
  resourceRules,
  retrieve,
  temperature,
  type Document,
} from "../../../grading/academy2/data/reasoning";
import { saveReport } from "./workspaces";
import { XYChart } from "./Plots";

const numbers = (value: string) =>
  value
    .split(/[，,\s]+/)
    .filter(Boolean)
    .map(Number);
const activities = [
  "retrieve",
  "temperature",
  "rules",
  "astar",
  "minimax",
] as const;
type Activity = (typeof activities)[number];
const titles: Record<Activity, string> = {
  retrieve: "有来源的资料助手",
  temperature: "温度与采样概率",
  rules: "规则与知识推理",
  astar: "A* 网格决策",
  minimax: "Minimax 对弈决策",
};
export type AssistantEvidence = ReturnType<typeof evaluateAssistant>;

export default function Reasoning({
  initial = "retrieve",
  topic,
  onEvidence,
}: {
  initial?: string;
  topic?: string;
  onEvidence?: (output: AssistantEvidence) => void;
}) {
  const [activity, setActivity] = useState<Activity>(
    activities.includes(initial as Activity)
      ? (initial as Activity)
      : "retrieve",
  );
  const [query, setQuery] = useState("library opens"),
    [references, setReferences] = useState<Document[]>(documents),
    [threshold, setThreshold] = useState(0.13);
  const [logits, setLogits] = useState("3,1,0"),
    [heat, setHeat] = useState(1),
    [leaves, setLeaves] = useState("3,5,2,9");
  const [facts, setFacts] = useState(["reservation", "room-open"]);
  const [walls, setWalls] = useState("1,1;1,2;2,2;3,2"),
    [heuristic, setHeuristic] = useState(true);
  const [output, setOutput] = useState<React.ReactNode>(),
    [description, setDescription] = useState(""),
    [error, setError] = useState("");
  function clear() {
    setOutput(undefined);
    setDescription("");
    setError("");
  }
  function run() {
    clear();
    try {
      switch (activity) {
        case "retrieve": {
          const result = retrieve(query, references, threshold);
          setOutput(
            <div>
              <h3>
                {result.hit ? "来源 " + result.hit.id : "资料不足，暂不回答"}
              </h3>
              {result.hit && <blockquote>{result.hit.text}</blockquote>}
              <p>
                {result.matches
                  .map((d) => d.id + " " + d.score.toFixed(3))
                  .join(" · ")}
              </p>
            </div>,
          );
          setDescription(
            result.hit?.id + " · " + (result.hit?.text ?? "没有达到阈值的资料"),
          );
          break;
        }
        case "temperature": {
          const probs = temperature(numbers(logits), heat);
          setOutput(
            <XYChart
              title="softmax 概率"
              points={probs.map((y, x) => ({ x, y }))}
              xLabel="候选索引"
              yLabel="概率"
              line
            />,
          );
          setDescription(probs.map((p) => p.toFixed(5)).join(", "));
          break;
        }
        case "rules": {
          const result = infer(facts, resourceRules);
          setOutput(
            <div>
              <h3>派生知识</h3>
              <p>{result.known.join(" · ")}</p>
              <ol>
                {result.applied.map((row) => (
                  <li key={row.rule}>
                    规则 {row.rule} 导出 {row.result}
                  </li>
                ))}
              </ol>
            </div>,
          );
          setDescription(result.known.join(", "));
          break;
        }
        case "astar": {
          const bad = walls
            .split(/[;；]/)
            .filter(Boolean)
            .map((row) => {
              const pair = numbers(row);
              if (pair.length !== 2) throw Error("每个障碍需要两个坐标。");
              return [pair[0]!, pair[1]!] as const;
            });
          const result = astar(6, [0, 0], [5, 5], bad, heuristic);
          setOutput(
            <>
              <p>
                访问 {result.visited.length} 个格子 ·{" "}
                {result.length === null
                  ? "不可达"
                  : "最短路 " + result.length + " 步"}
              </p>
              <div
                className="p3-grid-map"
                role="img"
                aria-label={
                  "路径 " +
                  result.path.map((point) => point.join(",")).join(" → ")
                }
              >
                {Array.from({ length: 36 }, (_, i) => {
                  const x = i % 6,
                    y = Math.floor(i / 6),
                    inSet = (set: readonly (readonly [number, number])[]) =>
                      set.some((p) => p[0] === x && p[1] === y);
                  const label =
                    i === 0
                      ? "起"
                      : i === 35
                        ? "终"
                        : inSet(bad)
                          ? "■"
                          : inSet(result.path)
                            ? "●"
                            : inSet(result.visited)
                              ? "·"
                              : "";
                  return (
                    <span key={i} data-route={inSet(result.path)}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </>,
          );
          setDescription(
            result.path.map((point) => point.join(",")).join(" → ") || "不可达",
          );
          break;
        }
        case "minimax": {
          const result = minimax(numbers(leaves));
          setOutput(
            <div>
              <h3>
                根效用 {result.value} · 访问叶节点 {result.count}
              </h3>
              <ol>
                {result.lines.map((line, i) => (
                  <li key={i}>
                    层 {line.level} · {line.action} · {line.value}
                  </li>
                ))}
              </ol>
            </div>,
          );
          setDescription("根效用 " + result.value + "，已读叶 " + result.count);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法执行。");
    }
  }
  return (
    <section className="a2-panel p3-card">
      <h2>智能系统实验</h2>
      <label>
        实验
        <select
          value={activity}
          onChange={(e) => {
            setActivity(e.target.value as Activity);
            clear();
          }}
        >
          {activities.map((a) => (
            <option key={a} value={a}>
              {titles[a]}
            </option>
          ))}
        </select>
      </label>
      {activity === "retrieve" && (
        <>
          <p>
            用词频向量作余弦检索。回答摘录实际命中的本地文档，低于阈值时拒答。此实验演示可追踪的检索与评估。
          </p>
          <label>
            问题
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={250}
            />
          </label>
          <label>
            最低相似度
            <input
              type="number"
              min="0"
              max="1"
              step=".01"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <details>
            <summary>编辑三份资料</summary>
            {references.map((d, i) => (
              <label key={d.id}>
                {d.id}
                <textarea
                  rows={3}
                  value={d.text}
                  maxLength={1200}
                  onChange={(e) =>
                    setReferences((previous) =>
                      previous.map((doc, j) =>
                        i === j ? { ...doc, text: e.target.value } : doc,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </details>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              clear();
              const result = evaluateAssistant(references, threshold);
              setOutput(
                <div>
                  <h3>
                    固定任务通过 {result.passed}/{result.table.length}
                  </h3>
                  <ul>
                    {result.table.map((test) => (
                      <li key={test.query}>
                        {test.query} · 预期 {test.expected ?? "拒答"} · 实际{" "}
                        {test.actual ?? "拒答"} ·{" "}
                        {test.passed ? "通过" : "待调整"}
                      </li>
                    ))}
                  </ul>
                </div>,
              );
              setDescription(JSON.stringify(result.table));
              onEvidence?.(result);
            }}
          >
            验证资料助手
          </button>
        </>
      )}
      {activity === "temperature" && (
        <>
          <label>
            候选 logits
            <input
              value={logits}
              maxLength={160}
              onChange={(e) => setLogits(e.target.value)}
            />
          </label>
          <label>
            温度 T
            <input
              type="number"
              value={heat}
              min=".01"
              max="10"
              step=".05"
              onChange={(e) => setHeat(Number(e.target.value))}
            />
          </label>
        </>
      )}
      {activity === "rules" && (
        <>
          <p>从所勾选事实开始，用声明式规则推导结论。缺少某事实时保持未知。</p>
          <div className="p3-fields">
            {["reservation", "trained", "room-open", "project"].map((fact) => (
              <label className="p3-check" key={fact}>
                <input
                  type="checkbox"
                  checked={facts.includes(fact)}
                  onChange={(e) =>
                    setFacts((previous) =>
                      e.target.checked
                        ? [...previous, fact]
                        : previous.filter((item) => item !== fact),
                    )
                  }
                />
                {fact}
              </label>
            ))}
          </div>
          <ul>
            {resourceRules.map((rule) => (
              <li key={rule.then}>
                {rule.when.join(" ∧ ")} → {rule.then}
              </li>
            ))}
          </ul>
        </>
      )}
      {activity === "astar" && (
        <>
          <label>
            障碍 x,y，使用分号分隔
            <input
              value={walls}
              maxLength={160}
              onChange={(e) => setWalls(e.target.value)}
            />
          </label>
          <label className="p3-check">
            <input
              type="checkbox"
              checked={heuristic}
              onChange={(e) => setHeuristic(e.target.checked)}
            />
            启用曼哈顿启发式
          </label>
        </>
      )}
      {activity === "minimax" && (
        <label>
          按顺序录入叶效用
          <input
            value={leaves}
            maxLength={160}
            onChange={(e) => setLeaves(e.target.value)}
          />
        </label>
      )}
      <div>
        <button className="btn" type="button" onClick={run}>
          运行智能系统实验
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {output && <div aria-live="polite">{output}</div>}
      {description && (
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            saveReport(
              "experiment",
              topic ?? "ml",
              titles[activity],
              "# " + titles[activity] + "\n\n" + description,
            )
          }
        >
          导出本次实验
        </button>
      )}
    </section>
  );
}
