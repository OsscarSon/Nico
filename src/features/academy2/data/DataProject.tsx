import { useState } from "react";
import { Link } from "../../../app/router";
import { getAcademyCourse, courseLink } from "../../../content/academy2/model";
import { isDataCourse } from "../../../content/academy2/data/registry";
import { projectsP3 } from "../../../content/academy2/data/projects";
import { airTable } from "../../../content/academy2/data/datasets";
import { projectKey } from "../../../content/academy2/p1/navigation";
import { exercise } from "../../../content/academy2/p1/types";
import {
  compareOnHoldout,
  verifyMonthly,
} from "../../../grading/academy2/data/projects";
import {
  gradeTopic,
  practicePassed,
} from "../../../grading/academy2/p1/progress";
import {
  updateKnowledge,
  useKnowledgeProgress,
} from "../../../progress/knowledge";
import { PageHeading } from "../Curriculum";
import DataStudio, { type DataEvidence } from "./DataStudio";
import MLPlayground, { type MLEvidence } from "./MLPlayground";
import Reasoning, { type AssistantEvidence } from "./Reasoning";
import { saveReport } from "./workspaces";
import "./data.css";

const evidence = exercise(
  "项目数据核验",
  ["valid"],
  "结构化输出符合项目规格。",
);
function details(value: MLEvidence["result"]) {
  if (!value) return [];
  const {
    model,
    features,
    details,
    options,
    validation,
    test,
    trainSize,
    validationSize,
    testSize,
    cv,
  } = value;
  return [
    "### 模型 " + model,
    details,
    "特征 " + features.join("、") + ", 标签 " + options.target,
    "训练 " + trainSize + "，验证 " + validationSize + "，测试 " + testSize,
    "验证：" +
      JSON.stringify(validation, (key, v) =>
        key === "roc" || key === "residuals" ? undefined : v,
      ),
    "测试：" +
      JSON.stringify(test, (key, v) =>
        key === "roc" || key === "residuals" ? undefined : v,
      ),
    "训练折：" + cv.join(", "),
    "配置：" + JSON.stringify(options),
  ];
}
export default function DataProject({ courseId }: { courseId: string }) {
  const [studio, setStudio] = useState<DataEvidence>(),
    [ml, setML] = useState<MLEvidence>(),
    [assistant, setAssistant] = useState<AssistantEvidence>();
  const [findings, setFindings] = useState(""),
    [notice, setNotice] = useState("");
  const { data } = useKnowledgeProgress();
  if (!isDataCourse(courseId)) return null;
  const course = getAcademyCourse(courseId)!,
    project = projectsP3[courseId],
    key = projectKey(courseId),
    model = ml?.result,
    other = ml?.comparison;
  const ready =
    courseId === "foundation-data-science"
      ? Boolean(
          studio?.source === "air" &&
          studio.steps.length &&
          studio.charts.length >= 2 &&
          studio.pivot,
        )
      : courseId === "intermediate-data-science"
        ? Boolean(
            studio?.source === "air" &&
            studio.result &&
            studio.steps.length === 0 &&
            verifyMonthly(airTable, studio.result),
          )
        : courseId === "foundation-ai"
          ? Boolean(
              model?.test?.kind === "classification" &&
              !model.options.leakDemo &&
              assistant?.passed === assistant?.table.length &&
              assistant?.passed,
            )
          : Boolean(
              model &&
              other &&
              model.cv.length >= 2 &&
              compareOnHoldout(model, other),
            );
  const datasetProject = course.domain === "data-science";
  function submit() {
    if (!ready || findings.trim().length < 35) return;
    const report = [
      "# " + project.title,
      "## 项目任务",
      ...project.steps.map((step) => "- " + step),
      ...(studio
        ? [
            "## 数据工作台证据",
            "数据集 " +
              studio.source +
              " · " +
              studio.table.rows.length +
              " 行",
            "清洗记录 " + (studio.steps.join("；") || "原始表"),
            "图表 " + studio.charts.join("、"),
            ...(studio.result
              ? [
                  "### 核验查询结果",
                  JSON.stringify(studio.result.rows),
                  "### SQL",
                  ...(studio.queries ?? []),
                ]
              : []),
          ]
        : []),
      ...details(model),
      ...details(other),
      ...(assistant
        ? [
            "## 助手评估",
            ...assistant.table.map(
              (row) =>
                "- " +
                row.query +
                " · " +
                (row.actual ?? "拒答") +
                " · " +
                (row.passed ? "通过" : "失败"),
            ),
          ]
        : []),
      "## 分析与限制",
      findings.trim(),
      "自动部分核对实际输出与实验步骤。研究结论、证据解读及表达由人工评阅。",
    ].join("\n\n");
    const saved = saveReport("project", courseId, project.title, report);
    if (saved)
      updateKnowledge((state) =>
        gradeTopic(
          gradeTopic(
            gradeTopic(state, key, 0, evidence, "valid", Date.now()),
            key,
            1,
            evidence,
            "valid",
            Date.now(),
          ),
          key,
          2,
          evidence,
          "valid",
          Date.now(),
        ),
      );
    setNotice(
      saved ? "项目证据已保存并下载报告。" : "已下载报告，浏览器存储不可用。",
    );
  }
  return (
    <article className="a2-page p3-project">
      <div className="a2-crumbs">
        <Link to={courseLink(courseId)}>{course.title}</Link>
        <span>/</span>
        <span>实践项目</span>
      </div>
      <PageHeading
        title={project.title}
        english="DATA & AI CAPSTONE"
        intro={project.summary}
      />
      {practicePassed(data.records[key]) && (
        <p className="pill">已提交可核验的项目证据</p>
      )}
      <section className="a2-panel">
        <h2>实践步骤</h2>
        <ol>
          {project.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      {datasetProject ? (
        <DataStudio
          scenario="dashboard"
          kind={
            courseId === "foundation-data-science" ? "dashboard" : "database"
          }
          onEvidence={setStudio}
        />
      ) : (
        <MLPlayground
          scenario={courseId === "intermediate-ai" ? "cv" : "logistic"}
          modelOnly
          onEvidence={setML}
        />
      )}
      {courseId === "foundation-ai" && (
        <>
          <Reasoning initial="retrieve" onEvidence={setAssistant} />
          <Link to="/lesson/c18-assistant-project">
            打开原版 AI 助手综合实验 ↗
          </Link>
        </>
      )}
      <section className="a2-panel p3-card">
        <h2>复核与提交</h2>
        <p role="status">
          {ready
            ? "已获得符合要求的可核验输出。"
            : "请完成上方工作台的任务，再核对实际输出。"}{" "}
          说明需包含解释和限制，至少 35 字。
        </p>
        <label>
          研究说明与局限
          <textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={5}
            maxLength={4000}
          />
        </label>
        <div>
          <button
            className="btn"
            type="button"
            onClick={submit}
            disabled={!ready || findings.trim().length < 35}
          >
            保存并下载项目报告
          </button>
        </div>
        {notice && <p role="status">{notice}</p>}
      </section>
    </article>
  );
}
