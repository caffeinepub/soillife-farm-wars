import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { TabId } from "./tabTypes";
import type { BattleLogEntry, FertilizerItem, SharedProps } from "./types";
import { DAILY_LIMITS } from "./types";

type Difficulty = "easy" | "medium" | "hard";

interface AIOpponent {
  name: string;
  emoji: string;
  difficulty: Difficulty;
  growthPower: number;
  soilStability: number;
  microbeBoost: number;
  hp: number;
  borderClass: string;
  colorClass: string;
  description: string;
}

const AI_OPPONENTS: AIOpponent[] = [
  {
    name: "Mudworm",
    emoji: "🐛",
    difficulty: "easy",
    growthPower: 12,
    soilStability: 8,
    microbeBoost: 5,
    hp: 80,
    borderClass: "border-green-500/60",
    colorClass: "text-green-400",
    description: "A simple soil creature. Low power but crafty.",
  },
  {
    name: "FungiBoss",
    emoji: "🍄",
    difficulty: "medium",
    growthPower: 28,
    soilStability: 22,
    microbeBoost: 18,
    hp: 120,
    borderClass: "border-yellow-500/60",
    colorClass: "text-yellow-400",
    description: "A balanced fighter with adaptive spore attacks.",
  },
  {
    name: "NeoBlight",
    emoji: "🦠",
    difficulty: "hard",
    growthPower: 55,
    soilStability: 45,
    microbeBoost: 40,
    hp: 180,
    borderClass: "border-red-500/60",
    colorClass: "text-red-400",
    description: "A mutant bio-weapon. Nearly unbeatable without a legendary.",
  },
];

// Tutorial easy opponent: very low HP so player wins quickly
const TUTORIAL_OPPONENT: AIOpponent = {
  name: "Training Worm",
  emoji: "🐛",
  difficulty: "easy",
  growthPower: 5,
  soilStability: 2,
  microbeBoost: 3,
  hp: 8,
  borderClass: "border-green-500/60",
  colorClass: "text-green-400",
  description: "A tutorial opponent. Very easy!",
};

type BattlePhase =
  | "select_opponent"
  | "select_fertilizer"
  | "fighting"
  | "result";

function calcDamage(
  attacker: { growthPower: number },
  defender: { soilStability: number },
) {
  const base = attacker.growthPower * (1 + Math.random() * 0.3);
  const mitigation = defender.soilStability * 0.5;
  return Math.max(1, Math.round(base - mitigation));
}

function calcSpecial(
  attacker: { microbeBoost: number },
  defender: { soilStability: number },
) {
  const base = attacker.microbeBoost * 1.5 * (1 + Math.random() * 0.2);
  const mitigation = defender.soilStability * 0.3;
  return Math.max(1, Math.round(base - mitigation));
}

function HPBar({
  current,
  max,
  colorClass,
}: { current: number; max: number; colorClass: string }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>
          {current}/{max} HP
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

type Props = SharedProps & { onNavigate: (tab: TabId) => void };

export default function BattleArena({
  gameState,
  setGameState,
  onNavigate,
}: Props) {
  const isTutorialStep6 = gameState.tutorialStep === 6;

  const [phase, setPhase] = useState<BattlePhase>(
    isTutorialStep6 ? "select_fertilizer" : "select_opponent",
  );
  const [selectedOpponent, setSelectedOpponent] = useState<AIOpponent | null>(
    isTutorialStep6 ? TUTORIAL_OPPONENT : null,
  );
  const [selectedFertilizer, setSelectedFertilizer] =
    useState<FertilizerItem | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(
    isTutorialStep6 ? TUTORIAL_OPPONENT.hp : 100,
  );
  const [playerMaxHp] = useState(100);
  const [enemyMaxHp, setEnemyMaxHp] = useState(
    isTutorialStep6 ? TUTORIAL_OPPONENT.hp : 100,
  );
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [round, setRound] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<
    { id: number; value: number; isPlayer: boolean }[]
  >([]);
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null);
  const [specialReady, setSpecialReady] = useState(true);
  const [showJackpot, setShowJackpot] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const dmgIdRef = useRef(0);
  const tutorialAutoStarted = useRef(false);

  const battlesLeft = DAILY_LIMITS.battles - gameState.dailyBattles;
  const battlesUntilJackpot = 6 - (gameState.battleRoundCount % 6);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll effect only needs battleLog
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [battleLog]);

  // Auto-start tutorial battle when entering step 6
  useEffect(() => {
    if (
      isTutorialStep6 &&
      phase === "select_fertilizer" &&
      !tutorialAutoStarted.current
    ) {
      tutorialAutoStarted.current = true;
      const bestFert = gameState.fertilizers
        .filter((f) => f.quantity > 0)
        .sort((a, b) => b.growthPower - a.growthPower)[0];
      if (bestFert) {
        setTimeout(() => {
          setSelectedOpponent(TUTORIAL_OPPONENT);
          setSelectedFertilizer(bestFert);
          setEnemyMaxHp(TUTORIAL_OPPONENT.hp);
          setPlayerHp(100);
          setEnemyHp(TUTORIAL_OPPONENT.hp);
          setBattleLog([]);
          setRound(0);
          setWinner(null);
          setSpecialReady(true);
          setPhase("fighting");
        }, 600);
      }
    }
  }, [isTutorialStep6, phase, gameState.fertilizers]);

  const startBattle = (opponent: AIOpponent, fertilizer: FertilizerItem) => {
    if (battlesLeft <= 0 && !isTutorialStep6) {
      toast.error("Daily battle limit reached!");
      return;
    }
    setSelectedOpponent(opponent);
    setSelectedFertilizer(fertilizer);
    setEnemyMaxHp(opponent.hp);
    setPlayerHp(playerMaxHp);
    setEnemyHp(opponent.hp);
    setBattleLog([]);
    setRound(0);
    setWinner(null);
    setSpecialReady(true);
    setPhase("fighting");
  };

  const addDamageNumber = (value: number, isPlayer: boolean) => {
    const id = ++dmgIdRef.current;
    setDamageNumbers((prev) => [...prev, { id, value, isPlayer }]);
    setTimeout(
      () => setDamageNumbers((prev) => prev.filter((d) => d.id !== id)),
      1300,
    );
  };

  const doAttack = async (useSpecial = false) => {
    if (!selectedOpponent || !selectedFertilizer || isAttacking || winner)
      return;
    setIsAttacking(true);
    setSpecialReady(false);

    const attacker = selectedFertilizer;
    const defender = selectedOpponent;

    // In tutorial, player always deals massive damage to guarantee win
    const playerDmg = isTutorialStep6
      ? 999
      : useSpecial
        ? calcSpecial(attacker, defender)
        : calcDamage(attacker, defender);
    addDamageNumber(playerDmg, true);
    const newEnemyHp = Math.max(0, enemyHp - playerDmg);
    setEnemyHp(newEnemyHp);

    await new Promise((r) => setTimeout(r, 400));

    // AI turn (if enemy alive) — in tutorial, AI does no damage
    let newPlayerHp = playerHp;
    let aiDmg = 0;
    if (newEnemyHp > 0 && !isTutorialStep6) {
      const aiStyle =
        defender.difficulty === "easy"
          ? Math.random() > 0.3
          : defender.difficulty === "medium"
            ? Math.random() > 0.15
            : true;
      aiDmg = aiStyle
        ? calcDamage(defender, {
            soilStability: Math.floor(attacker.soilStability * 0.8),
          })
        : Math.round(defender.growthPower * 0.5);
      addDamageNumber(aiDmg, false);
      newPlayerHp = Math.max(0, playerHp - aiDmg);
      setPlayerHp(newPlayerHp);
    }

    await new Promise((r) => setTimeout(r, 300));

    const newRound = round + 1;
    setRound(newRound);

    const logEntry: BattleLogEntry = {
      round: newRound,
      playerDmg,
      enemyDmg: aiDmg,
      playerHp: newPlayerHp,
      enemyHp: newEnemyHp,
      message: useSpecial
        ? `🦈 Microbe Boost activates! -${isTutorialStep6 ? "massive" : playerDmg} to ${defender.name}`
        : `⚔️ Round ${newRound}: You deal ${isTutorialStep6 ? "massive" : playerDmg}. ${
            aiDmg > 0
              ? `${defender.name} hits ${aiDmg}.`
              : `${defender.name} misses!`
          }`,
    };
    setBattleLog((prev) => [...prev, logEntry]);

    // Check win/loss
    if (newEnemyHp <= 0 || newPlayerHp <= 0 || newRound >= 5) {
      const playerWon =
        newEnemyHp <= 0 || (newRound >= 5 && newPlayerHp > newEnemyHp);
      setWinner(playerWon ? "player" : "enemy");
      await new Promise((r) => setTimeout(r, 500));
      finalizeBattle(playerWon);
    } else {
      setTimeout(() => setSpecialReady(true), 2000);
    }

    setIsAttacking(false);
  };

  const finalizeBattle = (playerWon: boolean) => {
    const newBattleCount = gameState.battleRoundCount + 1;
    const isJackpotRound = newBattleCount % 6 === 0;
    const reward = playerWon
      ? selectedOpponent?.difficulty === "hard"
        ? 50
        : selectedOpponent?.difficulty === "medium"
          ? 25
          : 10
      : 0;
    const jackpotReward =
      isJackpotRound && playerWon ? gameState.jackpotPool : 0;
    const totalReward = reward + jackpotReward;
    const newJackpot = isJackpotRound ? 0 : gameState.jackpotPool + 5;

    setGameState((prev) => ({
      ...prev,
      battleRoundCount: newBattleCount,
      battlesWon: playerWon ? prev.battlesWon + 1 : prev.battlesWon,
      battlesLost: !playerWon ? prev.battlesLost + 1 : prev.battlesLost,
      soilBalance: prev.soilBalance + totalReward,
      jackpotPool: newJackpot,
      dailyBattles: prev.dailyBattles + 1,
      evolutionMeter: Math.min(100, prev.evolutionMeter + 1),
      transactions: [
        {
          id: Date.now().toString(),
          type: (playerWon ? "earned" : "spent") as "earned" | "spent",
          amount: totalReward,
          reason: `Battle vs ${selectedOpponent?.name ?? "AI"}: ${
            playerWon ? "WIN" : "LOSS"
          }`,
          timestamp: Date.now(),
        },
        ...prev.transactions,
      ].slice(0, 50),
    }));

    if (isJackpotRound && playerWon) {
      setTimeout(() => setShowJackpot(true), 400);
    }

    setPhase("result");
  };

  const resetBattle = () => {
    setPhase(isTutorialStep6 ? "select_fertilizer" : "select_opponent");
    setSelectedOpponent(isTutorialStep6 ? TUTORIAL_OPPONENT : null);
    setSelectedFertilizer(null);
    setBattleLog([]);
    setRound(0);
    setWinner(null);
    setShowJackpot(false);
  };

  const availableFertilizers = gameState.fertilizers.filter(
    (f) => f.quantity > 0,
  );

  return (
    <div className="space-y-5" data-ocid="battle.section">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚔️</span>
            <div>
              <h2 className="section-header">Battle Arena</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {battlesLeft}/{DAILY_LIMITS.battles} battles left · Jackpot in{" "}
                {battlesUntilJackpot} battles
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">JACKPOT POOL</p>
            <p className="font-pixel text-sm text-glow-gold">
              🏆 {gameState.jackpotPool}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tutorial step 6 banner */}
      {isTutorialStep6 && (
        <div
          className="p-3 rounded-lg border text-xs text-center"
          style={{
            borderColor: "oklch(0.85 0.3 141 / 0.6)",
            background: "oklch(0.85 0.3 141 / 0.08)",
            color: "oklch(0.85 0.3 141)",
          }}
        >
          📍 Tutorial Battle — Follow the highlighted buttons!
        </div>
      )}

      {/* Jackpot animation */}
      <AnimatePresence>
        {showJackpot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setShowJackpot(false)}
          >
            <motion.div
              className="game-card game-card-gold p-8 text-center max-w-sm mx-4"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="text-6xl mb-4 animate-float">🏆</div>
              <h2 className="font-pixel text-lg text-glow-gold mb-3">
                JACKPOT!
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                You won the round 6 jackpot!
              </p>
              <p className="font-pixel text-2xl text-glow-gold">
                +{gameState.jackpotPool} SOIL
              </p>
              <button
                type="button"
                className="btn-neon-green mt-6 w-full py-3 rounded-md text-sm cursor-pointer"
                onClick={() => setShowJackpot(false)}
                data-ocid="battle.jackpot_close.button"
              >
                CLAIM REWARD 🎉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: Select Opponent */}
      {phase === "select_opponent" && !isTutorialStep6 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="game-card p-5">
            <h3 className="section-header mb-4">Choose Your Opponent</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AI_OPPONENTS.map((opp) => (
                <button
                  type="button"
                  key={opp.name}
                  className={`game-card border-2 ${opp.borderClass} p-4 text-left cursor-pointer hover:scale-[1.02] transition-transform`}
                  onClick={() => {
                    if (battlesLeft <= 0) {
                      toast.error("Daily battle limit reached!");
                      return;
                    }
                    setSelectedOpponent(opp);
                    setPhase("select_fertilizer");
                  }}
                  data-ocid={`battle.opponent_${opp.difficulty}.button`}
                >
                  <div className="text-4xl mb-2 text-center">{opp.emoji}</div>
                  <p
                    className={`font-pixel text-xs text-center mb-1 ${opp.colorClass}`}
                  >
                    {opp.name}
                  </p>
                  <p
                    className={`text-[9px] font-bold text-center mb-2 uppercase ${opp.colorClass}`}
                  >
                    [{opp.difficulty}]
                  </p>
                  <p className="text-[10px] text-muted-foreground text-center mb-3">
                    {opp.description}
                  </p>
                  <div className="text-[9px] space-y-1 border border-border rounded p-2">
                    <div className="flex justify-between">
                      <span>❤️ HP</span>
                      <span>{opp.hp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⚡ ATK</span>
                      <span>{opp.growthPower}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛡️ DEF</span>
                      <span>{opp.soilStability}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Battle history */}
          <div className="game-card p-4">
            <h3 className="section-header mb-2">Battle Record</h3>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="font-pixel text-2xl text-glow-green">
                  {gameState.battlesWon}
                </p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div className="text-center">
                <p
                  className="font-pixel text-2xl"
                  style={{ color: "oklch(0.65 0.25 22)" }}
                >
                  {gameState.battlesLost}
                </p>
                <p className="text-xs text-muted-foreground">Losses</p>
              </div>
              <div className="text-center">
                <p className="font-pixel text-2xl text-glow-gold">
                  {gameState.jackpotPool}
                </p>
                <p className="text-xs text-muted-foreground">Pool</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Phase: Select Fertilizer */}
      {phase === "select_fertilizer" && selectedOpponent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="game-card game-card-purple p-5">
            <div className="flex items-center gap-2 mb-4">
              {!isTutorialStep6 && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setPhase("select_opponent")}
                  data-ocid="battle.back.button"
                >
                  ←
                </button>
              )}
              <h3 className="section-header">
                {isTutorialStep6
                  ? "📍 Select your battle unit..."
                  : `Select Battle Unit vs ${selectedOpponent.emoji} ${selectedOpponent.name}`}
              </h3>
            </div>

            {availableFertilizers.length === 0 ? (
              <div
                className="text-center py-6"
                data-ocid="battle.fertilizers.empty_state"
              >
                <p className="text-3xl mb-2">🧪</p>
                <p className="text-sm text-muted-foreground mb-4">
                  No fertilizers! Visit the Lab to brew some.
                </p>
                <button
                  type="button"
                  className="btn-neon-purple px-6 py-2 rounded-md text-sm cursor-pointer"
                  onClick={() => onNavigate("lab")}
                  data-ocid="battle.goto_lab.button"
                >
                  Go to Lab 🧪
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {availableFertilizers.map((f, idx) => (
                  <button
                    type="button"
                    key={f.id}
                    className={`w-full p-3 rounded-lg border cursor-pointer text-left transition-all hover:scale-[1.01] ${
                      f.rarity === "legendary"
                        ? "border-yellow-500/60 hover:border-yellow-500"
                        : f.rarity === "epic"
                          ? "border-purple-500/60 hover:border-purple-500"
                          : f.rarity === "rare"
                            ? "border-blue-500/60 hover:border-blue-500"
                            : "border-border hover:border-muted-foreground"
                    } bg-muted/20`}
                    onClick={() => startBattle(selectedOpponent, f)}
                    data-ocid={`battle.unit.item.${idx + 1}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧪</span>
                      <div className="flex-1">
                        <div
                          className={`text-xs font-bold uppercase rarity-${f.rarity}`}
                        >
                          {f.rarity} Fertilizer
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          ⚡ ATK {f.growthPower} | 🛡️ DEF {f.soilStability} | 🦈
                          SP {f.microbeBoost}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        x{f.quantity}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Phase: Fighting */}
      {phase === "fighting" && selectedOpponent && selectedFertilizer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Battle stage */}
          <div className="game-card game-card-purple p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-header">Round {round}/5</h3>
              <span className="text-xs text-muted-foreground">
                {selectedFertilizer.rarity.toUpperCase()} vs{" "}
                {selectedOpponent.name}
              </span>
            </div>

            {/* Fighters */}
            <div className="grid grid-cols-2 gap-4 mb-6 relative">
              {/* Damage numbers */}
              {damageNumbers.map((d) => (
                <motion.div
                  key={d.id}
                  className={`absolute z-20 font-pixel text-sm pointer-events-none ${
                    d.isPlayer
                      ? "text-glow-green left-1/4"
                      : "right-1/4 text-red-400"
                  }`}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -40, opacity: 0 }}
                  transition={{ duration: 1.2 }}
                >
                  -{d.value}
                </motion.div>
              ))}

              {/* Player fighter */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-lg bg-[oklch(0.18_0.04_141)] flex items-center justify-center text-3xl border-2 border-[oklch(0.85_0.3_141_/_0.5)] mb-2 animate-float">
                  🧑‍🌾
                </div>
                <p className="text-xs font-semibold mb-2">
                  YOU (🧪 {selectedFertilizer.rarity})
                </p>
                <HPBar
                  current={playerHp}
                  max={playerMaxHp}
                  colorClass="hp-bar-player"
                />
              </div>

              {/* VS */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-pixel text-xs text-muted-foreground">
                VS
              </div>

              {/* Enemy fighter */}
              <div className="text-center">
                <div
                  className={`w-16 h-16 mx-auto rounded-lg bg-muted flex items-center justify-center text-3xl border-2 ${selectedOpponent.borderClass} mb-2`}
                  style={{
                    animation: isAttacking
                      ? "shake 0.3s ease-in-out"
                      : undefined,
                  }}
                >
                  {selectedOpponent.emoji}
                </div>
                <p
                  className={`text-xs font-semibold mb-2 ${selectedOpponent.colorClass}`}
                >
                  {selectedOpponent.name}
                </p>
                <HPBar
                  current={enemyHp}
                  max={enemyMaxHp}
                  colorClass="hp-bar-enemy"
                />
              </div>
            </div>

            {/* Action buttons */}
            {!winner && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn-neon-green py-3 rounded-md text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => doAttack(false)}
                  disabled={isAttacking}
                  data-ocid="battle.attack.button"
                  data-tutorial="attack-button"
                >
                  {isAttacking ? "⚔️..." : "⚔️ ATTACK"}
                </button>
                <button
                  type="button"
                  className={`py-3 rounded-md text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    specialReady
                      ? "btn-neon-purple"
                      : "border border-border text-muted-foreground"
                  }`}
                  onClick={() => doAttack(true)}
                  disabled={isAttacking || !specialReady}
                  data-ocid="battle.special.button"
                  data-tutorial="ability-button"
                >
                  {specialReady ? "🦈 MICROBE BOOST" : "⏳ COOLDOWN"}
                </button>
              </div>
            )}
          </div>

          {/* Battle log */}
          <div className="game-card p-4">
            <h3 className="section-header mb-2">Battle Log</h3>
            <div className="h-32 overflow-y-auto space-y-1">
              {battleLog.map((entry, idx) => (
                <p
                  key={`log-${entry.round}-${idx}`}
                  className="text-xs text-muted-foreground"
                >
                  {entry.message}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Phase: Result */}
      {phase === "result" && winner && selectedOpponent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div
            className={`game-card p-8 text-center ${
              winner === "player" ? "game-card-green" : "border-red-500/50"
            }`}
            data-ocid="battle.result.card"
          >
            <div className="text-5xl mb-4 animate-float">
              {winner === "player" ? "🏆" : "💥"}
            </div>
            <h2
              className="font-pixel text-lg mb-3"
              style={{
                color:
                  winner === "player"
                    ? "oklch(0.85 0.3 141)"
                    : "oklch(0.65 0.25 22)",
              }}
            >
              {winner === "player" ? "VICTORY!" : "DEFEATED"}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {winner === "player"
                ? `You defeated ${selectedOpponent.name}!`
                : `${selectedOpponent.name} was too powerful...`}
            </p>
            {winner === "player" && !isTutorialStep6 && (
              <p className="font-pixel text-xl text-glow-gold mb-4">
                +
                {selectedOpponent.difficulty === "hard"
                  ? 50
                  : selectedOpponent.difficulty === "medium"
                    ? 25
                    : 10}{" "}
                SOIL
              </p>
            )}
            {winner === "player" && isTutorialStep6 && (
              <p className="font-pixel text-base text-glow-gold mb-4">
                First Battle Complete! 🌱
              </p>
            )}
            {!isTutorialStep6 && (
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  className="btn-neon-green px-6 py-3 rounded-md text-sm cursor-pointer"
                  onClick={resetBattle}
                  data-ocid="battle.play_again.button"
                >
                  BATTLE AGAIN
                </button>
                <button
                  type="button"
                  className="btn-neon-purple px-6 py-3 rounded-md text-sm cursor-pointer"
                  onClick={() => onNavigate("dashboard")}
                  data-ocid="battle.goto_dashboard.button"
                >
                  DASHBOARD
                </button>
              </div>
            )}
          </div>

          {/* Battle summary */}
          {!isTutorialStep6 && (
            <div className="game-card p-4">
              <h3 className="section-header mb-3">Battle Summary</h3>
              <div className="space-y-1">
                {battleLog.map((entry, idx) => (
                  <p
                    key={`summary-${entry.round}-${idx}`}
                    className="text-xs text-muted-foreground"
                  >
                    {entry.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
