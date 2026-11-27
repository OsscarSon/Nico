import { useState } from "react";
import { createVariant } from "../../../content/academy2/teaching/p1/variants";
import { practicePassed, recordIndependentVerification } from "../../../grading/academy2/p1/progress";
import { evaluate, recordAnswer } from "../../../grading/academy2/teaching/questions";
import { updateKnowledge, useKnowledgeProgress } from "../../../progress/knowledge";
import { QuestionCard } from "./QuestionBank";

const random = () => crypto.getRandomValues(new Uint32Array(1))[0]! % 7;
export default function VariantQuestions({ id }: { id: string }) {
  const [seed, setSeed] = useState(random),
    [passed, setPassed] = useState(false);
  const { data } = useKnowledgeProgress();
  const first = createVariant(id, seed),
    verify = createVariant(id, (seed + 3) % 7, true);
  if (!first || !verify) return null;
  return (
    <details className="a2-panel p1-inside p1-exercises">
      <summary>参数变式与独立核验</summary>
      <p>先解一道随机参数题。完成三个主练习后，用不同参数独立核验掌握。</p>
      <button
        className="btn secondary"
        type="button"
        onClick={() => {
          setSeed((seed + 1 + (random() % 6)) % 7);
          setPassed(false);
        }}
      >
        换一组参数
      </button>
      <QuestionCard
        key={seed}
        question={first}
        onAttempt={(response) => {
          setPassed(evaluate(first, response).status === "correct");
          updateKnowledge((state) => {
            const bank = recordAnswer(state.questionBank?.[id] ?? {}, first, response, Date.now());
            return { ...state, questionBank: { ...state.questionBank, [id]: bank } };
          });
        }}
      />
      {passed && practicePassed(data.records[id]) && (
        <QuestionCard
          key={"verify-" + seed}
          question={verify}
          onAttempt={(response) => {
            const result = evaluate(verify, response);
            if (result.status === "correct" || result.status === "incorrect")
              updateKnowledge((state) => {
                const at = Date.now(),
                  updated = recordIndependentVerification(state, id, result.status === "correct", at);
                return {
                  ...updated,
                  questionBank: {
                    ...updated.questionBank,
                    [id]: recordAnswer(updated.questionBank?.[id] ?? {}, verify, response, at),
                  },
                };
              });
          }}
        />
      )}
    </details>
  );
}
