import { ELEMENT_IDS, ELEMENTS } from "../../ai/elements";
import { LEVEL_TEXT, type PromptReport } from "../../grading/promptScore";

/** 六要素检查结果：每一项都有“写了 / 没写”的图标和文字（不只靠颜色），写了的项给出依据。 */
export function ReportView({ report, showTips = true }: { report: PromptReport; showTips?: boolean }) {
  const next = report.nextStep ? ELEMENTS[report.nextStep] : null;
  return (
    <div className="pl-report">
      <p className="pl-level" role="status">
        <strong>{report.presentCount} / 6 项</strong>
        <span className="pill">{LEVEL_TEXT[report.level]}</span>
      </p>
      <ul className="pl-elements" aria-label="六要素检查">
        {ELEMENT_IDS.map((id) => {
          const r = report.results.find((x) => x.id === id)!;
          const info = ELEMENTS[id];
          return (
            <li key={id} className={r.present ? "on" : "off"}>
              <span className="mark" aria-hidden="true">{r.present ? "✓" : "○"}</span>
              <div>
                <strong>{info.name}</strong>
                <span className="sr-only">{r.present ? "：写了" : "：没写"}</span>
                <span className="muted"> · {info.asks}</span>
                {r.present && r.evidence && <div className="evidence">依据：「{r.evidence}」</div>}
                {!r.present && showTips && <div className="tip">{info.tip}</div>}
              </div>
            </li>
          );
        })}
      </ul>
      {next && report.level !== "empty" && (
        <p className="callout">
          <strong>下一步先补「{next.name}」。</strong>可以这样写：{next.template}
        </p>
      )}
      <p className="muted pl-caveat">
        这是规则检查：只看有没有写，不判断写得好不好；写得很绕的句子可能被漏掉，凑关键词也能骗过它。想知道写得好不好，请 AI 点评，或者拿去试一试。不是每条指令都需要六项。
      </p>
    </div>
  );
}
