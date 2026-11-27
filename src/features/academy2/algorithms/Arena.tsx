import { useEffect, useId, useState, type FormEvent } from "react";
import { arenaModels, modelById } from "../../../grading/academy2/algorithms";
import type {
  Frame,
  Model,
  Network,
  PlotFrame,
  Point,
  Trace,
  TreeFrame,
} from "../../../grading/academy2/algorithms/trace";
import { changeStudy } from "../../../progress/study";
import { downloadText } from "../study/files";
import "./algorithms.css";

function NetworkFigure({
  network,
  path,
}: {
  network: Network;
  path: string[];
}) {
  const arrow = useId();
  const positions = new Map(
    network.nodes.map((key, i) => {
      const theta = Math.PI * ((2 * i) / network.nodes.length - 0.5);
      return [
        key,
        [200 + Math.cos(theta) * 151, 116 + Math.sin(theta) * 81],
      ] as const;
    }),
  );
  return (
    <figure className="p2-network">
      <svg
        viewBox="0 0 400 232"
        role="img"
        aria-label={network.directed ? "有向图" : "无向图"}
      >
        <defs>
          <marker
            id={arrow}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0 L7 3.5 L0 7 Z" fill="context-stroke" />
          </marker>
        </defs>
        {network.edges.map(({ from, to, weight }, index) => {
          const [x, y] = positions.get(from)!;
          const [u, v] = positions.get(to)!;
          const highlighted = path.some(
            (node, i) =>
              (node === from && path[i + 1] === to) ||
              (!network.directed && node === to && path[i + 1] === from),
          );
          const d = Math.hypot(u - x, v - y) || 1;
          const markerEnd = network.directed
            ? "url(#" + arrow + ")"
            : undefined;
          const offset = network.edges.some(
            (edge, i) =>
              i !== index &&
              ((edge.from === to && edge.to === from) ||
                (edge.from === from && edge.to === to)),
          )
            ? 24 + (index % 3) * 9
            : 0;
          const midX = (x + u) / 2 - ((v - y) * offset) / d,
            midY = (y + v) / 2 + ((u - x) * offset) / d;
          return (
            <g key={index} data-highlight={highlighted}>
              {from === to ? (
                <path
                  d={`M ${x - 9} ${y - 11} C ${x - 35} ${y - 47} ${x + 35} ${y - 47} ${x + 9} ${y - 11}`}
                  markerEnd={markerEnd}
                />
              ) : (
                <path
                  d={`M ${x + ((u - x) * 15) / d} ${y + ((v - y) * 15) / d} Q ${midX} ${midY} ${u - ((u - x) * 17) / d} ${v - ((v - y) * 17) / d}`}
                  markerEnd={markerEnd}
                />
              )}
              <text
                x={from === to ? x : midX}
                y={from === to ? y - 42 : midY - 5}
              >
                {weight}
              </text>
            </g>
          );
        })}
        {network.nodes.map((node) => {
          const [x, y] = positions.get(node)!;
          return (
            <g key={node} data-highlight={path.includes(node)}>
              <circle cx={x} cy={y} r="13" />
              <text x={x} y={y + 4}>
                {node}
              </text>
            </g>
          );
        })}
      </svg>
      <details>
        <summary>图的文本数据</summary>
        <p>顶点 {network.nodes.join("、")}</p>
        <ul>
          {network.edges.map((e, i) => (
            <li key={i}>
              {e.from} {network.directed ? "→" : "—"} {e.to} · {e.weight}
            </li>
          ))}
        </ul>
      </details>
    </figure>
  );
}

function TreeFigure({ tree }: { tree: TreeFrame }) {
  const layout: { node: TreeFrame; depth: number; parent?: number }[] = [];
  let maxDepth = 0;
  function place(node: TreeFrame | undefined, depth: number, parent?: number) {
    if (!node) return;
    maxDepth = Math.max(depth, maxDepth);
    place(node.left, depth + 1, node.key);
    layout.push({ node, depth, parent });
    place(node.right, depth + 1, node.key);
  }
  place(tree, 0);
  const width = Math.max(360, layout.length * 36),
    height = Math.max(115, (maxDepth + 1) * 50 + 25);
  const positions = new Map(
    layout.map(
      ({ node, depth }, i) =>
        [
          node.key,
          [((i + 1) * width) / (layout.length + 1), 25 + depth * 50],
        ] as const,
    ),
  );
  return (
    <figure className="p2-network p2-diagram">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="当前二叉树"
      >
        {layout.map(({ node, parent }) => {
          if (parent === undefined) return null;
          const [x, y] = positions.get(parent)!,
            [u, v] = positions.get(node.key)!;
          return (
            <g key={node.key}>
              <path d={`M${x} ${y} L${u} ${v}`} />
            </g>
          );
        })}
        {layout.map(({ node }) => {
          const [x, y] = positions.get(node.key)!;
          return (
            <g key={node.key}>
              <circle cx={x} cy={y} r="15" />
              <text x={x} y={y + 4}>
                {node.key}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        横向依键排序，纵向为深度。结点的高度同时列在下方。
      </figcaption>
    </figure>
  );
}

function PlotFigure({ plot }: { plot: PlotFrame }) {
  const bounds = (i: 0 | 1) => [
    Math.min(...plot.points.map((point) => point[i])),
    Math.max(...plot.points.map((point) => point[i])),
  ];
  const [loX, hiX] = bounds(0),
    [loY, hiY] = bounds(1);
  const ratio = (value: number, min: number, max: number) =>
    max === min ? 0.5 : (value - min) / (max - min);
  const coords = ([x, y]: Point) =>
    [
      30 + 300 * ratio(x, loX!, hiX!),
      190 - 155 * ratio(y, loY!, hiY!),
    ] as const;
  const chain = plot.chain.map((point) => coords(point).join(",")).join(" ");
  return (
    <figure className="p2-network p2-diagram">
      <svg viewBox="0 0 360 220" role="img" aria-label="点集与本步凸链">
        <g data-highlight="true">
          <path className="p2-axis" d="M 20 10 V 200 H 347" />
          {plot.close ? (
            <polygon points={chain} />
          ) : (
            <polyline points={chain} />
          )}
        </g>
        {plot.points.map((point) => {
          const [x, y] = coords(point);
          return (
            <g key={point.join(",")}>
              <circle cx={x} cy={y} r="5" />
              <text x={x} y={y - 9}>
                {point.join(",")}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>亮线表示当前凸链。坐标轴按每组输入范围独立缩放。</figcaption>
    </figure>
  );
}

function ResultFrame({ result, frame }: { result: Trace; frame: Frame }) {
  return (
    <div className="p2-trace-frame">
      <h3>{frame.event}</h3>
      {result.network && (
        <NetworkFigure network={result.network} path={frame.path ?? []} />
      )}
      {frame.tree && <TreeFigure tree={frame.tree} />}
      {frame.plot && <PlotFigure plot={frame.plot} />}
      {!!frame.items?.length && (
        <ol className="p2-tokens" aria-label="当前元素">
          {frame.items.map((item, i) => (
            <li key={i} data-highlight={frame.active?.includes(i)}>
              <small>{i}</small>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
      )}
      {!!frame.path?.length && (
        <p className="p2-path">本步记录 {frame.path.join(" → ")}</p>
      )}
      {!!frame.variables.length && (
        <dl className="p2-variables">
          {frame.variables.map(([name, value], i) => (
            <div key={i}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p>
        累计 {result.measure} <strong>{frame.count}</strong>
      </p>
    </div>
  );
}

export default function Arena({
  initial,
  fixed = false,
  compare = false,
  topic,
}: {
  initial?: string;
  fixed?: boolean;
  compare?: boolean;
  topic?: string;
}) {
  const [model, setModel] = useState(
    () => modelById(initial ?? "") ?? modelById("sort") ?? arenaModels[0]!,
  );
  const [input, setInput] = useState(model.input),
    [parameter, setParameter] = useState(model.parameter ?? "");
  const [result, setResult] = useState<Trace>(),
    [error, setError] = useState(""),
    [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [notice, setNotice] = useState("");
  const [comparisons, setComparisons] = useState<[string, number][]>();
  const end = (result?.frames.length ?? 1) - 1;
  useEffect(() => {
    if (!playing || cursor >= end) return;
    const timer = window.setTimeout(() => {
      setCursor(cursor + 1);
      if (cursor + 1 === end) setPlaying(false);
    }, 600 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, cursor, end, speed]);
  function reset() {
    setPlaying(false);
    setCursor(0);
    setError("");
    setResult(undefined);
    setComparisons(undefined);
    setNotice("");
  }
  function pick(next: Model) {
    reset();
    setModel(next);
    setInput(next.input);
    setParameter(next.parameter ?? "");
  }
  function run(event: FormEvent) {
    event.preventDefault();
    reset();
    try {
      setResult(model.run(input, parameter));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "无法运行这个输入。");
    }
  }
  function goto(step: number) {
    setPlaying(false);
    setCursor(step);
  }
  const sortable = model.id === "sort";
  return (
    <section className="a2-panel p2-arena">
      <header>
        <h2>{fixed ? model.title : "算法竞技场"}</h2>
        <p>
          编辑输入并执行，逐步查看变量、路径与累计操作。回退会显示原始执行轨迹的上一帧。
        </p>
      </header>
      <form className="p2-inputs" onSubmit={run}>
        {!fixed && (
          <label>
            选择算法
            <select
              value={model.id}
              onChange={(event) => pick(modelById(event.target.value)!)}
            >
              {arenaModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {model.label}
          <textarea
            rows={2}
            maxLength={450}
            value={input}
            onChange={(event) => {
              reset();
              setInput(event.target.value);
            }}
          />
        </label>
        {model.parameterLabel && (
          <label>
            {model.parameterLabel}
            <input
              maxLength={300}
              value={parameter}
              onChange={(event) => {
                reset();
                setParameter(event.target.value);
              }}
            />
          </label>
        )}
        <div className="row">
          <button className="btn" type="submit">
            运行算法
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => pick(model)}
          >
            恢复示例
          </button>
        </div>
      </form>
      {error && (
        <p className="feedback bad" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="p2-player">
          <div className="row p2-transport">
            <button
              className="btn secondary"
              type="button"
              disabled={cursor === 0}
              onClick={() => goto(cursor - 1)}
            >
              上一步
            </button>
            <button
              className="btn"
              type="button"
              disabled={!end}
              onClick={() => {
                if (cursor === end) setCursor(0);
                setPlaying(!playing);
              }}
            >
              {playing ? "暂停" : cursor === end ? "重播" : "播放"}
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={cursor === end}
              onClick={() => goto(cursor + 1)}
            >
              下一步
            </button>
            <label>
              速度
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                {[0.5, 1, 2, 4].map((value) => (
                  <option key={value} value={value}>
                    {value} ×
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            步骤 {cursor + 1} / {end + 1}
            <input
              type="range"
              aria-label="执行步骤"
              min={0}
              max={end}
              value={cursor}
              onChange={(event) => goto(Number(event.target.value))}
            />
          </label>
          <div aria-live={playing ? "off" : "polite"}>
            <ResultFrame result={result} frame={result.frames[cursor]!} />
          </div>
          <p className="p2-complexity">
            <strong>理论复杂度</strong> {result.complexity}
            。本次操作计数只衡量上方声明的单位。
          </p>
          {cursor === end && (
            <div className="p2-compare">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  const title = model.title + " · 执行报告";
                  const markdown = [
                    "# " + title,
                    "输入：" + input,
                    ...(model.parameterLabel ? ["参数：" + parameter] : []),
                    "结果：" + result.answer,
                    "计数：" +
                      result.frames.at(-1)!.count +
                      " " +
                      result.measure,
                    "理论界：" + result.complexity,
                    "## 执行步骤",
                    ...result.frames
                      .slice(0, 180)
                      .map(
                        (frame, i) =>
                          "- " +
                          (i + 1) +
                          " " +
                          frame.event +
                          " · " +
                          frame.count +
                          (frame.variables.length
                            ? " · " +
                              frame.variables
                                .map(([key, value]) => key + " " + value)
                                .join("，")
                            : ""),
                      ),
                    ...(result.frames.length > 180
                      ? ["报告只列前 180 步，完整轨迹可用原输入复算。"]
                      : []),
                  ]
                    .join("\n")
                    .slice(0, 29500);
                  const at = Date.now(),
                    id = "arena-" + model.id + "-" + at;
                  const stored = changeStudy((source) => ({
                    ...source,
                    reports: {
                      ...source.reports,
                      [id]: {
                        kind: "experiment",
                        title,
                        topic: topic ?? "algorithms",
                        at,
                        markdown,
                        active: true,
                      },
                    },
                  }));
                  downloadText(id + ".md", markdown);
                  setNotice(
                    stored
                      ? "实验报告已保存并开始下载。"
                      : "本机保存失败。已提供下载。",
                  );
                }}
              >
                保存实验报告
              </button>
              {notice && <p role="status">{notice}</p>}
            </div>
          )}
          {compare && sortable && (
            <section className="p2-compare">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setComparisons(
                    ["插入", "选择", "归并"].map((method) => {
                      const output = model.run(input, method);
                      return [method + "排序", output.frames.at(-1)!.count];
                    }),
                  );
                }}
              >
                比较同一输入的排序
              </button>
              {comparisons && (
                <dl className="p2-variables">
                  {comparisons.map(([name, count]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{count} 次比较</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}
