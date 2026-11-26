import type { ESim } from "../../grading/e-route/ids";
import type { FormulaTask } from "../../grading/e-route/formulaTasks";
import type { BenchKey } from "../../grading/e-route/bench";
import { FormulaLab } from "./FormulaLab";
import { CapstoneReport, EBench, NotebookLab, WorkflowLab } from "./Operations";
import type { P3Props } from "./presentation";

const formulas: Partial<Record<ESim, FormulaTask>> = {
  "sheet-types": "types", "sheet-references": "references", "sheet-conditions": "conditions", "sheet-lookup": "lookup", "sheet-dates": "dates",
};
const benches: Partial<Record<ESim, BenchKey>> = {
  "sheet-cleaning": "cleaning", "sheet-pivot": "pivot", "sheet-chart": "chart", "sheet-script": "script",
  "sheet-triggers": "triggers", "sheet-gemini": "gemini", "sheet-dashboard": "dashboard", "sheet-pipeline": "pipeline",
};

export function ERoute({ sim, ...props }: P3Props & { sim: ESim }) {
  const formula = formulas[sim], bench = benches[sim];
  if (formula) return <FormulaLab name={formula} {...props} />;
  if (bench) return <EBench name={bench} {...props} />;
  if (sim === "sheet-workflow") return <WorkflowLab {...props} />;
  if (sim === "sheet-notebook") return <NotebookLab {...props} />;
  return <CapstoneReport {...props} />;
}
