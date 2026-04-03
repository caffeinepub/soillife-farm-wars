import Int "mo:core/Int";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Float "mo:core/Float";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types and modules
  public type CropState = { #empty; #planted; #growing; #readyToHarvest };
  public type Plot = {
    index : Nat;
    state : CropState;
    cropType : ?Text;
    fertilizerId : ?Nat;
    growthStartTime : ?Time.Time;
    harvestTime : ?Time.Time;
  };

  public type PlayerProfile = {
    principal : Principal;
    soilBalance : Nat;
    battlesWon : Nat;
    battlesLost : Nat;
    harvests : Nat;
    evolutions : Nat;
    plots : [Plot];
    lastDailyReset : Time.Time;
  };

  module PlayerProfile {
    public func compare(a : PlayerProfile, b : PlayerProfile) : Order.Order {
      Int.compare(b.soilBalance, a.soilBalance);
    };
  };

  public type FertilizerRarity = { #common; #rare; #epic; #legendary };
  public type Fertilizer = {
    id : Nat;
    rarity : FertilizerRarity;
    growthPower : Nat;
    soilStability : Nat;
    microbeBoost : Nat;
    quantity : Nat;
    owner : Principal;
  };

  public type Fermentation = {
    id : Nat;
    player : Principal;
    startTime : Time.Time;
    duration : Nat;
    animalWaste : Nat;
    soil : Nat;
    water : Nat;
    fertilizerId : Nat;
  };

  public type JackpotClaim = {
    player : Principal;
    amount : Nat;
    time : Time.Time;
  };

  public type EvolutionTier = {
    tier : Nat;
    threshold : Nat;
    unlockedTime : ?Time.Time;
  };

  public type EvolutionState = {
    currentTier : Nat;
    meter : Nat;
    goalsReached : Nat;
    lastEvolution : Time.Time;
    tiers : [EvolutionTier];
  };

  public type JackpotState = {
    pool : Nat;
    lastWinner : ?Principal;
    lastClaim : ?Time.Time;
    totalClaims : Nat;
  };

  public type UserProfile = {
    name : Text;
  };

  func defaultPlot() : Plot {
    {
      index = 0;
      state = #empty;
      cropType = null;
      fertilizerId = null;
      growthStartTime = null;
      harvestTime = null;
    };
  };

  // Data storage
  let playerProfiles = Map.empty<Principal, PlayerProfile>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let allFertilizers = Map.empty<Nat, Fertilizer>();
  let globalFermentations = Map.empty<Nat, Fermentation>();
  let jackpotClaims = Map.empty<Principal, [JackpotClaim]>();

  var fermentationCounter = 0;
  var fertilizerCounter = 0;

  var globalJackpot : JackpotState = {
    pool = 0;
    lastWinner = null;
    lastClaim = null;
    totalClaims = 0;
  };

  var globalEvolutionState : EvolutionState = {
    currentTier = 1;
    meter = 0;
    goalsReached = 0;
    lastEvolution = 0;
    tiers = [];
  };

  // Utility functions
  func getPlayerProfileInternal(caller : Principal) : PlayerProfile {
    switch (playerProfiles.get(caller)) {
      case (null) { Runtime.trap("Player profile not found") };
      case (?profile) { profile };
    };
  };

  // Required user profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Public/common query functions (accessible to all, including guests)
  public query ({ caller }) func getPlayerProfile() : async ?PlayerProfile {
    playerProfiles.get(caller);
  };

  public query ({ caller }) func getFertilizerInventory() : async [Fertilizer] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inventory");
    };
    let callerBlob = caller.toBlob();
    allFertilizers.values().toArray().filter(
      func(f) {
        f.owner.toBlob() == callerBlob
      }
    );
  };

  public query ({ caller }) func getFarmPlots() : async [Plot] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view farm plots");
    };
    let profile = getPlayerProfileInternal(caller);
    profile.plots;
  };

  public query ({ caller }) func getActiveFermentations() : async [Fermentation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view fermentations");
    };
    let callerBlob = caller.toBlob();
    globalFermentations.values().toArray().filter(
      func(f) {
        f.player.toBlob() == callerBlob
      }
    );
  };

  public query ({ caller }) func getGlobalEvolutionState() : async EvolutionState {
    // Public read - no authorization needed
    globalEvolutionState;
  };

  public query ({ caller }) func getJackpotPool() : async JackpotState {
    // Public read - no authorization needed
    globalJackpot;
  };

  public query ({ caller }) func getLeaderboard() : async [PlayerProfile] {
    // Public read - no authorization needed
    playerProfiles.values().toArray().sort();
  };

  // Player Management
  public shared ({ caller }) func createPlayerProfile() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create profiles");
    };
    if (playerProfiles.containsKey(caller)) {
      Runtime.trap("Player profile already exists");
    };
    let plots = Array.repeat(0, 6).map(func(i) { defaultPlot() });
    let profile = {
      principal = caller;
      soilBalance = 100;
      battlesWon = 0;
      battlesLost = 0;
      harvests = 0;
      evolutions = 0;
      plots;
      lastDailyReset = Time.now();
    };
    playerProfiles.add(caller, profile);
  };

  // Farming functions
  public shared ({ caller }) func plantCrop(plotIndex : Nat, cropType : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can plant crops");
    };
    let profile = getPlayerProfileInternal(caller);
    if (plotIndex >= profile.plots.size()) {
      Runtime.trap("Invalid plot index");
    };

    let updatedPlots = profile.plots.map(
      func(p) {
        if (p.index == plotIndex) {
          {
            index = plotIndex;
            state = #planted;
            cropType = ?cropType;
            fertilizerId = null;
            growthStartTime = ?Time.now();
            harvestTime = null;
          };
        } else { p };
      }
    );
    let updatedProfile = {
      principal = profile.principal;
      soilBalance = profile.soilBalance;
      battlesWon = profile.battlesWon;
      battlesLost = profile.battlesLost;
      harvests = profile.harvests;
      evolutions = profile.evolutions;
      plots = updatedPlots;
      lastDailyReset = profile.lastDailyReset;
    };
    playerProfiles.add(caller, updatedProfile);
  };

  public shared ({ caller }) func harvestCrop(plotIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can harvest crops");
    };
    let profile = getPlayerProfileInternal(caller);
    if (plotIndex >= profile.plots.size()) {
      Runtime.trap("Invalid plot index");
    };

    let maybePlot = profile.plots.find(func(p) { p.index == plotIndex });
    let plot = switch (maybePlot) {
      case (null) { Runtime.trap("Plot not found") };
      case (?p) { p };
    };

    if (plot.state != #readyToHarvest) {
      Runtime.trap("Crop not ready for harvest");
    };

    let updatedPlots = profile.plots.map(
      func(p) {
        if (p.index == plotIndex) {
          {
            index = plotIndex;
            state = #empty;
            cropType = null;
            fertilizerId = null;
            growthStartTime = null;
            harvestTime = null;
          }
        } else { p };
      }
    );
    let updatedProfile = {
      principal = profile.principal;
      soilBalance = profile.soilBalance + 50;
      battlesWon = profile.battlesWon;
      battlesLost = profile.battlesLost;
      harvests = profile.harvests + 1;
      evolutions = profile.evolutions;
      plots = updatedPlots;
      lastDailyReset = profile.lastDailyReset;
    };
    playerProfiles.add(caller, updatedProfile);
    globalJackpot := {
      pool = globalJackpot.pool + 5;
      lastWinner = globalJackpot.lastWinner;
      lastClaim = globalJackpot.lastClaim;
      totalClaims = globalJackpot.totalClaims;
    };
  };

  // Fertilizer Management
  public shared ({ caller }) func createFertilizer(rarity : FertilizerRarity, growthPower : Nat, soilStability : Nat, microbeBoost : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create fertilizer");
    };
    fertilizerCounter += 1;
    let newId = fertilizerCounter;
    let fertilizer = {
      id = newId;
      rarity;
      growthPower;
      soilStability;
      microbeBoost;
      quantity = 1;
      owner = caller;
    };
    allFertilizers.add(newId, fertilizer);
    newId;
  };

  public shared ({ caller }) func applyFertilizer(plotIndex : Nat, fertilizerId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can apply fertilizer");
    };
    let profile = getPlayerProfileInternal(caller);
    if (plotIndex >= profile.plots.size()) {
      Runtime.trap("Invalid plot index");
    };
    ignore profile.plots.find(func(p) { p.index == plotIndex });

    let maybeFertilizer = allFertilizers.get(fertilizerId);
    let fertilizer = switch (maybeFertilizer) {
      case (null) { Runtime.trap("Fertilizer not found") };
      case (?f) { f };
    };

    if (fertilizer.owner.toBlob() != caller.toBlob()) {
      Runtime.trap("Not the owner of the fertilizer");
    };

    let updatedPlots = profile.plots.map(
      func(p) {
        if (p.index == plotIndex) {
          {
            index = plotIndex;
            state = p.state;
            cropType = p.cropType;
            fertilizerId = ?fertilizerId;
            growthStartTime = p.growthStartTime;
            harvestTime = p.harvestTime;
          };
        } else { p };
      }
    );
    let updatedProfile = {
      principal = profile.principal;
      soilBalance = profile.soilBalance;
      battlesWon = profile.battlesWon;
      battlesLost = profile.battlesLost;
      harvests = profile.harvests;
      evolutions = profile.evolutions;
      plots = updatedPlots;
      lastDailyReset = profile.lastDailyReset;
    };
    playerProfiles.add(caller, updatedProfile);
  };

  // Fermentation functions
  public shared ({ caller }) func startFermentation(animalWaste : Nat, soil : Nat, water : Nat, duration : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start fermentation");
    };
    fermentationCounter += 1;
    let newId = fermentationCounter;

    let fermentation = {
      id = newId;
      player = caller;
      startTime = Time.now();
      duration;
      animalWaste;
      soil;
      water;
      fertilizerId = 0;
    };
    globalFermentations.add(newId, fermentation);
    newId;
  };

  public shared ({ caller }) func completeFermentation(fermentationId : Nat, fertilizerId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can complete fermentation");
    };
    let maybeFermentation = globalFermentations.get(fermentationId);
    let fermentation = switch (maybeFermentation) {
      case (null) { Runtime.trap("Fermentation not found") };
      case (?f) { f };
    };

    if (fermentation.player.toBlob() != caller.toBlob()) {
      Runtime.trap("Not the owner of the fermentation");
    };

    let updatedFermentation = {
      id = fermentation.id;
      player = caller;
      startTime = fermentation.startTime;
      duration = fermentation.duration;
      animalWaste = fermentation.animalWaste;
      soil = fermentation.soil;
      water = fermentation.water;
      fertilizerId;
    };
    globalFermentations.add(fermentationId, updatedFermentation);
  };

  // Jackpot + Evolution
  public shared ({ caller }) func claimJackpot(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can claim jackpot");
    };
    if (amount > globalJackpot.pool) {
      Runtime.trap("Insufficient jackpot funds");
    };
    let claim = {
      player = caller;
      amount;
      time = Time.now();
    };
    let claims = switch (jackpotClaims.get(caller)) {
      case (null) { [claim] };
      case (?existingClaims) {
        existingClaims.concat([claim]);
      };
    };
    jackpotClaims.add(caller, claims);
    globalJackpot := {
      pool = globalJackpot.pool - amount;
      lastWinner = ?caller;
      lastClaim = ?Time.now();
      totalClaims = globalJackpot.totalClaims + 1;
    };
  };

  // Admin functions for game management
  public shared ({ caller }) func resetJackpot() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reset jackpot");
    };
    globalJackpot := {
      pool = 0;
      lastWinner = null;
      lastClaim = null;
      totalClaims = 0;
    };
  };

  public shared ({ caller }) func setEvolutionState(newState : EvolutionState) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set evolution state");
    };
    globalEvolutionState := newState;
  };
};
