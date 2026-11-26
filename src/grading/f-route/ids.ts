export const fSims = [
  "hardware-circuit", "hardware-io", "hardware-arduino", "hardware-signals",
  "hardware-reading", "hardware-motors", "hardware-bus", "hardware-rover",
] as const;
export type FSim = typeof fSims[number];
export const isFSim = (sim: string): sim is FSim => fSims.some(s => s === sim);
