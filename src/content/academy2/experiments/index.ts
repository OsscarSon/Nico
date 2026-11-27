import { mathExperiments } from "./math";
import { statExperiments } from "./statistics";

export const experiments = { math: mathExperiments, statistics: statExperiments };
export const topicExperiments = (id: string) =>
  Object.entries(experiments).flatMap(([domain, list]) =>
    list
      .filter((experiment) => experiment.topic === id)
      .map((experiment) => ({
        title: experiment.title,
        path: "/lab/" + domain + "?experiment=" + experiment.id + "&from=" + id,
        objective: experiment.objective,
      })),
  );
