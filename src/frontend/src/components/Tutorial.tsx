import { AnimatePresence, motion } from "motion/react";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TabId } from "./tabTypes";
import type { GameState } from "./types";

interface TutorialProps {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  onNavigate: (tab: TabId) => void;
  activeTab: TabId;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Confetti particle data
const CONFETTI_COLORS = [
  "oklch(0.85 0.3 141)",
  "oklch(0.6 0.3 295)",
  "oklch(0.85 0.18 198)",
  "oklch(0.82 0.18 80)",
  "oklch(0.65 0.25 22)",
];

const confettiParticles = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 1.5,
  duration: 1.5 + Math.random() * 2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 4 + Math.random() * 6,
  startY: -20,
  endY: 110 + Math.random() * 20,
  drift: (Math.random() - 0.5) * 40,
}));

function useSpotlight(selector: string | null, active: boolean) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  const updateRect = useCallback(() => {
    if (!selector || !active) {
      setRect(null);
      return;
    }
    const el = document.querySelector(
      `[data-tutorial="${selector}"]`,
    ) as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  }, [selector, active]);

  useEffect(() => {
    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  return rect;
}

interface SpotlightOverlayProps {
  selector: string;
  instruction: string;
  subtext?: string;
  position?: "above" | "below" | "left";
  children?: React.ReactNode;
}

function SpotlightOverlay({
  selector,
  instruction,
  subtext,
  position = "above",
  children,
}: SpotlightOverlayProps) {
  const rect = useSpotlight(selector, true);
  const PAD = 12;

  return (
    <div
      className="fixed inset-0 z-[9000] pointer-events-none"
      style={{ isolation: "isolate" }}
    >
      {/* Dark overlay with hole cut out via radial-gradient mask */}
      {rect && (
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(0,0,0,0.78)",
            WebkitMaskImage: `radial-gradient(ellipse ${rect.width + PAD * 2}px ${rect.height + PAD * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 0%, transparent 60%, black 90%)`,
            maskImage: `radial-gradient(ellipse ${rect.width + PAD * 2}px ${rect.height + PAD * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 0%, transparent 60%, black 90%)`,
          }}
        />
      )}
      {!rect && (
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.78)" }}
        />
      )}

      {/* Pulsing ring around target */}
      {rect && (
        <motion.div
          className="absolute rounded-lg border-2 pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderColor: "oklch(0.85 0.3 141)",
            boxShadow:
              "0 0 0 2px oklch(0.85 0.3 141 / 0.4), 0 0 20px oklch(0.85 0.3 141 / 0.3)",
          }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{
            duration: 1.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Instruction card */}
      {rect && (
        <motion.div
          initial={{ opacity: 0, y: position === "above" ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute pointer-events-auto"
          style={{
            ...(position === "above"
              ? {
                  bottom: window.innerHeight - rect.top + PAD + 16,
                  left: Math.max(
                    8,
                    Math.min(rect.left, window.innerWidth - 300),
                  ),
                }
              : {
                  top: rect.top + rect.height + PAD + 16,
                  left: Math.max(
                    8,
                    Math.min(rect.left, window.innerWidth - 300),
                  ),
                }),
            maxWidth: 280,
          }}
        >
          <div
            className="game-card game-card-green p-3 rounded-xl"
            style={{ minWidth: 220 }}
          >
            <p className="font-pixel text-[10px] text-glow-green mb-1">
              📍 TUTORIAL
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">
              {instruction}
            </p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
            {children}
          </div>
          {/* Arrow indicator */}
          <div
            className="w-3 h-3 rotate-45 mx-auto -mt-1.5"
            style={{
              background: "oklch(0.11 0.012 255)",
              border: "1px solid oklch(0.85 0.3 141 / 0.6)",
              borderTop: "none",
              borderLeft: "none",
              display: position === "above" ? "block" : "none",
            }}
          />
        </motion.div>
      )}

      {/* Fallback if element not found */}
      {!rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto"
        >
          <div
            className="game-card game-card-green p-3 rounded-xl text-center"
            style={{ minWidth: 240 }}
          >
            <p className="font-pixel text-[10px] text-glow-green mb-1">
              📍 TUTORIAL
            </p>
            <p className="text-sm font-semibold mb-1">{instruction}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function Tutorial({
  gameState,
  setGameState,
  onNavigate,
  activeTab,
}: TutorialProps) {
  const step = gameState.tutorialStep;
  const [resourcesCollected, setResourcesCollected] = useState({
    waste: false,
    soil: false,
    water: false,
  });
  const [baselineSet, setBaselineSet] = useState(false);
  const [baseline, setBaseline] = useState({ waste: 0, soil: 0, water: 0 });
  const [showFermentComplete, setShowFermentComplete] = useState(false);
  const [prevFertCount, setPrevFertCount] = useState(0);
  const [prevBattlesWon, setPrevBattlesWon] = useState(0);
  const [rewardsGranted, setRewardsGranted] = useState(false);
  const [mutationApplied, setMutationApplied] = useState(false);

  // Auto-start tutorial
  useEffect(() => {
    if (step === 0) {
      setGameState((prev) => ({ ...prev, tutorialStep: 1 }));
    }
  }, [step, setGameState]);

  // Step 2: navigate to dashboard and set baseline
  useEffect(() => {
    if (step === 2) {
      onNavigate("dashboard");
      if (!baselineSet) {
        setBaseline({
          waste: gameState.animalWaste,
          soil: gameState.soil,
          water: gameState.water,
        });
        setBaselineSet(true);
      }
    }
  }, [
    step,
    onNavigate,
    gameState.animalWaste,
    gameState.soil,
    gameState.water,
    baselineSet,
  ]);

  // Step 2: track resource collection
  useEffect(() => {
    if (step === 2 && baselineSet) {
      setResourcesCollected({
        waste: gameState.animalWaste > baseline.waste,
        soil: gameState.soil > baseline.soil,
        water: gameState.water > baseline.water,
      });
    }
  }, [
    step,
    baselineSet,
    gameState.animalWaste,
    gameState.soil,
    gameState.water,
    baseline,
  ]);

  // Step 2: advance when all 3 collected
  const step2Complete =
    resourcesCollected.waste &&
    resourcesCollected.soil &&
    resourcesCollected.water;
  const step2CompleteRef = useRef(false);
  useEffect(() => {
    if (step === 2 && step2Complete && !step2CompleteRef.current) {
      step2CompleteRef.current = true;
      // Grant XP reward
      setGameState((prev) => ({
        ...prev,
        evolutionMeter: Math.min(100, prev.evolutionMeter + 10),
        soilBalance: prev.soilBalance + 10,
      }));
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, tutorialStep: 3 }));
      }, 1500);
    }
  }, [step, step2Complete, setGameState]);

  // Step 3: navigate to lab
  useEffect(() => {
    if (step === 3) {
      onNavigate("lab");
    }
  }, [step, onNavigate]);

  // Step 3: watch fermentations for completion
  const fermCountRef = useRef(gameState.fertilizers.length);
  useEffect(() => {
    if (step === 3) {
      const currentCount = gameState.fertilizers.reduce(
        (s, f) => s + f.quantity,
        0,
      );
      if (
        currentCount > prevFertCount &&
        prevFertCount > 0 &&
        !showFermentComplete
      ) {
        setShowFermentComplete(true);
        setTimeout(() => {
          setShowFermentComplete(false);
          setGameState((prev) => ({ ...prev, tutorialStep: 4 }));
        }, 2500);
      }
      setPrevFertCount(currentCount);
    }
  }, [
    step,
    gameState.fertilizers,
    prevFertCount,
    showFermentComplete,
    setGameState,
  ]);

  // Step 3: initialize prevFertCount
  useEffect(() => {
    if (step === 3 && prevFertCount === 0) {
      const count = gameState.fertilizers.reduce((s, f) => s + f.quantity, 0);
      setPrevFertCount(count);
      fermCountRef.current = count;
    }
  }, [step, gameState.fertilizers, prevFertCount]);

  // Step 4: apply mutation (upgrade most recent fertilizer to rare)
  useEffect(() => {
    if (step === 4 && !mutationApplied) {
      setMutationApplied(true);
      setGameState((prev) => {
        if (prev.fertilizers.length === 0) return prev;
        const fertilizers = [...prev.fertilizers];
        // Find last common fertilizer and upgrade it
        const lastCommonIdx = [...fertilizers]
          .reverse()
          .findIndex((f) => f.rarity === "common");
        if (lastCommonIdx >= 0) {
          const actualIdx = fertilizers.length - 1 - lastCommonIdx;
          fertilizers[actualIdx] = {
            ...fertilizers[actualIdx],
            rarity: "rare",
          };
        }
        return { ...prev, fertilizers };
      });
    }
  }, [step, mutationApplied, setGameState]);

  // Step 6: navigate to battle
  useEffect(() => {
    if (step === 6) {
      onNavigate("battle");
      setPrevBattlesWon(gameState.battlesWon);
    }
  }, [step, onNavigate, gameState.battlesWon]);

  // Step 6: detect battle won
  useEffect(() => {
    if (
      step === 6 &&
      gameState.battlesWon > prevBattlesWon &&
      prevBattlesWon >= 0
    ) {
      // Advance to step 7 after short delay
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, tutorialStep: 7 }));
      }, 800);
    }
  }, [step, gameState.battlesWon, prevBattlesWon, setGameState]);

  // Step 7: grant rewards
  useEffect(() => {
    if (step === 7 && !rewardsGranted) {
      setRewardsGranted(true);
      setGameState((prev) => ({
        ...prev,
        soilBalance: prev.soilBalance + 25,
        evolutionMeter: Math.min(100, prev.evolutionMeter + 15),
      }));
    }
  }, [step, rewardsGranted, setGameState]);

  const advance = (to: number) => {
    setGameState((prev) => ({ ...prev, tutorialStep: to }));
  };

  const skipTutorial = () => {
    setGameState((prev) => ({
      ...prev,
      tutorialCompleted: true,
      tutorialStep: 11,
    }));
  };

  if (gameState.tutorialCompleted || step === 0 || step === 11) return null;

  return (
    <>
      {/* =================== STEP 1: WELCOME =================== */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)" }}
            data-ocid="tutorial.modal"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="game-card game-card-green p-8 max-w-md w-full mx-4 text-center"
            >
              <motion.div
                className="text-7xl mb-5"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                🌱
              </motion.div>
              <h1 className="font-pixel text-base text-glow-green mb-2 leading-loose">
                Welcome to
                <br />
                SoilLife: Farm Wars 🌱
              </h1>
              <p className="text-sm text-muted-foreground my-4 leading-relaxed">
                Turn waste into power.
                <br />
                Grow, fight, and win rewards.
              </p>
              <div className="flex justify-center gap-4 text-3xl my-6">
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0,
                  }}
                >
                  🌾
                </motion.span>
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.3,
                  }}
                >
                  🧪
                </motion.span>
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.6,
                  }}
                >
                  ⚔️
                </motion.span>
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.9,
                  }}
                >
                  💰
                </motion.span>
              </div>
              <button
                type="button"
                className="btn-neon-green w-full py-4 rounded-lg font-pixel text-sm cursor-pointer"
                onClick={() => advance(2)}
                data-ocid="tutorial.start.primary_button"
              >
                ▶ START FARMING
              </button>
              <p className="text-[10px] text-muted-foreground mt-3 opacity-60">
                ~2 minute tutorial • learn the basics
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== STEP 2: RESOURCE COLLECTION =================== */}
      {step === 2 && activeTab === "dashboard" && (
        <SpotlightOverlay
          selector="resource-area"
          instruction="Tap to collect resources!"
          subtext="Collect 1 of each: Waste, Soil & Water"
          position="above"
        >
          {/* Progress checklist */}
          <div className="mt-2 space-y-1">
            {[
              {
                key: "waste",
                label: "Animal Waste",
                done: resourcesCollected.waste,
              },
              { key: "soil", label: "Soil", done: resourcesCollected.soil },
              { key: "water", label: "Water", done: resourcesCollected.water },
            ].map(({ key, label, done }) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <motion.span
                  animate={{ scale: done ? [1, 1.4, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {done ? "✅" : "⬜"}
                </motion.span>
                <span
                  className={
                    done ? "text-glow-green line-through" : "text-foreground"
                  }
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          {step2Complete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs font-pixel text-glow-green"
            >
              ⬆ +10 XP ⬆ +10 SOIL
            </motion.div>
          )}
        </SpotlightOverlay>
      )}

      {/* Skip button for step 2+ */}
      {step >= 2 && step <= 10 && (
        <button
          type="button"
          className="fixed top-4 right-4 z-[9998] text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-3 py-1.5 rounded border border-border bg-card"
          onClick={skipTutorial}
          data-ocid="tutorial.skip.button"
        >
          Skip Tutorial ✕
        </button>
      )}

      {/* =================== STEP 3: FERMENTATION =================== */}
      {step === 3 && activeTab === "lab" && !showFermentComplete && (
        <SpotlightOverlay
          selector="start-fermentation"
          instruction="Combine resources to create Liquid Fertilizer"
          subtext='Tap "Start Fermentation" to brew! (Tutorial: 8s timer)'
          position="above"
        />
      )}

      {/* Fermentation complete animation */}
      <AnimatePresence>
        {step === 3 && showFermentComplete && (
          <motion.div
            key="ferm-complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.88)" }}
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="game-card game-card-purple p-8 max-w-sm w-full mx-4 text-center"
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
              >
                🧪
              </motion.div>
              {/* Bubbling animation */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ background: "oklch(0.6 0.3 295)" }}
                    animate={{
                      y: [0, -16, 0],
                      opacity: [1, 0.4, 1],
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
              <h2 className="font-pixel text-sm text-glow-purple mb-2">
                FERMENTATION COMPLETE!
              </h2>
              <p className="text-sm text-foreground">
                You created Common Fertilizer!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Advancing to mutation...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== STEP 4: MUTATION =================== */}
      <AnimatePresence>
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.95)" }}
            data-ocid="tutorial.mutation.modal"
          >
            {/* Pulsing glow background */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, oklch(0.6 0.3 295 / 0.2) 0%, transparent 60%)",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />

            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 250, damping: 20 }}
              className="game-card game-card-purple p-8 max-w-sm w-full mx-4 text-center relative z-10"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mb-4"
              >
                Something is happening...
              </motion.p>

              {/* Glow burst */}
              <motion.div
                className="text-7xl mb-4 mx-auto"
                initial={{ scale: 0 }}
                animate={{
                  scale: [0, 1.3, 1],
                  filter: ["brightness(1)", "brightness(3)", "brightness(1.5)"],
                }}
                transition={{ delay: 0.6, duration: 0.8, times: [0, 0.5, 1] }}
              >
                ✨
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <div
                  className="font-pixel text-xl mb-2"
                  style={{
                    color: "oklch(0.6 0.25 240)",
                    textShadow: "0 0 20px oklch(0.6 0.25 240 / 0.8)",
                  }}
                >
                  💧 RARE FERTILIZER!
                </div>
                <p className="text-sm text-foreground mb-2">
                  Your fertilizer mutated!
                </p>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Rare fertilizers are stronger
                  <br />
                  and unlock special abilities.
                </p>
                <button
                  type="button"
                  className="btn-neon-purple w-full py-3 rounded-lg font-pixel text-xs cursor-pointer"
                  onClick={() => advance(5)}
                  data-ocid="tutorial.mutation.confirm_button"
                >
                  AMAZING! ✨
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== STEP 5: PREPARE FOR BATTLE =================== */}
      <AnimatePresence>
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)" }}
            data-ocid="tutorial.battle_prep.modal"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="game-card game-card-green p-8 max-w-sm w-full mx-4 text-center"
            >
              <div className="text-5xl mb-4">⚔️</div>
              <h2 className="font-pixel text-sm text-glow-green mb-3">
                PREPARE FOR BATTLE!
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Your fertilizer is now ready to fight!
              </p>

              {/* Bio Unit card */}
              <div className="game-card game-card-purple p-4 mb-5 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🧪</span>
                  <div>
                    <p
                      className="font-pixel text-[10px]"
                      style={{ color: "oklch(0.6 0.25 240)" }}
                    >
                      RARE BIO UNIT
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Liquid Fertilizer mk.I
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      label: "⚡ Attack",
                      value: 45,
                      color: "oklch(0.85 0.3 141)",
                    },
                    {
                      label: "🛡️ Defense",
                      value: 30,
                      color: "oklch(0.85 0.18 198)",
                    },
                    {
                      label: "🦈 Ability",
                      value: "Microbe Burst",
                      color: "oklch(0.6 0.3 295)",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="flex justify-between text-xs items-center"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span
                        className="font-pixel text-[10px]"
                        style={{ color }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn-neon-green w-full py-3 rounded-lg font-pixel text-xs cursor-pointer"
                onClick={() => advance(6)}
                data-ocid="tutorial.battle_prep.primary_button"
              >
                ⚔️ ENTER THE ARENA
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== STEP 6: FIRST BATTLE =================== */}
      {step === 6 && activeTab === "battle" && <BattleTurnOverlay />}

      {/* =================== STEP 7: VICTORY REWARD =================== */}
      <AnimatePresence>
        {step === 7 && (
          <motion.div
            key="step7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(0,0,0,0.92)" }}
            data-ocid="tutorial.victory.modal"
          >
            {/* Confetti */}
            {confettiParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute pointer-events-none rounded-sm"
                style={{
                  left: `${p.left}%`,
                  top: `${p.startY}%`,
                  width: p.size,
                  height: p.size * 0.6,
                  background: p.color,
                }}
                initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                animate={{
                  y: `${p.endY}vh`,
                  x: p.drift,
                  rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeIn",
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="game-card game-card-gold p-8 max-w-sm w-full mx-4 text-center relative z-10"
            >
              <motion.div
                className="text-6xl mb-3"
                animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                ⚔️
              </motion.div>
              <h2
                className="font-pixel text-xl mb-4"
                style={{
                  color: "oklch(0.82 0.18 80)",
                  textShadow: "0 0 20px oklch(0.82 0.18 80 / 0.8)",
                }}
              >
                VICTORY!
              </h2>

              {/* Rewards */}
              <div className="space-y-3 mb-6">
                {[
                  {
                    emoji: "💰",
                    text: "+25 SOIL Tokens",
                    color: "oklch(0.82 0.18 80)",
                  },
                  { emoji: "⬆️", text: "+15 XP", color: "oklch(0.85 0.3 141)" },
                ].map(({ emoji, text, color }) => (
                  <motion.div
                    key={text}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-3 p-2 rounded-lg"
                    style={{ background: "oklch(0.15 0.02 260)" }}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="font-pixel text-xs" style={{ color }}>
                      {text}
                    </span>
                  </motion.div>
                ))}
              </div>

              <button
                type="button"
                className="btn-neon-green w-full py-3 rounded-lg font-pixel text-xs cursor-pointer"
                onClick={() => advance(8)}
                data-ocid="tutorial.victory.primary_button"
              >
                🎉 CLAIM REWARDS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== STEP 8: JACKPOT INTRO =================== */}
      <AnimatePresence>
        {step === 8 && (
          <motion.div
            key="step8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)" }}
            data-ocid="tutorial.jackpot.modal"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="game-card game-card-gold p-8 max-w-sm w-full mx-4 text-center"
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.12, 1], rotate: [-5, 5, -5] }}
                transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
              >
                💰
              </motion.div>
              <h2 className="font-pixel text-base text-glow-gold mb-3">
                JACKPOT SYSTEM!
              </h2>
              <p className="text-sm text-foreground mb-4">
                Every 6 battles = Jackpot 💰
              </p>

              {/* Countdown */}
              <div className="game-card p-4 mb-5">
                <p className="text-xs text-muted-foreground mb-2">
                  Battles until jackpot:
                </p>
                <div className="flex justify-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="w-8 h-8 rounded border flex items-center justify-center font-pixel text-[10px]"
                      style={{
                        borderColor:
                          n <= 6 - (gameState.battleRoundCount % 6)
                            ? "oklch(0.82 0.18 80)"
                            : "oklch(0.3 0.03 260)",
                        color:
                          n <= 6 - (gameState.battleRoundCount % 6)
                            ? "oklch(0.82 0.18 80)"
                            : "oklch(0.4 0.02 260)",
                        background:
                          n <= 6 - (gameState.battleRoundCount % 6)
                            ? "oklch(0.82 0.18 80 / 0.1)"
                            : "transparent",
                      }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-glow-gold font-pixel">
                  {6 - (gameState.battleRoundCount % 6)} battles remaining
                </p>
              </div>

              <p className="text-xs text-muted-foreground mb-5">
                Keep playing to qualify for the jackpot pool!
              </p>

              <button
                type="button"
                className="btn-neon-green w-full py-3 rounded-lg font-pixel text-xs cursor-pointer"
                onClick={() => advance(9)}
                data-ocid="tutorial.jackpot.confirm_button"
              >
                GOT IT! 💰
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== STEP 9: DAILY REWARD =================== */}
      <AnimatePresence>
        {step === 9 && (
          <DailyRewardStep advance={advance} setGameState={setGameState} />
        )}
      </AnimatePresence>

      {/* =================== STEP 10: FREE PLAY UNLOCK =================== */}
      <AnimatePresence>
        {step === 10 && (
          <motion.div
            key="step10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(0,0,0,0.9)" }}
            data-ocid="tutorial.complete.modal"
          >
            {/* Glow celebration background */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, oklch(0.85 0.3 141 / 0.15) 0%, oklch(0.6 0.3 295 / 0.1) 50%, transparent 70%)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
            />

            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="game-card game-card-green p-8 max-w-md w-full mx-4 text-center relative z-10"
            >
              <motion.div
                className="text-7xl mb-5"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                🌾
              </motion.div>

              <h2
                className="font-pixel text-lg mb-3 leading-loose"
                style={{
                  color: "oklch(0.85 0.3 141)",
                  textShadow: "0 0 20px oklch(0.85 0.3 141 / 0.8)",
                }}
              >
                YOU ARE NOW A<br />
                SOIL FARMER!
              </h2>

              <p className="text-sm text-foreground mb-2">
                Grow stronger and dominate the arena.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                All tutorial restrictions removed. The world is yours!
              </p>

              {/* Achievement badges */}
              <div className="flex justify-center gap-3 mb-6">
                {["🌱 Collector", "🧪 Brewer", "⚔️ Fighter"].map((badge) => (
                  <div
                    key={badge}
                    className="px-2 py-1 rounded-full text-[9px] font-pixel border"
                    style={{
                      borderColor: "oklch(0.85 0.3 141 / 0.6)",
                      color: "oklch(0.85 0.3 141)",
                      background: "oklch(0.85 0.3 141 / 0.1)",
                    }}
                  >
                    {badge}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-neon-green w-full py-4 rounded-lg font-pixel text-sm cursor-pointer"
                onClick={() => {
                  setGameState((prev) => ({
                    ...prev,
                    tutorialCompleted: true,
                    tutorialStep: 11,
                  }));
                }}
                data-ocid="tutorial.complete.primary_button"
              >
                🌾 ENTER THE ARENA
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---- BattleTurnOverlay: spotlight for attack/special in step 6 ----
function BattleTurnOverlay() {
  const [hintPhase, setHintPhase] = useState<"attack" | "special">("attack");

  useEffect(() => {
    // After 4 seconds on attack hint, switch to special hint
    if (hintPhase === "attack") {
      const t = setTimeout(() => setHintPhase("special"), 4000);
      return () => clearTimeout(t);
    }
  }, [hintPhase]);

  const selector = hintPhase === "attack" ? "attack-button" : "ability-button";
  const instruction =
    hintPhase === "attack" ? "Attack your enemy!" : "Use your Special Ability!";
  const subtext =
    hintPhase === "attack"
      ? "Tap the ATTACK button to strike"
      : "Tap MICROBE BOOST for extra damage!";

  // Don't show when battle result is visible
  const battlePhase = document.querySelector(
    '[data-ocid="battle.result.card"]',
  );
  if (battlePhase) return null;

  return (
    <SpotlightOverlay
      selector={selector}
      instruction={instruction}
      subtext={subtext}
      position="above"
    />
  );
}

// ---- Daily Reward Step (separate to handle grant-once) ----
function DailyRewardStep({
  advance,
  setGameState,
}: {
  advance: (to: number) => void;
  setGameState: Dispatch<SetStateAction<GameState>>;
}) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!granted) {
      setGranted(true);
      setGameState((prev) => ({
        ...prev,
        soilBalance: prev.soilBalance + 50,
        transactions: [
          {
            id: Date.now().toString(),
            type: "earned" as const,
            amount: 50,
            reason: "Day 1 Tutorial Reward",
            timestamp: Date.now(),
          },
          ...prev.transactions,
        ].slice(0, 50),
      }));
    }
  }, [granted, setGameState]);

  return (
    <motion.div
      key="step9"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      data-ocid="tutorial.daily_reward.modal"
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="game-card game-card-gold p-8 max-w-sm w-full mx-4 text-center"
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ scale: [1, 1.15, 1], y: [0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        >
          🎁
        </motion.div>
        <h2 className="font-pixel text-sm text-glow-gold mb-2">
          DAY 1 REWARD!
        </h2>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="font-pixel text-2xl mb-3"
          style={{ color: "oklch(0.82 0.18 80)" }}
        >
          +50 SOIL 💰
        </motion.div>
        <p className="text-sm text-muted-foreground mb-6">
          Come back daily for bigger rewards!
        </p>
        <button
          type="button"
          className="btn-neon-green w-full py-3 rounded-lg font-pixel text-xs cursor-pointer"
          onClick={() => advance(10)}
          data-ocid="tutorial.daily_reward.primary_button"
        >
          🎁 COLLECT REWARD
        </button>
      </motion.div>
    </motion.div>
  );
}
