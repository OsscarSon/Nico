import { Link } from "../../app/router";
import type { Track } from "../../content/catalog";
import { useProgress } from "../../progress/useProgress";

const UNIT_H = 64;
const LESSON_H = 80;
const X = 24;

type Row =
  | { kind: "unit"; id: string; title: string; y: number }
  | { kind: "lesson"; id: string; title: string; status: "available" | "planned"; y: number };

/**
 * 走线路线图：课时是焊盘，已完成的线段点亮为琥珀色，
 * 未到达的部分是灰色虚线；单元标题处有一个 45° 的分支。
 */
export function PathMap({ track }: { track: Track }) {
  const progress = useProgress();

  const rows: Row[] = [];
  let y = 0;
  for (const unit of track.units) {
    rows.push({ kind: "unit", id: unit.id, title: unit.title, y: y + UNIT_H / 2 });
    y += UNIT_H;
    for (const l of track.lessons.filter((l) => l.unit === unit.id)) {
      rows.push({ kind: "lesson", id: l.id, title: l.title, status: l.status, y: y + LESSON_H / 2 });
      y += LESSON_H;
    }
  }
  const height = y;
  const lessonRows = rows.filter((r): r is Extract<Row, { kind: "lesson" }> => r.kind === "lesson");
  const completedRows = lessonRows.filter((r) => progress.lessons[r.id]);
  const lastLit = completedRows.at(-1)?.y ?? 0;
  const current = lessonRows.find((r) => r.status === "available" && !progress.lessons[r.id]);
  const trackEnd = rows[rows.length - 1]?.y ?? 0;

  return (
    <div className="pathmap" style={{ height }}>
      <svg className="trace" height={height} viewBox={`0 0 56 ${height}`} aria-hidden="true">
        <line x1={X} y1={0} x2={X} y2={trackEnd} stroke="#8c97a8" strokeWidth="2.5" strokeDasharray="5 6" />
        {lastLit > 0 && <line x1={X} y1={0} x2={X} y2={lastLit} stroke="#ffb020" strokeWidth="4" />}
        {rows.map((r) =>
          r.kind === "unit" ? (
            <path
              key={r.id}
              d={`M${X} ${r.y - 8} L${X + 16} ${r.y + 8} H56`}
              fill="none"
              stroke="#14213d"
              strokeWidth="2"
            />
          ) : (
            <g key={r.id}>
              {current?.id === r.id && <circle className="pad-pulse" cx={X} cy={r.y} r="9" fill="none" stroke="#ffb020" strokeWidth="3" />}
              <circle
                cx={X}
                cy={r.y}
                r="9"
                strokeWidth="2.5"
                stroke={r.status === "planned" ? "#8c97a8" : "#14213d"}
                fill={progress.lessons[r.id] ? "#ffb020" : r.status === "planned" ? "#f2f4f7" : "#ffffff"}
              />
              {progress.lessons[r.id] && (
                <path d={`M${X - 4} ${r.y} l3 3 l5 -6`} fill="none" stroke="#14213d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </g>
          ),
        )}
      </svg>
      <ol aria-label={`${track.title}的课时`}>
        {rows.map((r) =>
          r.kind === "unit" ? (
            <li key={r.id} className="pm-unit" style={{ height: UNIT_H }}>
              <h2>{r.title}</h2>
            </li>
          ) : r.status === "available" ? (
            <li key={r.id} className="pm-lesson" style={{ height: LESSON_H }}>
              <Link to={`/lesson/${r.id}`} className={`pm-card${current?.id === r.id ? " current" : ""}`}>
                <strong>{r.title}</strong>
                {progress.lessons[r.id] ? (
                  <span className="pill done">已完成</span>
                ) : (
                  <span className="pill available">可以开始</span>
                )}
              </Link>
            </li>
          ) : (
            <li key={r.id} className="pm-lesson" style={{ height: LESSON_H }}>
              <div className="pm-card planned">
                <strong>{r.title}</strong>
                <span className="pill">规划中</span>
              </div>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
