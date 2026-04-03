import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PlayerProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import type { SharedProps, TransactionEntry } from "./types";

interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  effect: string;
}

const UPGRADES: Upgrade[] = [
  {
    id: "speed_boost",
    name: "Speed Boost",
    emoji: "⚡",
    description: "Doubles fermentation speed for 1 hour.",
    cost: 100,
    effect: "2x fermentation speed",
  },
  {
    id: "mutation_booster",
    name: "Mutation Booster",
    emoji: "🧬",
    description: "+5% legendary chance for 3 fermentations.",
    cost: 200,
    effect: "+5% legendary chance (3x)",
  },
  {
    id: "extra_plot",
    name: "Extra Plot",
    emoji: "🌿",
    description: "Cosmetic: unlocks special golden plot frame.",
    cost: 500,
    effect: "Golden plot cosmetic",
  },
];

function truncatePrincipal(p: string): string {
  return `${p.slice(0, 5)}...${p.slice(-4)}`;
}

function txTypeColor(type: "earned" | "spent") {
  return type === "earned" ? "text-glow-green" : "text-red-400";
}

export default function TokenWallet({ gameState, setGameState }: SharedProps) {
  const { actor: queryActor } = useActor();

  const { data: leaderboard, isLoading: lbLoading } = useQuery<PlayerProfile[]>(
    {
      queryKey: ["leaderboard"],
      queryFn: async () => {
        if (!queryActor) return [];
        return queryActor.getLeaderboard();
      },
      enabled: !!queryActor,
      staleTime: 30_000,
    },
  );

  const handleBuyUpgrade = (upgrade: Upgrade) => {
    if (gameState.soilBalance < upgrade.cost) {
      toast.error(
        `Not enough SOIL! Need ${upgrade.cost}, have ${gameState.soilBalance}.`,
      );
      return;
    }

    const alreadyOwned = gameState.activeUpgrades.find(
      (u) => u.type === (upgrade.id as any),
    );
    if (alreadyOwned && upgrade.id !== "mutation_booster") {
      toast.info(`${upgrade.name} is already active!`);
      return;
    }

    setGameState((prev) => {
      const newUpgrade =
        upgrade.id === "speed_boost"
          ? { type: "speed_boost" as const, expiresAt: Date.now() + 3600_000 }
          : upgrade.id === "mutation_booster"
            ? { type: "mutation_booster" as const, remainingUses: 3 }
            : { type: "extra_plot" as const };

      return {
        ...prev,
        soilBalance: prev.soilBalance - upgrade.cost,
        activeUpgrades: [...prev.activeUpgrades, newUpgrade],
        transactions: [
          {
            id: Date.now().toString(),
            type: "spent" as const,
            amount: upgrade.cost,
            reason: `Bought ${upgrade.name}`,
            timestamp: Date.now(),
          },
          ...prev.transactions,
        ].slice(0, 50),
      };
    });
    toast.success(`✨ ${upgrade.name} activated!`);
  };

  const sortedLeaderboard = leaderboard
    ? [...leaderboard].sort(
        (a, b) => Number(b.soilBalance) - Number(a.soilBalance),
      )
    : [];

  const recentTxs = gameState.transactions.slice(0, 20);

  return (
    <div className="space-y-5" data-ocid="wallet.section">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl animate-float">💰</span>
          <div>
            <h2 className="section-header">SOIL Token Wallet</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earn SOIL by farming, battling, and brewing.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Balance hero */}
      <div className="game-card game-card-gold p-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">YOUR BALANCE</p>
        <p className="font-pixel text-4xl text-glow-gold">
          {gameState.soilBalance.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">💰 SOIL Tokens</p>
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <span>↔️ {gameState.transactions.length} transactions</span>
          <span>⚔️ {gameState.battlesWon} victories</span>
        </div>
      </div>

      {/* Active Upgrades */}
      {gameState.activeUpgrades.length > 0 && (
        <div className="game-card game-card-purple p-4">
          <h3 className="section-header mb-3">Active Upgrades</h3>
          <div className="space-y-2">
            {gameState.activeUpgrades.map((u, i) => {
              const upg = UPGRADES.find((up) => up.id === u.type);
              if (!upg) return null;
              const isExpired = u.expiresAt ? Date.now() > u.expiresAt : false;
              if (isExpired) return null;
              return (
                <div
                  key={`upgrade-${i}-${u.type}`}
                  className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border"
                  data-ocid={`wallet.upgrade.item.${i + 1}`}
                >
                  <span className="text-xl">{upg.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{upg.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {upg.effect}
                    </p>
                  </div>
                  {u.expiresAt && (
                    <Badge variant="outline" className="text-[9px]">
                      {Math.max(
                        0,
                        Math.round((u.expiresAt - Date.now()) / 60000),
                      )}
                      m left
                    </Badge>
                  )}
                  {u.remainingUses !== undefined && (
                    <Badge variant="outline" className="text-[9px]">
                      {u.remainingUses}x left
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrades Shop */}
      <div className="game-card game-card-cyan p-5">
        <h3 className="section-header mb-4">Upgrade Shop</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {UPGRADES.map((upg, idx) => {
            const canAfford = gameState.soilBalance >= upg.cost;
            return (
              <div
                key={upg.id}
                className={`p-4 rounded-lg border transition-all ${
                  canAfford
                    ? "border-border hover:border-muted-foreground"
                    : "border-border opacity-60"
                } bg-muted/20`}
                data-ocid={`wallet.upgrade_shop.item.${idx + 1}`}
              >
                <div className="text-3xl mb-2 text-center">{upg.emoji}</div>
                <p className="text-xs font-bold text-center mb-1">{upg.name}</p>
                <p className="text-[10px] text-muted-foreground text-center mb-3">
                  {upg.description}
                </p>
                <p className="text-center text-glow-gold font-pixel text-xs mb-3">
                  {upg.cost} SOIL
                </p>
                <button
                  type="button"
                  className={`w-full py-2 rounded-md text-xs cursor-pointer ${
                    canAfford
                      ? "btn-neon-green"
                      : "border border-border text-muted-foreground cursor-not-allowed"
                  }`}
                  onClick={() => handleBuyUpgrade(upg)}
                  disabled={!canAfford}
                  data-ocid={`wallet.buy_${upg.id}.button`}
                >
                  {canAfford ? "BUY" : "NEED MORE SOIL"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction history */}
      <div className="game-card p-5">
        <h3 className="section-header mb-3">Transaction History</h3>
        {recentTxs.length === 0 ? (
          <div
            className="text-center py-6"
            data-ocid="wallet.transactions.empty_state"
          >
            <p className="text-3xl mb-2">📄</p>
            <p className="text-sm text-muted-foreground">
              No transactions yet. Start farming!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTxs.map((tx, idx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                data-ocid={`wallet.transaction.item.${idx + 1}`}
              >
                <span>{tx.type === "earned" ? "⬆️" : "⬇️"}</span>
                <div className="flex-1">
                  <p className="text-xs">{tx.reason}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-pixel ${txTypeColor(tx.type)}`}>
                  {tx.type === "earned" ? "+" : "-"}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="game-card game-card-green p-5">
        <h3 className="section-header mb-4">Leaderboard</h3>
        {lbLoading ? (
          <div
            className="text-center py-6"
            data-ocid="wallet.leaderboard.loading_state"
          >
            <div className="text-2xl animate-spin-slow mb-2">🌱</div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : sortedLeaderboard.length === 0 ? (
          <div
            className="text-center py-6"
            data-ocid="wallet.leaderboard.empty_state"
          >
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-sm text-muted-foreground">
              No players ranked yet. Be the first!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLeaderboard.slice(0, 10).map((player, idx) => {
              const rank = idx + 1;
              const rankEmoji =
                rank === 1
                  ? "🥇"
                  : rank === 2
                    ? "🥈"
                    : rank === 3
                      ? "🥉"
                      : `#${rank}`;
              return (
                <div
                  key={player.principal.toString()}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    rank <= 3 ? "bg-muted/30 border border-border" : ""
                  }`}
                  data-ocid={`wallet.leaderboard.item.${idx + 1}`}
                >
                  <span className="text-lg w-8 text-center">{rankEmoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-mono">
                      {truncatePrincipal(player.principal.toString())}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ⚔️ {Number(player.battlesWon)}W 🌾{" "}
                      {Number(player.harvests)} harvests
                    </p>
                  </div>
                  <span className="font-pixel text-sm text-glow-gold">
                    {Number(player.soilBalance).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
