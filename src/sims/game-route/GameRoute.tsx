import type { GameRouteSim } from "../../grading/game-route/ids";
import type { BenchKey } from "../../grading/game-route/bench";
import type { P3Props } from "../p3aShared";
import { BenchLab } from "./BenchLab";
import { DeliveryLab, FallLab, FeedbackLab, RoundLab } from "./StateLabs";

const benchBySim: Record<Exclude<GameRouteSim, "game-gravity" | "game-state" | "game-feedback" | "game-delivery">, BenchKey> = {
  "game-collision": "collision",
  "game-editor": "editor",
  "game-components": "components",
  "game-csharp": "scripting",
  "game-physics": "physics",
  "game-hud": "hud",
  "game-assets": "assets",
  "game-release": "release",
};

export function GameRoute({ sim, ...props }: P3Props & { sim: GameRouteSim }) {
  switch (sim) {
    case "game-gravity": return <FallLab {...props} />;
    case "game-state": return <RoundLab {...props} />;
    case "game-feedback": return <FeedbackLab {...props} />;
    case "game-delivery": return <DeliveryLab {...props} />;
    default: return <BenchLab name={benchBySim[sim]} {...props} />;
  }
}
