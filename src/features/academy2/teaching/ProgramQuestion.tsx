import { useRef, useState } from "react";
import type { Question } from "../../../content/academy2/teaching/schema";
import { evaluate, type Response } from "../../../grading/academy2/teaching/questions";
import { parseProgramOutput, programHarness } from "../../../grading/academy2/p15/python";
import TeachingPython from "./TeachingPython";

export default function ProgramQuestion({
  question,
  onAttempt,
  last,
}: {
  question: Extract<Question, { type: "program" }>;
  onAttempt?: (value: Response) => void;
  last?: boolean;
}) {
  const tag = useRef(""),
    [message, setMessage] = useState("");
  return (
    <section className="study-program">
      <h3>编程题 {last && <small>· 已通过</small>}</h3>
      <p>{question.prompt}</p>
      <TeachingPython
        initial={question.starter}
        button="运行并检查代码"
        onChangeCode={() => setMessage("")}
        transform={(code) => {
          tag.current = "NICO-" + crypto.randomUUID();
          return programHarness(code, question, tag.current);
        }}
        onResult={(result) => {
          if (result.loadError || result.timedOut || result.stopped || result.error) {
            setMessage("本次没有完成全部测试。检查运行错误后重试。");
            return;
          }
          const response = parseProgramOutput(result.stdout, tag.current);
          if (!response) {
            setMessage("请返回有限的数值。");
            return;
          }
          const outcome = evaluate(question, response);
          setMessage(
            outcome.status === "correct"
              ? "已通过 " + question.cases.length + " 组运行核验。"
              : outcome.message,
          );
          onAttempt?.(response);
        }}
      />
      {message && <p role="status">{message}</p>}
    </section>
  );
}
