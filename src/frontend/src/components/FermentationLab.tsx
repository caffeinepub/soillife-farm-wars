import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  FermentationProcess,
  FertilizerRarity,
  SharedProps,
} from "./types";
import { DAILY_LIMITS, RARITY_STATS } from "./types";

type Duration = "quick" | "normal" | "extended";

const DURATION_CONFIG: Record<
  Duration,
  {
    label: string;
    seconds: number;
    emoji: string;
    odds: Record<FertilizerRarity, number>;
  }
> = {
  quick: {
    label: "Quick (1 min)",
    seconds: 60,
    emoji: "⚡",
    odds: { common: 70, rare: 20, epic: 8, legendary: 2 },
  },
  normal: {
    label: "Normal (5 min)",
    seconds: 300,
    emoji: "⏳",
    odds: { common: 50, rare: 30, epic: 15, legendary: 5 },
  },
  extended: {
    label: "Extended (15 min)",
    seconds: 900,
    emoji: "✨",
    odds: { common: 30, rare: 35, epic: 25, legendary: 10 },
  },
};

const RARITY_COLORS: Record<FertilizerRarity, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-400",
  epic: "text-glow-purple",
  legendary: "text-glow-gold",
};

const RARITY_BORDER: Record<FertilizerRarity, string> = {
  common: "border-border",
  rare: "border-blue-500/50",
  epic: "border-purple-500/50",
  legendary: "border-yellow-500/50",
};

function rollRarity(odds: Record<FertilizerRarity, number>): FertilizerRarity {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const rarity of [
    "common",
    "rare",
    "epic",
    "legendary",
  ] as FertilizerRarity[]) {
    cumulative += odds[rarity];
    if (rand < cumulative) return rarity;
  }
  return "common";
}

function FermentationTimer({
  startTime,
  duration,
}: { startTime: number; duration: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setRemaining(Math.max(0, duration - elapsed));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [startTime, duration]);

  const pct = Math.min(100, ((duration - remaining) / duration) * 100);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return (
    <div className="flex-1">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-muted-foreground">Progress</span>
        <span
          className={
            remaining <= 0 ? "text-glow-green" : "text-muted-foreground"
          }
        >
          {remaining <= 0
            ? "READY!"
            : `${mins}:${secs.toString().padStart(2, "0")}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 progress-gradient"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function FermentationLab({
  gameState,
  setGameState,
  actor,
}: SharedProps) {
  const [waste, setWaste] = useState(10);
  const [soil, setSoil] = useState(10);
  const [water, setWater] = useState(10);
  const [duration, setDuration] = useState<Duration>("normal");
  const [brewing, setBrewing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Tutorial mode: override duration to 8 seconds
  const isTutorialStep3 = gameState.tutorialStep === 3;

  const fermsLeft = DAILY_LIMITS.fermentations - gameState.dailyFermentations;
  const config = DURATION_CONFIG[duration];

  const checkReady = useCallback((ferm: FermentationProcess) => {
    const elapsed = (Date.now() - ferm.startTime) / 1000;
    return elapsed >= ferm.duration;
  }, []);

  const handleStartFermentation = async () => {
    if (fermsLeft <= 0) {
      toast.error("Daily fermentation limit reached!");
      return;
    }
    if (waste > gameState.animalWaste) {
      toast.error("Not enough Animal Waste!");
      return;
    }
    if (soil > gameState.soil) {
      toast.error("Not enough Soil!");
      return;
    }
    if (water > gameState.water) {
      toast.error("Not enough Water!");
      return;
    }
    setBrewing(true);

    // In tutorial step 3, use 8 second duration
    const effectiveSeconds = isTutorialStep3 ? 8 : config.seconds;

    const id = Date.now().toString();
    let backendId: string | undefined;

    if (actor) {
      try {
        const bid = await actor.startFermentation(
          BigInt(waste),
          BigInt(soil),
          BigInt(water),
          BigInt(effectiveSeconds),
        );
        backendId = bid.toString();
      } catch {
        // continue with local state
      }
    }

    const newFerm: FermentationProcess = {
      id,
      animalWaste: waste,
      soil,
      water,
      duration: effectiveSeconds,
      startTime: Date.now(),
      completed: false,
      backendId,
    };

    setGameState((prev) => ({
      ...prev,
      animalWaste: prev.animalWaste - waste,
      soil: prev.soil - soil,
      water: prev.water - water,
      fermentations: [newFerm, ...prev.fermentations],
      dailyFermentations: prev.dailyFermentations + 1,
    }));
    toast.success(
      isTutorialStep3
        ? "🧪 Tutorial fermentation started! (8 sec)"
        : `🧪 Fermentation started! ${config.label}`,
    );
    setBrewing(false);
  };

  const handleComplete = async (ferm: FermentationProcess) => {
    if (!checkReady(ferm)) {
      toast.error("Not ready yet!");
      return;
    }
    setCompleting(ferm.id);

    const rarity = rollRarity(config.odds);
    const stats = RARITY_STATS[rarity];
    const newFertId = `f${Date.now()}`;

    let backendFertId: bigint | undefined;
    if (actor) {
      try {
        const rid = await actor.createFertilizer(
          rarity as any,
          BigInt(stats.growthPower),
          BigInt(stats.soilStability),
          BigInt(stats.microbeBoost),
        );
        backendFertId = rid;
        if (ferm.backendId) {
          await actor.completeFermentation(BigInt(ferm.backendId), rid);
        }
      } catch {
        // continue
      }
    }

    setGameState((prev) => {
      const fermentations = prev.fermentations.filter((f) => f.id !== ferm.id);
      const existing = prev.fertilizers.findIndex(
        (f) => f.rarity === rarity && f.growthPower === stats.growthPower,
      );
      let fertilizers = [...prev.fertilizers];
      if (existing >= 0) {
        fertilizers[existing] = {
          ...fertilizers[existing],
          quantity: fertilizers[existing].quantity + 1,
        };
      } else {
        fertilizers = [
          ...fertilizers,
          {
            id: backendFertId?.toString() ?? newFertId,
            rarity,
            growthPower: stats.growthPower,
            soilStability: stats.soilStability,
            microbeBoost: stats.microbeBoost,
            quantity: 1,
          },
        ];
      }

      const newMeter = Math.min(100, prev.evolutionMeter + 3);
      const newTier =
        newMeter >= 80
          ? 5
          : newMeter >= 60
            ? 4
            : newMeter >= 40
              ? 3
              : newMeter >= 20
                ? 2
                : 1;

      return {
        ...prev,
        fermentations,
        fertilizers,
        evolutionMeter: newMeter,
        evolutionTier: newTier,
        soilBalance: prev.soilBalance + stats.soilReward,
        transactions: [
          {
            id: Date.now().toString(),
            type: "earned" as const,
            amount: stats.soilReward,
            reason: `Brewed ${rarity} fertilizer`,
            timestamp: Date.now(),
          },
          ...prev.transactions,
        ].slice(0, 50),
      };
    });

    const rarityEmojis: Record<FertilizerRarity, string> = {
      common: "🧪",
      rare: "💧",
      epic: "💜",
      legendary: "⭐",
    };
    toast.success(
      `${rarityEmojis[rarity]} Brewed a ${rarity.toUpperCase()} fertilizer! +${stats.soilReward} SOIL`,
    );
    setCompleting(null);
  };

  const activeCount = gameState.fermentations.filter(
    (f) => !f.completed,
  ).length;

  return (
    <div className="space-y-5" data-ocid="lab.section">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl animate-spin-slow">🦬</span>
          <div>
            <h2 className="section-header">Fermentation Lab</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mix resources to brew fertilizers. Longer duration = rarer
              results!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Brew Form */}
      <div className="game-card game-card-purple p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header">Start Fermentation</h3>
          <span className="text-xs text-muted-foreground">
            {fermsLeft}/{DAILY_LIMITS.fermentations} left today
          </span>
        </div>

        {/* Tutorial hint */}
        {isTutorialStep3 && (
          <div
            className="mb-4 p-2 rounded border text-xs text-center"
            style={{
              borderColor: "oklch(0.6 0.3 295 / 0.6)",
              background: "oklch(0.6 0.3 295 / 0.08)",
              color: "oklch(0.75 0.3 295)",
            }}
          >
            📍 Tutorial Mode: Fermentation takes only 8 seconds!
          </div>
        )}

        {/* Resource Sliders */}
        <div className="space-y-4 mb-5">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span>🐄 Animal Waste: {waste}</span>
              <span className="text-muted-foreground">
                Available: {gameState.animalWaste}
              </span>
            </div>
            <Slider
              value={[waste]}
              onValueChange={([v]) => setWaste(v)}
              min={1}
              max={Math.min(50, gameState.animalWaste)}
              step={1}
              className="w-full"
              data-ocid="lab.waste.input"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span>🪨 Soil: {soil}</span>
              <span className="text-muted-foreground">
                Available: {gameState.soil}
              </span>
            </div>
            <Slider
              value={[soil]}
              onValueChange={([v]) => setSoil(v)}
              min={1}
              max={Math.min(50, gameState.soil)}
              step={1}
              className="w-full"
              data-ocid="lab.soil.input"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span>💧 Water: {water}</span>
              <span className="text-muted-foreground">
                Available: {gameState.water}
              </span>
            </div>
            <Slider
              value={[water]}
              onValueChange={([v]) => setWater(v)}
              min={1}
              max={Math.min(50, gameState.water)}
              step={1}
              className="w-full"
              data-ocid="lab.water.input"
            />
          </div>
        </div>

        {/* Duration selector */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground mb-2">
            Duration{isTutorialStep3 ? " (overridden to 8s in tutorial)" : ""}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              Object.entries(DURATION_CONFIG) as [
                Duration,
                (typeof DURATION_CONFIG)[Duration],
              ][]
            ).map(([key, cfg]) => (
              <button
                type="button"
                key={key}
                className={`p-2 rounded-md border text-xs cursor-pointer transition-all ${
                  duration === key
                    ? "border-[oklch(0.6_0.3_295)] bg-[oklch(0.6_0.3_295_/_0.15)] text-glow-purple"
                    : "border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground"
                }`}
                onClick={() => setDuration(key)}
                data-ocid={`lab.duration_${key}.toggle`}
              >
                <div className="text-lg">{cfg.emoji}</div>
                <div className="font-semibold mt-0.5">{key.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Odds Table */}
        <div className="mb-5 p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-2">
            🎲 Mutation Odds ({isTutorialStep3 ? "Tutorial 8s" : config.label})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(
              ["common", "rare", "epic", "legendary"] as FertilizerRarity[]
            ).map((r) => (
              <div key={r} className="text-center">
                <div
                  className={`text-[10px] font-bold uppercase ${RARITY_COLORS[r]}`}
                >
                  {r}
                </div>
                <div className="text-xs font-pixel mt-0.5">
                  {config.odds[r]}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn-neon-purple w-full py-3 rounded-md text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleStartFermentation}
          disabled={
            brewing ||
            fermsLeft <= 0 ||
            waste > gameState.animalWaste ||
            soil > gameState.soil ||
            water > gameState.water
          }
          data-ocid="lab.brew.submit_button"
          data-tutorial="start-fermentation"
        >
          {brewing ? "⏳ STARTING..." : "🧪 BREW FERTILIZER"}
        </button>
      </div>

      {/* Active Fermentations */}
      <div className="game-card game-card-cyan p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header">Active Brews</h3>
          <Badge variant="outline">{activeCount} active</Badge>
        </div>

        {gameState.fermentations.length === 0 ? (
          <div
            className="text-center py-8"
            data-ocid="lab.fermentations.empty_state"
          >
            <p className="text-3xl mb-2">🧪</p>
            <p className="text-sm text-muted-foreground">
              No active fermentations. Start one above!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {gameState.fermentations.map((ferm, idx) => {
              const isReady = checkReady(ferm);
              const isCompleting = completing === ferm.id;
              const durations = Object.values(DURATION_CONFIG);
              const matchedDuration =
                durations.find((d) => d.seconds === ferm.duration) ??
                DURATION_CONFIG.normal;
              return (
                <motion.div
                  key={ferm.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isReady
                      ? "border-[oklch(0.85_0.3_141_/_0.6)] bg-[oklch(0.85_0.3_141_/_0.05)] animate-glow-green"
                      : "border-border bg-muted/20"
                  }`}
                  data-ocid={`lab.fermentation.item.${idx + 1}`}
                >
                  <span className="text-2xl">
                    {isReady ? "✨" : matchedDuration.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        🐄{ferm.animalWaste} 🪨{ferm.soil} 💧{ferm.water}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          isReady
                            ? "border-[oklch(0.85_0.3_141)] text-glow-green"
                            : ""
                        }`}
                      >
                        {ferm.duration === 8
                          ? "Tutorial (8s)"
                          : matchedDuration.label}
                      </Badge>
                    </div>
                    <FermentationTimer
                      startTime={ferm.startTime}
                      duration={ferm.duration}
                    />
                  </div>
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-md text-xs font-bold cursor-pointer transition-all ${
                      isReady
                        ? "btn-neon-green"
                        : "border border-border text-muted-foreground opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() => handleComplete(ferm)}
                    disabled={!isReady || !!isCompleting}
                    data-ocid={`lab.complete.button.${idx + 1}`}
                  >
                    {isCompleting ? "..." : isReady ? "✨ COLLECT" : "WAIT"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rarity stats reference */}
      <div className="game-card p-4">
        <h3 className="section-header mb-3">Fertilizer Stats Reference</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["common", "rare", "epic", "legendary"] as FertilizerRarity[]).map(
            (r) => {
              const stats = RARITY_STATS[r];
              return (
                <div
                  key={r}
                  className={`p-3 rounded-lg border ${RARITY_BORDER[r]} bg-muted/10`}
                >
                  <div
                    className={`text-xs font-bold uppercase mb-2 ${RARITY_COLORS[r]}`}
                  >
                    {r}
                  </div>
                  <div className="text-[10px] space-y-1 text-muted-foreground">
                    <p>⚡ ATK: {stats.growthPower}</p>
                    <p>🛡️ DEF: {stats.soilStability}</p>
                    <p>🦈 SP: {stats.microbeBoost}</p>
                    <p className="text-glow-gold">💰 +{stats.soilReward}</p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
