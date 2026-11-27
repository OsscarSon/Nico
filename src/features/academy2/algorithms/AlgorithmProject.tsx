import { useState } from "react";
import { Link } from "../../../app/router";
import { courseLink, getAcademyCourse } from "../../../content/academy2/model";
import { knowledgeLink } from "../../../content/academy2/knowledgeRegistry";
import { exercise } from "../../../content/academy2/p1/types";
import { projectKey } from "../../../content/academy2/p1/navigation";
import { isAlgorithmCourse } from "../../../content/academy2/algorithms/registry";
import {
  projectReading,
  projectsP2,
} from "../../../content/academy2/algorithms/projects";
import {
  benchmarkRange,
  projectExample,
  sortingProject,
  structuresProject,
  transportProject,
  type ProjectRun,
} from "../../../grading/academy2/algorithms/projects";
import {
  gradeTopic,
  practicePassed,
} from "../../../grading/academy2/p1/progress";
import {
  updateKnowledge,
  useKnowledgeProgress,
} from "../../../progress/knowledge";
import { changeStudy } from "../../../progress/study";
import { PageHeading } from "../Curriculum";
import { downloadText } from "../study/files";
import "./algorithms.css";

const stages = {
  foundation: ["第一组整数", "第二组整数"],
  intermediate: [
    "非负有向图（A 到 D）",
    "含负边的有向图（A 到 D）",
    "训练输入",
    "容量或目标和",
  ],
  advanced: ["整数数组", "点更新与查询", "文本", "模式"],
} as const;
const helpers = {
  foundation: "用逗号分隔整数。至少一组包含重复值，每组至少三个元素。",
  intermediate:
    "图格式如 A>B:4，边之间用逗号。背包格式如 2,4;3,5。双指针使用逗号分隔的非递减列表。",
  advanced:
    "如 u:1:7 表示将下标 1 替换为 7，q:0:3 表示求 [0,3) 之和。字符串按 Unicode 码点给出下标。",
};
const evidence = exercise(
  "自动对照全部项目数据",
  ["valid"],
  "观察到可复现的通过证据。",
);
const escapeMarkup = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function playerDocument(result: ProjectRun) {
  const frames = JSON.stringify(result.trace!.frames).replaceAll(
    "<",
    "\\u003c",
  );
  return `<!doctype html>
<html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nico · 归并排序轨迹</title>
<style>body{font:1.1rem system-ui;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#edf6ff;background:#102035}button,input{margin:.3rem;font:inherit}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:1rem;border:1px solid #7090a0}</style>
<h1>归并排序轨迹</h1><p>输入 ${escapeMarkup(result.input)}</p>
<button id="previous">上一步</button><button id="next">下一步</button><input id="step" aria-label="执行步骤" type="range" min="0" value="0" max="${result.trace!.frames.length - 1}">
<pre id="frame" aria-live="polite"></pre>
<script type="application/json" id="data">${frames}</script>
<script>
const frames = JSON.parse(document.getElementById('data').textContent), step = document.getElementById('step');
function render(){
 const i = Number(step.value), f = frames[i];
 document.getElementById('frame').textContent = [String(i+1)+' / '+frames.length,f.event,(f.items||[]).join(', '), ...f.variables.map(([k,v])=>k+' '+v),'累计键比较 '+f.count].join('\\n');
 document.getElementById('previous').disabled=i===0;
 document.getElementById('next').disabled=i===frames.length-1;
}
step.oninput=render;
document.getElementById('previous').onclick=()=>{step.stepDown();render();};
document.getElementById('next').onclick=()=>{step.stepUp();render();};
render();
</script>`;
}

export default function AlgorithmProject({ courseId }: { courseId: string }) {
  const course = getAcademyCourse(courseId);
  const stage = course?.stage ?? "foundation";
  const [values, setValues] = useState<string[]>(() => [
    ...projectExample[stage],
  ]);
  const [task, setTask] = useState("dp"),
    [findings, setFindings] = useState(""),
    [error, setError] = useState("");
  const [output, setOutput] = useState<ProjectRun[]>([]),
    [notice, setNotice] = useState("");
  const [size, setSize] = useState(256),
    [benchmark, setBenchmark] = useState<ReturnType<typeof benchmarkRange>>([]);
  const { data } = useKnowledgeProgress();
  if (!course || !isAlgorithmCourse(courseId)) return null;
  const project = projectsP2[courseId],
    id = projectKey(courseId);
  function clear() {
    setError("");
    setOutput([]);
    setNotice("");
  }
  function calculate() {
    const [a, b, c, d] = values;
    switch (stage) {
      case "foundation":
        return sortingProject(a!, b!);
      case "intermediate":
        return transportProject(a!, b!, task, c!, d!);
      case "advanced":
        return structuresProject(a!, b!, c!, d!);
    }
  }
  function save() {
    const now = Date.now();
    if (
      !output.length ||
      findings.trim().length < 20 ||
      (stage === "advanced" && benchmark.length !== 4)
    )
      return;
    const markdown = [
      "# " + project.title,
      "## 核验数据",
      ...output.map((run) =>
        [
          "### " + run.name,
          "输入：" + run.input,
          ...(run.parameter ? ["参数：" + run.parameter] : []),
          ...run.rows.map(([name, result]) => "- " + name + "：" + result),
        ].join("\n"),
      ),
      ...(benchmark.length
        ? [
            "## 基准 · 查询与更新时间（毫秒）",
            ...benchmark.map(
              (item) =>
                "- " +
                item.name +
                " · n=" +
                item.size +
                " · " +
                item.operations +
                " 次操作。五轮耗时 " +
                item.samples.map((x) => x.toFixed(3)).join(", ") +
                "，中位数 " +
                item.median.toFixed(3),
            ),
          ]
        : []),
      "## 学员分析",
      findings.trim(),
      "## 人工评分标准",
      project.rubric,
      "导出时只自动核验了算法结果与报告齐备性。分析质量等待人工复核。",
    ].join("\n\n");
    const persisted = changeStudy((source) => ({
      ...source,
      reports: {
        ...source.reports,
        [id]: {
          kind: "project",
          title: project.title,
          topic: courseId,
          at: now,
          markdown,
          active: true,
        },
      },
    }));
    if (persisted)
      updateKnowledge((state) =>
        [0, 1, 2].reduce(
          (current, index) =>
            gradeTopic(current, id, index as 0 | 1 | 2, evidence, "valid", now),
          state,
        ),
      );
    downloadText(project.title + ".md", markdown, "text/markdown");
    setNotice(
      persisted
        ? "报告已保存到学习资料并开始下载。"
        : "浏览器未能保存报告。已提供本地下载。",
    );
  }
  return (
    <article className="a2-page p2-project">
      <div className="a2-crumbs">
        <Link to={courseLink(courseId)}>{course.title}</Link>
        <span>/</span>
        <span>实践项目</span>
      </div>
      <PageHeading
        title={project.title}
        english="ALGORITHM CAPSTONE"
        intro={project.brief}
      />
      {practicePassed(data.records[id]) && (
        <p className="pill">已提交可核验的项目证据</p>
      )}
      <section className="a2-panel">
        <h2>任务和评分</h2>
        <ol>
          {project.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{project.rubric}</p>
        <ul className="a2-link-list">
          {projectReading(courseId).map((topic) => (
            <li key={topic.id}>
              <Link to={knowledgeLink(topic.id)}>{topic.title} ↗</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="a2-panel">
        <h2>提交算法输入</h2>
        <p>{helpers[stage]}</p>
        <form
          className="p2-inputs"
          onSubmit={(event) => {
            event.preventDefault();
            clear();
            try {
              setOutput(calculate());
            } catch (issue) {
              setError(issue instanceof Error ? issue.message : "请检查输入。");
            }
          }}
        >
          {stage === "intermediate" && (
            <label>
              竞赛题
              <select
                value={task}
                onChange={(event) => {
                  clear();
                  const next = event.target.value;
                  setTask(next);
                  setValues((previous) => [
                    previous[0]!,
                    previous[1]!,
                    ...(next === "dp"
                      ? ["2,4;3,5;4,11", "5"]
                      : ["1,3,4,7,10", "11"]),
                  ]);
                }}
              >
                <option value="dp">0/1 背包</option>
                <option value="pointers">双指针</option>
              </select>
            </label>
          )}
          {stages[stage].map((label, i) => (
            <label key={label}>
              {label}
              <input
                required
                maxLength={450}
                value={values[i] ?? ""}
                onChange={(event) => {
                  clear();
                  setValues((previous) =>
                    previous.map((value, index) =>
                      index === i ? event.target.value : value,
                    ),
                  );
                }}
              />
            </label>
          ))}
          <div>
            <button className="btn" type="submit">
              执行并核对项目
            </button>
          </div>
        </form>
        {error && (
          <p className="feedback bad" role="alert">
            {error}
          </p>
        )}
      </section>
      {!!output.length && (
        <section className="a2-panel p2-project-result">
          <h2>独立核验结果</h2>
          {output.map((work, index) => (
            <div key={index}>
              <h3>{work.name}</h3>
              <dl className="p2-variables">
                {work.rows.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {stage === "foundation" && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() =>
                    downloadText(
                      "nico-sort-replay-" + (index + 1) + ".html",
                      playerDocument(work),
                      "text/html",
                    )
                  }
                >
                  导出第 {index + 1} 组轨迹播放器
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {stage === "advanced" && (
        <section className="a2-panel">
          <h2>测量两个规模的真实运行时间</h2>
          <p>
            每种结构预热一次。计时从构建结束后开始，列出五轮混合查询和更新的时间。浏览器负载、计时精度和分配开销会影响读数。
          </p>
          <form
            className="p2-inputs"
            onSubmit={(event) => {
              event.preventDefault();
              const time = () => performance.now();
              setBenchmark([
                ...benchmarkRange(size, time),
                ...benchmarkRange(size * 2, time),
              ]);
            }}
          >
            <label>
              第一组的元素数
              <input
                type="number"
                required
                min="32"
                max="2048"
                value={size || ""}
                onChange={(event) => {
                  setSize(Number(event.target.value));
                  setBenchmark([]);
                }}
              />
            </label>
            <div>
              <button className="btn secondary" type="submit">
                运行两组基准
              </button>
            </div>
          </form>
          {!!benchmark.length && (
            <dl className="p2-variables" aria-label="真实计时结果">
              {benchmark.map((item) => (
                <div key={item.name + item.size}>
                  <dt>
                    {item.name} · n={item.size}
                  </dt>
                  <dd>中位数 {item.median.toFixed(3)} ms</dd>
                  <dd>已核验 {item.total} 条查询</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}
      <section className="a2-panel">
        <h2>完成和导出报告</h2>
        <p>
          解释结果、操作计数和适用条件，再说明至少一条局限。报告需有至少 20
          个字符的分析。
        </p>
        <label>
          我的分析
          <textarea
            value={findings}
            rows={5}
            maxLength={3500}
            onChange={(event) => setFindings(event.target.value)}
          />
        </label>
        <button
          className="btn"
          type="button"
          onClick={save}
          disabled={
            !output.length ||
            findings.trim().length < 20 ||
            (stage === "advanced" && benchmark.length !== 4)
          }
        >
          保存并下载 Markdown 报告
        </button>
        {notice && <p role="status">{notice}</p>}
      </section>
    </article>
  );
}
