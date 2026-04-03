import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Fertilizer {
    id: bigint;
    owner: Principal;
    growthPower: bigint;
    microbeBoost: bigint;
    quantity: bigint;
    rarity: FertilizerRarity;
    soilStability: bigint;
}
export type Time = bigint;
export interface EvolutionTier {
    threshold: bigint;
    tier: bigint;
    unlockedTime?: Time;
}
export interface PlayerProfile {
    battlesLost: bigint;
    principal: Principal;
    evolutions: bigint;
    lastDailyReset: Time;
    plots: Array<Plot>;
    harvests: bigint;
    soilBalance: bigint;
    battlesWon: bigint;
}
export interface EvolutionState {
    meter: bigint;
    tiers: Array<EvolutionTier>;
    lastEvolution: Time;
    currentTier: bigint;
    goalsReached: bigint;
}
export interface Plot {
    state: CropState;
    growthStartTime?: Time;
    cropType?: string;
    index: bigint;
    fertilizerId?: bigint;
    harvestTime?: Time;
}
export interface JackpotState {
    lastWinner?: Principal;
    pool: bigint;
    lastClaim?: Time;
    totalClaims: bigint;
}
export interface Fermentation {
    id: bigint;
    startTime: Time;
    duration: bigint;
    player: Principal;
    soil: bigint;
    animalWaste: bigint;
    fertilizerId: bigint;
    water: bigint;
}
export interface UserProfile {
    name: string;
}
export enum CropState {
    empty = "empty",
    planted = "planted",
    growing = "growing",
    readyToHarvest = "readyToHarvest"
}
export enum FertilizerRarity {
    epic = "epic",
    legendary = "legendary",
    rare = "rare",
    common = "common"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    applyFertilizer(plotIndex: bigint, fertilizerId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimJackpot(amount: bigint): Promise<void>;
    completeFermentation(fermentationId: bigint, fertilizerId: bigint): Promise<void>;
    createFertilizer(rarity: FertilizerRarity, growthPower: bigint, soilStability: bigint, microbeBoost: bigint): Promise<bigint>;
    createPlayerProfile(): Promise<void>;
    getActiveFermentations(): Promise<Array<Fermentation>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFarmPlots(): Promise<Array<Plot>>;
    getFertilizerInventory(): Promise<Array<Fertilizer>>;
    getGlobalEvolutionState(): Promise<EvolutionState>;
    getJackpotPool(): Promise<JackpotState>;
    getLeaderboard(): Promise<Array<PlayerProfile>>;
    getPlayerProfile(): Promise<PlayerProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    harvestCrop(plotIndex: bigint): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    plantCrop(plotIndex: bigint, cropType: string): Promise<void>;
    resetJackpot(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setEvolutionState(newState: EvolutionState): Promise<void>;
    startFermentation(animalWaste: bigint, soil: bigint, water: bigint, duration: bigint): Promise<bigint>;
}
