import type { Dispatch, SetStateAction } from "react";
import type { backendInterface } from "../backend";

export type FertilizerRarity = "common" | "rare" | "epic" | "legendary";

export interface FertilizerItem {
  id: string;
  rarity: FertilizerRarity;
  growthPower: number;
  soilStability: number;
  microbeBoost: number;
  quantity: number;
}

export interface FermentationProcess {
  id: string;
  animalWaste: number;
  soil: number;
  water: number;
  duration: number; // in seconds
  startTime: number; // timestamp ms
  completed: boolean;
  backendId?: string;
}

export type CropStateValue = "empty" | "planted" | "growing" | "readyToHarvest";

export interface PlotState {
  index: number;
  state: CropStateValue;
  cropType?: string;
  growthStartTime?: number;
  harvestTime?: number;
  fertilizerId?: string;
}

export interface BattleLogEntry {
  round: number;
  playerDmg: number;
  enemyDmg: number;
  playerHp: number;
  enemyHp: number;
  message: string;
}

export interface TransactionEntry {
  id: string;
  type: "earned" | "spent";
  amount: number;
  reason: string;
  timestamp: number;
}

export interface ActiveUpgrade {
  type: "speed_boost" | "mutation_booster" | "extra_plot";
  expiresAt?: number;
  remainingUses?: number;
}

export interface GameState {
  // Resources
  animalWaste: number;
  soil: number;
  water: number;

  // Economy
  soilBalance: number;
  transactions: TransactionEntry[];

  // Farm plots (local overlay)
  plots: PlotState[];

  // Fertilizer inventory
  fertilizers: FertilizerItem[];

  // Fermentation
  fermentations: FermentationProcess[];

  // Battle
  battleRoundCount: number; // total battles, jackpot every 6
  battlesWon: number;
  battlesLost: number;

  // Evolution
  evolutionMeter: number; // 0-100
  evolutionTier: number; // 1-5

  // Jackpot
  jackpotPool: number;

  // Daily limits
  lastResetDate: string;
  dailyCollections: number;
  dailyFermentations: number;
  dailyBattles: number;

  // Upgrades
  activeUpgrades: ActiveUpgrade[];

  // Tutorial
  tutorialStep: number; // 0 = not started, 1-10 = active, 11 = completed
  tutorialCompleted: boolean;
}

export const DAILY_LIMITS = {
  collections: 10,
  fermentations: 5,
  battles: 10,
};

export const RARITY_STATS: Record<
  FertilizerRarity,
  {
    growthPower: number;
    soilStability: number;
    microbeBoost: number;
    soilReward: number;
  }
> = {
  common: {
    growthPower: 10,
    soilStability: 10,
    microbeBoost: 5,
    soilReward: 5,
  },
  rare: {
    growthPower: 25,
    soilStability: 20,
    microbeBoost: 15,
    soilReward: 15,
  },
  epic: {
    growthPower: 50,
    soilStability: 40,
    microbeBoost: 30,
    soilReward: 30,
  },
  legendary: {
    growthPower: 100,
    soilStability: 80,
    microbeBoost: 60,
    soilReward: 75,
  },
};

export const RARITY_COLORS: Record<FertilizerRarity, string> = {
  common: "#9ba3af",
  rare: "#60a5fa",
  epic: "oklch(0.6 0.3 295)",
  legendary: "oklch(0.88 0.2 80)",
};

export const CROP_TYPES = [
  { name: "Wheat", emoji: "🌾", growTime: 60, soilReward: 5 },
  { name: "Carrot", emoji: "🥕", growTime: 90, soilReward: 8 },
  { name: "Mushroom", emoji: "🍄", growTime: 120, soilReward: 12 },
  { name: "Bio-Shroom", emoji: "✨", growTime: 180, soilReward: 20 },
];

export type SharedProps = {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  actor: backendInterface | null;
};
