import { enhanceLesson } from "../../../content/academy2/teaching/p1";
import {
  recordAnswer,
  summarizeBank,
} from "../../../grading/academy2/teaching/questions";
import {
  updateKnowledge,
  useKnowledgeProgress,
} from "../../../progress/knowledge";
import { BlockList } from "./TeachingBlocks";
import { QuestionCard } from "./QuestionBank";
import { ProbabilityTree } from "./ProbabilityTree";
import "./teaching.css";

const widgets = { "probability-tree": () => <ProbabilityTree /> };

export default function P1Teaching({ id }: { id: string }) {
  const lesson = enhanceLesson(id);
  const { data } = useKnowledgeProgress();
  const record = data.questionBank?.[lesson.id];
  const summary = summarizeBank(lesson.questions, record);
  return (
    <div className="teaching-engine">
      <div className="a2-panel">
        <BlockList blocks={lesson.blocks} widgets={widgets} />
      </div>
      {lesson.questions.length > 0 && (
        <details className="a2-panel p1-inside p1-exercises teaching-bank">
          <summary>进阶题库 · {lesson.questions.length} 题</summary>
          <p aria-live="polite">
            判分题已答对 {summary.passed} / {summary.scored} · 待复核{" "}
            {summary.needsReview} · 开放题 {summary.open}
          </p>
          <p>
            题库单独保存答题记录。课时的完成和掌握继续由主练习与迁移核验记录。
          </p>
          {lesson.questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              last={record?.[question.id]?.lastCorrect}
              onAttempt={(response) =>
                updateKnowledge((state) => {
                  const before = state.questionBank?.[lesson.id] ?? {};
                  const after = recordAnswer(
                    before,
                    question,
                    response,
                    Date.now(),
                  );
                  return after === before
                    ? state
                    : {
                        ...state,
                        questionBank: {
                          ...state.questionBank,
                          [lesson.id]: after,
                        },
                      };
                })
              }
            />
          ))}
        </details>
      )}
    </div>
  );
}
