import type { GameState } from "./types";

const STORAGE_KEY = "soillife_gamestate_v2";

export function loadGameState(): GameState {
  const today = new Date().toDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      // Ensure tutorial fields exist for saves that predate tutorial feature
      if (parsed.tutorialStep === undefined) parsed.tutorialStep = 0;
      if (parsed.tutorialCompleted === undefined)
        parsed.tutorialCompleted = false;
      // Reset daily counters if stale
      if (parsed.lastResetDate !== today) {
        return {
          ...parsed,
          lastResetDate: today,
          dailyCollections: 0,
          dailyFermentations: 0,
          dailyBattles: 0,
        };
      }
      return parsed;
    }
  } catch {
    // ignore parse errors
  }

  // Default initial state
  return {
    animalWaste: 50,
    soil: 50,
    water: 50,
    soilBalance: 100,
    transactions: [
      {
        id: "1",
        type: "earned",
        amount: 100,
        reason: "Welcome bonus",
        timestamp: Date.now() - 3600000,
      },
    ],
    plots: Array.from({ length: 6 }, (_, i) => ({
      index: i,
      state: "empty" as const,
    })),
    fertilizers: [
      {
        id: "f1",
        rarity: "common",
        growthPower: 10,
        soilStability: 10,
        microbeBoost: 5,
        quantity: 3,
      },
      {
        id: "f2",
        rarity: "rare",
        growthPower: 25,
        soilStability: 20,
        microbeBoost: 15,
        quantity: 1,
      },
    ],
    fermentations: [],
    battleRoundCount: 0,
    battlesWon: 0,
    battlesLost: 0,
    evolutionMeter: 12,
    evolutionTier: 1,
    jackpotPool: 450,
    lastResetDate: today,
    dailyCollections: 0,
    dailyFermentations: 0,
    dailyBattles: 0,
    activeUpgrades: [],
    tutorialStep: 0,
    tutorialCompleted: false,
  };
}

export function saveGameState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}
