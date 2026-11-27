import { usePreferences } from "../../../preferences/store";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "../../../app/router";
import { EmptyState } from "../../../components/ui";
import { algorithmIds } from "../../../content/academy2/algorithms/registry";
import { findAlgorithmLesson } from "../../../content/academy2/algorithms";
import { algorithmCode } from "../../../content/academy2/algorithms/python";
import { dependenciesOf } from "../../../content/academy2/knowledgeGraph";
import { knowledgeLink } from "../../../content/academy2/knowledgeRegistry";
import { courseLink, getAcademyCourse } from "../../../content/academy2/model";
import type { Question } from "../../../content/academy2/teaching/schema";
import { modelById } from "../../../grading/academy2/algorithms";
import { algorithmVariant } from "../../../grading/academy2/algorithms/variants";
import {
  beginTopic,
  gradeExercise,
  gradeTopic,
  knowledgeStatus,
  practicePassed,
  recordIndependentVerification,
} from "../../../grading/academy2/p1/progress";
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
import { arenaLink } from "./navigation";
import { compareOutputs } from "../../../grading/academy2/p15/python";
import "../teaching/teaching.css";
import "./algorithms.css";

const Arena = lazy(() => import("./Arena"));
const TeachingPython = lazy(() => import("../teaching/TeachingPython"));
const TopicTutor = lazy(() => import("../study/TopicTutor"));
const names = ["概念与计算", "应用", "分析", "独立迁移核验"] as const;
const indexes = [0, 1, 2, 3] as const;

function PythonPair({
  code,
}: {
  code: NonNullable<ReturnType<typeof algorithmCode>>;
}) {
  const [open, setOpen] = useState(false);
  const [stdout, setStdout] = useState<(string | null)[]>([null, null]);
  function mark(i: number, value: string | null) {
    setStdout((previous) =>
      previous.map((output, index) => (index === i ? value : output)),
    );
  }
  return (
    <details
      className="a2-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpen(true);
      }}
    >
      <summary>运行两种 Python 实现 · {code.title}</summary>
      <p>
        修改时请给两栏相同的输入。相同的输出只说明这组输入下结果一致。两栏的时间复杂度可能不同。
      </p>
      {open && (
        <Suspense fallback={<p role="status">加载 Python 编辑器…</p>}>
          <div className="a2-two-col">
            {(["From Scratch", "Real-world Library"] as const).map(
              (title, i) => (
                <section key={title}>
                  <h3>{title}</h3>
                  <TeachingPython
                    initial={i === 0 ? code.scratch : code.library}
                    onChangeCode={() => mark(i, null)}
                    onResult={(result) =>
                      mark(
                        i,
                        result.error ||
                          result.stopped ||
                          result.timedOut ||
                          result.loadError ||
                          result.truncated
                          ? null
                          : result.stdout.trim() || null,
                      )
                    }
                  />
                </section>
              ),
            )}
          </div>
        </Suspense>
      )}
      <p role="status">
        {stdout[0] === null || stdout[1] === null
          ? "运行两栏后会比较标准输出。"
          : compareOutputs(stdout[0]!, stdout[1]!)
            ? "两次运行结果一致。"
            : "运行结果不同，请核查两栏输入和算法。"}
      </p>
    </details>
  );
}

export default function P2Lesson({ id }: { id: string }) {
  const { showAiLinks } = usePreferences();
  const item = findAlgorithmLesson(id);
  const { data, warning } = useKnowledgeProgress();
  const [focus, setFocus] = useState(false),
    [openLab, setOpenLab] = useState(false),
    [openTutor, setOpenTutor] = useState(false);
  const [seed, setSeed] = useState(1);
  const [variant, setVariant] = useState<Question>();
  const [verification, setVerification] = useState<Question>();
  const [programCheck, setProgramCheck] = useState<Question>();
  useEffect(() => {
    if (item) updateKnowledge((state) => beginTopic(state, id, Date.now()));
  }, [item, id]);
  if (!item)
    return (
      <EmptyState
        title="找不到算法课时"
        action={<Link to="/courses">回到课程</Link>}
      >
        可从课程目录继续。
      </EmptyState>
    );
  const course = getAcademyCourse(item.course)!;
  const module = course.modules.find((value) => value.id === item.module)!;
  const ids = algorithmIds(item.course),
    position = ids.indexOf(id),
    previous = ids[position - 1],
    next = ids[position + 1];
  const record = data.records[id],
    complete = practicePassed(record),
    attempts = data.questionBank?.[id];
  const model = modelById(item.material.model)!;
  const programming = algorithmCode(model.id);
  const canGenerate = Boolean(algorithmVariant(model.id, 1));
  function save(question: Question, response: Response, verify = false) {
    updateKnowledge((state) => {
      const result = evaluate(question, response);
      if (result.status !== "correct" && result.status !== "incorrect")
        return state;
      const now = Date.now();
      const updated = verify
        ? recordIndependentVerification(
            state,
            id,
            result.status === "correct",
            now,
          )
        : state;
      return {
        ...updated,
        questionBank: {
          ...updated.questionBank,
          [id]: recordAnswer(
            updated.questionBank?.[id] ?? {},
            question,
            response,
            now,
          ),
        },
      };
    });
  }
  return (
    <article
      className={
        "a2-page p1-page study-anchors p2-teaching" +
        (focus ? " study-focus" : "")
      }
    >
      <div className="a2-crumbs">
        <Link to={courseLink(item.course, item.module, item.title)}>
          {course.title}
        </Link>
        <span>/</span>
        <span>{module.title}</span>
      </div>
      <PageHeading
        title={item.title}
        english={item.material.term}
        intro="概念、算法过程、证明与核验"
      />
      <div className="row">
        <LearningStatus status={knowledgeStatus(record, Date.now())} />
        <span className="pill draft">草稿 · 尚未经真实试学</span>
      </div>
      {warning && <p role="status">{warning}</p>}
      <ReadingTools
        id={id}
        title={item.title}
        focus={focus}
        onFocus={() => setFocus(!focus)}
      />
      <div className="p1-teaching p2-reading" id="reading-theory">
        <BlockList
          blocks={item.lesson.blocks.slice(0, 1)}
          topic={id}
          sectionClass="a2-panel"
        />
      </div>
      <div className="p1-teaching p2-reading" id="reading-enhanced">
        <BlockList
          blocks={item.lesson.blocks.slice(1)}
          topic={id}
          sectionClass="a2-panel"
          start={1}
        />
      </div>
      {dependenciesOf(id).length > 0 && (
        <section className="a2-panel">
          <h2>先修与关联</h2>
          <Prerequisites targets={dependenciesOf(id)} />
        </section>
      )}
      <details
        className="a2-panel"
        id="reading-lab"
        onToggle={(event) => {
          if (event.currentTarget.open) setOpenLab(true);
        }}
      >
        <summary>课内实验 · {model.title}</summary>
        <p>先预测结果，执行到关键状态并比较，再改动一项输入检验预测。</p>
        {openLab && (
          <Suspense fallback={<p role="status">加载课内实验…</p>}>
            <Arena initial={model.id} fixed compare topic={id} />
          </Suspense>
        )}
        <Link to={arenaLink(model.id, id)}>在算法竞技场打开 ↗</Link>
      </details>
      {programming && <PythonPair code={programming} />}
      <section
        className="a2-panel p1-exercises p2-exercises"
        id="reading-practice"
      >
        <h2>练习与掌握核验</h2>
        <p>
          通过前三题记录完成。随后通过独立迁移题或独立参数核验，才会记录掌握。
        </p>
        {indexes.map((index) => (
          <CoreQuestion
            key={index}
            id={id}
            index={index}
            item={item}
            disabled={index === 3 && !complete}
            previous={
              (index === 3 ? record?.verification : record?.practice[index])
                ?.lastCorrect
            }
          />
        ))}
        {canGenerate && (
          <section>
            <h3>参数变式</h3>
            <p>
              先做练习变式，再开启独立核验。两套数据使用不同种子，完成练习变式不会授予掌握状态。
            </p>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setVariant(algorithmVariant(model.id, seed));
                setSeed(seed + 1);
                setVerification(undefined);
              }}
            >
              生成练习变式
            </button>
            {variant && (
              <QuestionCard
                key={variant.id}
                question={variant}
                last={attempts?.[variant.id]?.lastCorrect}
                onAttempt={(response) => save(variant, response)}
              />
            )}
            {variant && complete && attempts?.[variant.id]?.lastCorrect && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setVerification(
                    algorithmVariant(model.id, seed + 2000, true),
                  );
                  setSeed(seed + 1);
                }}
              >
                开启独立参数核验
              </button>
            )}
            {verification && (
              <QuestionCard
                key={verification.id}
                question={verification}
                last={attempts?.[verification.id]?.lastCorrect}
                onAttempt={(response) => save(verification, response, true)}
              />
            )}
          </section>
        )}
        {programming && (
          <details>
            <summary>打开 Python 编程任务</summary>
            <QuestionCard
              question={programming.question}
              last={attempts?.[programming.question.id]?.lastCorrect}
              onAttempt={(response) => save(programming.question, response)}
            />
            {complete && attempts?.[programming.question.id]?.lastCorrect && (
              <div>
                <p>
                  独立编程核验使用同一规格和两组新种子生成的输入。可用默认编辑框重新实现。
                </p>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    setProgramCheck(
                      algorithmCode(
                        model.id,
                        crypto.getRandomValues(new Uint32Array(1))[0]!,
                      )?.question,
                    )
                  }
                >
                  开启独立编程核验
                </button>
              </div>
            )}
            {programCheck && (
              <QuestionCard
                key={programCheck.id}
                question={programCheck}
                last={attempts?.[programCheck.id]?.lastCorrect}
                onAttempt={(response) => save(programCheck, response, true)}
              />
            )}
          </details>
        )}
      </section>
      {showAiLinks && (
        <details
          className="a2-panel"
          onToggle={(event) => {
            if (event.currentTarget.open) setOpenTutor(true);
          }}
        >
          <summary>AI 学习帮助</summary>
          {openTutor && (
            <Suspense fallback={<p role="status">加载导师…</p>}>
              <TopicTutor
                id={id}
                lesson={item}
                experiment={{
                  title: model.title,
                  objective: item.material.procedure,
                }}
              />
            </Suspense>
          )}
        </details>
      )}
      <nav className="study-nav" aria-label="相邻课时">
        {previous && (
          <Link className="btn secondary" to={knowledgeLink(previous)}>
            ← {findAlgorithmLesson(previous)?.title}
          </Link>
        )}
        {next ? (
          <Link className="btn secondary p1-next" to={knowledgeLink(next)}>
            继续学习 · {findAlgorithmLesson(next)?.title} ↗
          </Link>
        ) : (
          <Link className="btn secondary p1-next" to={"/projects/" + course.id}>
            打开实践项目 ↗
          </Link>
        )}
      </nav>
    </article>
  );
}

function CoreQuestion({
  id,
  index,
  item,
  disabled,
  previous,
}: {
  id: string;
  index: (typeof indexes)[number];
  item: NonNullable<ReturnType<typeof findAlgorithmLesson>>;
  disabled: boolean;
  previous?: boolean;
}) {
  const [value, setValue] = useState(""),
    [submitted, setSubmitted] = useState<boolean>();
  const exercise = item.base.exercises[index];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || !value.trim()) return;
        const change = (state: Parameters<typeof gradeTopic>[0]) =>
          gradeTopic(state, id, index, exercise, value, Date.now());
        const correct = gradeExercise(exercise, value);
        updateKnowledge(change);
        setSubmitted(correct);
      }}
    >
      <h3>
        {names[index]}
        {previous !== undefined && (
          <small> · {previous ? "已答对" : "待复核"}</small>
        )}
      </h3>
      <p>
        <RichText text={exercise.prompt} />
      </p>
      <div className="row">
        <label className="sr-only" htmlFor={"p2-answer-" + index}>
          {names[index]}答案
        </label>
        <input
          id={"p2-answer-" + index}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
          maxLength={200}
          disabled={disabled}
        />
        <button className="btn secondary" type="submit" disabled={disabled}>
          {index === 3 ? "核验掌握" : "检查答案"}
        </button>
      </div>
      {submitted !== undefined && (
        <p role="status" className={"feedback " + (submitted ? "ok" : "bad")}>
          {submitted ? (
            <RichText text={exercise.explanation} />
          ) : (
            "结果有出入。请确认数据约定、边界、下标或操作单位，再重做关键一步。"
          )}
        </p>
      )}
    </form>
  );
}
