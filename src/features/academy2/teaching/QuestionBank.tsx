import { useId, useState, type FormEvent } from "react";
import type { Question } from "../../../content/academy2/teaching/schema";
import {
  evaluate,
  type Response,
} from "../../../grading/academy2/teaching/questions";
import { RichText } from "./math";

const captions = {
  concept: "概念",
  calculation: "计算",
  application: "应用",
  analysis: "分析",
  transfer: "迁移",
};
export function QuestionCard({
  question,
  last,
  onAttempt,
}: {
  question: Question;
  last?: boolean;
  onAttempt?: (response: Response) => void;
}) {
  const [submitted, setSubmitted] = useState<ReturnType<typeof evaluate>>();
  const [response, setResponse] = useState<Response>("");
  const name = useId();
  function handle(event: FormEvent) {
    event.preventDefault();
    const result = evaluate(question, response);
    setSubmitted(result);
    if (result.status === "correct" || result.status === "incorrect")
      onAttempt?.(response);
  }
  return (
    <form onSubmit={handle}>
      <fieldset>
        <legend>
          {captions[question.level]}
          {last !== undefined && <small> · {last ? "已答对" : "待复核"}</small>}
        </legend>
        <p id={name + "-prompt"}>
          <RichText text={question.prompt} />
        </p>
        {question.type === "number" && (
          <p>
            <small>
              可输入小数{question.allowFraction ? "或分数" : ""}
              {question.allowPercent ? "，也可输入百分比" : ""}。
            </small>
          </p>
        )}
        {question.type === "multi" ? (
          question.options.map((option) => (
            <label className="teaching-option" key={option.id}>
              <input
                type="checkbox"
                name={name}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setResponse((current) => {
                    const ids = Array.isArray(current) ? current : [];
                    return checked
                      ? [...ids, option.id]
                      : ids.filter((id) => id !== option.id);
                  });
                }}
              />
              <RichText text={option.label} />
            </label>
          ))
        ) : question.type === "single" ? (
          question.options.map((option) => (
            <label className="teaching-option" key={option.id}>
              <input
                required
                type="radio"
                name={name}
                onChange={() => setResponse(option.id)}
              />
              <RichText text={option.label} />
            </label>
          ))
        ) : question.type === "boolean" ? (
          [true, false].map((value) => (
            <label className="teaching-option" key={String(value)}>
              <input
                required
                type="radio"
                name={name}
                onChange={() => setResponse(value)}
              />
              {value ? "正确" : "错误"}
            </label>
          ))
        ) : question.type === "open" ? (
          <textarea
            required
            rows={4}
            maxLength={4000}
            aria-label="写下你的论证"
            aria-describedby={name + "-prompt"}
            onChange={(event) => setResponse(event.target.value)}
          />
        ) : (
          <input
            required
            maxLength={350}
            aria-label={
              question.type === "vector" ? "向量答案，用逗号分隔" : "答案"
            }
            aria-describedby={name + "-prompt"}
            onChange={(event) => setResponse(event.target.value)}
          />
        )}
      </fieldset>
      <button className="btn secondary" type="submit">
        {question.type === "open" ? "按检查点自行复核" : "提交答案"}
      </button>
      {submitted && (
        <div
          className={
            "feedback " +
            (submitted.status === "correct"
              ? "ok"
              : submitted.status === "review"
                ? ""
                : "bad")
          }
          role="status"
        >
          <RichText text={submitted.message} />
          {submitted.status === "review" && question.type === "open" && (
            <ul>
              {question.checkpoints.map((point) => (
                <li key={point}>
                  <RichText text={point} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
