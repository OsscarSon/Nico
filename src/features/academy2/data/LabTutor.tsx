import { lazy, Suspense, useState } from "react";
import { usePreferences } from "../../../preferences/store";

const Contents = lazy(() => import("./LabTutorContents"));

export default function LabTutor({
  topic,
  scenario,
  kind,
}: {
  topic?: string;
  scenario?: string;
  kind: "data" | "ml";
}) {
  const { showAiLinks } = usePreferences();
  const [opened, setOpened] = useState(false);
  if (!showAiLinks) return null;
  return (
    <details
      className="a2-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary>实验 AI 学习帮助</summary>
      {opened && (
        <Suspense fallback={<p role="status">加载实验导师…</p>}>
          <Contents topic={topic} scenario={scenario} kind={kind} />
        </Suspense>
      )}
    </details>
  );
}
