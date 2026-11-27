import { fundamentals } from "./fundamentals";
import { graphModels } from "./graphs";
import { structureModels } from "./structures";
import { designModels } from "./design";
import { theoryModels } from "./theory";
export const arenaModels = [
  ...fundamentals,
  ...graphModels,
  ...structureModels,
  ...designModels,
  ...theoryModels,
];
export const modelById = (id: string) =>
  arenaModels.find((model) => model.id === id);
