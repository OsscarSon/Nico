import { useState } from "react";
import { advancedProgram } from "../../../content/academy2/advanced/programs";
import { evaluate } from "../../../grading/academy2/teaching/questions";
import { QuestionCard } from "../teaching/QuestionBank";
import { Link } from "../../../app/router";
import { courseLink, getAcademyCourse } from "../../../content/academy2/model";
import { projectLabs } from "../../../content/academy2/advanced/projects";
import { codeProjects } from "../../../content/academy2/advanced/codeProjects";
import { projectKey } from "../../../content/academy2/p1/navigation";
import { exercise } from "../../../content/academy2/p1/types";
import { gradeTopic } from "../../../grading/academy2/p1/progress";
import { updateKnowledge } from "../../../progress/knowledge";
import { PageHeading } from "../Curriculum";
import { saveReport } from "../data/workspaces";
import { Lab } from "./Lab";
import {
  projectValue,
  verifyProject,
  type LabRecord,
} from "../../../grading/academy2/advanced/projectEvidence";
import "./advanced.css";

export default function AdvancedProject({ courseId }: { courseId: string }) {
  const project = projectLabs[courseId],
    course = getAcademyCourse(courseId);
  const [evidence, setEvidence] = useState<LabRecord[]>([]),
    [companion, setCompanion] = useState<Record<string, LabRecord>>({}),
    [finding, setFinding] = useState(""),
    [notice, setNotice] = useState("");
  const [programPassed, setProgramPassed] = useState(false);
  if (!project || !course) return null;
  const program =
    courseId.endsWith("-programming") && course.stage !== "advanced"
      ? advancedProgram("study-log", 7)?.question
      : courseId.endsWith("-applied")
        ? advancedProgram(project.lab, 7)?.question
        : undefined;
  const codeProject = codeProjects[courseId];
  const ready =
    (!program || programPassed) &&
    verifyProject(courseId, evidence) &&
    (project.companion?.every((id) => companion[id]) ?? true);
  return (
    <div className="a2-page">
      <div className="a2-crumbs">
        <Link to={courseLink(courseId)}>{course.title}</Link>
      </div>
      <PageHeading
        english={course.english}
        title={project.name}
        intro={project.task}
      />
      {project.reference && (
        <p>
          <a href={project.reference.url}>{project.reference.title} ↗</a>
        </p>
      )}
      {codeProject && (
        <section className="a2-panel">
          <h2>在本机完成代码交付</h2>
          <p>{codeProject.notebook}</p>
          <pre className="p4-trace" tabIndex={0}>
            python projects/p4/verify.py --only {codeProject.task}
          </pre>
          <p>
            提交源代码、独立检查结果和适用范围。评分时分别检查结果（40）、复现步骤（25）、边界处理（20）和解释（15）。下方浏览器实验保存自己的证据，本机运行结果由读者另行核验。
          </p>
          <a
            href={
              "https://github.com/OsscarSon/Nico/blob/codex/academy-2-p4-advanced-computing/projects/p4/" +
              codeProject.path
            }
          >
            打开代码交付物 ↗
          </a>
        </section>
      )}
      <Lab
        active={project.lab}
        onResult={(record) => setEvidence((old) => [...old.slice(-1), record])}
      />
      {program && (
        <section className="a2-panel p1-exercises">
          <h2>
            {courseId.endsWith("-applied")
              ? "实现项目核心函数"
              : "实现汇总函数"}
          </h2>
          <QuestionCard
            question={program}
            onAttempt={(response) =>
              setProgramPassed(evaluate(program, response).status === "correct")
            }
          />
        </section>
      )}
      {project.companion?.map((id) => (
        <Lab
          key={id}
          active={id}
          onResult={(record) =>
            setCompanion((old) => ({ ...old, [id]: record }))
          }
        />
      ))}
      <section className="a2-panel p3-card">
        <h2>比较实验与报告</h2>
        <p>
          每次记录来自一次实际执行。第二次只更改一个变量或一个数据批次。自动核验比较「
          {project.primary}」。研究解释由读者评阅。
        </p>
        <ol>
          {evidence.map((entry, i) => (
            <li key={i}>
              {project.primary} {String(projectValue(courseId, entry))}
            </li>
          ))}
        </ol>
        <label>
          结果解释与局限
          <textarea
            rows={5}
            maxLength={3500}
            value={finding}
            onChange={(event) => setFinding(event.target.value)}
          />
        </label>
        <button
          className="btn"
          type="button"
          disabled={!ready || finding.trim().length < 24}
          onClick={() => {
            if (!ready) return;
            const markdown = [
              "# " + project.name,
              project.task,
              ...(project.reference
                ? [project.reference.title + " · " + project.reference.url]
                : []),
              "## 两次执行证据",
              ...evidence.map(
                (r, i) =>
                  "### 执行 " +
                  (i + 1) +
                  "\n\n" +
                  JSON.stringify(
                    {
                      inputs: r.inputs,
                      text: r.text,
                      result: r.result.metrics,
                    },
                    null,
                    2,
                  ),
              ),
              ...Object.entries(companion).map(
                ([id, record]) =>
                  "## 配套执行 " +
                  id +
                  "\n\n" +
                  JSON.stringify(
                    { inputs: record.inputs, result: record.result.metrics },
                    null,
                    2,
                  ),
              ),
              "## 解释与局限",
              finding.trim(),
            ].join("\n\n");
            const saved = saveReport(
              "project",
              courseId,
              project.name,
              markdown,
            );
            if (saved) {
              const validated = exercise(
                "两个不同配置产生可核验的计算结果。",
                ["valid"],
                "已核验",
              );
              updateKnowledge((state) =>
                ([0, 1, 2] as const).reduce(
                  (current, index) =>
                    gradeTopic(
                      current,
                      projectKey(courseId),
                      index,
                      validated,
                      "valid",
                      Date.now(),
                    ),
                  state,
                ),
              );
            }
            setNotice(
              saved
                ? "已保存并下载项目报告。"
                : "已下载报告。浏览器存储暂不可用。",
            );
          }}
        >
          保存并下载项目报告
        </button>
        {notice && <p role="status">{notice}</p>}
      </section>
    </div>
  );
}
