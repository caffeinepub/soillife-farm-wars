# SoilLife: Farm Wars — Tutorial / Onboarding Flow

## Current State

The app has 5 fully-functional tabs: Dashboard, Farm, Fermentation Lab, Battle Arena, Token Wallet. Authentication via Internet Identity is required. Game state persists to localStorage (`soillife_gamestate_v2`). There is no tutorial or first-run onboarding experience. New players are dropped directly into the Dashboard with no guidance.

`GameState` (types.ts) tracks resources (animalWaste, soil, water), soilBalance, fertilizers, fermentations, battleRoundCount, battlesWon, dailyCollections, etc. The `TabId` type covers `dashboard | farm | lab | battle | wallet`. App.tsx wires `onNavigate` into Dashboard and BattleArena.

## Requested Changes (Diff)

### Add
- `tutorialStep` field to `GameState` (number, 0 = not started, 1–10 = active steps, 11 = completed)
- `tutorialCompleted` boolean field to `GameState`
- `Tutorial.tsx` component — a full-screen overlay/modal-driven flow that renders above all tabs and drives the player through 10 steps:
  1. **Welcome Screen** — full modal: "Welcome to SoilLife: Farm Wars 🌱", tagline, "Start Farming" button
  2. **Resource Collection** — overlay pointing at Dashboard resource cards (Animal Waste, Soil, Water); player taps each to collect; requires 1 of each; reward: +10 XP (evolutionMeter), +10 SOIL
  3. **Fermentation Lab** — navigates to Lab tab; overlay highlights "Start Fermentation" button; short 8-second timer instead of normal duration; shows bubbling + glow animation on completion; output: "You created Common Fertilizer"
  4. **First Mutation** — immediately after fermentation completes; guaranteed upgrade from common → rare; full-screen glow effect animation; message: "Something is happening..." → "Rare Fertilizer!"; explanation text
  5. **Prepare for Battle** — modal showing the newly created Rare Fertilizer converted to a Bio Unit with stats (Attack, Defense, Ability)
  6. **First Battle** — navigates to Battle Arena; guided turn-by-turn: Turn 1 highlights "Attack" button, Turn 2 highlights "Special Ability"; AI opponent is set to easy; player is guaranteed to win
  7. **Reward Screen** — full-screen dopamine modal: "Victory!", +SOIL tokens, +XP, celebration animation (confetti/particles)
  8. **Jackpot Intro** — modal: "Every 6 battles = Jackpot 💰", shows 6-battle countdown, "Keep playing to qualify"
  9. **Daily Reward** — modal: Day 1 reward granted (+50 SOIL), "Come back daily for bigger rewards"
  10. **Free Play Unlock** — final modal: "You are now a Soil Farmer. Grow stronger and dominate the arena.", dismiss to enter free play
- Tutorial highlight system: semi-transparent dark overlay with a "spotlight" cutout highlighting the relevant UI element by CSS selector or data-ocid attribute, with an animated pulse ring
- Tutorial step indicator (small dots or step count) shown during active tutorial
- "Skip Tutorial" option available from step 2 onward
- Tutorial state persists in gameStorage so refresh doesn't reset progress mid-tutorial

### Modify
- `GameState` interface in `types.ts` — add `tutorialStep: number` and `tutorialCompleted: boolean`
- `gameStorage.ts` — add `tutorialStep: 0` and `tutorialCompleted: false` to the default initial state; for new installs, `tutorialStep` starts at 0 (triggers tutorial on first login)
- `App.tsx` — import and render `<Tutorial>` overlay above the main content when `!gameState.tutorialCompleted`; pass `gameState`, `setGameState`, `onNavigate` (setActiveTab) props
- `Dashboard.tsx` — add `data-tutorial="resource-waste"`, `data-tutorial="resource-soil"`, `data-tutorial="resource-water"` attributes to the three resource collection buttons/cards for the spotlight highlight system
- `FermentationLab.tsx` — add `data-tutorial="start-fermentation"` to the Start Fermentation button; when `gameState.tutorialStep === 3`, override fermentation duration to 8 seconds
- `BattleArena.tsx` — add `data-tutorial="attack-button"` and `data-tutorial="ability-button"` to relevant action buttons; when `gameState.tutorialStep === 6`, force easy AI and guarantee player win

### Remove
- Nothing removed

## Implementation Plan

1. Update `types.ts` — add `tutorialStep: number` and `tutorialCompleted: boolean` to `GameState`
2. Update `gameStorage.ts` — add defaults `tutorialStep: 0, tutorialCompleted: false` to initial state
3. Create `src/frontend/src/components/Tutorial.tsx`:
   - State machine: tracks current step (1–10), driven by `gameState.tutorialStep`
   - Step 1: Full overlay modal (welcome)
   - Steps 2–10: Either full modals or spotlight overlay pointing at specific UI elements
   - Spotlight system: renders a dark overlay with a transparent hole over the target element, found via `data-tutorial` attribute
   - Animated pulse ring on highlighted element
   - All step transitions update `gameState.tutorialStep` via `setGameState`
   - Step 2 (resources): listens for resource collection events (detects when animalWaste/soil/water each increase by at least 1 from tutorial start baseline); grants +10 evolutionMeter and +10 soilBalance on completion
   - Step 3 (fermentation): auto-navigates to lab tab, waits for fermentation to complete (tutorialStep advances when a fermentation process finishes)
   - Step 4 (mutation): auto-fires after step 3; upgrades last-added fertilizer rarity to "rare" via setGameState
   - Step 5 (bio unit prep): modal shows unit stats derived from rare fertilizer stats
   - Step 6 (battle): auto-navigates to battle tab; BattleArena reads `tutorialStep === 6` to use guaranteed-win mode
   - Step 7 (reward): fires after battle win; shows reward modal with animation
   - Steps 8–10: sequential modals, each dismissed with a button
   - Step 10 completion: sets `tutorialCompleted: true`, `tutorialStep: 11` in gameState
   - "Skip Tutorial" button (step 2+) sets `tutorialCompleted: true` immediately
4. Update `App.tsx` — render `<Tutorial>` above main content when `!gameState.tutorialCompleted`
5. Add `data-tutorial` attributes to Dashboard resource cards, FermentationLab start button, BattleArena action buttons
6. FermentationLab: check `tutorialStep === 3` to force 8s timer
7. BattleArena: check `tutorialStep === 6` to use easy AI + forced win
8. Validate (lint + typecheck + build)
