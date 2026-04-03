import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { FertilizerItem, PlotState, SharedProps } from "./types";
import { CROP_TYPES, RARITY_STATS } from "./types";

const CROP_GROW_TIME_MS: Record<string, number> = {
  Wheat: 60 * 1000,
  Carrot: 90 * 1000,
  Mushroom: 120 * 1000,
  "Bio-Shroom": 180 * 1000,
};

const CROP_EMOJI: Record<string, string> = {
  Wheat: "🌾",
  Carrot: "🥕",
  Mushroom: "🍄",
  "Bio-Shroom": "✨",
};

const RARITY_LABEL_CLASSES: Record<string, string> = {
  common: "rarity-common border",
  rare: "rarity-rare border",
  epic: "rarity-epic border",
  legendary: "rarity-legendary border",
};

function getPlotEmoji(
  plot: PlotState,
  now: number,
): { emoji: string; label: string; isReady: boolean } {
  if (plot.state === "empty")
    return { emoji: "🪨", label: "Empty", isReady: false };
  if (!plot.cropType) return { emoji: "🌱", label: "Planted", isReady: false };

  const elapsed = now - (plot.growthStartTime ?? now);
  const growTime = CROP_GROW_TIME_MS[plot.cropType] ?? 60000;
  const isReady = elapsed >= growTime || plot.state === "readyToHarvest";

  if (isReady) {
    return {
      emoji: CROP_EMOJI[plot.cropType] ?? "🌾",
      label: "Ready!",
      isReady: true,
    };
  }

  const progress = Math.min(100, Math.round((elapsed / growTime) * 100));
  if (progress < 30)
    return { emoji: "🌱", label: `Growing ${progress}%`, isReady: false };
  if (progress < 70)
    return { emoji: "🌳", label: `Growing ${progress}%`, isReady: false };
  return {
    emoji: CROP_EMOJI[plot.cropType] ?? "🌾",
    label: `Almost! ${progress}%`,
    isReady: false,
  };
}

type PlantModalProps = {
  open: boolean;
  onClose: () => void;
  onPlant: (cropType: string) => void;
};

function PlantModal({ open, onClose, onPlant }: PlantModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-glow-green">
            Plant a Crop
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {CROP_TYPES.map((crop) => (
            <button
              type="button"
              key={crop.name}
              className="btn-neon-green p-3 rounded-lg flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => onPlant(crop.name)}
              data-ocid={`farm.plant_${crop.name.toLowerCase().replace("-", "_")}.button`}
            >
              <span className="text-2xl">{crop.emoji}</span>
              <span className="text-xs font-bold">{crop.name}</span>
              <span className="text-[9px] opacity-75">⏱ {crop.growTime}s</span>
              <span className="text-[9px] opacity-75">
                💰 +{crop.soilReward} SOIL
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type FertilizerModalProps = {
  open: boolean;
  onClose: () => void;
  onApply: (fertilizer: FertilizerItem) => void;
  fertilizers: FertilizerItem[];
};

function FertilizerModal({
  open,
  onClose,
  onApply,
  fertilizers,
}: FertilizerModalProps) {
  const available = fertilizers.filter((f) => f.quantity > 0);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-glow-purple">
            Apply Fertilizer
          </DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fertilizers available. Brew some in the Lab! 🧪
          </p>
        ) : (
          <div className="space-y-2 pt-2">
            {available.map((f) => (
              <button
                type="button"
                key={f.id}
                className="w-full btn-neon-purple p-3 rounded-lg flex items-center gap-3 cursor-pointer"
                onClick={() => onApply(f)}
                data-ocid="farm.apply_fertilizer.button"
              >
                <span className="text-xl">🧪</span>
                <div className="flex-1 text-left">
                  <span
                    className={`text-xs font-bold uppercase ${RARITY_LABEL_CLASSES[f.rarity]}`}
                  >
                    {f.rarity}
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    ⚡{f.growthPower} ATK | 🛡️{f.soilStability} DEF | 🦈
                    {f.microbeBoost} SP
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  x{f.quantity}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Farm({ gameState, setGameState, actor }: SharedProps) {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showFertModal, setShowFertModal] = useState(false);
  const [harvesting, setHarvesting] = useState<number | null>(null);
  const now = Date.now();

  const handlePlotClick = (plotIdx: number) => {
    const plot = gameState.plots[plotIdx];
    const elapsed = now - (plot.growthStartTime ?? now);
    const growTime = CROP_GROW_TIME_MS[plot.cropType ?? ""] ?? 60000;
    const isReady = elapsed >= growTime || plot.state === "readyToHarvest";

    if (plot.state === "empty") {
      setSelectedPlot(plotIdx);
      setShowPlantModal(true);
    } else if (isReady) {
      handleHarvest(plotIdx);
    } else {
      setSelectedPlot(plotIdx);
      setShowFertModal(true);
    }
  };

  const handlePlant = async (cropType: string) => {
    if (selectedPlot === null) return;
    setShowPlantModal(false);

    // Try backend call
    if (actor) {
      actor.plantCrop(BigInt(selectedPlot), cropType).catch(() => {});
    }

    setGameState((prev) => {
      const plots = [...prev.plots];
      plots[selectedPlot] = {
        ...plots[selectedPlot],
        state: "planted",
        cropType,
        growthStartTime: Date.now(),
      };
      return { ...prev, plots };
    });
    toast.success(`🌱 Planted ${cropType}!`);
    setSelectedPlot(null);
  };

  const handleApplyFertilizer = (fertilizer: FertilizerItem) => {
    if (selectedPlot === null) return;
    setShowFertModal(false);

    if (actor) {
      actor
        .applyFertilizer(BigInt(selectedPlot), BigInt(fertilizer.id))
        .catch(() => {});
    }

    setGameState((prev) => {
      const plots = [...prev.plots];
      const fertIdx = prev.fertilizers.findIndex((f) => f.id === fertilizer.id);
      const fertilizers = [...prev.fertilizers];
      if (fertIdx >= 0) {
        fertilizers[fertIdx] = {
          ...fertilizers[fertIdx],
          quantity: fertilizers[fertIdx].quantity - 1,
        };
      }
      // Speed up harvest: reduce remaining grow time by 50%
      const currentTime = plots[selectedPlot].growthStartTime ?? Date.now();
      plots[selectedPlot] = {
        ...plots[selectedPlot],
        fertilizerId: fertilizer.id,
        growthStartTime:
          currentTime -
          (CROP_GROW_TIME_MS[plots[selectedPlot].cropType ?? ""] ?? 60000) *
            0.5,
      };
      return { ...prev, plots, fertilizers };
    });
    toast.success(`🧪 Applied ${fertilizer.rarity} fertilizer!`);
    setSelectedPlot(null);
  };

  const handleHarvest = async (plotIdx: number) => {
    setHarvesting(plotIdx);
    const plot = gameState.plots[plotIdx];
    const cropInfo = CROP_TYPES.find((c) => c.name === plot.cropType);
    const reward = cropInfo?.soilReward ?? 5;
    const fertBonus = plot.fertilizerId ? Math.floor(reward * 0.5) : 0;
    const total = reward + fertBonus;

    if (actor) {
      actor.harvestCrop(BigInt(plotIdx)).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 600));

    setGameState((prev) => {
      const plots = [...prev.plots];
      plots[plotIdx] = { index: plotIdx, state: "empty" };
      const newMeter = Math.min(100, prev.evolutionMeter + 2);
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
        plots,
        soilBalance: prev.soilBalance + total,
        evolutionMeter: newMeter,
        evolutionTier: newTier,
        transactions: [
          {
            id: Date.now().toString(),
            type: "earned" as const,
            amount: total,
            reason: `Harvest ${plot.cropType}`,
            timestamp: Date.now(),
          },
          ...prev.transactions,
        ].slice(0, 50),
      };
    });
    toast.success(`🌾 Harvested ${plot.cropType}! +${total} SOIL 💰`);
    setHarvesting(null);
  };

  return (
    <div className="space-y-5" data-ocid="farm.section">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🌾</span>
          <div>
            <h2 className="section-header">Your Farm</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click empty plots to plant. Click ready crops to harvest!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Crop Grid */}
      <div className="game-card game-card-green p-5">
        <div className="grid grid-cols-3 gap-3 mb-4" data-ocid="farm.table">
          {gameState.plots.map((plot, idx) => {
            const { emoji, label, isReady } = getPlotEmoji(plot, now);
            const isHarvesting = harvesting === idx;
            return (
              <motion.button
                key={plot.index}
                className={`crop-tile h-24 flex-col gap-1 ${
                  isReady ? "ready" : ""
                } ${isHarvesting ? "animate-harvest-flash" : ""}`}
                onClick={() => handlePlotClick(idx)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                data-ocid={`farm.plot.item.${idx + 1}`}
              >
                <span className={`text-3xl ${isReady ? "animate-float" : ""}`}>
                  {isHarvesting ? "✨" : emoji}
                </span>
                <span className="text-[8px] font-pixel text-center leading-tight px-1">
                  {isHarvesting ? "..." : label}
                </span>
                {plot.fertilizerId && (
                  <span className="absolute top-1 right-1 text-[10px]">🧪</span>
                )}
              </motion.button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-neon-green flex-1 py-2.5 rounded-md text-xs cursor-pointer"
            onClick={() => {
              const readyPlots = gameState.plots.filter((p) => {
                if (p.state === "empty" || !p.cropType) return false;
                const elapsed = now - (p.growthStartTime ?? now);
                return (
                  elapsed >= (CROP_GROW_TIME_MS[p.cropType] ?? 60000) ||
                  p.state === "readyToHarvest"
                );
              });
              if (readyPlots.length > 0) {
                for (const p of readyPlots) {
                  handleHarvest(p.index);
                }
              } else {
                toast.info("No crops ready to harvest yet!");
              }
            }}
            data-ocid="farm.harvest_all.button"
          >
            🌾 HARVEST ALL
          </button>
        </div>
      </div>

      {/* Fertilizer Inventory */}
      <div className="game-card game-card-purple p-5">
        <h3 className="section-header mb-3">Fertilizer Inventory</h3>
        {gameState.fertilizers.filter((f) => f.quantity > 0).length === 0 ? (
          <div
            className="text-center py-6"
            data-ocid="farm.fertilizers.empty_state"
          >
            <p className="text-3xl mb-2">🧪</p>
            <p className="text-sm text-muted-foreground">
              No fertilizers yet. Visit the Lab to brew some!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gameState.fertilizers
              .filter((f) => f.quantity > 0)
              .map((f, idx) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                  data-ocid={`farm.fertilizer.item.${idx + 1}`}
                >
                  <span className="text-2xl">🧪</span>
                  <div className="flex-1">
                    <div
                      className={`text-xs font-bold uppercase px-2 py-0.5 rounded border inline-block ${RARITY_LABEL_CLASSES[f.rarity]}`}
                    >
                      {f.rarity}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      ⚡{f.growthPower} | 🛡️{f.soilStability} | 🦈
                      {f.microbeBoost}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    x{f.quantity}
                  </Badge>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="game-card p-4">
        <h3 className="section-header mb-3">Crop Guide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CROP_TYPES.map((crop) => (
            <div
              key={crop.name}
              className="flex items-center gap-2 text-xs p-2 rounded bg-muted/20"
            >
              <span className="text-xl">{crop.emoji}</span>
              <div>
                <p className="font-semibold">{crop.name}</p>
                <p className="text-muted-foreground">⏱ {crop.growTime}s</p>
                <p className="text-muted-foreground">💰 +{crop.soilReward}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PlantModal
        open={showPlantModal}
        onClose={() => {
          setShowPlantModal(false);
          setSelectedPlot(null);
        }}
        onPlant={handlePlant}
      />
      <FertilizerModal
        open={showFertModal}
        onClose={() => {
          setShowFertModal(false);
          setSelectedPlot(null);
        }}
        onApply={handleApplyFertilizer}
        fertilizers={gameState.fertilizers}
      />
    </div>
  );
}
