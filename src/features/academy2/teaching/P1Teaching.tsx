import { lazy,Suspense } from "react";
import { extendedQuestions } from "../../../content/academy2/teaching/p1/variants";
import VariantQuestions from "./VariantQuestions";
import { findP1Lesson } from "../../../content/academy2/p1";
import { Link } from "../../../app/router";
import { topicExperiments } from "../../../content/academy2/experiments";
import TopicTutor from "../study/TopicTutor";
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

const CodeComparison=lazy(()=>import("./CodeComparison"));

const widgets = { "probability-tree": () => <ProbabilityTree /> };

export default function P1Teaching({ id }: { id: string }) {
  const lesson = enhanceLesson(id);
  const { data } = useKnowledgeProgress();
  const record = data.questionBank?.[lesson.id];
  const linked=topicExperiments(id);
  const questions=[...lesson.questions,...(extendedQuestions[id]??[])];
  const summary = summarizeBank(questions, record);
  const prior=data.records[id];
  const main=prior?.practice.filter(item=>item?.lastCorrect).length??0;
  const legacy=findP1Lesson(id);
  return (
    <div className="teaching-engine">
      <div className="a2-panel">
        <BlockList blocks={lesson.blocks} widgets={widgets} topic={id} />
      </div>
      {linked.length>0&&<div className="a2-quick-links">{linked.map(item=><Link to={item.path} key={item.path}>{item.title} ↗</Link>)}</div>}
      <TopicTutor id={id} experiment={linked[0]}/>
      <Suspense fallback={null}><CodeComparison id={id}/></Suspense>
      <VariantQuestions id={id}/>
      {questions.length > 0 && (
        <details className="a2-panel p1-inside p1-exercises teaching-bank">
          <summary>进阶题库 · {questions.length} 题</summary>
          <p aria-live="polite">
            判分题已答对 {summary.passed} / {summary.scored} · 待复核{" "}
            {summary.needsReview} · 开放题 {summary.open}
          </p>
          <p>
            主练习已答对 {main} / {legacy?.exercises.length?3:0} · 独立核验 {prior?.verification?.lastCorrect?"通过":"待完成"}。完成主练习后可用迁移题或参数变式核验掌握。
          </p>
          {questions.map((question) => (
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
