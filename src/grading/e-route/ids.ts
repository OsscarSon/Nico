export const eSims = [
  "sheet-types", "sheet-references", "sheet-conditions", "sheet-lookup", "sheet-dates",
  "sheet-cleaning", "sheet-pivot", "sheet-chart", "sheet-script", "sheet-triggers",
  "sheet-workflow", "sheet-gemini", "sheet-notebook", "sheet-dashboard", "sheet-pipeline", "sheet-report",
] as const;
export type ESim = typeof eSims[number];
export const isESim = (value: string): value is ESim => eSims.some(sim => sim === value);
