import { useState } from "react";
import { treeProbabilities } from "../../../grading/academy2/p1/statistics";

const percent = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
export function ProbabilityTree() {
  const [prior, setPrior] = useState(2),
    [hit, setHit] = useState(90),
    [falseAlarm, setFalseAlarm] = useState(10);
  const result = treeProbabilities(prior / 100, hit / 100, falseAlarm / 100);
  return (
    <div className="teaching-tree">
      <p>拖动假警率或基率，比较两条报警路径。连线旁显示路径内的条件概率。</p>
      <label>
        不良率（%）{" "}
        <input
          type="range"
          min={0}
          max={100}
          value={prior}
          onChange={(event) => setPrior(event.target.valueAsNumber)}
        />
        {prior}%
      </label>
      <label>
        不良品报警率（%）{" "}
        <input
          type="range"
          min={0}
          max={100}
          value={hit}
          onChange={(event) => setHit(event.target.valueAsNumber)}
        />
        {hit}%
      </label>
      <label>
        良品报警率（%）{" "}
        <input
          type="range"
          min={0}
          max={100}
          value={falseAlarm}
          onChange={(event) => setFalseAlarm(event.target.valueAsNumber)}
        />
        {falseAlarm}%
      </label>
      <svg
        viewBox="0 0 420 180"
        role="img"
        aria-label="不良品报警和良品报警的两条路径，具体概率见图下结果"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M55 90 L175 35 H291 M55 90 L175 145 H291" />
        </g>
        <g fill="currentColor" fontSize="17">
          <text x="12" y="96">
            检测
          </text>
          <text x="177" y="29">
            不良品
          </text>
          <text x="177" y="139">
            良品
          </text>
          <text x="96" y="52">
            {prior}%
          </text>
          <text x="96" y="145">
            {100 - prior}%
          </text>
          <text x="236" y="28">
            {hit}%
          </text>
          <text x="236" y="139">
            {falseAlarm}%
          </text>
          <text x="300" y="41">
            真报警
          </text>
          <text x="300" y="151">
            假报警
          </text>
        </g>
      </svg>
      <p aria-live="polite">
        真报警占总件数 {percent(result.trueAlert)}；假报警占{" "}
        {percent(result.falseAlert)}。
        {result.posterior === null
          ? "没有报警事件，后验未定义。"
          : "已知报警后的不良率为 " + percent(result.posterior) + "。"}
      </p>
    </div>
  );
}
