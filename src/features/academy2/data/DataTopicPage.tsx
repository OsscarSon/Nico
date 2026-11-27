import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "../../../app/router";
import { EmptyState } from "../../../components/ui";
import { findDataLesson } from "../../../content/academy2/data";
import { dataIds, labOf } from "../../../content/academy2/data/registry";
import { dependenciesOf } from "../../../content/academy2/knowledgeGraph";
import {
  knowledgeLink,
  findKnowledge,
} from "../../../content/academy2/knowledgeRegistry";
import { courseLink, getAcademyCourse } from "../../../content/academy2/model";
import type { Question } from "../../../content/academy2/teaching/schema";
import { dataVariant } from "../../../grading/academy2/data/variant";
import {
  beginTopic,
  gradeExercise,
  gradeTopic,
  knowledgeStatus,
  practicePassed,
  recordIndependentVerification,
} from "../../../grading/academy2/p1/progress";
import { compareOutputs } from "../../../grading/academy2/p15/python";
import {
  evaluate,
  recordAnswer,
  type Response,
} from "../../../grading/academy2/teaching/questions";
import {
  updateKnowledge,
  useKnowledgeProgress,
} from "../../../progress/knowledge";
import { LearningStatus, PageHeading, Prerequisites } from "../Curriculum";
import { ReadingTools } from "../study/reading";
import { BlockList } from "../teaching/TeachingBlocks";
import { QuestionCard } from "../teaching/QuestionBank";
import { RichText } from "../teaching/math";
import "../teaching/teaching.css";
import "./data.css";

const Tutor = lazy(() => import("../study/TopicTutor")),
  Python = lazy(() => import("../teaching/TeachingPython"));
const levels = ["概念核查", "动手计算", "分析", "迁移核验"] as const;
const index = [0, 1, 2, 3] as const;
function Examples({
  program,
}: {
  program: NonNullable<ReturnType<typeof findDataLesson>>["programming"];
}) {
  const [open, setOpen] = useState(false);
  const [out, setOut] = useState<(string | null)[]>([null, null]);
  if (!program) return null;
  const mark = (i: number, value: string | null) =>
    setOut((current) => current.map((x, j) => (i === j ? value : x)));
  return (
    <details
      className="a2-panel p3-code"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpen(true);
      }}
    >
      <summary>手写 Python 与实际库对照</summary>
      <p>两栏使用同一输入，查看输出后用同一组新值复核。</p>
      {open && (
        <Suspense fallback={<p role="status">加载 Python 编辑器…</p>}>
          <div className="a2-two-col">
            {["From Scratch", "Real-world Library"].map((title, i) => (
              <section key={title}>
                <h3>{title}</h3>
                <Python
                  initial={i === 0 ? program.scratch : program.library}
                  packages={i === 1 ? program.packages : undefined}
                  onChangeCode={() => mark(i, null)}
                  onResult={(value) =>
                    mark(
                      i,
                      value.error ||
                        value.loadError ||
                        value.stopped ||
                        value.timedOut ||
                        value.truncated
                        ? null
                        : value.stdout.trim(),
                    )
                  }
                />
              </section>
            ))}
          </div>
        </Suspense>
      )}
      <p role="status">
        {out[0] == null || out[1] == null
          ? "运行两种实现后核对标准输出。"
          : compareOutputs(out[0], out[1])
            ? "运行结果一致。"
            : "两栏输出不同。请检查输入、舍入和输出格式。"}
      </p>
    </details>
  );
}
export default function DataTopicPage({ id }: { id: string }) {
  const item = findDataLesson(id);
  const { data, warning } = useKnowledgeProgress();
  const [focus, setFocus] = useState(false),
    [answers, setAnswers] = useState(["", "", "", ""]),
    [feedback, setFeedback] = useState<boolean[]>([]);
  const [variant, setVariant] = useState<Question>(),
    [transfer, setTransfer] = useState<Question>(),
    [seed, setSeed] = useState(1);
  const [showTutor, setShowTutor] = useState(false);
  useEffect(() => {
    if (item) updateKnowledge((state) => beginTopic(state, id, Date.now()));
  }, [id, item]);
  if (!item)
    return (
      <EmptyState
        title="课时没有找到"
        action={<Link to="/courses">回到目录</Link>}
      >
        请选择一个知识点。
      </EmptyState>
    );
  const course = getAcademyCourse(item.course)!,
    seq = dataIds(item.course),
    position = seq.indexOf(id);
  const previous = seq[position - 1],
    next = seq[position + 1];
  const lab = labOf(course.id),
    material = item.material,
    record = data.records[id],
    complete = practicePassed(record);
  const labLink =
    "/lab/" +
    lab +
    "?experiment=" +
    encodeURIComponent(material.lab) +
    "&from=" +
    id;
  const canPractice = Boolean(dataVariant(material.lab, material.recipe, 1));
  function save(q: Question, response: Response, verify = false) {
    updateKnowledge((state) => {
      const outcome = evaluate(q, response);
      if (outcome.status !== "correct" && outcome.status !== "incorrect")
        return state;
      const time = Date.now(),
        current = verify
          ? recordIndependentVerification(
              state,
              id,
              outcome.status === "correct",
              time,
            )
          : state;
      return {
        ...current,
        questionBank: {
          ...current.questionBank,
          [id]: recordAnswer(
            current.questionBank?.[id] ?? {},
            q,
            response,
            time,
          ),
        },
      };
    });
  }
  return (
    <article
      className={
        "a2-page study-anchors p3-lesson" + (focus ? " study-focus" : "")
      }
    >
      <div className="a2-crumbs">
        <Link to={courseLink(item.course, item.module, item.title)}>
          {course.title}
        </Link>
        <span>/</span>
        <span>
          {course.modules.find((module) => module.id === item.module)?.title}
        </span>
      </div>
      <PageHeading
        title={item.title}
        english={material.english}
        intro="案例、实验和独立核验"
      />
      <div className="row">
        <LearningStatus status={knowledgeStatus(record, Date.now())} />
        <span className="pill draft">草稿 · 待真实试学</span>
      </div>
      {warning && <p role="status">{warning}</p>}
      <ReadingTools
        id={id}
        title={item.title}
        focus={focus}
        onFocus={() => setFocus((value) => !value)}
      />
      <div className="p3-reading" id="reading-theory">
        <BlockList
          topic={id}
          sectionClass="a2-panel"
          blocks={item.lesson.blocks.slice(0, 2)}
        />
      </div>
      <div className="p3-reading" id="reading-enhanced">
        <BlockList
          topic={id}
          sectionClass="a2-panel"
          start={2}
          blocks={item.lesson.blocks.slice(2)}
        />
      </div>
      <section className="a2-panel p3-card" id="reading-lab">
        <h2>打开配套实验</h2>
        <p>
          {lab === "data"
            ? "在数据工作台中改变数据和操作，再比较重新计算后的输出。"
            : "固定种子后改动一个条件，核对派生过程、预测或指标。"}
        </p>
        <div className="row">
          <Link className="btn" to={labLink}>
            {lab === "data" ? "打开 Data Studio" : "打开 ML Playground"}
          </Link>
          {material.legacy && (
            <Link className="btn secondary" to={"/lesson/" + material.legacy}>
              打开原版互动课 ↗
            </Link>
          )}
        </div>
      </section>
      <Examples program={item.programming} />
      <section
        id="reading-practice"
        className="a2-panel p1-exercises teaching-engine"
      >
        <h2>实际核验</h2>
        <p>
          前三题通过后开启迁移核验。输入数字、小数或分数。答案需要来自案例中的单位及条件。
        </p>
        {index.map((i) => {
          const exercise = item.base.exercises[i],
            enabled = i !== 3 || complete,
            recorded = i === 3 ? record?.verification : record?.practice[i];
          return (
            <form
              key={i}
              onSubmit={(e) => {
                e.preventDefault();
                if (!enabled || !answers[i]!.trim()) return;
                const correct = gradeExercise(exercise, answers[i]!);
                setFeedback((previous) => {
                  const copy = [...previous];
                  copy[i] = correct;
                  return copy;
                });
                updateKnowledge((state) =>
                  gradeTopic(state, id, i, exercise, answers[i]!, Date.now()),
                );
              }}
            >
              <h3>
                {levels[i]}{" "}
                {recorded && (
                  <small>· {recorded.lastCorrect ? "已答对" : "待重做"}</small>
                )}
              </h3>
              <p>
                <RichText text={exercise.prompt} />
              </p>
              <div className="row">
                <label className="sr-only" htmlFor={"p3-answer-" + i}>
                  {levels[i]}答案
                </label>
                <input
                  id={"p3-answer-" + i}
                  required
                  maxLength={180}
                  disabled={!enabled}
                  value={answers[i]}
                  onChange={(e) =>
                    setAnswers((current) =>
                      current.map((v, j) => (i === j ? e.target.value : v)),
                    )
                  }
                />
                <button
                  className="btn secondary"
                  type="submit"
                  disabled={!enabled}
                >
                  {i === 3 ? "核验掌握" : "检查答案"}
                </button>
              </div>
              {feedback[i] !== undefined && (
                <p
                  className={"feedback " + (feedback[i] ? "ok" : "bad")}
                  role="status"
                >
                  {feedback[i]
                    ? exercise.explanation
                    : "结果有出入。按题面重新核对条件、分母或顺序后再算。"}
                </p>
              )}
            </form>
          );
        })}
        {canPractice && (
          <section>
            <h3>参数变式</h3>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setVariant(dataVariant(material.lab, material.recipe, seed));
                setSeed(seed + 1);
                setTransfer(undefined);
              }}
            >
              生成参数题
            </button>
            {variant && (
              <QuestionCard
                key={variant.id}
                question={variant}
                onAttempt={(response) => save(variant, response)}
              />
            )}
            {complete &&
              variant &&
              data.questionBank?.[id]?.[variant.id]?.lastCorrect && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    setTransfer(
                      dataVariant(
                        material.lab,
                        material.recipe,
                        seed + 1500,
                        true,
                      ),
                    );
                    setSeed(seed + 1);
                  }}
                >
                  开启独立变式核验
                </button>
              )}
            {transfer && (
              <QuestionCard
                key={transfer.id}
                question={transfer}
                onAttempt={(response) => save(transfer, response, true)}
              />
            )}
          </section>
        )}
        {item.programming && (
          <details>
            <summary>打开 Python 自动判题</summary>
            <QuestionCard
              question={item.programming.question}
              onAttempt={(response) =>
                save(item.programming!.question, response)
              }
              last={
                data.questionBank?.[id]?.[item.programming.question.id]
                  ?.lastCorrect
              }
            />
          </details>
        )}
      </section>
      {dependenciesOf(id).length > 0 && (
        <section className="a2-panel">
          <h2>先修与关联</h2>
          <Prerequisites targets={dependenciesOf(id)} />
        </section>
      )}
      <details
        className="a2-panel"
        onToggle={(e) => {
          if (e.currentTarget.open) setShowTutor(true);
        }}
      >
        <summary>AI 学习帮助</summary>
        {showTutor && (
          <Suspense fallback={<p>加载导师…</p>}>
            <Tutor
              id={id}
              lesson={item}
              experiment={{
                title: lab === "data" ? "Data Studio" : "ML Playground",
                objective: material.aim,
              }}
            />
          </Suspense>
        )}
      </details>
      <nav className="study-nav" aria-label="相邻课时">
        {previous && (
          <Link className="btn secondary" to={knowledgeLink(previous)}>
            ← {findKnowledge(previous)?.title}
          </Link>
        )}
        {next ? (
          <Link className="btn secondary" to={knowledgeLink(next)}>
            继续学习 · {findKnowledge(next)?.title} ↗
          </Link>
        ) : (
          <Link className="btn secondary" to={"/projects/" + course.id}>
            开始实践项目 ↗
          </Link>
        )}
      </nav>
    </article>
  );
}
