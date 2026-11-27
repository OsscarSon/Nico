import { experiment, type SplitOptions } from "./ml";
import type { Table } from "./table";

self.onmessage = (
  message: MessageEvent<{ table: Table; options: SplitOptions }>,
) => {
  try {
    self.postMessage({
      result: experiment(message.data.table, message.data.options),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "训练失败。",
    });
  }
};
