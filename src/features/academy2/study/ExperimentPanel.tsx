import { lazy, Suspense } from "react";
import { useState, type FormEvent } from "react";
import { Link } from "../../../app/router";
import { experiments } from "../../../content/academy2/experiments";
import type { Curve, Experiment, Result } from "../../../content/academy2/experiments/types";
import { knowledgeLink } from "../../../content/academy2/knowledgeRegistry";
import { changeStudy } from "../../../progress/study";
import { display } from "../../../content/academy2/p1/workbench";
import { downloadText } from "./files";
import "./study.css";

const TopicTutor = lazy(() => import("./TopicTutor"));

const colors = ["#65bff5", "#f6c56c", "#79e5bb", "#e99ff9", "#fca7a7"];
function Plot({ curves, equal }: { curves: Curve[]; equal: boolean }) {
  const all = curves.flatMap((curve) => curve.points.filter((pair) => pair.every(Number.isFinite)));
  if (!all.length) return null;
  const xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]);
  let loX = Math.min(...xs),
    hiX = Math.max(...xs),
    loY = Math.min(0, ...ys),
    hiY = Math.max(0, ...ys);
  if (loX === hiX) {
    loX--;
    hiX++;
  }
  if (loY === hiY) {
    loY--;
    hiY++;
  }
  const width = 560,
    height = 250,
    left = 65,
    top = 18;
  if (equal) {
    const extent = Math.max((hiX - loX) / width, (hiY - loY) / height);
    const cx = (loX + hiX) / 2,
      cy = (loY + hiY) / 2;
    [loX, hiX, loY, hiY] = [
      cx - (extent * width) / 2,
      cx + (extent * width) / 2,
      cy - (extent * height) / 2,
      cy + (extent * height) / 2,
    ];
  }
  const padX = (hiX - loX) * (equal ? 0.06 : 0.04),
    padY = (hiY - loY) * (equal ? 0.06 : 0.07);
  loX -= padX;
  hiX += padX;
  loY -= padY;
  hiY += padY;
  const x = (v: number) => left + ((v - loX) * width) / (hiX - loX),
    y = (v: number) => top + ((hiY - v) * height) / (hiY - loY);
  const grid = Array.from({ length: 5 }, (_, i) => i / 4);
  return (
    <figure className="study-plot">
      <svg
        viewBox="0 0 640 310"
        role="img"
        aria-label={curves.map((v) => v.label).join("、") + "，图下有数据"}
      >
        <rect width="640" height="310" rx="12" fill="#101c31" />
        {grid.map((p, i) => (
          <g key={i} fill="#cfddf2" fontSize="13">
            <path
              d={`M${left + p * width} ${top}v${height}M${left} ${top + p * height}h${width}`}
              stroke="#344661"
              fill="none"
            />
            <text x={left + p * width} y={top + height + 20} textAnchor="middle">
              {Number((loX + (hiX - loX) * p).toPrecision(3))}
            </text>
            <text x={left - 8} y={top + p * height + 4} textAnchor="end">
              {Number((hiY - (hiY - loY) * p).toPrecision(3))}
            </text>
          </g>
        ))}
        {curves.map((curve, i) => {
          const color = colors[i % colors.length],
            points = curve.points.filter((pair) => pair.every(Number.isFinite));
          if (curve.type === "dots")
            return (
              <g key={i} fill={color}>
                {points.map(([a, b], j) => (
                  <circle key={j} cx={x(a)} cy={y(b)} r={4} />
                ))}
              </g>
            );
          if (curve.type === "bars") {
            const gap = points.length > 1 ? Math.abs(x(points[1]![0]) - x(points[0]![0])) : 12;
            const bar = Math.max(1, Math.min(48, gap * 0.86));
            return (
              <g key={i} fill={color} opacity=".8">
                {points.map(([a, b], j) => (
                  <rect
                    key={j}
                    x={x(a) - bar / 2}
                    y={Math.min(y(0), y(b))}
                    width={bar}
                    height={Math.abs(y(0) - y(b))}
                  />
                ))}
              </g>
            );
          }
          if (curve.label === "拒绝域" && points.length > 1) {
            const fill = [
              x(points[0]![0]) + "," + y(0),
              ...points.map(([a, b]) => x(a) + "," + y(b)),
              x(points.at(-1)![0]) + "," + y(0),
            ].join(" ");
            return <polygon key={i} points={fill} fill={colors[1]} opacity=".6" />;
          }
          const path = points
            .map(([a, b], j) =>
              j === 0 ? `M${x(a)},${y(b)}` : curve.step ? `H${x(a)}V${y(b)}` : `L${x(a)},${y(b)}`,
            )
            .join(" ");
          return <path key={i} d={path} stroke={color} strokeWidth="2.8" fill="none" />;
        })}
      </svg>
      <figcaption>
        {curves.map((curve, i) => (
          <span key={i}>
            <i style={{ background: colors[i % colors.length] }} />
            {curve.label}
          </span>
        ))}
      </figcaption>
      <details>
        <summary>查看绘图数据</summary>
        {curves.map((curve, i) => (
          <p key={i}>
            {curve.label} ·{" "}
            {curve.points.map(([a, b]) => "(" + display(a) + ", " + display(b) + ")").join("  ")}
          </p>
        ))}
      </details>
    </figure>
  );
}

function Session({ experiment }: { experiment: Experiment }) {
  const [values, setValues] = useState(() => experiment.controls.map((control) => control.value));
  const [result, setResult] = useState<Result | null>(null);
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [note, setNote] = useState("");
  const stage = result?.steps?.[step];
  function run(event: FormEvent) {
    event.preventDefault();
    setStep(0);
    setStatus("");
    try {
      const output = experiment.run(values);
      setResult(output);
      setError("");
    } catch (issue) {
      setResult(null);
      setError(issue instanceof Error ? issue.message : "无法计算此输入。");
    }
  }
  function report() {
    return [
      "# " + experiment.title,
      "## 问题",
      experiment.objective,
      "## 输入",
      ...experiment.controls.map((field, i) => "- " + field.label + "：" + values[i]),
      "## 输出",
      ...(result?.values ?? []).map(([label, value]) => "- " + label + "：" + value),
      "## 解释与局限",
      note || "未填写观察与局限。",
      "课时路径：#/topics/" + experiment.topic,
    ].join("\n\n");
  }
  return (
    <section className="a2-panel study-experiment">
      <h2>{experiment.title}</h2>
      <p>{experiment.objective}</p>
      <Link to={knowledgeLink(experiment.topic)}>阅读相关知识点 ↗</Link>
      <form onSubmit={run}>
        <div className="p1-fields">
          {experiment.controls.map((field, i) => (
            <label key={field.label}>
              {field.label}
              {field.choices ? (
                <select
                  value={values[i]}
                  onChange={(event) => {
                    const v = event.target.value;
                    setValues((old) => old.map((a, j) => (j === i ? v : a)));
                    setResult(null);
                    setError("");
                    setStatus("");
                  }}
                >
                  {field.choices.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  value={values[i]}
                  maxLength={560}
                  onChange={(event) => {
                    const v = event.target.value;
                    setValues((old) => old.map((a, j) => (j === i ? v : a)));
                    setResult(null);
                    setError("");
                    setStatus("");
                  }}
                />
              )}
            </label>
          ))}
        </div>
        <button className="btn" type="submit">
          运行实验
        </button>
      </form>
      {error && (
        <p role="alert" className="feedback bad">
          {error}
        </p>
      )}
      {result && (
        <div className="study-result">
          <dl aria-live="polite">
            {result.values.map(([label, value], i) => (
              <div key={i}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {result.curves && (
            <Plot
              curves={result.curves}
              equal={["unit-circle", "projection", "matrix-map", "eigen"].includes(experiment.id)}
            />
          )}
          {stage && (
            <section>
              <p aria-live="polite">
                {step + 1}/{result.steps!.length} · {stage.label}
              </p>
              <div className="teaching-table">
                <table aria-label="当前矩阵">
                  <tbody>
                    {stage.matrix.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{display(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.steps!.length > 1 && (
                <div className="row">
                  <button className="btn secondary" disabled={!step} onClick={() => setStep(step - 1)}>
                    上一步
                  </button>
                  <button
                    className="btn secondary"
                    disabled={step === result.steps!.length - 1}
                    onClick={() => setStep(step + 1)}
                  >
                    下一步
                  </button>
                </div>
              )}
            </section>
          )}
          <label>
            观察与局限{" "}
            <textarea
              rows={3}
              maxLength={3000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="row">
            <button
              className="btn secondary"
              onClick={() => {
                const at = Date.now(),
                  id = crypto.randomUUID();
                const saved = changeStudy((old) => ({
                  ...old,
                  reports: {
                    ...old.reports,
                    [id]: {
                      kind: "experiment",
                      title: experiment.title,
                      topic: experiment.topic,
                      at,
                      markdown: report(),
                      active: true,
                    },
                  },
                }));
                setStatus(saved ? "报告已保存到我的学习资料。" : "报告暂未写入浏览器，可立即下载。");
              }}
            >
              保存实验报告
            </button>
            <button
              className="btn secondary"
              onClick={() => downloadText(experiment.id + ".md", report())}
            >
              下载实验报告
            </button>
          </div>
          {status && <p role="status">{status}</p>}
        </div>
      )}
    </section>
  );
}

export default function ExperimentPanel({
  domain,
  value,
  from,
}: {
  domain: "math" | "statistics";
  value: string | null;
  from: string | null;
}) {
  const list = experiments[domain],
    selected = list.find((experiment) => experiment.id === value);
  return (
    <div className="study-lab">
      {selected && (
        <>
          {from && <Link to={knowledgeLink(from)}>← 返回知识点学习</Link>}
          <Session key={selected.id} experiment={selected} />
          <Suspense fallback={null}>
            <TopicTutor id={selected.topic} experiment={selected} />
          </Suspense>
        </>
      )}
      <section className="a2-panel">
        <h2>{domain === "math" ? "数学专题实验" : "统计专题实验"}</h2>
        {value && !selected && <p role="status">找不到该实验。请选择一个可运行的专题。</p>}
        <div className="study-cards">
          {list.map((item) => (
            <Link
              key={item.id}
              to={"/lab/" + domain + "?experiment=" + item.id + "&from=" + item.topic}
              aria-current={item.id === value ? "page" : undefined}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
