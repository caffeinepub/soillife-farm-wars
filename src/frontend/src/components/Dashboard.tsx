import { Progress } from "@/components/ui/progress";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { TabId } from "./tabTypes";
import type { GameState, SharedProps } from "./types";
import { DAILY_LIMITS } from "./types";

type Props = SharedProps & {
  principal: string;
  onNavigate: (tab: TabId) => void;
};

const TIER_LABELS = [
  "Seedling",
  "Sprout",
  "Sapling",
  "Grove",
  "Ancient Forest",
];
const RESOURCE_MAX = 200;

function StatCard({
  label,
  value,
  icon,
  glowClass,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  glowClass: string;
  sub?: string;
}) {
  return (
    <div className={`game-card ${glowClass} p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="font-pixel text-base text-glow-gold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ResourceBar({
  label,
  emoji,
  value,
  max,
}: {
  label: string;
  emoji: string;
  value: number;
  max: number;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span>
          {emoji} {label}
        </span>
        <span className="text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              label === "Water"
                ? "oklch(0.85 0.18 198)"
                : label === "Soil"
                  ? "oklch(0.55 0.1 50)"
                  : "oklch(0.6 0.18 40)",
          }}
        />
      </div>
    </div>
  );
}

export default function Dashboard({
  gameState,
  setGameState,
  principal,
  onNavigate,
}: Props) {
  const [collectingIndex, setCollectingIndex] = useState<number | null>(null);

  const collectionsLeft = DAILY_LIMITS.collections - gameState.dailyCollections;
  const battlesUntilJackpot = 6 - (gameState.battleRoundCount % 6);

  const handleCollect = async (resourceIdx: number) => {
    if (collectionsLeft <= 0) {
      toast.error("Daily collection limit reached! Come back tomorrow.");
      return;
    }
    setCollectingIndex(resourceIdx);
    await new Promise((r) => setTimeout(r, 500));

    const resources: (keyof GameState)[] = ["animalWaste", "soil", "water"];
    const key = resources[resourceIdx];
    const current = gameState[key] as number;
    if (current >= RESOURCE_MAX) {
      toast.error(
        `${["Animal Waste", "Soil", "Water"][resourceIdx]} storage is full!`,
      );
      setCollectingIndex(null);
      return;
    }
    const gain = Math.min(10, RESOURCE_MAX - current);
    setGameState((prev) => ({
      ...prev,
      [key]: Math.min(RESOURCE_MAX, (prev[key] as number) + gain),
      dailyCollections: prev.dailyCollections + 1,
    }));
    toast.success(
      `+${gain} ${["🐄 Animal Waste", "🪨 Soil", "💧 Water"][resourceIdx]} collected!`,
    );
    setCollectingIndex(null);
  };

  return (
    <div className="space-y-5" data-ocid="dashboard.section">
      {/* Player header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-card game-card-cyan p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-lg bg-[oklch(0.18_0.04_141)] flex items-center justify-center text-3xl border-2 border-[oklch(0.85_0.3_141_/_0.5)]">
            🧑‍🌾
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[oklch(0.85_0.3_141)] rounded-full flex items-center justify-center text-[8px] font-bold text-black">
            {gameState.evolutionTier}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">FARMER</p>
          <h2 className="font-pixel text-sm text-glow-cyan">{principal}</h2>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span>
              ⚔️ {gameState.battlesWon}W / {gameState.battlesLost}L
            </span>
            <span>
              🌾{" "}
              {
                gameState.transactions.filter((t) =>
                  t.reason.includes("Harvest"),
                ).length
              }{" "}
              Harvests
            </span>
            <span>
              ✨ Tier {gameState.evolutionTier}:{" "}
              {TIER_LABELS[gameState.evolutionTier - 1]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">SOIL BALANCE</p>
          <p className="font-pixel text-xl text-glow-gold">
            💰 {gameState.soilBalance.toLocaleString()}
          </p>
        </div>
      </motion.div>

      {/* 4-panel stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Battles Won"
          value={gameState.battlesWon}
          icon="⚔️"
          glowClass="game-card-green"
          sub={`${gameState.dailyBattles}/${DAILY_LIMITS.battles} today`}
        />
        <StatCard
          label="Fertilizers"
          value={gameState.fertilizers.reduce((s, f) => s + f.quantity, 0)}
          icon="🧪"
          glowClass="game-card-purple"
          sub={`${gameState.fertilizers.length} types`}
        />
        <StatCard
          label="Jackpot Pool"
          value={`${gameState.jackpotPool} 💰`}
          icon="🏆"
          glowClass="game-card-gold"
          sub={`${battlesUntilJackpot} battles left`}
        />
        <StatCard
          label="Soil Evolution"
          value={`${gameState.evolutionMeter}%`}
          icon="🌿"
          glowClass="game-card-cyan"
          sub={`Tier ${gameState.evolutionTier}/5`}
        />
      </div>

      {/* Resources — data-tutorial marks this section for spotlight */}
      <div
        className="game-card game-card-green p-5"
        data-tutorial="resource-area"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header">Resources</h3>
          <span className="text-xs text-muted-foreground">
            {collectionsLeft}/{DAILY_LIMITS.collections} collections left today
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <ResourceBar
            label="Animal Waste"
            emoji="🐄"
            value={gameState.animalWaste}
            max={RESOURCE_MAX}
          />
          <ResourceBar
            label="Soil"
            emoji="🪨"
            value={gameState.soil}
            max={RESOURCE_MAX}
          />
          <ResourceBar
            label="Water"
            emoji="💧"
            value={gameState.water}
            max={RESOURCE_MAX}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["🐄 Animal Waste", "🪨 Soil", "💧 Water"].map((label, i) => (
            <button
              type="button"
              key={label}
              className="btn-neon-green py-2 rounded-md text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleCollect(i)}
              disabled={collectingIndex !== null || collectionsLeft <= 0}
              data-ocid={`dashboard.collect_${["waste", "soil", "water"][i]}.button`}
              data-tutorial={
                ["resource-waste", "resource-soil", "resource-water"][i]
              }
            >
              {collectingIndex === i ? "..." : `+${label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Evolution + Jackpot row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evolution Meter */}
        <div className="game-card game-card-cyan p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🌿</span>
            <h3 className="section-header">Soil Evolution</h3>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-glow-cyan">
              Tier {gameState.evolutionTier}:{" "}
              {TIER_LABELS[gameState.evolutionTier - 1]}
            </span>
            <span className="text-muted-foreground">
              {gameState.evolutionMeter}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700 progress-gradient"
              style={{ width: `${gameState.evolutionMeter}%` }}
            />
          </div>
          <div className="grid grid-cols-5 gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((tier) => (
              <div
                key={tier}
                className={`text-center rounded py-1 text-[9px] font-pixel border ${
                  tier <= gameState.evolutionTier
                    ? "border-[oklch(0.85_0.3_141)] text-glow-green bg-[oklch(0.85_0.3_141_/_0.1)]"
                    : "border-border text-muted-foreground"
                }`}
              >
                T{tier}
              </div>
            ))}
          </div>
        </div>

        {/* Jackpot countdown */}
        <div className="game-card game-card-gold p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl animate-float">🏆</span>
            <h3 className="section-header">Jackpot Countdown</h3>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <div className="font-pixel text-3xl text-glow-gold">
                {battlesUntilJackpot}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                battles left
              </div>
            </div>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((6 - battlesUntilJackpot) / 6) * 100}%`,
                    background:
                      "linear-gradient(90deg, oklch(0.82 0.18 80), oklch(0.65 0.25 22))",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Battle {gameState.battleRoundCount % 6}/6</span>
                <span>Pool: 💰 {gameState.jackpotPool}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded bg-[oklch(0.82_0.18_80_/_0.1)] border border-[oklch(0.82_0.18_80_/_0.3)]">
            <span className="text-2xl">🎁</span>
            <div className="text-xs">
              <p className="text-glow-gold font-semibold">
                ROUND {Math.floor(gameState.battleRoundCount / 6) + 1} JACKPOT
              </p>
              <p className="text-muted-foreground">
                Win battle #
                {gameState.battleRoundCount -
                  (gameState.battleRoundCount % 6) +
                  6}{" "}
                to claim!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action strip */}
      <div className="game-card p-4">
        <h3 className="section-header mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: "Go Farm",
              emoji: "🌾",
              tab: "farm" as TabId,
              glow: "btn-neon-green",
            },
            {
              label: "Brew Lab",
              emoji: "🧪",
              tab: "lab" as TabId,
              glow: "btn-neon-purple",
            },
            {
              label: "Battle!",
              emoji: "⚔️",
              tab: "battle" as TabId,
              glow: "btn-neon-green",
            },
            {
              label: "Wallet",
              emoji: "💰",
              tab: "wallet" as TabId,
              glow: "btn-neon-purple",
            },
          ].map(({ label, emoji, tab, glow }) => (
            <button
              type="button"
              key={tab}
              className={`${glow} py-3 rounded-md text-xs cursor-pointer flex items-center justify-center gap-1.5`}
              onClick={() => onNavigate(tab)}
              data-ocid={`dashboard.goto_${tab}.button`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily limits */}
      <div className="game-card p-4">
        <h3 className="section-header mb-3">Daily Limits</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Collections",
              used: gameState.dailyCollections,
              max: DAILY_LIMITS.collections,
              emoji: "📦",
            },
            {
              label: "Fermentations",
              used: gameState.dailyFermentations,
              max: DAILY_LIMITS.fermentations,
              emoji: "🧪",
            },
            {
              label: "Battles",
              used: gameState.dailyBattles,
              max: DAILY_LIMITS.battles,
              emoji: "⚔️",
            },
          ].map(({ label, used, max, emoji }) => (
            <div key={label} className="text-center">
              <div className="text-xl mb-1">{emoji}</div>
              <Progress value={(used / max) * 100} className="h-2 mb-1" />
              <p className="text-[10px] text-muted-foreground">
                {label}: {used}/{max}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
