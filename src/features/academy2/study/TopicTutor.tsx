import { useState } from "react";
import { askAi } from "../../../ai/client";
import { aiEnabled } from "../../../ai/config";
import { buildTopicContext, type TutorMode } from "../../../ai/topicContext";
import { LIMITS, type AiResult } from "../../../ai/protocol";
import { AiBox } from "../../../components/AiLabel";
import { Markdown } from "../../../ai/markdown";
import { findP1Lesson } from "../../../content/academy2/p1";
import { enhanceLesson } from "../../../content/academy2/teaching/p1";
import { findKnowledge } from "../../../content/academy2/knowledgeRegistry";
import { usePreferences } from "../../../preferences/store";
import { AiError } from "../../prompt-lab/AiError";

const templates: Record<TutorMode, string> = {
  解释知识: "用一个新例子解释概念，并说明在哪些条件下适用。",
  解释推导: "说明应从哪一定义开始，以及每一步的重要依据。",
  答题提示: "请只给第一步的提示与自检方向，保留解答机会。",
};
export default function TopicTutor({
  id,
  experiment,
}: {
  id: string;
  experiment?: { title: string; objective: string };
}) {
  const [mode, setMode] = useState<TutorMode>("解释知识");
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiResult>();
  const prefs = usePreferences();
  const legacy = findP1Lesson(id),
    location = findKnowledge(id);
  if (!legacy || !location || !prefs.showAiLinks) return null;
  return (
    <details className="a2-panel study-tutor">
      <summary>课内 AI 导师</summary>
      {aiEnabled() ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setResult(undefined);
            try {
              setResult(
                await askAi({
                  kind: "tutor",
                  lessonTitle: location.title,
                  context: buildTopicContext(legacy, enhanceLesson(id), mode, experiment),
                  question: (templates[mode] + " " + question.trim()).slice(0, LIMITS.question),
                }),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            帮助方式
            <select value={mode} onChange={(e) => setMode(e.target.value as TutorMode)}>
              {Object.keys(templates).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            补充问题
            <textarea
              rows={3}
              maxLength={LIMITS.question - 70}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <p>只发送你填写的问题和公开教学上下文。笔记、提交答案和成绩保留在本机。</p>
          <button className="btn secondary" disabled={busy} type="submit">
            {busy ? "正在请求…" : "向 AI 导师提问"}
          </button>
        </form>
      ) : (
        <p>当前环境未配置 AI。仍可查看推导、练习反馈和实验。</p>
      )}
      {result?.ok && result.kind === "tutor" && (
        <AiBox title="AI 生成" model={result.model}>
          <Markdown text={result.text} />
        </AiBox>
      )}
      {result && !result.ok && <AiError error={result} />}
    </details>
  );
}
