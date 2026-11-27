import { useRef } from "react";
import {
  correlation,
  pairsFor,
  histogram,
  numberSummary,
  numericValues,
  type Table,
} from "../../../grading/academy2/data/table";
import type { MLResult } from "../../../grading/academy2/data/ml";
import { downloadText } from "../study/files";
import "./data.css";

export type PlotKind = "scatter" | "line" | "histogram" | "box" | "heatmap";
type XY = { x: number; y: number; group?: number; note?: string };
const colors = [
  "#61b9ff",
  "#ffbd7b",
  "#96e4bb",
  "#c1adff",
  "#fa9ca4",
  "#ecd474",
];
const number = (x: number) =>
  Number(x.toPrecision(5)).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
const units = ["数值", "类别"];
const tick = (val: number, a: number, b: number) => a + (b - a) * val;
function domain(values: number[]) {
  const lo = Math.min(...values),
    hi = Math.max(...values);
  return lo === hi ? ([lo - 1, hi + 1] as const) : ([lo, hi] as const);
}
const width = 620,
  height = 300,
  left = 87,
  right = 595,
  top = 22,
  bottom = 252;
export function Chart({
  title,
  children,
  caption,
  exportChart = true,
}: {
  title: string;
  children: React.ReactNode;
  caption?: string;
  exportChart?: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  return (
    <figure className="p3-chart">
      <figcaption>
        <strong>{title}</strong>
        {caption && <p>{caption}</p>}
      </figcaption>
      <svg
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
        aria-label={title}
        role="img"
        fontFamily="system-ui,sans-serif"
        fill="#f1f6ff"
      >
        <rect width={width} height={height} rx="14" fill="#132137" />
        {children}
      </svg>
      {exportChart && (
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            if (svg.current)
              downloadText(
                "nico-chart.svg",
                new XMLSerializer().serializeToString(svg.current),
                "image/svg+xml",
              );
          }}
        >
          下载 SVG 图表
        </button>
      )}
    </figure>
  );
}
function Axes({
  x,
  y,
  xLabel,
  yLabel,
}: {
  x: readonly [number, number];
  y: readonly [number, number];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <g key={ratio} stroke="#3a536e" strokeWidth={0.8}>
          <path
            d={`M${left} ${tick(ratio, bottom, top)} H${right} M${tick(ratio, left, right)} ${top} V${bottom}`}
          />
          <g fill="#b9d0e7" stroke="none" fontSize="11">
            <text
              x={left - 6}
              y={tick(ratio, bottom + 3, top + 3)}
              textAnchor="end"
            >
              {number(tick(ratio, ...y))}
            </text>
            <text
              x={tick(ratio, left, right)}
              y={bottom + 17}
              textAnchor="middle"
            >
              {number(tick(ratio, ...x))}
            </text>
          </g>
        </g>
      ))}
      <text
        textAnchor="middle"
        x={(left + right) / 2}
        y={height - 4}
        fontSize="13"
      >
        {xLabel.slice(0, 42)}
      </text>
      <text
        transform={`translate(16 ${(top + bottom) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize="13"
      >
        {yLabel.slice(0, 32)}
      </text>
    </>
  );
}
export function XYChart({
  title,
  points,
  xLabel = units[0]!,
  yLabel = units[1]!,
  line = false,
  boundary,
  caption,
}: {
  title: string;
  points: XY[];
  xLabel?: string;
  yLabel?: string;
  line?: boolean;
  boundary?: MLResult["boundary"];
  caption?: string;
}) {
  if (!points.length) return <p role="status">所选列暂时没有成对数值。</p>;
  const [xmin, xmax] = domain([
      ...points.map((x) => x.x),
      ...(boundary?.x ?? []),
    ]),
    [ymin, ymax] = domain([...points.map((p) => p.y), ...(boundary?.y ?? [])]);
  const X = (u: number) => tick((u - xmin) / (xmax - xmin), left, right);
  const Y = (v: number) => tick((v - ymin) / (ymax - ymin), bottom, top);
  const tone = (group: number) =>
    group < 0 ? "#9fb0c4" : colors[group % colors.length]!;
  return (
    <Chart title={title} caption={caption ?? points.length + " 个有效观测"}>
      {boundary &&
        boundary.y.flatMap((value, i) =>
          boundary.x.map((x, j) => {
            const dx = (boundary.x[1]! - boundary.x[0]!) / 2,
              dy = (boundary.y[1]! - boundary.y[0]!) / 2;
            const low = Math.max(left, X(x - dx)),
              high = Math.min(right, X(x + dx)),
              start = Math.max(top, Y(value + dy)),
              end = Math.min(bottom, Y(value - dy));
            return (
              <rect
                key={i + "-" + j}
                x={low}
                y={start}
                width={Math.max(0, high - low)}
                height={Math.max(0, end - start)}
                fill={tone(boundary.labels[i * boundary.x.length + j]!)}
                opacity=".21"
              />
            );
          }),
        )}
      <Axes x={[xmin, xmax]} y={[ymin, ymax]} xLabel={xLabel} yLabel={yLabel} />
      {line && (
        <polyline
          points={points.map((p) => X(p.x) + "," + Y(p.y)).join(" ")}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
        />
      )}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={X(p.x)}
          cy={Y(p.y)}
          r={line ? 2.1 : 4}
          fill={tone(p.group ?? 0)}
          stroke="#132137"
          strokeWidth=".7"
        >
          <title>{p.note ?? number(p.x) + " / " + number(p.y)}</title>
        </circle>
      ))}
    </Chart>
  );
}

export function DataChart({
  kind,
  table,
  x,
  y,
}: {
  kind: PlotKind;
  table: Table;
  x: string;
  y: string;
}) {
  if (kind === "scatter" || kind === "line") {
    const pairs = pairsFor(table, x, y);
    const points = (
      kind === "line" ? [...pairs].sort((a, b) => a[0] - b[0]) : pairs
    ).map(([x, y]) => ({ x, y }));
    return (
      <XYChart
        title={kind === "line" ? "按 X 排序的折线" : "数值散点图"}
        points={points}
        xLabel={x}
        yLabel={y}
        line={kind === "line"}
      />
    );
  }
  if (kind === "heatmap") {
    const keys = table.columns
      .filter((key) => numericValues(table, key).length >= 2)
      .slice(0, 8);
    if (!keys.length) return <p>需要至少一个有两个数值的列。</p>;
    const count = keys.length,
      size = Math.min(61, 198 / count);
    return (
      <Chart
        title="Pearson 相关矩阵"
        caption="每对变量按共同可用记录计算。蓝色为正相关，橙色为负相关，— 表示无法计算。"
      >
        {keys.map((key, j) => (
          <g key={key} fontSize="10">
            <text
              x={left + 90 + size * j + size / 2}
              y={26}
              textAnchor="middle"
            >
              {key.slice(0, 8)}
            </text>
            <text x={left + 81} y={49 + size * j + size / 2} textAnchor="end">
              {key.slice(0, 20)}
            </text>
          </g>
        ))}
        {keys.flatMap((a, i) =>
          keys.map((b, j) => {
            const pairs = pairsFor(table, a, b),
              r = correlation(pairs),
              bx = left + 90 + size * j,
              by = 33 + size * i;
            return (
              <g key={i + "-" + j}>
                <title>{a + " 与 " + b + " · " + pairs.length + " 条"}</title>
                <rect
                  x={bx}
                  y={by}
                  width={size - 1}
                  height={size - 1}
                  fill={r == null ? "#485871" : r < 0 ? "#d57b42" : "#2673b7"}
                  opacity={0.28 + 0.72 * Math.abs(r ?? 0)}
                />
                <text
                  x={bx + size / 2}
                  y={by + size / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                >
                  {r === null ? "—" : r.toFixed(2)}
                </text>
              </g>
            );
          }),
        )}
      </Chart>
    );
  }
  const values = numericValues(table, x),
    stats = numberSummary(values);
  if (!stats) return <p>选择有数值的列。</p>;
  const bounds = domain(values),
    X = (v: number) =>
      tick((v - bounds[0]) / (bounds[1] - bounds[0]), left, right);
  if (kind === "box") {
    const mid = 134;
    return (
      <Chart
        title="箱线图 · Tukey 围栏"
        caption={`Q1 ${number(stats.q1)} · 中位数 ${number(stats.median)} · Q3 ${number(stats.q3)} · 围栏外 ${stats.outliers.length} 条`}
      >
        <Axes x={bounds} y={[0, 1]} xLabel={x} yLabel="分布" />
        <path
          d={`M${X(stats.whiskers[0])} ${mid} H${X(stats.whiskers[1])}`}
          stroke={colors[0]}
          strokeWidth="3"
        />
        <rect
          x={X(stats.q1)}
          width={Math.max(1, X(stats.q3) - X(stats.q1))}
          y={mid - 25}
          height="50"
          fill="#3d6ca0"
          stroke={colors[0]}
        />
        <path
          d={`M${X(stats.median)} ${mid - 25} v50`}
          stroke={colors[1]}
          strokeWidth="2"
        />
        {stats.outliers.map((value, i) => (
          <circle key={i} cx={X(value)} cy={mid} r="4" fill={colors[1]}>
            <title>{number(value)}</title>
          </circle>
        ))}
      </Chart>
    );
  }
  const bins = histogram(values),
    max = Math.max(...bins.map((row) => row.count), 1);
  return (
    <Chart
      title="直方图"
      caption={values.length + " 个有限数值。最后一箱包含右端。"}
    >
      <Axes x={bounds} y={[0, max]} xLabel={x} yLabel="频数" />
      {bins.map(({ edge, end, count }, i) => {
        const barWidth = values.every((value) => value === values[0])
          ? 42
          : Math.max(1, X(end) - X(edge) - 1);
        const size = ((bottom - top) * count) / max;
        return (
          <rect
            key={i}
            x={edge === end ? X(edge) - barWidth / 2 : X(edge)}
            y={bottom - size}
            width={barWidth}
            height={size}
            fill={colors[0]}
          >
            <title>
              {number(edge) + " 至 " + number(end) + "，" + count + " 条"}
            </title>
          </rect>
        );
      })}
    </Chart>
  );
}
