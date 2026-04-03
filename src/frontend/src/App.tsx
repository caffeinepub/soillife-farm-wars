import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import BattleArena from "./components/BattleArena";
import Dashboard from "./components/Dashboard";
import Farm from "./components/Farm";
import FermentationLab from "./components/FermentationLab";
import TokenWallet from "./components/TokenWallet";
import Tutorial from "./components/Tutorial";
import { loadGameState, saveGameState } from "./components/gameStorage";
import type { TabId } from "./components/tabTypes";
import type { GameState } from "./components/types";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

const NAV_ITEMS: { id: TabId; label: string; emoji: string }[] = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠" },
  { id: "farm", label: "Farm", emoji: "🌱" },
  { id: "lab", label: "Lab", emoji: "🧪" },
  { id: "battle", label: "Battle", emoji: "⚔️" },
  { id: "wallet", label: "Wallet", emoji: "💰" },
];

function LoginScreen({
  onLogin,
  isLoggingIn,
}: { onLogin: () => void; isLoggingIn: boolean }) {
  return (
    <div className="min-h-screen soil-bg flex items-center justify-center p-4">
      <div className="vignette" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center max-w-md w-full"
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="text-6xl mb-4 animate-float">🌱</div>
          <h1 className="logo-pixel text-3xl mb-2 leading-relaxed">
            SOIL LIFE
          </h1>
          <p className="font-pixel text-xs text-glow-purple mt-3">FARM WARS</p>
        </div>

        {/* Tagline */}
        <div className="game-card game-card-green p-6 mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Grow powerful liquid fertilizers. Command living Bio-Weapons. Battle
            for the ultimate Soil Jackpot.
          </p>
          <div className="flex justify-center gap-6 text-2xl mb-2">
            <span title="Farm">🌾</span>
            <span title="Ferment">🧪</span>
            <span title="Battle">⚔️</span>
            <span title="Tokens">💰</span>
          </div>
        </div>

        {/* Login button */}
        <button
          type="button"
          className="btn-neon-green w-full py-4 px-8 rounded-lg font-pixel text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={onLogin}
          disabled={isLoggingIn}
          data-ocid="login.primary_button"
        >
          {isLoggingIn ? "CONNECTING..." : "▶ PLAY NOW"}
        </button>

        <p className="text-xs text-muted-foreground mt-4 opacity-70">
          Secured by Internet Identity
        </p>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [profileCreated, setProfileCreated] = useState(false);

  // Persist game state
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Create profile when actor available and logged in
  useEffect(() => {
    if (actor && identity && !profileCreated) {
      setProfileCreated(true);
      actor.createPlayerProfile().catch(() => {
        // Safe to ignore — already exists
      });
    }
  }, [actor, identity, profileCreated]);

  // Reset daily counters if new day
  useEffect(() => {
    const today = new Date().toDateString();
    if (gameState.lastResetDate !== today) {
      setGameState((prev) => ({
        ...prev,
        lastResetDate: today,
        dailyCollections: 0,
        dailyFermentations: 0,
        dailyBattles: 0,
      }));
    }
  }, [gameState.lastResetDate]);

  const handleLogout = () => {
    clear();
    toast.success("Logged out. See you back on the farm! 🌱");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen soil-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin-slow">🌱</div>
          <p className="font-pixel text-xs text-glow-green">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <>
        <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} />
        <Toaster />
      </>
    );
  }

  const principalStr = identity.getPrincipal().toString();
  const shortPrincipal = `${principalStr.slice(0, 6)}...${principalStr.slice(-4)}`;

  return (
    <div className="min-h-screen soil-bg flex flex-col">
      <div className="vignette" />

      {/* Tutorial overlay — renders above everything */}
      {!gameState.tutorialCompleted && (
        <Tutorial
          gameState={gameState}
          setGameState={setGameState}
          onNavigate={setActiveTab}
          activeTab={activeTab}
        />
      )}

      {/* Header Nav */}
      <header className="relative z-20 sticky top-0 bg-[oklch(0.09_0.01_260_/_0.95)] backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-2 md:gap-3">
          {/* Logo */}
          <div className="flex-shrink-0 mr-1">
            <span className="logo-pixel text-sm md:text-base">SOIL</span>
            <span className="font-pixel text-[8px] block text-glow-purple -mt-1">
              FARM WARS
            </span>
          </div>

          {/* Nav Pills */}
          <nav className="flex items-center gap-1 overflow-x-auto flex-1">
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`nav-pill ${
                  activeTab === item.id
                    ? item.id === "dashboard" || item.id === "farm"
                      ? "active-green"
                      : "active-purple"
                    : ""
                }`}
                onClick={() => setActiveTab(item.id)}
                data-ocid={`nav.${item.id}.link`}
              >
                <span className="mr-1">{item.emoji}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* SOIL balance display */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="text-glow-gold font-pixel text-[9px] hidden md:block">
              💰 {gameState.soilBalance.toLocaleString()}
            </span>
            <button
              type="button"
              className="btn-neon-purple px-3 py-1.5 rounded-md text-xs cursor-pointer"
              onClick={handleLogout}
              data-ocid="nav.logout_button"
              title={`Logged in as ${shortPrincipal}`}
            >
              <span className="hidden sm:inline">LOGOUT</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-3 py-4 md:px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && (
              <Dashboard
                gameState={gameState}
                setGameState={setGameState}
                actor={actor}
                principal={shortPrincipal}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === "farm" && (
              <Farm
                gameState={gameState}
                setGameState={setGameState}
                actor={actor}
              />
            )}
            {activeTab === "lab" && (
              <FermentationLab
                gameState={gameState}
                setGameState={setGameState}
                actor={actor}
              />
            )}
            {activeTab === "battle" && (
              <BattleArena
                gameState={gameState}
                setGameState={setGameState}
                actor={actor}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === "wallet" && (
              <TokenWallet
                gameState={gameState}
                setGameState={setGameState}
                actor={actor}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-auto py-4 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-glow-green hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      <Toaster theme="dark" />
    </div>
  );
}
