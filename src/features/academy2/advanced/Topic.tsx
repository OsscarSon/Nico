import { usePreferences } from "../../../preferences/store";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "../../../app/router";
import { advancedProgram } from "../../../content/academy2/advanced/programs";
import {
  evaluate,
  recordAnswer,
  type Response,
} from "../../../grading/academy2/teaching/questions";
import type { Question } from "../../../content/academy2/teaching/schema";
import { QuestionCard } from "../teaching/QuestionBank";
import { EmptyState } from "../../../components/ui";
import { findP4Lesson } from "../../../content/academy2/advanced";
import { microTrainingLinks } from "../../../content/academy2/applied/trainingLinks";
import {
  reasoningQuestions,
  seededReasoning,
} from "../../../content/academy2/applied/reasoning";
import {
  p4LabLink,
  p4TopicsIn,
} from "../../../content/academy2/advanced/registry";
import { courseLink, getAcademyCourse } from "../../../content/academy2/model";
import { dependenciesOf } from "../../../content/academy2/knowledgeGraph";
import {
  findKnowledge,
  knowledgeLink,
} from "../../../content/academy2/knowledgeRegistry";
import {
  beginTopic,
  gradeExercise,
  gradeTopic,
  knowledgeStatus,
  practicePassed,
} from "../../../grading/academy2/p1/progress";
import {
  updateKnowledge,
  useKnowledgeProgress,
} from "../../../progress/knowledge";
import { LearningStatus, PageHeading, Prerequisites } from "../Curriculum";
import { ReadingTools } from "../study/reading";
import { BlockList } from "../teaching/TeachingBlocks";
import { RichText } from "../teaching/math";
import { Lab } from "./Lab";
import "../teaching/teaching.css";
import "./advanced.css";

const Crypto = lazy(() => import("./Crypto"));
const CodeComparison = lazy(() => import("../teaching/CodeComparison"));
const Tutor = lazy(() => import("../study/TopicTutor"));
const levels = ["知识核查", "计算练习", "分析练习", "独立迁移核验"] as const;
const indexes = [0, 1, 2, 3] as const;
export default function AdvancedTopic({ id }: { id: string }) {
  const { showAiLinks } = usePreferences();
  const item = findP4Lesson(id);
  const { data, warning } = useKnowledgeProgress();
  const [focus, setFocus] = useState(false),
    [labOpen, setLabOpen] = useState(false),
    [tutorOpen, setTutorOpen] = useState(false);
  const [answers, setAnswers] = useState(["", "", "", ""]),
    [outcomes, setOutcomes] = useState<(boolean | undefined)[]>([]);
  const [seed, setSeed] = useState(0);
  const [reasoningSeed, setReasoningSeed] = useState(1);
  const exists = Boolean(item);
  useEffect(() => {
    if (exists) updateKnowledge((old) => beginTopic(old, id, Date.now()));
  }, [id, exists]);
  if (!item)
    return (
      <EmptyState
        title="找不到进阶课时"
        action={<Link to="/courses">课程目录</Link>}
      >
        请从课程内选择已开放的课时。
      </EmptyState>
    );
  const course = getAcademyCourse(item.course)!;
  const seq = p4TopicsIn(item.course),
    position = seq.indexOf(id);
  const record = data.records[id],
    deps = dependenciesOf(id);
  const program = advancedProgram(item.spec.lab, seed)?.question;
  const training = microTrainingLinks[id];
  const reasoning = reasoningQuestions(id, reasoningSeed);
  function recordQuestion(question: Question, response: Response) {
    const outcome = evaluate(question, response);
    if (outcome.status !== "correct" && outcome.status !== "incorrect") return;
    updateKnowledge((state) => ({
      ...state,
      questionBank: {
        ...state.questionBank,
        [id]: recordAnswer(
          state.questionBank?.[id] ?? {},
          question,
          response,
          Date.now(),
        ),
      },
    }));
  }
  return (
    <article
      className={
        "a2-page study-anchors p4-topic" + (focus ? " study-focus" : "")
      }
    >
      <div className="a2-crumbs">
        <Link to={courseLink(course.id, item.module, item.title)}>
          {course.title}
        </Link>
      </div>
      <PageHeading
        english={course.english}
        title={item.title}
        intro={item.spec.hook}
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
      <div id="reading-theory">
        <BlockList
          topic={id}
          blocks={item.lesson.blocks.slice(0, 2)}
          sectionClass="a2-panel"
        />
      </div>
      <div id="reading-enhanced">
        <BlockList
          topic={id}
          start={2}
          blocks={item.lesson.blocks.slice(2)}
          sectionClass="a2-panel"
        />
      </div>
      <details
        className="a2-panel"
        id="reading-lab"
        onToggle={(event) => {
          if (event.currentTarget.open) setLabOpen(true);
        }}
      >
        <summary>打开课程实验</summary>
        <p>
          <Link
            to={
              item.spec.lab === "cryptography"
                ? "/lab/research?crypto=1&from=" + id
                : p4LabLink(item.lab.area, item.spec.lab, id)
            }
          >
            在实验室打开 ↗
          </Link>
        </p>
        {training && (
          <p>
            <Link to={p4LabLink("ml", training[0], id)}>{training[1]} ↗</Link>
          </p>
        )}
        {labOpen &&
          (item.spec.lab === "cryptography" ? (
            <Suspense fallback={<p role="status">加载 Web Crypto…</p>}>
              <Crypto />
            </Suspense>
          ) : (
            <Lab active={item.spec.lab} topic={id} />
          ))}
      </details>
      {item.programming && (
        <Suspense fallback={<p role="status">加载双栏代码…</p>}>
          <CodeComparison id={id} override={item.programming.pair} />
        </Suspense>
      )}
      <section className="a2-panel p1-exercises" id="reading-practice">
        <h2>练习与迁移</h2>
        {indexes.map((i) => {
          const task = item.base.exercises[i];
          const enabled = i !== 3 || practicePassed(record);
          return (
            <form
              key={i}
              onSubmit={(event) => {
                event.preventDefault();
                if (!enabled || !answers[i]!.trim()) return;
                const correct = gradeExercise(task, answers[i]!);
                setOutcomes((old) => {
                  const next = [...old];
                  next[i] = correct;
                  return next;
                });
                updateKnowledge((state) =>
                  gradeTopic(state, id, i, task, answers[i]!, Date.now()),
                );
              }}
            >
              <h3>{levels[i]}</h3>
              <p>
                <RichText text={task.prompt} />
              </p>
              <div className="row">
                <label className="sr-only" htmlFor={id + "-answer-" + i}>
                  {levels[i]}答案
                </label>
                <input
                  id={id + "-answer-" + i}
                  required
                  disabled={!enabled}
                  value={answers[i]}
                  onChange={(e) =>
                    setAnswers((old) =>
                      old.map((v, j) => (i === j ? e.target.value : v)),
                    )
                  }
                />
                <button
                  disabled={!enabled}
                  type="submit"
                  className="btn secondary"
                >
                  {i === 3 ? "核验掌握" : "检查答案"}
                </button>
              </div>
              {outcomes[i] !== undefined && (
                <p
                  role="status"
                  className={"feedback " + (outcomes[i] ? "ok" : "bad")}
                >
                  {outcomes[i]
                    ? task.explanation
                    : "请用本课定义与分步案例核对你的假设和计算。"}
                </p>
              )}
            </form>
          );
        })}
        {reasoning.length > 0 && (
          <details>
            <summary>结构化推理与独立变式</summary>
            {seededReasoning.has(id) && (
              <button
                className="btn secondary"
                type="button"
                onClick={() =>
                  setReasoningSeed((value) => (value >= 12 ? 1 : value + 1))
                }
              >
                换一组推理参数
              </button>
            )}
            {reasoning.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                last={data.questionBank?.[id]?.[question.id]?.lastCorrect}
                onAttempt={(response) => recordQuestion(question, response)}
              />
            ))}
          </details>
        )}
        {program && (
          <details>
            <summary>Python 判题与种子变式</summary>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setSeed(seed >= 10 ? 1 : seed + 1)}
            >
              换一组核验数据
            </button>
            <QuestionCard
              key={program.id}
              question={program}
              last={data.questionBank?.[id]?.[program.id]?.lastCorrect}
              onAttempt={(response) => recordQuestion(program, response)}
            />
          </details>
        )}
      </section>
      {deps.length > 0 && (
        <section className="a2-panel">
          <h2>先修与关联</h2>
          <Prerequisites targets={deps} />
        </section>
      )}
      {showAiLinks && (
        <details
          className="a2-panel"
          onToggle={(event) => {
            if (event.currentTarget.open) setTutorOpen(true);
          }}
        >
          <summary>AI 学习帮助</summary>
          {tutorOpen && (
            <Suspense fallback={<p role="status">加载导师…</p>}>
              <Tutor
                id={id}
                lesson={item}
                experiment={{
                  title: item.lab.title,
                  objective: item.lab.objective,
                }}
                initialOpen
              />
            </Suspense>
          )}
        </details>
      )}
      <nav className="study-nav" aria-label="相邻课时">
        {[seq[position - 1], seq[position + 1]].map(
          (neighbor, i) =>
            neighbor && (
              <Link
                className="btn secondary"
                key={neighbor}
                to={knowledgeLink(neighbor)}
              >
                {i ? "→ " : "← "}
                {findKnowledge(neighbor)?.title}
              </Link>
            ),
        )}
      </nav>
    </article>
  );
}
