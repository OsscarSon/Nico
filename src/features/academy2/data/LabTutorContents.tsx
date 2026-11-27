import { dataLessons, findDataLesson } from "../../../content/academy2/data";
import { labOf } from "../../../content/academy2/data/registry";
import TopicTutor from "../study/TopicTutor";

export default function LabTutorContents({
  topic,
  scenario,
  kind,
}: {
  topic?: string;
  scenario?: string;
  kind: "data" | "ml";
}) {
  const linked = topic ? findDataLesson(topic) : undefined;
  const item =
    linked && labOf(linked.course) === kind
      ? linked
      : (dataLessons.find(
          (lesson) =>
            labOf(lesson.course) === kind && lesson.material.lab === scenario,
        ) ?? findDataLesson(kind === "data" ? "fd-eda" : "k-bd44074776c9"));
  if (!item) return null;
  return (
    <TopicTutor
      id={item.id}
      lesson={item}
      experiment={{
        title: kind === "data" ? "Data Studio" : "ML Playground",
        objective: item.material.aim,
      }}
      initialOpen
    />
  );
}
