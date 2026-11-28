import { experiment, type Evaluation, type SplitOptions } from "./ml";
import type { Table } from "./table";

self.onmessage = (
  message: MessageEvent<{
    table: Table;
    options: SplitOptions;
    evaluation: Evaluation;
  }>,
) => {
  try {
    self.postMessage({
      result: experiment(
        message.data.table,
        message.data.options,
        message.data.evaluation,
      ),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "训练失败。",
    });
  }
};
