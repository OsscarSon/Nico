export const gameRouteSims = [
  "game-collision", "game-gravity", "game-state", "game-feedback",
  "game-editor", "game-components", "game-csharp", "game-physics",
  "game-hud", "game-assets", "game-release", "game-delivery",
] as const;
export type GameRouteSim = (typeof gameRouteSims)[number];
export const isGameRouteSim = (sim: string): sim is GameRouteSim => gameRouteSims.some(id => id === sim);
