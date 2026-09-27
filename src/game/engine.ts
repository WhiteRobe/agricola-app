// ---- 行动 / 原料 → 中文 ----
// 仅用于 pushLog 与错误提示里的中文渲染；动作协议 token 仍保持英文。
const ACTION_NAME_ZH: Record<string, string> = {
  Wood: "木材", Clay: "陶土", Reed: "芦苇", Stone: "石材", Grain: "谷物", Vegetable: "蔬菜",
  Fishing: "钓鱼", DayLaborer: "日工",
  Sheep: "羊市", Boar: "猪市", Cattle: "牛市",
  StartPlayer: "起始玩家",
  BuildRoom: "建房间/马厩", PlowField: "犁地", SowOrBake: "播种/烤面包",
  Fences: "建栅栏", FamilyGrowth: "添丁", Renovate: "翻修", BuildMajor: "大改进",
  EasternQuarry: "东采石场", PlowAndSow: "犁田及/或撒种", UrgentGrowth: "急迫添丁", RenovateFences: "翻修及/或栅栏",
  GatherFuel: "收集燃料", CutMeadow: "割草甸", ReclaimMoor: "沼泽拓荒", SowMoor: "沼泽播种",
  MoorResourceMarket: "资源市场", Occupation: "职业", SideJob: "副业",
  Ore: "采矿", Season: "节气行动",
};
const ANIMAL_ZH: Record<string, string> = { sheep: "绵羊", boar: "野猪", cattle: "黄牛", horse: "马", vegetable: "蔬菜" };
function zhAction(id: string): string { return ACTION_NAME_ZH[id] || id; }
function zhAnimal(k: string): string { return ANIMAL_ZH[k] || k; }

// ============================================================
// Agricola 游戏引擎 — 完整版（家庭变体）
// ============================================================
import type { RoomState } from "../dos";
import {
  FARM_W, FARM_H, MAX_FAMILY, MAX_STABLES,
  FOOD_PER_FAMILY, FOOD_PER_BABY_THIS_HARVEST,
  GRAIN_TO_FOOD, VEG_TO_FOOD, BEGGING_PENALTY, START_PLAYER_FOOD,
  ROOM_COST, RENO_COST, STABLE_COST_WOOD,
  FENCE_COST_WOOD, FENCE_MAX,
  FIELDS_PER_PLOW, SOW_GRAIN_TOTAL, SOW_VEG_TOTAL,
  SOW_GRAIN_NEW, SOW_GRAIN_ADDX, SOW_VEG_NEW, SOW_VEG_ADDX,
  STAGE_OF_ROUND, HARVEST_AFTER,
  LEFT_BOARD, ANIMAL_MARKET, MAJOR_IMPROVEMENTS,
  SCORE, animalScore, startingFood, type AnimalType,
  ANIMAL_CAPACITY_PER_CELL, ANIMAL_CAPACITY_STABLE_BONUS,
  SCALING_BOARD_SPACES,
} from "./constants";
import {
  makeEdges, cloneEdges, countEdges, computePastures,
  validateEnclosure, edgeId, parseEdgeId,
} from "./grid";
import { DEFAULT_DLC, OCCUPATIONS, MINOR_IMPROVEMENTS, MOOR_MINOR_IMPROVEMENTS, sample, type DlcConfig, type Occupation, type MinorImprovement } from "./dlc";

// ---------- 类型 ----------
export interface PlayerState {
  id: string;
  name: string;
  seat: number;
  food: number;
  resources: { wood: number; clay: number; reed: number; stone: number; grain: number; vegetable: number };
  animals: Record<AnimalType, number>;
  family: number; // 总人数（已放置的家人）
  babiesThisRound: number; // 当前收获出生的婴儿数量
  rooms: number; // 房间数（含初始 2 间木屋）
  roomType: "wood" | "clay" | "stone";
  stables: number;
  grid: { kind: "empty" | "room" | "field" | "void"; terrain?: "forest" | "moor"; forestLayers?: number; buriedMoor?: boolean; crop?: "grain" | "vegetable"; markers?: number; stable?: boolean; fallowFood?: number; pendingFood?: number; pendingFuel?: number; blockedBy?: "grave" | "archaeology" }[][];
  baseFarmOrigin?: { x: number; y: number };
  edges: { h: boolean[][]; v: boolean[][] };
  pastures: { id: string; cells: string[]; animal?: AnimalType | "horse" }[];
  pastureAnimalCells: Record<string, string[]>; // 动物所在牧场分配（id -> cellList）
  horsePastureCells?: Record<string, number>;
  beggings: number;
  improvements: (keyof typeof MAJOR_IMPROVEMENTS)[];
  startingPlayer: boolean;
  usedStartPlayer: boolean;
  usedSpaces: string[]; // 本轮已被占用的行动格
  // ===== Farmers of the Moor（仅 dlc.moor=true 时使用） =====
  fuel: number;
  horses: number;
  sick: number;
  moorEnabled: boolean;
  moorStartCard?: number;
  moorBonusVP: number;
  kilnBonusVP?: number;
  churchSpendFuel: boolean;
  heatPlan?: number;
  moorScheduled?: { round: number; kind: "wood" | "clay" | "reed" | "stone" | "grain" | "vegetable" | "food" | "fuel" | "horse" | "forest" | "moor" | "field" | "cutpeat" | "offerSheep" | "offerBoar" | "offerCattle" | "offerHorse"; amount: number }[];
  pendingTerrain?: ("forest" | "moor" | "field")[];
  pendingCutPeat?: number;
  pendingAnimalOffers?: ("sheep" | "boar" | "cattle" | "horse")[];
  pendingSow?: { onlyCell?: string }[];
  pendingPlow?: number;
  pendingHorsePurchase?: number;
  pendingDeepPlow?: number;
  pendingFreeStables?: number;
  pendingHayWagon?: number;
  guestForestCell?: string;
  guestForestLayer?: number;
  guestWorkersThisRound?: number;
  reservedMajor?: "tiledOven" | "villageChurch";
  reservedMajorRound?: number;
  reservedMajorAvailable?: boolean;
  pendingButcher?: boolean;
  optionalButcher?: boolean;
  moorAnimalSpaces?: { kind: "forest" | "night"; animal: AnimalType | "horse"; cell?: string; ownerId?: string }[];
  implementSpecial?: boolean;
  tapsSpecial?: boolean;
  specialPastureRestriction?: boolean;
  moorUses?: Record<string, number>;
  bogPonies?: number;
  firewoodUse?: boolean;
  distilleryHarvest?: boolean;
  distilleryScorePlan?: number;
  routineChoice?: "food" | "fuel";
  /** 水井剩余轮次：每轮开始 +1 食物，共 5 轮（建成时设置） */
  wellRounds: number;
  /** 已打出并在场生效的职业（支持多张在场） */
  occupations: Occupation[];
  /** 玩家当前私密手牌（职业卡池） */
  occupationHand: Occupation[];
  /** 玩家已建造在场的小发展卡 */
  minorImprovements: string[];
  /** 玩家当前私密手牌（小发展卡池） */
  minorHand: MinorImprovement[];
  /** 兼容历史单职业字段 */
  occupation?: { id: string; name: string; icon: string; effect: string };
  /** DLC（节气轮转）：假期行动累积的额外胜利点（终局计入总分） */
  seasonVP: number;
  log: { t: number; msg: string }[];
}

function hasOccupation(p: PlayerState, id: string): boolean {
  return (p.occupations || []).some(card => card.id === id) || p.occupation?.id === id;
}

const MOOR_MINOR_BY_ID = new Map(MOOR_MINOR_IMPROVEMENTS.map(card => [card.id, card]));
// 官方九张起始卡的正面布局，按卡面从上到下、从左到右记录；F=森林，M=沼泽。
// 卡面右下角的两格固定为起始木屋。图源：Agricola (Original Edition) + Expansions
// Tabletop Simulator 模组中「Farmers of the Moor Start Deck」的九张实物扫描。
const MOOR_START_LAYOUTS = [
  ["..F", "FFF", ".F.", "MM.", "M.."],
  ["..F", "F.F", "FM.", "FMM", "..."],
  ["FFF", "F..", "FMM", "..M", "..."],
  ["MM.", "MFF", "...", "FFF", "..."],
  ["FFF", "FMF", ".M.", ".M.", "..."],
  ["FFF", "MM.", "M..", "F..", "F.."],
  [".FF", "..F", "MMM", "FF.", "..."],
  ["FF.", ".MM", ".MF", ".FF", "..."],
  ["...", ".M.", "MMF", "FFF", "F.."],
];
// 单人游戏使用十张特殊行动卡；马市费用、集市食物依卡面而异。
// 同上模组的「Farmers of the Moor Action Spaces」实物扫描，按卡面顺序记录。
const MOOR_SOLO_SPECIAL_CARDS = [
  { id: "solo1", actions: ["FellTrees", "SlashBurn", "CutPeat"] },
  { id: "solo2", actions: ["HorseMarket", "HiringFair", "BlackMarket", "IllicitWork"], horseFee: 1 },
  { id: "solo3", actions: ["HorseMarket", "SlashBurn", "CutPeat"] },
  { id: "solo4", actions: ["FellTrees", "HiringFair", "BlackMarket", "IllicitWork"], hiringFood: 2 },
  { id: "solo5", actions: ["HorseMarket", "FellTrees"] },
  { id: "solo6", actions: ["HiringFair", "BlackMarket", "IllicitWork"] },
  { id: "solo7", actions: ["SlashBurn", "CutPeat"] },
  { id: "solo8", actions: ["HorseMarket"], horseFee: 1 },
  { id: "solo9", actions: ["HiringFair", "FellTrees"] },
  { id: "solo10", actions: ["BlackMarket", "IllicitWork"] },
];
// 沼泽扩展的 117 张小发展卡均已接入规则结算。
const MOOR_PLAYABLE_IDS = new Set([
  "M019", "M020", "M022", "M023", "M024", "M025", "M026", "M028", "M029",
  "M065", "M067", "M072", "M080", "M088", "M099", "M100", "M115", "M116",
  "M120", "M122", "M124", "M083", "M085", "M086", "M087", "M089", "M097",
  "M103", "M110", "M114", "M128", "M130",
  "M075", "M076", "M077", "M078", "M094",
  "M015", "M016", "M017", "M021", "M043", "M095",
  "M036", "M040", "M068", "M107",
  "M081", "M090", "M125", "M126",
  "M018", "M027",
  "M052", "M066", "M079", "M112", "M121", "M123", "M069", "M113",
  "M098", "M109", "M117", "M118", "M119", "M127",
  "M071", "M073", "M074",
  "M082", "M084",
  "M091", "M092", "M096",
  "M064", "M070",
  "M044", "M045", "M048", "M049",
  "M056", "M131",
  "M035", "M102", "M104",
  "M041", "M058", "M059", "M060", "M129",
  "M030", "M031",
  "M046", "M047",
  "M042",
  "M111",
  "M032",
  "M105", "M106",
  "M108",
  "M037",
  "M093",
  "M061",
  "M038", "M039",
  "M055",
  "M053",
  "M062", "M063",
  "M101",
  "M054", "M057",
  "M033", "M034",
  "M050", "M051",
]);

export interface EngineAction {
  type: string;
  [k: string]: unknown;
}

export interface ActionResult {
  ok: boolean;
  msg?: string;
}

export interface GameState {
  engine: "agricola";
  engineVer: string;
  numPlayers: number;
  stage: number;
  round: number;
  waitingFor: string[]; // pid[]
  immediateSpecialFor?: string;
  setupPending?: string[];
  setupDecks?: { occupations: Occupation[]; moor: MinorImprovement[]; normal: MinorImprovement[] };
  setupDiscards?: { occupations: Occupation[]; moor: MinorImprovement[]; normal: MinorImprovement[] };
  placedThisRound: string[];
  usedSpaces: string[]; // ★ 本轮已被占用的行动格
  spaceOccupants?: Record<string, string>; // 行动格被谁占用：spaceId -> playerId
  revealed: string[]; // 已揭示的回合卡（行动空间名称）
  supply: { wood: number; clay: number; reed: number; stone: number; grain: number; vegetable: number; sheep: number; boar: number; cattle: number; food: number };
  /**
   * 各行动格上的「累积堆」：每轮补充阶段 +1，取用时**拿走全部**并清零。
   * 这是 Agricola 的核心机制 —— 抢的时机决定收益多少。
   */
  piles: {
    Wood: number; Clay: number; Reed: number; Stone: number;
    Fishing: number;
    Sheep: number; Boar: number; Cattle: number;
    EasternQuarry?: number;
    [k: string]: number | undefined;
  };
  roundDeck: string[]; // 14 轮洗好的回合卡（按 Stage 洗牌生成）
  startPlayerId: string | null;
  players: PlayerState[];
  harvestQueue: number[]; // 本轮收获顺序（family size 升序）
  log: { t: number; msg: string }[];
  finished: boolean;
  scores?: { id: string; name: string; total: number; breakdown: Record<string, number> }[];
  /** DLC 配置：开局从主持人勾选项带入 */
  dlc: DlcConfig;
  // ===== Through the Seasons（仅 dlc.seasons=true 时使用） =====
  /** 起始季节在四季序列中的偏移（0=春 1=夏 2=秋 3=冬），开局随机；第 r 轮的季节 = (seasonStart + r - 1) % 4 */
  seasonStart: number;
  /** 当前轮的季节（每轮 startRound 时刷新；"none" 表示未启用节气 DLC） */
  season: "spring" | "summer" | "autumn" | "winter" | "none";
  // ===== Farmers of the Moor（仅 dlc.moor=true 时使用） =====
  specialCards?: { id: string; actions: string[]; horseFee?: number; hiringFood?: number; holder?: string; usedTwice?: boolean; retained?: boolean }[];
  soloSpecialDeck?: { id: string; actions: string[]; horseFee?: number; hiringFood?: number }[];
  soloSpecialDiscard?: { id: string; actions: string[]; horseFee?: number; hiringFood?: number }[];
  soloSpecialSwappedRound?: number;
  /** DLC：抽出的 minor improvements（加入行动板，所有人都能用） */
  minorImprovementCards?: MinorImprovement[];
}

export function createGame(
  players: { id: string; name: string; seat: number }[],
  options?: { dlc?: DlcConfig }
): GameState {
  const num = players.length;
  const selectedDlc = options?.dlc || DEFAULT_DLC;
  const dlc: DlcConfig = selectedDlc.moor
    ? { ...selectedDlc, occupations: selectedDlc.moorLevel === 3, minorImprovements: (selectedDlc.moorLevel || 1) >= 2 }
    : selectedDlc;
  // DLC：职业洗牌（每名玩家开局 7 张候选），抽 minor improvement 优先
  const handByPlayer: Record<string, Occupation[]> = {};
  const minorHandByPlayer: Record<string, MinorImprovement[]> = {};
  const minorCards: MinorImprovement[] = [];

  // 开局发牌：仅当启用对应 DLC 时发牌
  const occDeck = dlc.occupations ? sample(OCCUPATIONS, OCCUPATIONS.length) : [];
  const minorDeck = dlc.minorImprovements ? sample(MINOR_IMPROVEMENTS, MINOR_IMPROVEMENTS.length) : [];
  const playableMoorMinors = MOOR_MINOR_IMPROVEMENTS.filter(card => MOOR_PLAYABLE_IDS.has(card.id));
  const moorMinorDeck = dlc.moor && dlc.minorImprovements ? sample(playableMoorMinors, playableMoorMinors.length) : [];
  const moorStartCards = dlc.moor ? sample(Array.from({ length: 9 }, (_, i) => i), 9) : [];

  for (const p of players) {
    handByPlayer[p.id] = occDeck.splice(0, 7);
    minorHandByPlayer[p.id] = dlc.moor
      ? [...moorMinorDeck.splice(0, dlc.moorLevel === 3 ? 4 : 7), ...(dlc.moorLevel === 3 ? minorDeck.splice(0, 3) : [])]
      : minorDeck.splice(0, 7);
  }
  if (dlc.minorImprovements && !dlc.moor && minorDeck.length > 0) {
    minorCards.push(minorDeck[0]);
  }
  const ps: PlayerState[] = players.map((p, i) => {
    const sp = startingFood(num, i === 0);
    const grid: PlayerState["grid"] = Array.from({ length: FARM_H }, () =>
      Array.from({ length: FARM_W }, () => ({ kind: "empty" as const })),
    );
    // 沼泽起始卡的房屋固定在右下两格；普通模式保留原农场布局。
    const houses: [number, number][] = dlc.moor ? [[1, 4], [2, 4]] : [[0, 3], [1, 3]];
    for (const [x, y] of houses) grid[y][x] = { kind: "room" as const };
    if (dlc.moor) {
      const layout = MOOR_START_LAYOUTS[moorStartCards[i]];
      for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
        if (layout[y][x] === "F") grid[y][x].terrain = "forest";
        if (layout[y][x] === "M") grid[y][x].terrain = "moor";
      }
    }
    return {
      id: p.id,
      name: p.name,
      seat: p.seat,
      food: dlc.moor && num === 1 ? 0 : sp,
      resources: { wood: 0, clay: 0, reed: 0, stone: 0, grain: 0, vegetable: 0 },
      animals: { sheep: 0, boar: 0, cattle: 0 },
      family: 2,
      babiesThisRound: 0,
      rooms: 2,
      roomType: "wood",
      stables: 0,
      grid,
      baseFarmOrigin: { x: 0, y: 0 },
      edges: makeEdges(FARM_W, FARM_H),
      pastures: [],
      pastureAnimalCells: {},
      horsePastureCells: {},
      beggings: 0,
      improvements: [],
      startingPlayer: i === 0,
      usedStartPlayer: false,
      usedSpaces: [],
      occupations: [],
      occupationHand: handByPlayer[p.id] || [],
      minorImprovements: [],
      minorHand: minorHandByPlayer[p.id] || [],
      seasonVP: 0,
      fuel: 0,
      horses: 0,
      sick: 0,
      moorEnabled: !!dlc.moor,
      moorStartCard: dlc.moor ? moorStartCards[i] + 1 : undefined,
      moorBonusVP: 0,
      churchSpendFuel: false,
      heatPlan: undefined,
      moorScheduled: [],
      pendingTerrain: [],
      pendingCutPeat: 0,
      pendingAnimalOffers: [],
      moorUses: {},
      bogPonies: 0,
      firewoodUse: false,
      routineChoice: "food",
      wellRounds: 0,
      log: [],
    };
  });
  const g: GameState = {
    engine: "agricola",
    engineVer: "1.1.0",
    numPlayers: num,
    stage: 1,
    round: 0,
    waitingFor: ps.map((p) => p.id),
    placedThisRound: [],
    usedSpaces: [],
    revealed: [],
    supply: { wood: 0, clay: 0, reed: 0, stone: 0, grain: 0, vegetable: 0, sheep: 0, boar: 0, cattle: 0, food: 0 },
    // ★ 累积堆起手为空，靠每轮补充积累
    piles: { Wood: 0, Clay: 0, Reed: 0, Stone: 0, Fishing: 0, Sheep: 0, Boar: 0, Cattle: 0, EasternQuarry: 0, StartPlayer: 0 },
    roundDeck: generateRoundDeck(),
    startPlayerId: ps[0].id,
    players: ps,
    harvestQueue: [],
    log: [],
    finished: false,
    dlc,
    // Through the Seasons：随机起始季节（0=春 1=夏 2=秋 3=冬）
    seasonStart: dlc.seasons ? Math.floor(Math.random() * 4) : 0,
    season: "none",
    minorImprovementCards: dlc.minorImprovements ? minorCards : [],
    spaceOccupants: {},
    specialCards: dlc.moor && num > 1 ? num === 2 ? [
      { id: "wildland", actions: ["FellTrees", "SlashBurn", "CutPeat"] },
      { id: "market", actions: ["HorseMarket", "HiringFair", "BlackMarket", "IllicitWork"] },
    ] : [
      { id: "wildland", actions: ["SlashBurn", "CutPeat"] },
      { id: "market", actions: ["HiringFair", "BlackMarket", "IllicitWork"] },
      { id: "rural", actions: ["FellTrees", "HorseMarket"] },
    ] : [],
    soloSpecialDeck: dlc.moor && num === 1 ? sample(MOOR_SOLO_SPECIAL_CARDS, MOOR_SOLO_SPECIAL_CARDS.length) : [],
    soloSpecialDiscard: [],
  };
  if (dlc.moor) {
    const majorIndex = g.roundDeck.indexOf("BuildMajor");
    [g.roundDeck[0], g.roundDeck[majorIndex]] = [g.roundDeck[majorIndex], g.roundDeck[0]];
  }
  startRound(g);
  if (dlc.moor && (dlc.moorLevel || 1) >= 2) {
    g.setupPending = ps.map(player => player.id);
    g.setupDecks = { occupations: occDeck, moor: moorMinorDeck, normal: minorDeck };
    g.setupDiscards = { occupations: [], moor: [], normal: [] };
  }
  return g;
}

// ---------- 阶段 ----------
/** Through the Seasons：四季序列与中文名 */
const TTS_ORDER = ["spring", "summer", "autumn", "winter"] as const;
type TtsSeason = (typeof TTS_ORDER)[number];
const TTS_ZH: Record<TtsSeason, string> = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
/** 当前轮的季节（未启用节气 DLC 返回 null） */
function seasonOf(g: GameState): TtsSeason | null {
  if (!g.dlc?.seasons) return null;
  const idx = (((g.seasonStart + g.round - 1) % 4) + 4) % 4;
  return TTS_ORDER[idx];
}
function isSeason(g: GameState, s: TtsSeason): boolean {
  return seasonOf(g) === s;
}

function startRound(g: GameState) {
  g.round += 1;
  g.stage = STAGE_OF_ROUND[g.round - 1];
  g.placedThisRound = [];
  g.usedSpaces = [];
  g.spaceOccupants = {};
  g.players.forEach((p) => {
    p.babiesThisRound = 0;
    p.startingPlayer = (p.id === g.startPlayerId);
    p.pendingTerrain = [];
    p.pendingCutPeat = 0;
    p.pendingAnimalOffers = [];
    p.pendingSow = [];
    p.pendingPlow = 0;
    p.pendingHorsePurchase = 0;
    p.pendingDeepPlow = 0;
    p.pendingFreeStables = 0;
    p.pendingHayWagon = 0;
    p.guestWorkersThisRound = 0;
    p.reservedMajorAvailable = false;
    p.implementSpecial = false;
    p.tapsSpecial = false;
    p.optionalButcher = false;
    if (p.minorImprovements.includes("M055")) { p.moorUses ||= {}; p.moorUses.M055 = 1; }
    const due = (p.moorScheduled || []).filter(item => item.round === g.round);
    p.moorScheduled = (p.moorScheduled || []).filter(item => item.round > g.round);
    for (const item of due) {
      if (item.kind === "food") p.food += item.amount;
      else if (item.kind === "fuel") p.fuel += item.amount;
      else if (item.kind === "horse") for (let n = 0; n < item.amount; n++) addHorse(p, g);
      else if (item.kind === "forest" || item.kind === "moor" || item.kind === "field") for (let n = 0; n < item.amount; n++) p.pendingTerrain.push(item.kind);
      else if (item.kind === "cutpeat") p.pendingCutPeat += item.amount;
      else if (item.kind === "offerSheep") p.pendingAnimalOffers.push("sheep");
      else if (item.kind === "offerBoar") p.pendingAnimalOffers.push("boar");
      else if (item.kind === "offerCattle") p.pendingAnimalOffers.push("cattle");
      else if (item.kind === "offerHorse") p.pendingAnimalOffers.push("horse");
      else p.resources[item.kind] += item.amount;
    }
  });
  if (g.dlc?.moor && g.numPlayers === 1) {
    const active = g.specialCards?.[0];
    if (active?.usedTwice) {
      g.soloSpecialDiscard?.push({ id: active.id, actions: active.actions, horseFee: active.horseFee, hiringFood: active.hiringFood });
      g.specialCards = [];
    }
    if (!g.specialCards?.length) {
      const next = g.soloSpecialDeck?.shift() || g.soloSpecialDiscard?.at(-1);
      g.specialCards = next ? [{ ...next }] : [];
    } else {
      g.specialCards[0].holder = undefined;
      g.specialCards[0].retained = false;
    }
  } else for (const card of g.specialCards || []) {
    card.holder = undefined;
    card.usedTwice = false;
    card.retained = false;
  }
  // 节气轮转：刷新当前季节
  g.season = seasonOf(g) || "none";
  // ★ 回合卡一经揭示就永久留在版图上（不随回合消失），因此这里不清空 g.revealed

  // 补充阶段：各行动格累积堆（★ 树林每轮 +3，陶土/芦苇/钓鱼每轮 +1）
  g.piles.Wood += g.dlc?.moor && g.numPlayers === 1 ? 2 : LEFT_BOARD.forest.acc;
  g.piles.Clay += LEFT_BOARD.clayPit.acc;
  g.piles.Reed += LEFT_BOARD.reedBank.acc;
  g.piles.Fishing += LEFT_BOARD.fishing.acc;
  if (g.dlc?.moor && g.dlc.moorLevel !== 3 && g.numPlayers > 1) g.piles.StartPlayer = (g.piles.StartPlayer || 0) + 1;
  if (g.revealed.includes("Stone") || g.round >= LEFT_BOARD.stoneQuarry.appearsRound) g.piles.Stone += LEFT_BOARD.stoneQuarry.acc;
  if (g.revealed.includes("EasternQuarry")) {
    g.piles.EasternQuarry = (g.piles.EasternQuarry || 0) + 1;
  }
  // 多人局动态行动格累积
  const extraSpaces = SCALING_BOARD_SPACES[g.numPlayers] || [];
  for (const sp of extraSpaces) {
    if (sp.type === "acc" && sp.acc) {
      g.piles[sp.id] = (g.piles[sp.id] || 0) + sp.acc;
    }
  }
  // 动物市场同样累积（已揭示或达到开放轮次后每轮 +1）
  (Object.keys(ANIMAL_MARKET) as AnimalType[]).forEach((t) => {
    const key = t === "sheep" ? "Sheep" : t === "boar" ? "Boar" : "Cattle";
    if (g.revealed.includes(key) || g.round >= ANIMAL_MARKET[t].appearsRound) {
      g.piles[key] = (g.piles[key] || 0) + 1;
    }
  });

  // Through the Seasons：季节修正累积堆（春 木−1 石+1 / 夏 陶+1 石−1 钓+1 / 秋 木+1 苇+1 / 冬 陶−1 苇−1）
  if (g.dlc?.seasons && g.season !== "none") {
    const mod: Partial<Record<keyof GameState["piles"], number>> =
      g.season === "spring" ? { Wood: -1, Stone: 1 } :
      g.season === "summer" ? { Clay: 1, Stone: -1, Fishing: 1 } :
      g.season === "autumn" ? { Wood: 1, Reed: 1 } :
      { Clay: -1, Reed: -1 };
    for (const [k, v] of Object.entries(mod)) {
      const key = k as keyof GameState["piles"];
      // 石场第 4 轮才开放，未开放时不做增减
      if (key === "Stone" && g.round < LEFT_BOARD.stoneQuarry.appearsRound) continue;
      g.piles[key] = Math.max(0, (g.piles[key] || 0) + (v as number));
    }
  }

  // 水井：建成后的 5 轮，每轮开始 +1 食物
  for (const p of g.players) {
    if (p.wellRounds > 0) {
      p.wellRounds -= 1;
      p.food += 1;
      pushLog(g, `🪣 「${p.name}」水井 +1 食物（剩余 ${p.wellRounds} 轮）`);
    }
    if (g.dlc?.moor && p.improvements.includes("ridingStables") && p.horses >= 2) {
      p.food += 1;
      pushLog(g, `🐴 「${p.name}」骑术马厩 +1 食物`);
    }
  }
  // 永久小发展卡：每轮开始 +1 资源（柴堆→木 / 纺车→芦苇 / 砖块→陶 / 石堆→石）
  const MINOR_ROUND_RES: Record<string, keyof PlayerState["resources"]> = {
    "mi.firewood": "wood", "mi.spinning": "reed", "mi.brick": "clay", "mi.stoneHeap": "stone",
  };
  for (const p of g.players) {
    for (const [card, res] of Object.entries(MINOR_ROUND_RES)) {
      if ((p.minorImprovements || []).includes(card)) {
        p.resources[res] += 1;
        pushLog(g, `🎴 「${p.name}」小发展卡 +1 ${resZh(res)}`);
      }
    }
  }

  // 职业：每轮开始被动结算
  for (const p of g.players) {
    for (const occupation of p.occupations?.length ? p.occupations : p.occupation ? [p.occupation] : []) {
      const oid = occupation.id;
      if (oid === "woodcutter") { p.resources.wood += 1; pushLog(g, `🪓 「${p.name}」伐木工 +1 木材`); }
      else if (oid === "clayworker") { p.resources.clay += 1; pushLog(g, `🏺 「${p.name}」泥瓦工 +1 陶土`); }
      else if (oid === "reedcutter") { p.resources.reed += 1; pushLog(g, `🎋 「${p.name}」芦苇工 +1 芦苇`); }
      else if (oid === "stonemason") { p.resources.stone += 1; pushLog(g, `⛏ 「${p.name}」石匠 +1 石材`); }
      else if (oid === "grainMerchant" || oid === "fieldHand") { p.resources.grain += 1; pushLog(g, `🌾 「${p.name}」${occupation.name} +1 谷物`); }
      else if (oid === "innkeeper") { p.food += 1; pushLog(g, `🏮 「${p.name}」旅店老板 +1 食物`); }
      else if (oid === "storehouseClerk" && p.food === 0) { p.food += 1; pushLog(g, `📦 「${p.name}」仓库管理员补贴 +1 食物`); }
      else if (oid === "woodMerchant" && p.resources.wood === 0) { p.resources.wood += 1; pushLog(g, `🪵 「${p.name}」木柴商保底补贴 +1 木材`); }
      else if (oid === "greengrocer" && p.resources.vegetable >= 1) { p.food += 1; pushLog(g, `🥬 「${p.name}」菜贩 +1 食物`); }
      else if (oid === "pastureManager" && p.pastures.length >= 2) { p.food += 1; pushLog(g, `⛳ 「${p.name}」牧场领班 +1 食物`); }
      else if (oid === "fieldWatchman") {
        const hasCrops = p.grid.some(row => row.some(c => c.kind === "field" && (c.markers || 0) > 0));
        if (hasCrops) { p.food += 1; pushLog(g, `👀 「${p.name}」守望者 +1 食物`); }
      }
      else if (oid === "brewer" && p.resources.grain >= 1) {
        p.resources.grain -= 1;
        p.food += 4;
        pushLog(g, `🍺 「${p.name}」酿酒师 1 谷物换 4 食物`);
      }
      else if (oid === "basketmaker" && p.resources.reed >= 1) {
        p.resources.reed -= 1;
        p.food += 3;
        pushLog(g, `🧺 「${p.name}」编筐工 1 芦苇换 3 食物`);
      }
      else if (oid === "seasonalWorker") {
        if ([1, 5, 8, 10, 12, 14].includes(g.round)) {
          p.resources.grain += 1;
          p.food += 1;
          pushLog(g, `🍂 「${p.name}」季节工 +1 谷物 +1 食物`);
        }
      }
    }
  }

  // 揭回合卡（累积：已揭示的永久保留，这里只记录本轮新翻出的）
  // Moor 回合卡只在勾选了「荒野之地」的房间揭示
  const newlyRevealed: string[] = [];
  roundCardFor(g, g.round).forEach((c) => {
    if (!g.revealed.includes(c)) { g.revealed.push(c); newlyRevealed.push(c); }
  });

  // 重排 worker 顺序：从起始玩家开始，每人放一个，循环直到全部家人放完
  // 简单实现：每个人可放置 family 数量的 worker；当前回合按起始玩家开始
  g.waitingFor = orderByStart(g);
  // 本轮新开放的空间提示（更直观）
  const openings: string[] = [];
  if (g.round === LEFT_BOARD.stoneQuarry.appearsRound) openings.push("石场开放");
  if (g.round === LEFT_BOARD.vegetable.appearsRound) openings.push("菜地开放");
  (Object.keys(ANIMAL_MARKET) as AnimalType[]).forEach((t) => {
    if (g.round === ANIMAL_MARKET[t].appearsRound) {
      openings.push(`${t === "sheep" ? "羊" : t === "boar" ? "猪" : "牛"}市开放`);
    }
  });
  pushLog(g, `📢 第 ${g.round} 轮 · 阶段 ${g.stage}${newlyRevealed.length ? " · 新揭示：" + newlyRevealed.map(zhAction).join("、") : ""}${openings.length ? " · ★ " + openings.join("、") : ""}`);
  // 节气轮转：播报本季效果
  if (g.dlc?.seasons && g.season !== "none") {
    const s = g.season as TtsSeason;
    const desc = s === "spring"
      ? "木材堆−1、采石场+1；建栅栏最多 2 段免费（须付费 ≥1 段）；节气行动：春耕（立即繁殖 + 可播种）"
      : s === "summer"
        ? "陶土坑+1、采石场−1、钓鱼+1；建房附赠 1 马厩；日工额外 +1 谷物；节气行动：度假（按本轮已放置家人数得分）"
        : s === "autumn"
          ? "木材堆+1、芦苇滩+1；建大改进减 1 建材；节气行动：秋收（立即田间阶段 + 可拿 1 蔬菜）"
          : "陶土坑−1、芦苇滩−1；犁地需付 1 食物；鱼塘封冻（第 11 轮起解冻）；节气行动：家庭扩建（无需空房，2 木材 + 3 食物）";
    pushLog(g, `📅 节气 · ${TTS_ZH[s]}季：${desc}`);
  }
}

export function getClockwisePlayers(g: GameState): PlayerState[] {
  const startP = g.players.find(p => p.id === g.startPlayerId) || g.players[0];
  const n = g.players.length;
  return g.players.slice().sort((a, b) => {
    const distA = (a.seat - startP.seat + n) % n;
    const distB = (b.seat - startP.seat + n) % n;
    return distA - distB;
  });
}

function orderByStart(g: GameState): string[] {
  const clockwise = getClockwisePlayers(g);
  const order: string[] = [];
  const placedByPlayer = Object.fromEntries(clockwise.map((p) => [p.id, 0]));
  // 严格顺时针轮转：从起始玩家开始，每人轮流放一名工人，直到所有人放完
  // 注意：本轮出生的婴儿当轮不能工作（workersOf 已扣除）
  while (true) {
    let any = false;
    for (const p of clockwise) {
      if (placedByPlayer[p.id] < workersOf(p)) {
        order.push(p.id);
        placedByPlayer[p.id]++;
        any = true;
      }
    }
    if (!any) break;
  }
  return order;
}

// ---------- 14 轮阶段回合卡生成（标准按 Stage 洗牌） ----------
export function generateRoundDeck(rng: () => number = Math.random): string[] {
  // Stage 1 (Rounds 1-4): 4 张洗牌
  // Fences(建栅栏), BuildMajor(大或小发展卡), SowOrBake(播种/烤面包), Sheep(羊市)
  const stage1 = sample(["Fences", "BuildMajor", "SowOrBake", "Sheep"], 4, rng);

  // Stage 2 (Rounds 5-7): 3 张洗牌
  // Stone(西采石场), FamilyGrowth(添丁及打1小发展), Renovate(翻修及打发展卡)
  const stage2 = sample(["Stone", "FamilyGrowth", "Renovate"], 3, rng);

  // Stage 3 (Rounds 8-9): 2 张洗牌
  // Boar(猪市), Vegetable(蔬菜地)
  const stage3 = sample(["Boar", "Vegetable"], 2, rng);

  // Stage 4 (Rounds 10-11): 2 张洗牌
  // Cattle(牛市), EasternQuarry(东采石场)
  const stage4 = sample(["Cattle", "EasternQuarry"], 2, rng);

  // Stage 5 (Rounds 12-13): 2 张洗牌
  // PlowAndSow(犁田及/或撒种), UrgentGrowth(急迫添丁，无空房亦可添丁)
  const stage5 = sample(["PlowAndSow", "UrgentGrowth"], 2, rng);

  // Stage 6 (Round 14): 1 张
  // RenovateFences(翻修及/或建栅栏)
  const stage6 = ["RenovateFences"];

  return [...stage1, ...stage2, ...stage3, ...stage4, ...stage5, ...stage6];
}

function roundCardFor(g: GameState, r: number): string[] {
  const cards: string[] = [];
  if (g.roundDeck && g.roundDeck[r - 1]) {
    cards.push(g.roundDeck[r - 1]);
  }
  return cards;
}


// ---------- 入口 ----------
export function handleAction(room: RoomState, pid: string, action: EngineAction): ActionResult {
  const g = room.game as unknown as GameState;
  if (!g || g.engine !== "agricola") return { ok: false, msg: "引擎未就绪" };
  return dispatchGame(g, pid, action);
}

/** 直接分发动作（跳过 room 包装 + waitingFor 校验）—— 用于单元测试 */
/** 实时计分：返回每个玩家当前分数（含 place 排名） */
export function liveScores(g: GameState): { id: string; name: string; total: number; breakdown: Record<string, number>; place: number }[] {
  const scored = g.players.map((p) => scorePlayer(p, g));
  scored.sort((a, b) => b.total - a.total);
  scored.forEach((s, i) => (s.place = i + 1));
  return scored;
}

/** 动作 → 占用的行动格 id */
function spaceOfAction(a: EngineAction, g: GameState): string | null {
  switch (a.type) {
    case "Take": return String(a.space || "") || null;
    case "BuildRoom": return "BuildRoom";
    case "PlowField": return "PlowField";
    case "Sow": return "SowOrBake";
    case "BakeBread": return "SowOrBake";
    case "SowAndBake": return "SowOrBake";
    case "BuildFences": return "Fences";
    case "FamilyGrowth": return "FamilyGrowth";
    case "Renovate": return "Renovate";
    case "BuildMajor": return "BuildMajor";
    case "PlayMinor": return "BuildMajor";
    case "PlayOccupation": return g.numPlayers >= 4 ? "Lessons4P" : g.numPlayers === 3 ? "Lessons3P" : "Occupation";
    case "EasternQuarry": return "EasternQuarry";
    case "PlowAndSow": return "PlowAndSow";
    case "UrgentGrowth": return "UrgentGrowth";
    case "RenovateFences": return "RenovateFences";
    case "Infirmary": return "Infirmary";
    case "SideJob": return "SideJob";
    // Through the Seasons：四个季节行动共用「节气行动」格（每轮一次）
    case "SeasonSpring": return "Season";
    case "SeasonSummer": return "Season";
    case "SeasonAutumn": return "Season";
    case "SeasonWinter": return "Season";
    default: return null; // Cook / HarvestMoor 等不占行动格
  }
}

/** 回合卡行动：必须已揭示（翻出）才能使用 */
const ROUND_CARD_SPACES = new Set([
  "Fences", "BuildMajor", "Renovate", "FamilyGrowth",
  "Stone", "Vegetable", "Sheep", "Boar", "Cattle",
  "EasternQuarry", "PlowAndSow", "UrgentGrowth", "RenovateFences",
]);

/** 该玩家本轮是否还有至少一个可用的行动格（用于无格可放时自动跳过） */
function hasLegalSpace(g: GameState, p: PlayerState): boolean {
  const used = g.usedSpaces;
  const open = (id: string) => !used.includes(id);
  const pile = (k: keyof GameState["piles"]) => (g.piles[k] ?? 0) > 0;

  if (open("Wood") && pile("Wood")) return true;
  if (open("Clay") && pile("Clay")) return true;
  if (open("Reed") && pile("Reed")) return true;
  if (open("Grain")) return true; // 固定拿 1 谷物
  if (open("Vegetable") && g.round >= LEFT_BOARD.vegetable.appearsRound) return true; // 固定拿 1 蔬菜
  if (open("Stone") && g.round >= LEFT_BOARD.stoneQuarry.appearsRound && pile("Stone")) return true;
  if (open("Fishing") && pile("Fishing")) return true;
  if (open("DayLaborer")) return true;
  if (open("StartPlayer")) return true;
  if (g.dlc?.moor && g.numPlayers <= 2 && open("MoorResourceMarket")) return true;
  if (g.dlc?.moor && g.dlc.moorLevel === 1 && g.numPlayers > 1 && open("SideJob")) return true;
  if (open("PlowField")) return true;

  // 撒种（有田可种且手里有谷/菜）或烤面包（有炉且有谷）
  if (open("SowOrBake")) {
    const emptyField = p.grid.some((row) => row.some((c) => c.kind === "field" && !c.crop));
    const canSow = emptyField && (p.resources.grain > 0 || p.resources.vegetable > 0);
    const hasOven = p.improvements.includes("clayOven") || p.improvements.includes("stoneOven");
    const canBake = hasOven && p.resources.grain > 0;
    if (canSow || canBake) return true;
  }
  // 建房间：有空位 + 资源够
  if (open("BuildRoom")) {
    const cost = ROOM_COST[p.roomType];
    const afford = Object.entries(cost).every(([k, v]) => (p.resources as Record<string, number>)[k] >= v);
    const hasRoom = p.grid.some((row) => row.some((c) => c.kind === "empty"));
    if (afford && hasRoom) return true;
  }
  // 动物市场
  for (const t of ["sheep", "boar", "cattle"] as AnimalType[]) {
    const id = t === "sheep" ? "Sheep" : t === "boar" ? "Boar" : "Cattle";
    const key = id as keyof GameState["piles"];
    if (open(id) && g.round >= ANIMAL_MARKET[t].appearsRound && (g.piles[key] ?? 0) > 0) return true;
  }
  // 回合卡
  if (open("Fences") && g.revealed.includes("Fences")) return true;
  if (open("FamilyGrowth") && g.revealed.includes("FamilyGrowth")) {
    if (p.food >= 2 && p.rooms + (p.minorImprovements.includes("M032") ? 1 : 0) > p.family && p.family < MAX_FAMILY) return true;
  }
  if (open("Renovate") && g.revealed.includes("Renovate")) {
    const n = p.rooms;
    const c = p.roomType === "wood" ? { clay: n, reed: n } : p.roomType === "clay" ? { stone: n, reed: n } : null;
    if (c && Object.entries(c).every(([k, v]) => (p.resources as Record<string, number>)[k] >= v)) return true;
  }
  if (open("BuildMajor") && g.revealed.includes("BuildMajor")) return true;
  if (g.dlc?.moor) return true; // 医务所不限人数，可供任何仍有工人的玩家使用。
  // Through the Seasons：节气行动格（每轮一次）
  if (g.dlc?.seasons && !used.includes("Season")) {
    const s = seasonOf(g);
    if (s === "summer" || s === "autumn") return true;
    if (s === "spring") {
      const hasPair = (["sheep", "boar", "cattle"] as AnimalType[]).some((t) => p.animals[t] >= 2);
      const emptyField = p.grid.some((row) => row.some((c) => c.kind === "field" && !c.crop));
      const hasSeed = p.resources.grain > 0 || p.resources.vegetable > 0;
      if (hasPair || (emptyField && hasSeed)) return true;
    }
    if (s === "winter") {
      if (p.resources.wood >= 2 && p.food >= 3 && p.family < MAX_FAMILY) return true;
    }
  }
  return false;
}

/** 队列首位无格可放时自动跳过，避免行动格被占满后无人能行动 */
function autoPassStuck(g: GameState) {
  let guard = 0;
  while (g.waitingFor.length > 0 && guard++ < 64) {
    const p = g.players.find((x) => x.id === g.waitingFor[0]);
    if (!p) break;
    if (hasLegalSpace(g, p)) break;
    g.waitingFor.shift();
    g.placedThisRound.push(p.id);
    pushLog(g, `⏭ 「${p.name}」已无可用的行动格，本轮跳过`);
  }
}

export function dispatchGame(g: GameState, pid: string, action: EngineAction): ActionResult {
  if (g.finished) return { ok: false, msg: "游戏已结束" };

  const p = g.players.find((x) => x.id === pid);
  if (!p) return { ok: false, msg: "玩家不存在" };
  if (g.setupPending?.length) {
    if (action.type !== "Mulligan") return { ok: false, msg: "请先完成开局换牌" };
    if (!g.setupPending.includes(pid)) return { ok: false, msg: "你已完成开局换牌" };
    const ids = Array.isArray(action.ids) ? action.ids.map(String) : [];
    if (new Set(ids).size !== ids.length) return { ok: false, msg: "换牌列表存在重复卡牌" };
    const hand = [...p.occupationHand, ...p.minorHand];
    if (ids.some(id => !hand.some(card => card.id === id))) return { ok: false, msg: "只能更换自己当前手牌" };
    const decks = g.setupDecks!;
    const discarded = { occupations: [] as Occupation[], moor: [] as MinorImprovement[], normal: [] as MinorImprovement[] };
    for (const id of ids) {
      const occupation = p.occupationHand.find(card => card.id === id);
      if (occupation) { p.occupationHand.splice(p.occupationHand.indexOf(occupation), 1); discarded.occupations.push(occupation); continue; }
      const minor = p.minorHand.find(card => card.id === id)!;
      p.minorHand.splice(p.minorHand.indexOf(minor), 1);
      (id.startsWith("M") ? discarded.moor : discarded.normal).push(minor);
    }
    for (const kind of ["occupations", "moor", "normal"] as const) {
      const needed = discarded[kind].length;
      const drawn = decks[kind].splice(0, needed);
      if (drawn.length < needed) drawn.push(...g.setupDiscards![kind].splice(0, needed - drawn.length));
      if (drawn.length < needed) drawn.push(...discarded[kind].splice(0, needed - drawn.length));
      if (kind === "occupations") p.occupationHand.push(...drawn as Occupation[]);
      else p.minorHand.push(...drawn as MinorImprovement[]);
      g.setupDiscards![kind].push(...discarded[kind] as any);
    }
    g.setupPending = g.setupPending.filter(id => id !== pid);
    if (!g.setupPending.length) { g.setupDecks = undefined; g.setupDiscards = undefined; }
    return { ok: true };
  }
  if (p.pendingButcher && action.type !== "ResolveButcher") return { ok: false, msg: "请先结算肉墩，选择一只动物兑换食物" };
  if (g.immediateSpecialFor && (pid !== g.immediateSpecialFor || !["MoorSpecial", "SkipBonusSpecial"].includes(action.type))) return { ok: false, msg: "请先结算农业工具的特殊行动" };
  const reservedBuilder = g.players.find(player => player.reservedMajorAvailable);
  if (!g.immediateSpecialFor && reservedBuilder && (pid !== reservedBuilder.id || !["BuildReservedMajor", "SkipReservedMajor"].includes(action.type))) {
    return { ok: false, msg: `请先由「${reservedBuilder.name}」决定是否立即建造预留的重大改进` };
  }
  if (action.type === "SkipBonusSpecial") {
    if (!p.implementSpecial && !p.tapsSpecial) return { ok: false, msg: "没有可放弃的额外特殊行动" };
    if (p.implementSpecial) { p.implementSpecial = false; g.immediateSpecialFor = undefined; }
    else { if (g.waitingFor[0] !== pid) return { ok: false, msg: "尚未轮到你的敲鼓者行动" }; p.tapsSpecial = false; g.waitingFor.shift(); }
    return advanceTurn(g);
  }
  if (action.type === "MoorSpecial" && p.implementSpecial) return takeMoorSpecial(g, p, action, "implement");

  // 烹饪不占工人，任何时候可做
  if (action.type === "Cook") return cook(g, p, action);
  if (action.type === "ExchangeFuel") {
    if (!g.dlc?.moor) return { ok: false, msg: "未启用沼泽农夫" };
    const amount = Number(action.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > p.resources.wood) return { ok: false, msg: "木材数量不足" };
    p.resources.wood -= amount;
    p.fuel += amount;
    pushLog(g, `🔥 「${p.name}」将 ${amount} 木材换成燃料`);
    return { ok: true };
  }
  if (action.type === "SetChurchSpend") {
    if (!g.dlc?.moor || !(p.improvements.includes("villageChurch") || p.minorImprovements.includes("M068"))) return { ok: false, msg: "没有教堂或乡村教堂" };
    p.churchSpendFuel = !!action.enabled;
    return { ok: true };
  }
  if (action.type === "MoorFire") {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M040") || countTerrain(p, "moor") !== 1) return { ok: false, msg: "需要沼泽火卡和恰好 1 片沼泽" };
    const x = Number(action.x), y = Number(action.y);
    if (!isValidCell(p, x, y) || p.grid[y][x].terrain !== "moor") return { ok: false, msg: "请选择最后一片沼泽" };
    p.grid[y][x].terrain = undefined;
    p.grid[y][x].kind = "field";
    return { ok: true };
  }
  if (action.type === "UseMoorMinor") {
    const id = String(action.id || "");
    if (!g.dlc?.moor || !p.minorImprovements.includes(id)) return { ok: false, msg: "你没有这张沼泽小发展卡" };
    if (id === "M081") {
      const target = String(action.target || "");
      const trade: Record<string, { fuel: number; count: number }> = {
        wood: { fuel: 3, count: 2 }, clay: { fuel: 3, count: 2 },
        reed: { fuel: 4, count: 2 }, stone: { fuel: 4, count: 2 },
        grain: { fuel: 2, count: 1 }, vegetable: { fuel: 3, count: 1 },
      };
      const option = trade[target];
      if (!option || p.fuel < option.fuel) return { ok: false, msg: "泥炭船所需燃料不足或目标无效" };
      p.fuel -= option.fuel;
      (p.resources as Record<string, number>)[target] += option.count;
      return { ok: true };
    }
    const uses = p.moorUses?.[id] || 0;
    if (uses <= 0 || !["M090", "M125", "M126"].includes(id)) return { ok: false, msg: "这张卡已没有可用次数" };
    if (id === "M090") {
      p.food = Math.max(p.food, 2);
      p.fuel = Math.max(p.fuel, 2);
    } else if (id === "M125") {
      for (const key of ["wood", "clay", "reed", "stone"] as const) if (p.resources[key] === 0) p.resources[key] += 1;
    } else {
      const from = String(action.from || ""), target = String(action.target || "");
      const sources = ["wood", "clay", "reed", "stone"];
      if (!sources.includes(from) || !["wood", "clay", "reed"].includes(target) || from === target || (p.resources as Record<string, number>)[from] < 1) {
        return { ok: false, msg: "合作商店需要 1 建材换另一种非石材建材" };
      }
      (p.resources as Record<string, number>)[from] -= 1;
      (p.resources as Record<string, number>)[target] += 1;
    }
    p.moorUses![id] -= 1;
    return { ok: true };
  }
  if (action.type === "PlanAdministration") {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M074")) return { ok: false, msg: "没有管理部门" };
    const amount = Number(action.amount);
    if (!Number.isInteger(amount) || amount < 0 || amount > p.improvements.length) return { ok: false, msg: "计划兑换数量无效" };
    p.moorUses ||= {};
    p.moorUses.M074 = amount;
    return { ok: true };
  }
  if (action.type === "SetFirewoodUse") {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M082")) return { ok: false, msg: "没有木柴卡" };
    p.firewoodUse = !!action.enabled;
    return { ok: true };
  }
  if (action.type === "SetDistilleryPlan") {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M108")) return { ok: false, msg: "没有谷物酒厂" };
    const amount = Number(action.scorePlan);
    if (!Number.isInteger(amount) || amount < 0) return { ok: false, msg: "终局兑换数量无效" };
    p.distilleryHarvest = !!action.harvest;
    p.distilleryScorePlan = amount;
    return { ok: true };
  }
  if (action.type === "BuildReservedMajor") {
    const name = String(action.improvement || "");
    if (!g.dlc?.moor || p.reservedMajor !== name || !p.reservedMajorAvailable || g.round <= (p.reservedMajorRound || 0)) return { ok: false, msg: "这张预留重大改进现在不能建造" };
    const result = buildMajor(g, p, action);
    if (result.ok) { p.reservedMajor = undefined; p.reservedMajorAvailable = false; return advanceTurn(g); }
    return result;
  }
  if (action.type === "SkipReservedMajor") {
    if (!p.reservedMajorAvailable) return { ok: false, msg: "当前没有可放弃的预留建造机会" };
    p.reservedMajorAvailable = false;
    return advanceTurn(g);
  }
  if (action.type === "ResolveButcher") {
    if (!g.dlc?.moor || (!p.pendingButcher && !p.optionalButcher)) return { ok: false, msg: "没有待处理的肉墩效果" };
    const animal = String(action.animal || "");
    if (!animal && p.optionalButcher) { p.optionalButcher = false; return advanceTurn(g); }
    const rates: Record<string, number> = { sheep: 1, boar: 2, cattle: 3, horse: 2 };
    if (!rates[animal] || (animal === "horse" ? p.horses : p.animals[animal as AnimalType]) < 1) return { ok: false, msg: "请选择自己拥有的一只动物" };
    if (animal === "horse") removeHorse(p);
    else removeMoorTradeAnimal(p, animal as AnimalType);
    p.food += rates[animal];
    p.pendingButcher = false;
    p.optionalButcher = false;
    pushLog(g, `🔪 「${p.name}」通过肉墩将 1 只${zhAnimal(animal)}换成 ${rates[animal]} 食物`);
    return advanceTurn(g);
  }
  if (action.type === "SetRoutineChoice") {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M091") || !["food", "fuel"].includes(String(action.choice))) return { ok: false, msg: "没有日常工作卡或选择无效" };
    p.routineChoice = action.choice as "food" | "fuel";
    return { ok: true };
  }
  if (action.type === "RestBogPony") {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M084") || p.horses <= (p.bogPonies || 0)) return { ok: false, msg: "没有可侧卧的站立马匹" };
    p.bogPonies = (p.bogPonies || 0) + 1;
    p.fuel += 2;
    return { ok: true };
  }
  if (action.type === "PlacePendingTerrain") {
    if (!g.dlc?.moor) return { ok: false, msg: "未启用沼泽扩展" };
    const index = Number(action.index), x = Number(action.x), y = Number(action.y);
    const kind = p.pendingTerrain?.[index];
    if (!Number.isInteger(index) || !kind || !isValidCell(p, x, y)) return { ok: false, msg: "没有待放置的地形或坐标无效" };
    const cell = p.grid[y][x];
    if (cell.kind !== "empty" || cell.terrain || cell.stable || cell.blockedBy || isCellInPasture(p, x, y)) return { ok: false, msg: "只能放在未使用的农场空地" };
    claimMoorCellGoods(p, x, y);
    if (kind === "field") cell.kind = "field";
    else cell.terrain = kind;
    p.pendingTerrain!.splice(index, 1);
    return { ok: true };
  }
  if (action.type === "UsePendingCutPeat") {
    if (!g.dlc?.moor || !p.pendingCutPeat) return { ok: false, msg: "没有本轮可用的免费挖泥炭行动" };
    if (g.placedThisRound.length > 0) return { ok: false, msg: "泥炭切割权只能在本轮派工前使用" };
    const card = (g.specialCards || []).find(item => item.actions.includes("CutPeat") && !item.holder && !item.usedTwice);
    if (!card) return { ok: false, msg: "本轮没有可拿取的挖泥炭特殊行动卡" };
    const result = cutPeatTile(g, p, action);
    if (result.ok) {
      p.pendingCutPeat -= 1;
      card.holder = p.id;
      if (g.numPlayers === 1) card.usedTwice = true;
      if (p.minorImprovements.includes("M058")) { p.pendingSow ||= []; p.pendingSow.push({}); }
      if (p.minorImprovements.includes("M060") && p.animals.cattle >= 2) { p.pendingSow ||= []; p.pendingSow.push({}); }
      pushLog(g, `🪵 「${p.name}」凭泥炭切割权拿取特殊行动卡并挖泥炭`);
    }
    return result;
  }
  if (action.type === "ResolvePendingAnimal") {
    const index = Number(action.index);
    const animal = p.pendingAnimalOffers?.[index];
    if (!g.dlc?.moor || !Number.isInteger(index) || !animal) return { ok: false, msg: "没有待处理的动物" };
    if (g.placedThisRound.length > 0) return { ok: false, msg: "畜摊只能在本轮派工前购买动物" };
    if (action.buy) {
      if (p.food < 1) return { ok: false, msg: "购买动物需要 1 食物" };
      const housed = animal === "horse" ? addHorse(p, g) : addAnimal(g, p, animal);
      if (!housed) return { ok: false, msg: "没有空间饲养这只动物" };
      p.food -= 1;
    }
    p.pendingAnimalOffers!.splice(index, 1);
    return { ok: true };
  }
  if (action.type === "UsePendingSow") {
    const index = Number(action.index);
    const bonus = p.pendingSow?.[index];
    if (!g.dlc?.moor || !Number.isInteger(index) || !bonus) return { ok: false, msg: "没有待执行的额外播种行动" };
    const sowed = Array.isArray(action.sowed) ? action.sowed : [];
    if (bonus.onlyCell && (sowed.length !== 1 || `${Number(sowed[0]?.x)},${Number(sowed[0]?.y)}` !== bonus.onlyCell)) return { ok: false, msg: "这次只能在刚开垦的田地播种" };
    const result = sow(g, p, action);
    if (result.ok) p.pendingSow!.splice(index, 1);
    return result;
  }
  if (action.type === "DiscardPendingSow") {
    const index = Number(action.index);
    if (!g.dlc?.moor || !Number.isInteger(index) || !p.pendingSow?.[index]) return { ok: false, msg: "没有待放弃的额外播种行动" };
    p.pendingSow.splice(index, 1);
    return { ok: true };
  }
  if (action.type === "UsePendingPlow") {
    if (!g.dlc?.moor || !p.pendingPlow) return { ok: false, msg: "没有待执行的额外犁田行动" };
    const result = plowField(g, p, { ...action, suppressMoorBonus: true });
    if (result.ok) p.pendingPlow -= 1;
    return result;
  }
  if (action.type === "ResolvePendingHorsePurchase") {
    if (!g.dlc?.moor || !p.pendingHorsePurchase) return { ok: false, msg: "没有待处理的犁马购买机会" };
    if (action.buy) {
      if (p.food < 1) return { ok: false, msg: "购买马匹需要 1 食物" };
      if (!addHorse(p, g)) return { ok: false, msg: "没有空间饲养马匹" };
      p.food -= 1;
    }
    p.pendingHorsePurchase -= 1;
    return { ok: true };
  }
  if (action.type === "UseDeepPlow") {
    if (!g.dlc?.moor || !p.pendingDeepPlow) return { ok: false, msg: "没有待执行的深犁交换" };
    const x = Number(action.x), y = Number(action.y);
    if (!isValidCell(p, x, y) || p.grid[y][x].terrain !== "moor") return { ok: false, msg: "请选择要换成农田的沼泽" };
    const fields = collectFields(p);
    if (fields.length && !orthAdjacentToAny(p, x, y, fields)) return { ok: false, msg: "深犁的新田必须紧邻已有田地" };
    p.grid[y][x].terrain = undefined;
    p.grid[y][x].kind = "field";
    p.pendingDeepPlow -= 1;
    return { ok: true };
  }
  if (action.type === "DiscardDeepPlow") {
    if (!g.dlc?.moor || !p.pendingDeepPlow) return { ok: false, msg: "没有待放弃的深犁交换" };
    p.pendingDeepPlow -= 1;
    return { ok: true };
  }
  if (action.type === "DiscardNoTillCrop") {
    const x = Number(action.x), y = Number(action.y);
    if (!g.dlc?.moor || !p.minorImprovements.includes("M111") || !isValidCell(p, x, y) || p.grid[y][x].kind !== "empty" || !p.grid[y][x].crop) return { ok: false, msg: "请选择免耕农业种植的作物" };
    p.grid[y][x].crop = undefined;
    p.grid[y][x].markers = 0;
    return { ok: true };
  }
  if (action.type === "BuildFreeStable") {
    if (!g.dlc?.moor || !p.pendingFreeStables) return { ok: false, msg: "没有免费马厩可建" };
    const x = Number(action.x), y = Number(action.y);
    if (!isValidCell(p, x, y) || p.grid[y][x].kind !== "empty" || p.grid[y][x].terrain || p.grid[y][x].stable || p.grid[y][x].blockedBy || p.stables >= MAX_STABLES) return { ok: false, msg: "请选择可以建马厩的空地" };
    claimMoorCellGoods(p, x, y);
    p.grid[y][x].stable = true;
    p.stables += 1;
    p.pendingFreeStables -= 1;
    rebuildPastures(p);
    return { ok: true };
  }
  if (action.type === "DiscardFreeStable") {
    if (!g.dlc?.moor || !p.pendingFreeStables) return { ok: false, msg: "没有免费马厩可放弃" };
    p.pendingFreeStables -= 1;
    return { ok: true };
  }
  if (action.type === "UseHayWagon") {
    if (!g.dlc?.moor || !p.pendingHayWagon) return { ok: false, msg: "没有待执行的干草货车建造行动" };
    const result = action.kind === "BuildRoom" ? buildRoom(g, p, action)
      : action.kind === "Renovate" ? renovate(g, p, action)
      : { ok: false, msg: "只能建房或翻修" };
    if (result.ok) p.pendingHayWagon -= 1;
    return result;
  }
  if (action.type === "DiscardHayWagon") {
    if (!g.dlc?.moor || !p.pendingHayWagon) return { ok: false, msg: "没有待放弃的干草货车行动" };
    p.pendingHayWagon -= 1;
    return { ok: true };
  }
  if (action.type === "DiscardPendingTerrain") {
    const index = Number(action.index);
    if (!g.dlc?.moor || !Number.isInteger(index) || !p.pendingTerrain?.[index]) return { ok: false, msg: "没有待归还的地形" };
    p.pendingTerrain.splice(index, 1);
    return { ok: true };
  }
  if (action.type === "SetHeatPlan") {
    if (!g.dlc?.moor) return { ok: false, msg: "未启用沼泽农夫" };
    const amount = Number(action.amount);
    if (!Number.isInteger(amount) || amount < 0 || amount > p.rooms + (p.minorImprovements.includes("M032") ? 1 : 0)) return { ok: false, msg: "取暖燃料数量无效" };
    p.heatPlan = amount;
    return { ok: true };
  }
  if (action.type === "TradeMajor") {
    const id = String(action.improvement || "");
    const target = String(action.target || "");
    const trade: Record<string, { from: "wood" | "clay" | "reed"; targets: string[] }> = {
      furnitureStall: { from: "wood", targets: ["clay"] },
      ceramicsStall: { from: "clay", targets: ["wood"] },
      basketStall: { from: "reed", targets: ["wood", "clay", "stone"] },
    };
    const rule = trade[id];
    if (!rule || !p.improvements.includes(id) || !rule.targets.includes(target)) return { ok: false, msg: "没有可用的交易改进" };
    if (p.resources[rule.from] < 1) return { ok: false, msg: "交易资源不足" };
    p.resources[rule.from] -= 1;
    (p.resources as Record<string, number>)[target] += 1;
    pushLog(g, `🏪 「${p.name}」用 1 ${resZh(rule.from)}换得 1 ${resZh(target)}`);
    return { ok: true };
  }

  // 严格回合序：只允许队列首位行动
  if (g.waitingFor.length === 0) return { ok: false, msg: "本轮已结束，等待结算" };
  if (g.waitingFor[0] !== pid) {
    const cur = g.players.find((x) => x.id === g.waitingFor[0]);
    return { ok: false, msg: cur ? `现在轮到「${cur.name}」` : "现在不该你放" };
  }
  if (action.type === "SwapSoloSpecial") {
    if (!g.dlc?.moor || g.numPlayers !== 1 || !g.soloSpecialDeck?.length ||
        g.placedThisRound.length > 0 || g.specialCards?.[0]?.holder ||
        g.soloSpecialSwappedRound === g.round) {
      return { ok: false, msg: "本轮现在不能更换特殊行动卡" };
    }
    const old = g.specialCards![0];
    g.soloSpecialDeck.push({ id: old.id, actions: old.actions, horseFee: old.horseFee, hiringFood: old.hiringFood });
    g.specialCards = [{ ...g.soloSpecialDeck.shift()! }];
    g.soloSpecialSwappedRound = g.round;
    return { ok: true };
  }
  if (action.type === "MoorSpecial") return takeMoorSpecial(g, p, action, p.tapsSpecial ? "taps" : undefined);
  if (p.tapsSpecial) return { ok: false, msg: "敲鼓者只能拿取特殊行动卡，或放弃" };
  if (g.placedThisRound.filter((x) => x === pid).length >= workersOf(p)) {
    return { ok: false, msg: "你已经放完本轮工人" };
  }
  // 行动格占用：每格每轮只能被使用一次
  const space = spaceOfAction(action, g);
  if (g.dlc?.moor && p.sick > 0) {
    const remaining = workersOf(p) - g.placedThisRound.filter((x) => x === pid).length;
    if (remaining <= p.sick && action.type !== "Infirmary") {
      return { ok: false, msg: "卧床的家人本轮只能前往医务所" };
    }
  }
  if (space && space !== "Infirmary" && g.usedSpaces.includes(space)) {
    return { ok: false, msg: `${zhAction(space)} 本轮已被占用，请换一格` };
  }
  // 回合卡行动：必须已经揭示（翻出）才能用（协议层校验，不只靠 UI 隐藏）
  if (space && ROUND_CARD_SPACES.has(space) && !g.revealed.includes(space)) {
    return { ok: false, msg: `${zhAction(space)} 尚未揭示（回合卡还没翻出）` };
  }

  return dispatchAction(g, p, action);
}

function dispatchAction(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  switch (a.type) {
    case "Take": {
      const space = String(a.space || "");
      const accumulated = g.piles[space] || 0;
      if (space === "StartPlayer" && a.minorId && g.dlc?.moor && g.dlc.moorLevel === 3) {
        const minor = playMinorImprovement(g, p, { ...a, type: "PlayMinor", id: a.minorId });
        if (!minor.ok) return minor;
      }
      const r = handleTake(g, p, space, a);
      if (r.ok) {
        const resource = space === "Wood" || space === "Grove4P" || space === "Copse3P" || space === "Copse4P" ? "wood"
            : space === "Clay" || space === "ClayDeposit3P" || space === "ClayDeposit4P" ? "clay"
            : space === "Reed" || space === "ReedBank4P" ? "reed"
            : space === "Stone" || space === "EasternQuarry" ? "stone" : null;
        if (resource && accumulated >= ({ wood: 5, clay: 4, reed: 3, stone: 2 }[resource]) && p.minorImprovements.includes("M110")) p.resources.grain += 1;
        if (resource && accumulated >= ({ wood: 3, clay: 3, reed: 2, stone: 2 }[resource]) && p.minorImprovements.includes("M061")) p.pendingHayWagon = (p.pendingHayWagon || 0) + 1;
        if (resource && accumulated >= 4 && p.minorImprovements.includes("M127")) p.fuel += 1;
        if (resource === "wood" && accumulated >= 4 && p.minorImprovements.includes("M118")) {
          const useFuel = !!a.timberFuel && p.fuel > 0;
          if (useFuel) p.fuel -= 1;
          p.resources.wood += useFuel ? 2 : 1;
        }
        if (resource === "wood" && accumulated >= 3 && p.minorImprovements.includes("M117") && p.horses > 0 && !!a.draughtHorse && p.food > 0) {
          p.food -= 1;
          p.resources.wood += accumulated === 3 ? 1 : 2;
        }
        return advance(g, p, space, r);
      }
      return r;
    }
    case "BuildRoom": return advance(g, p, "BuildRoom", buildRoom(g, p, a));
    case "PlowField": return advance(g, p, "PlowField", plowField(g, p, a));
    case "Sow": return advance(g, p, "Sow", sow(g, p, a));
    case "BuildFences": return advance(g, p, "Fences", buildFences(g, p, a));
    case "BakeBread": return advance(g, p, "BakeBread", bakeBread(g, p, a));
    case "SowAndBake": return advance(g, p, "SowOrBake", sowAndBake(g, p, a));
    case "FamilyGrowth": return advance(g, p, "FamilyGrowth", familyGrowth(g, p));
    case "Renovate": return advance(g, p, "Renovate", renovate(g, p, a));
    case "BuildMajor": return advance(g, p, "BuildMajor", buildMajor(g, p, a));
    case "PlowAndSow": return advance(g, p, "PlowAndSow", plowAndSow(g, p, a));
    case "UrgentGrowth": return advance(g, p, "UrgentGrowth", urgentGrowth(g, p));
    case "RenovateFences": return advance(g, p, "RenovateFences", renovateFences(g, p, a));
    case "Cook": return cook(g, p, a); // 不消耗工人
    case "EndTurn": {
      g.placedThisRound.push(p.id);
      const idx = g.waitingFor.indexOf(p.id);
      if (idx >= 0) g.waitingFor.splice(idx, 1);
      if (p.minorImprovements.includes("M057") && g.placedThisRound.filter(id => id === p.id).length === workersOf(p)) {
        p.tapsSpecial = true;
        g.waitingFor.push(p.id);
      }
      return advanceTurn(g);
    }
    case "ChooseOccupation": return g.dlc?.moor ? { ok: false, msg: "沼泽 III 级的职业需使用行动格打出" } : playOccupation(g, p, a);
    case "PlayOccupation": return advance(g, p, spaceOfAction(a, g)!, playOccupation(g, p, a));
    case "PlayMinor": return advance(g, p, "BuildMajor", playMinorImprovement(g, p, a));
    case "TakeMinorImprovement": return takeMinorImprovement(g, p, a);
    case "UseMinorImprovement": return useMinorImprovement(g, p, a);
    case "Infirmary":
      if (!g.dlc?.moor) return { ok: false, msg: "未启用沼泽农夫" };
      const bedridden = p.sick > 0;
      p.sick = Math.max(0, p.sick - 1);
      p.food += 1 + (bedridden && p.minorImprovements.includes("M099") ? 1 : 0);
      if (p.minorImprovements.includes("M094")) for (let n = 1; n <= countTerrain(p, "moor") && g.round + n <= 14; n++) {
        p.moorScheduled ||= [];
        p.moorScheduled.push({ round: g.round + n, kind: "food", amount: 1 });
      }
      return advance(g, p, "Infirmary", { ok: true });
    case "SideJob": return advance(g, p, "SideJob", sideJob(g, p, a));
    case "GatherFuel": case "CutMeadow": case "ReclaimMoor": case "SowMoor": case "HarvestMoor":
      return { ok: false, msg: "旧版公共沼泽行动已移除，请使用特殊行动卡" };
    // Through the Seasons：季节行动（共用「节气行动」格）
    case "SeasonSpring": return advance(g, p, "Season", seasonSpring(g, p, a));
    case "SeasonSummer": return advance(g, p, "Season", seasonSummer(g, p));
    case "SeasonAutumn": return advance(g, p, "Season", seasonAutumn(g, p, a));
    case "SeasonWinter": return advance(g, p, "Season", seasonWinter(g, p));
    default: return { ok: false, msg: "未知行动" };
  }
}

// ---------- 行动：取用空间 ----------
function handleTake(g: GameState, p: PlayerState, space: string, a?: EngineAction): ActionResult {
  if (space === "MoorResourceMarket") {
    if (!g.dlc?.moor || g.numPlayers > 2) return { ok: false, msg: "该资源市场只用于 1 至 2 人沼泽对局" };
    p.food += 1;
    p.resources.stone += 1;
    pushLog(g, `⚖️ 「${p.name}」从资源市场取得 1 食物和 1 石材`);
    return { ok: true };
  }
  // 起始玩家 + 食物（"StartPlayer"）
  if (space === "StartPlayer") {
    if (g.startPlayerId === p.id && !g.dlc?.moor) {
      return { ok: false, msg: "你当前已持有起始玩家标记，无需重复拿取" };
    }
    g.startPlayerId = p.id;
    const food = g.dlc?.moor && g.dlc.moorLevel !== 3 && g.numPlayers > 1 ? (g.piles.StartPlayer || 0) : START_PLAYER_FOOD;
    p.food += food;
    if (g.dlc?.moor && g.dlc.moorLevel !== 3 && g.numPlayers > 1) g.piles.StartPlayer = 0;
    p.usedStartPlayer = true;
    for (const pl of g.players) {
      pl.startingPlayer = (pl.id === p.id);
    }
    pushLog(g, `🚜 「${p.name}」拿取起始玩家标记（下轮先动）并获得 ${food} 食物`);
    if (hasOccupation(p, "townCrier")) {
      p.resources.grain += 1;
      pushLog(g, `📢 「${p.name}」市集叫卖人额外 +1 谷物`);
    }
    if (hasOccupation(p, "villageClerk")) {
      p.resources.reed += 1;
      pushLog(g, `🖋️ 「${p.name}」村书记额外 +1 芦苇`);
    }
    return { ok: true };
  }
  if (space === "Grain") {
    p.resources.grain += 1;
    if (p.minorImprovements.includes("M130")) addHorse(p, g);
    pushLog(g, `🌾 「${p.name}」取走谷物堆上的 1 谷物`);
    if (hasOccupation(p, "seedMerchant")) { p.resources.grain += 1; pushLog(g, `🌱 「${p.name}」种子商人多得 1 份谷物种子`); }
    if (hasOccupation(p, "grainInspector")) { p.resources.grain += 1; pushLog(g, `🔍 「${p.name}」谷物检验员额外 +1 谷物`); }
    return { ok: true };
  }
  if (space === "Vegetable") {
    if (g.round < LEFT_BOARD.vegetable.appearsRound) {
      return { ok: false, msg: `菜地第 ${LEFT_BOARD.vegetable.appearsRound} 轮起才开放` };
    }
    p.resources.vegetable += 1;
    pushLog(g, `🥕 「${p.name}」取走蔬菜地上的 1 蔬菜`);
    if (hasOccupation(p, "seedMerchant")) { p.resources.vegetable += 1; pushLog(g, `🌱 「${p.name}」种子商人多得 1 份蔬菜种子`); }
    return { ok: true };
  }
  if (space === "Wood" || space === "Clay" || space === "Reed") {
    // ★ 累积格：拿走该格全部资源
    const poolKey = space as keyof GameState["piles"];
    const resKey = (space === "Wood" ? "wood" : space === "Clay" ? "clay" : "reed") as keyof PlayerState["resources"];
    const got = g.piles[poolKey] || 0;
    if (got <= 0) return { ok: false, msg: `${zhSpace(space)}是空的` };
    p.resources[resKey] += got;
    g.piles[poolKey] = 0;
    pushLog(g, `${resIcon(resKey)} 「${p.name}」取走 ${zhSpace(space)}上的全部 ${got} ${resZh(resKey)}`);

    // 职业资源额外加成
    if (space === "Wood") {
      if (hasOccupation(p, "lumberjack")) { p.resources.wood += 1; pushLog(g, `🪵 「${p.name}」柴夫额外 +1 木材`); }
      if (hasOccupation(p, "forestCustodian")) { p.resources.reed += 1; pushLog(g, `🌲 「${p.name}」护林员额外 +1 芦苇`); }
      if (hasOccupation(p, "mushroomCollector")) { p.food += 1; pushLog(g, `🍄 「${p.name}」蘑菇采摘人额外 +1 食物`); }
      if (hasOccupation(p, "hunter")) { p.food += 1; pushLog(g, `🏹 「${p.name}」猎人额外 +1 食物`); }
      if (hasOccupation(p, "trapper")) { p.food += 1; pushLog(g, `🪤 「${p.name}」野味设阱师额外 +1 食物`); }
      if (hasOccupation(p, "silviculturist") && got >= 3) { p.food += 1; pushLog(g, `🌲 「${p.name}」林农额外 +1 食物`); }
      if (hasOccupation(p, "charcoalBurner")) {
        if (g.dlc?.moor) p.fuel += 1; else p.food += 1;
        pushLog(g, `🔥 「${p.name}」炭烧工额外 +1 燃料/食物`);
      }
    } else if (space === "Clay") {
      if (hasOccupation(p, "clayCarrier")) { p.resources.clay += 1; pushLog(g, `🧱 「${p.name}」运泥工额外 +1 陶土`); }
      if (hasOccupation(p, "miner")) { p.resources.clay += 1; pushLog(g, `⛏️ 「${p.name}」矿工额外 +1 陶土`); }
      if (hasOccupation(p, "gravelCarrier")) { p.resources.stone += 1; pushLog(g, `🪨 「${p.name}」砾石搬运工额外 +1 石材`); }
      if (hasOccupation(p, "peatCutter")) {
        if (g.dlc?.moor) p.fuel += 1; else p.food += 1;
        pushLog(g, `🧱 「${p.name}」泥炭割工额外 +1 燃料/食物`);
      }
    } else if (space === "Reed") {
      if (hasOccupation(p, "reedCollector")) { p.resources.reed += 1; pushLog(g, `🌿 「${p.name}」割苇人额外 +1 芦苇`); }
    }
    return { ok: true };
  }
  if (space === "Stone" || space === "EasternQuarry") {
    const isEast = space === "EasternQuarry";
    const got = isEast ? (g.piles.EasternQuarry || 0) : g.piles.Stone;
    if (got <= 0) return { ok: false, msg: `${isEast ? "东采石场" : "采石场"}是空的（每轮 +1）` };
    p.resources.stone += got;
    if (isEast) g.piles.EasternQuarry = 0;
    else g.piles.Stone = 0;
    pushLog(g, `⛏ 「${p.name}」取走${isEast ? "东采石场" : "采石场"}上的全部 ${got} 石材`);
    if (hasOccupation(p, "quarryman")) { p.resources.stone += 1; pushLog(g, `⛰️ 「${p.name}」采石工额外 +1 石材`); }
    if (hasOccupation(p, "miner")) { p.resources.stone += 1; pushLog(g, `⛏️ 「${p.name}」矿工额外 +1 石材`); }
    return { ok: true };
  }
  if (space === "Fishing") {
    // 节气轮转：冬季鱼塘封冻，第 11 轮起解冻
    if (isSeason(g, "winter") && g.round < 11) {
      return { ok: false, msg: "冬季鱼塘封冻，无法钓鱼（第 11 轮起解冻）" };
    }
    const got = g.piles.Fishing;
    if (got <= 0) return { ok: false, msg: "鱼塘是空的（每轮 +1）" };
    p.food += got;
    g.piles.Fishing = 0;
    pushLog(g, `🐟 「${p.name}」钓鱼 +${got} 食物`);
    if (hasOccupation(p, "fisher")) { p.food += 1; pushLog(g, `🎣 「${p.name}」渔夫额外 +1 食物`); }
    if (hasOccupation(p, "hunter")) { p.food += 1; pushLog(g, `🏹 「${p.name}」猎人额外 +1 食物`); }
    if (hasOccupation(p, "fishBuyer")) { p.food += 1; pushLog(g, `🐟 「${p.name}」鱼贩额外 +1 食物`); }
    if (p.minorImprovements.includes("M120")) p.resources.clay += 2;
    if (p.minorImprovements.includes("M087")) p.fuel += 2;
    if (p.minorImprovements.includes("M114")) p.resources.wood += Math.min(3, countTerrain(p, "forest"));
    if (p.minorImprovements.includes("M098") && a?.smokeFish && p.fuel > 0) { p.fuel -= 1; p.food += 3; }
    return { ok: true };
  }
  // 多人局动态行动格处理
  const extraSpaces = SCALING_BOARD_SPACES[g.numPlayers] || [];
  const extraMatch = extraSpaces.find(s => s.id === space);
  if (extraMatch) {
    if (extraMatch.type === "acc") {
      const got = g.piles[extraMatch.id] || 0;
      if (got <= 0) return { ok: false, msg: `${extraMatch.name}是空的` };
      const resKey = extraMatch.res as keyof PlayerState["resources"];
      p.resources[resKey] += got;
      g.piles[extraMatch.id] = 0;
      pushLog(g, `📦 「${p.name}」从${extraMatch.name}拿走全部 ${got} ${resZh(resKey)}`);
      return { ok: true };
    } else if (extraMatch.type === "fixed" && extraMatch.fixed) {
      for (const [k, v] of Object.entries(extraMatch.fixed)) {
        if (k === "food") p.food += v;
        else (p.resources as any)[k] += v;
      }
      pushLog(g, `⚖️ 「${p.name}」在${extraMatch.name}获得了资源组合包`);
      return { ok: true };
    }
  }

  if (space === "DayLaborer") {
    p.food += LEFT_BOARD.dayLaborer.food;
    if (p.minorImprovements.includes("M124")) p.resources.stone += 1;
    if (p.minorImprovements.includes("M083")) p.fuel += 1;
    pushLog(g, `🛠 「${p.name}」日工 +${LEFT_BOARD.dayLaborer.food} 食物（无须成本，但用掉 1 名家人）`);
    // 节气轮转：夏季日工额外 +1 谷物
    if (isSeason(g, "summer")) {
      p.resources.grain += 1;
      pushLog(g, `☀️ 「${p.name}」夏季日工雇主管饭，额外 +1 谷物`);
    }
    if (hasOccupation(p, "dayLaborer")) { p.food += 1; pushLog(g, `🛠 「${p.name}」打工达人额外 +1 食物（共 3 食物）`); }
    if (hasOccupation(p, "oddJobMan")) { p.resources.wood += 1; pushLog(g, `🧹 「${p.name}」杂务工额外 +1 木材`); }
    if (hasOccupation(p, "laborBroker")) { p.resources.clay += 1; pushLog(g, `💼 「${p.name}」劳工经纪额外 +1 陶土`); }
    return { ok: true };
  }
  // ---- 动物市场（累积格）：拿走该格全部动物，不花食物；养不下的跑回供应区 ----
  if (space === "Sheep" || space === "Boar" || space === "Cattle") {
    const t: AnimalType = space === "Sheep" ? "sheep" : space === "Boar" ? "boar" : "cattle";
    const zh = t === "sheep" ? "羊" : t === "boar" ? "猪" : "牛";
    const poolKey = space as keyof GameState["piles"];
    if (g.round < ANIMAL_MARKET[t].appearsRound) return { ok: false, msg: `${zh}市第 ${ANIMAL_MARKET[t].appearsRound} 轮起才开放` };
    const pool = g.piles[poolKey] || 0;
    if (pool <= 0) return { ok: false, msg: `${zh}市是空的（每轮 +1）` };
    let kept = 0;
    for (let i = 0; i < pool; i++) {
      if (addAnimal(g, p, t)) kept++;
      else break;   // 养不下的跑回供应区
    }
    const lost = pool - kept;
    g.piles[poolKey] = lost;   // 只收走养得下的，其余留在该格
    if (kept === 0) {
      return { ok: false, msg: `没有容纳${zh}的牧场（需先围牧场：每格 2 头）` };
    }
    // 「羊圈/猪圈/牛圈」小发展卡：取该类动物时额外 +1 只（若有容量）
    const penCard = t === "sheep" ? "mi.sheepPen" : t === "boar" ? "mi.boarPen" : "mi.cowPen";
    if ((p.minorImprovements || []).includes(penCard) && addAnimal(g, p, t)) {
      kept += 1;
      pushLog(g, `🎴 「${p.name}」${zh}圈额外 +1 只${zh}`);
    }
    // 职业牲畜奖励
    if (t === "sheep" && hasOccupation(p, "shepherd") && addAnimal(g, p, "sheep")) {
      kept += 1;
      pushLog(g, `🐑 「${p.name}」牧羊人额外 +1 只羊`);
    } else if (t === "boar" && hasOccupation(p, "swineherd") && addAnimal(g, p, "boar")) {
      kept += 1;
      pushLog(g, `🐗 「${p.name}」养猪人额外 +1 只猪`);
    } else if (t === "cattle" && hasOccupation(p, "cattleFarmer") && addAnimal(g, p, "cattle")) {
      kept += 1;
      pushLog(g, `🐄 「${p.name}」牧牛人额外 +1 只牛`);
    }
    if (hasOccupation(p, "livestockBroker")) {
      p.food += 1;
      pushLog(g, `🤝 「${p.name}」牲畜经纪人交易佣金 +1 食物`);
    }
    if (hasOccupation(p, "animalBreeder") && p.animals[t] === 2) {
      p.resources.grain += 1;
      pushLog(g, `🐣 「${p.name}」动物育种师牲畜成对 +1 谷物`);
    }
    pushLog(g, `🐑 「${p.name}」从${zh}市带走 ${kept} 只${zh}${lost > 0 ? `（${lost} 只因没有牧场跑掉了）` : ""}`);
    return { ok: true };
  }
  return { ok: false, msg: "无法执行该行动空间" };
}

// ---------- 行动：建房间及/或建马厩 ----------
function buildRoom(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  // 兼容单次旧协议 { type: "BuildRoom", x, y } 与全新复合协议 { type: "BuildRoom", rooms?: {x, y}[], stables?: {x, y}[] }
  const roomsToBuild: { x: number; y: number }[] = [];
  if (Array.isArray(a.rooms)) {
    for (const r of a.rooms) roomsToBuild.push({ x: Number(r.x), y: Number(r.y) });
  } else if (a.x !== undefined && a.y !== undefined) {
    roomsToBuild.push({ x: Number(a.x), y: Number(a.y) });
  }

  const stablesToBuild: { x: number; y: number }[] = [];
  if (Array.isArray(a.stables)) {
    for (const s of a.stables) stablesToBuild.push({ x: Number(s.x), y: Number(s.y) });
  }

  if (roomsToBuild.length === 0 && stablesToBuild.length === 0) {
    return { ok: false, msg: "请选择要建造的房间或马厩位置" };
  }

  // 1. 校验房间合法性
  if (roomsToBuild.length > 0) {
    // 拷贝一份临时 grid 逐步校验
    const tempGrid = p.grid.map(row => row.map(cell => ({ ...cell })));
    for (const { x, y } of roomsToBuild) {
      if (!isValidCell(p, x, y)) return { ok: false, msg: "无效的房间坐标" };
      if (tempGrid[y][x].kind !== "empty" || tempGrid[y][x].terrain || tempGrid[y][x].blockedBy || tempGrid[y][x].stable || isCellInPasture(p, x, y)) {
        return { ok: false, msg: `坐标 (${x},${y}) 已被使用，无法建房` };
      }
      // 检查邻接：必须与原房间或已在本批次放置的房间相邻
      let hasNeighbor = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const nx = x + dx, ny = y + dy;
        if (isValidCell(p, nx, ny) && tempGrid[ny][nx].kind === "room") {
          hasNeighbor = true;
          break;
        }
      }
      if (!hasNeighbor) return { ok: false, msg: `新房间 (${x},${y}) 必须紧邻现有房间` };
      tempGrid[y][x].kind = "room";
    }
  }

  // 2. 校验马厩合法性（个人上限 4 座，每格最多 1 座，必须是空地或牧场格，不能是房间或田）
  if (stablesToBuild.length > 0) {
    if (p.stables + stablesToBuild.length > MAX_STABLES) {
      return { ok: false, msg: `马厩总数不能超过 ${MAX_STABLES} 座（当前已有 ${p.stables} 座）` };
    }
    const seenStableCells = new Set<string>();
    for (const { x, y } of stablesToBuild) {
      if (!isValidCell(p, x, y)) return { ok: false, msg: "无效的马厩坐标" };
      const key = `${x},${y}`;
      if (seenStableCells.has(key)) return { ok: false, msg: "同一格子不能重复建造马厩" };
      seenStableCells.add(key);
      const cell = p.grid[y][x];
      if (cell.stable) return { ok: false, msg: `(${x},${y}) 已经建有马厩` };
      // 不能建在房间或田地上，也不能建在本批次即将变成房间的格子上
      if (cell.kind === "room" || cell.kind === "field" || cell.terrain || cell.blockedBy || roomsToBuild.some(r => r.x === x && r.y === y)) {
        return { ok: false, msg: `马厩只能建在空地或牧场中，不能建在房间或田地上` };
      }
    }
  }

  // 3. 计算建材消耗
  // 房间：每间 5 木/陶/石 + 2 芦苇
  const roomCostPer = ROOM_COST[p.roomType];
  const matKey = p.roomType as "wood" | "clay" | "stone";
  let totalMat = roomCostPer[matKey] * roomsToBuild.length;
  let totalReed = roomCostPer.reed * roomsToBuild.length;

  if (hasOccupation(p, "carpenter") && p.roomType === "wood") totalMat = Math.max(roomsToBuild.length, totalMat - roomsToBuild.length);
  if (p.minorImprovements.includes("M036") && p.roomType === "wood") totalMat = Math.max(roomsToBuild.length, totalMat - 2 * roomsToBuild.length);
  if (hasOccupation(p, "bricklayer") && p.roomType === "clay") totalMat = Math.max(roomsToBuild.length, totalMat - roomsToBuild.length);
  if (hasOccupation(p, "wainwright") || hasOccupation(p, "thatcher")) totalReed = Math.max(0, totalReed - roomsToBuild.length);

  // 马厩：每座 2 木
  let totalStableWood = stablesToBuild.length * STABLE_COST_WOOD;
  if (hasOccupation(p, "stableArchitect") && totalStableWood > 0) {
    totalStableWood = Math.max(0, totalStableWood - 1);
  }

  const finalCost: Record<string, number> = {};
  if (matKey === "wood") {
    finalCost.wood = totalMat + totalStableWood;
  } else {
    if (totalMat > 0) finalCost[matKey] = totalMat;
    if (totalStableWood > 0) finalCost.wood = totalStableWood;
  }
  if (totalReed > 0) finalCost.reed = totalReed;

  if (!pay(g, p, finalCost)) {
    const needDesc = Object.entries(finalCost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
    return { ok: false, msg: `建造所需资源不足：需要 ${needDesc}` };
  }

  // 4. 应用变更
  for (const { x, y } of roomsToBuild) {
    claimMoorCellGoods(p, x, y);
    p.grid[y][x].kind = "room";
    p.rooms += 1;
    pushLog(g, `🏠 「${p.name}」建了一间${houseLabel(p.roomType)}房 (${x},${y})`);
    if (hasOccupation(p, "masterBuilder")) {
      p.resources.wood += 1;
      pushLog(g, `🏗️ 「${p.name}」建筑工长回收余料 +1 木材`);
    }
    if (hasOccupation(p, "surveyor") && p.rooms >= 3) {
      p.food += 2;
      pushLog(g, `📐 「${p.name}」宅地测量员落成庆典 +2 食物`);
    }
  }

  for (const { x, y } of stablesToBuild) {
    claimMoorCellGoods(p, x, y);
    p.grid[y][x].stable = true;
    p.stables += 1;
    pushLog(g, `🛖 「${p.name}」建造了 1 座马厩 (${x},${y})（共 ${p.stables} 座）`);
  }
  if (g.dlc?.moor && p.minorImprovements.includes("M037") && roomsToBuild.length >= 2) {
    p.pendingFreeStables = (p.pendingFreeStables || 0) + Math.min(2, MAX_STABLES - p.stables);
  }

  // 节气轮转：夏季建房附赠 1 马厩
  if (roomsToBuild.length > 0 && isSeason(g, "summer") && p.stables < MAX_STABLES) {
    p.stables += 1;
    pushLog(g, `☀️ 夏季建房附赠 1 马厩（共 ${p.stables} 个）`);
  }

  rebuildPastures(p);
  return { ok: true };
}

// ---------- 行动：犁地 ----------
function plowField(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const x = Number(a.x), y = Number(a.y);
  if (!isValidCell(p, x, y)) return { ok: false, msg: "无效坐标" };
  if (p.grid[y][x].kind !== "empty" || p.grid[y][x].terrain || p.grid[y][x].blockedBy || p.grid[y][x].stable || isCellInPasture(p, x, y)) {
    return { ok: false, msg: "该格已被使用，无法犁地" };
  }
  // 必须与现有田正交相邻（无田时任意）
  const fields = collectFields(p);
  if (fields.length > 0 && !orthAdjacentToAny(p, x, y, fields)) return { ok: false, msg: "新田必须与现有田正交相邻" };
  // 节气轮转：冬季犁地冻土坚硬，需付 1 食物
  if (isSeason(g, "winter")) {
    if (p.food < 1) return { ok: false, msg: "冬季犁地需要 1 食物（节气严冬）" };
    p.food -= 1;
    pushLog(g, `❄️ 「${p.name}」冬季犁地消耗 1 食物`);
  }
  // 简化：犁地 1 块需 0 资源（原版无额外费用）
  claimMoorCellGoods(p, x, y);
  p.grid[y][x] = { kind: "field" as const };
  pushLog(g, `🌱 「${p.name}」犁地 (${x},${y})`);
  if (hasOccupation(p, "plowwright")) {
    p.resources.wood += 1;
    pushLog(g, `🚜 「${p.name}」犁匠刨取优质木料 +1 木`);
  }
  if (g.dlc?.moor && !a.suppressMoorBonus) {
    if (p.minorImprovements.includes("M041") && p.animals.cattle > 0) p.pendingPlow = (p.pendingPlow || 0) + 1;
    if (p.minorImprovements.includes("M129")) p.pendingHorsePurchase = (p.pendingHorsePurchase || 0) + 1;
    if (p.minorImprovements.includes("M042")) p.pendingDeepPlow = (p.pendingDeepPlow || 0) + 1;
  }
  return { ok: true };
}

// ---------- 行动：播种（支持单次批量播种多块田） ----------
function sow(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const items: { x: number; y: number; crop: "grain" | "vegetable" }[] = [];
  if (Array.isArray(a.sowed)) {
    for (const item of a.sowed) {
      items.push({ x: Number(item.x), y: Number(item.y), crop: item.crop === "vegetable" ? "vegetable" : "grain" });
    }
  } else if (a.x !== undefined && a.y !== undefined) {
    items.push({ x: Number(a.x), y: Number(a.y), crop: a.crop === "vegetable" ? "vegetable" : "grain" });
  }

  if (items.length === 0) return { ok: false, msg: "请选择要播种的田地" };

  let needGrain = 0;
  let needVeg = 0;
  const seenCells = new Set<string>();

  for (const item of items) {
    const { x, y, crop } = item;
    if (!isValidCell(p, x, y)) return { ok: false, msg: "无效坐标" };
    const key = `${x},${y}`;
    if (seenCells.has(key)) return { ok: false, msg: "不能在同一块田重复播种" };
    seenCells.add(key);

    const cell = p.grid[y][x];
    const noTill = cell.kind === "empty" && !cell.terrain && !cell.stable && !cell.blockedBy && p.minorImprovements.includes("M111");
    if (cell.kind !== "field" && !noTill) return { ok: false, msg: `(${x},${y}) 不是可播种的田地或免耕空地` };
    if (cell.crop) return { ok: false, msg: `(${x},${y}) 已经播过种` };

    if (crop === "grain") needGrain += 1;
    else needVeg += 1;
  }

  if (p.resources.grain < needGrain) return { ok: false, msg: `谷物种子不足（需要 ${needGrain}，当前拥有 ${p.resources.grain}）` };
  if (p.resources.vegetable < needVeg) return { ok: false, msg: `蔬菜种子不足（需要 ${needVeg}，当前拥有 ${p.resources.vegetable}）` };
  const existingNoTill = p.grid.flat().filter(cell => cell.kind === "empty" && cell.crop).length;
  const newNoTill = items.filter(({ x, y }) => p.grid[y][x].kind === "empty").length;
  if (existingNoTill + newNoTill > 2) return { ok: false, msg: "免耕农业最多占用 2 个空地格" };

  p.resources.grain -= needGrain; g.supply.grain += needGrain;
  p.resources.vegetable -= needVeg; g.supply.vegetable += needVeg;

  for (const item of items) {
    const { x, y, crop } = item;
    const cell = p.grid[y][x];
    cell.crop = crop;
    cell.markers = crop === "grain" ? SOW_GRAIN_TOTAL : SOW_VEG_TOTAL;
    if (cell.fallowFood) { p.food += cell.fallowFood; cell.fallowFood = undefined; }
    pushLog(g, `${crop === "grain" ? "🌾" : "🥕"} 「${p.name}」在 (${x},${y}) 播种${zhAnimal(crop)}（标记 ${cell.markers}）`);
  }

  if (hasOccupation(p, "cornShepherd") && items.length > 0) {
    p.food += items.length;
    pushLog(g, `🌾 「${p.name}」麦田看守护粮酬劳 +${items.length} 食物`);
  }
  return { ok: true };
}

// ---------- 复合行动：播种及/或烤面包 ----------
function sowAndBake(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  let anyDone = false;
  if (a.sowed && Array.isArray(a.sowed) && a.sowed.length > 0) {
    const resSow = sow(g, p, a);
    if (!resSow.ok) return resSow;
    anyDone = true;
  }
  if (a.bake && typeof a.bake === "object") {
    const resBake = bakeBread(g, p, a.bake as EngineAction);
    if (!resBake.ok) return resBake;
    anyDone = true;
  }
  if (!anyDone) return { ok: false, msg: "请选择播种田块或执行烤面包" };
  return { ok: true };
}

// ---------- 复合行动：犁田及/或撒种 ----------
function plowAndSow(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  let plowed = false;
  if (a.plow && typeof a.plow === "object") {
    const resPlow = plowField(g, p, a.plow as EngineAction);
    if (!resPlow.ok) return resPlow;
    plowed = true;
  }
  if (a.sowed && Array.isArray(a.sowed) && a.sowed.length > 0) {
    const resSow = sow(g, p, a);
    if (!resSow.ok) return resSow;
    return { ok: true };
  }
  if (!plowed) return { ok: false, msg: "请选择犁田位置或撒种" };
  return { ok: true };
}

// ---------- 高级行动：急迫添丁（无空房添丁） ----------
function urgentGrowth(g: GameState, p: PlayerState): ActionResult {
  if (p.family >= MAX_FAMILY) return { ok: false, msg: "家里最多 5 人" };
  // ★ 官方规则：急迫添丁即使没有空房也可进行添丁
  p.family += 1;
  p.babiesThisRound += 1;
  onMoorFamilyGrowth(p);
  pushLog(g, `👶 「${p.name}」急迫添丁：家庭增添了新成员（无需空房）`);
  if (hasOccupation(p, "midwife")) {
    p.food += 2;
    pushLog(g, `👶 「${p.name}」助产士贺礼 +2 食物`);
  }
  return { ok: true };
}

// ---------- 复合行动：翻修及/或建栅栏 ----------
function renovateFences(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  let anyDone = false;
  if (a.direction) {
    const resReno = renovate(g, p, a);
    if (!resReno.ok) return resReno;
    anyDone = true;
  }
  if (a.edges && Array.isArray(a.edges) && a.edges.length > 0) {
    const resFences = buildFences(g, p, a);
    if (!resFences.ok) return resFences;
    anyDone = true;
  }
  if (!anyDone) return { ok: false, msg: "请选择翻修房屋或搭建栅栏" };
  return { ok: true };
}

// ---------- 行动：建栅栏 ----------
function buildFences(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const ids = (Array.isArray(a.edges) ? a.edges : []) as string[];
  if (ids.length === 0) return { ok: false, msg: "至少要选 1 段栅栏" };
  const added: { kind: "h" | "v"; x: number; y: number }[] = [];
  const baseEdges = cloneEdges(p.edges);
  for (const id of ids) {
    const e = parseEdgeId(String(id));
    if (!e) return { ok: false, msg: "无效栅栏段" };
    if (e.kind === "h" ? !baseEdges.h[e.y] || e.x < 0 || e.x >= baseEdges.h[e.y].length : !baseEdges.v[e.y] || e.x < 0 || e.x >= baseEdges.v[e.y].length) return { ok: false, msg: "栅栏坐标超出农场" };
    const neighbors = e.kind === "h" ? [[e.x, e.y - 1], [e.x, e.y]] : [[e.x - 1, e.y], [e.x, e.y]];
    if (!neighbors.some(([x, y]) => isValidCell(p, x, y))) return { ok: false, msg: "不能在农场外建造栅栏" };
    if (e.kind === "h" && baseEdges.h[e.y]?.[e.x] === true) continue;
    if (e.kind === "v" && baseEdges.v[e.y]?.[e.x] === true) continue;
    if (e.kind === "h") baseEdges.h[e.y][e.x] = true;
    else baseEdges.v[e.y][e.x] = true;
    added.push(e);
  }
  const totalAfter = countEdges(baseEdges);
  if (totalAfter > FENCE_MAX) return { ok: false, msg: `栅栏总数 ${FENCE_MAX} 段上限` };
  // 选中的段全部已经建好 → 不能白烧一次行动（栅栏不可拆除，也没有新段可加）
  if (added.length === 0) return { ok: false, msg: "这些栅栏段已经建好了，请选择虚线格边" };
  // 节气轮转：春季建栅栏最多 2 段免费（须至少付费 1 段）
  let freeSegs = 0;
  if (isSeason(g, "spring") && added.length >= 2) {
    freeSegs = Math.min(2, added.length - 1);
  }
  const cost = (added.length - freeSegs) * FENCE_COST_WOOD;
  if (p.resources.wood < cost) return { ok: false, msg: `需要 ${cost} 木头` };
  // 验证：必须是围出封闭牧场（且内部农田/房屋用栅栏隔开）
  const blocked = new Set<string>();
  for (let y = 0; y < p.grid.length; y++) {
    for (let x = 0; x < p.grid[y].length; x++) {
      if (p.grid[y][x].kind === "room" || p.grid[y][x].kind === "field" || p.grid[y][x].kind === "void" || p.grid[y][x].terrain || p.grid[y][x].blockedBy) {
        blocked.add(`${x},${y}`);
      }
    }
  }
  const holes = new Set<string>();
  for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) if (p.grid[y][x].kind === "void") holes.add(`${x},${y}`);
  const v = validateEnclosure(p.grid[0].length, p.grid.length, baseEdges, added.map((e) => edgeId(e.kind, e.x, e.y)), blocked, holes);
  if (!v.ok) return { ok: false, msg: v.reason || "栅栏布局非法" };
  if (p.specialPastureRestriction) {
    const existing = new Set(p.pastures.flatMap(pasture => pasture.cells));
    const next = computePastures(p.grid[0].length, p.grid.length, baseEdges, blocked, holes);
    for (const pasture of next) {
      if (pasture.cells.some(cell => existing.has(cell))) continue;
      if (!pasture.cells.some(cell => {
        const [x, y] = cell.split(",").map(Number);
        return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => existing.has(`${nx},${ny}`));
      })) return { ok: false, msg: "特殊牧场要求之后新建的牧场紧邻已有牧场" };
    }
  }
  // 扣资源 & 应用
  p.resources.wood -= cost;
  g.supply.wood += cost;
  p.edges = baseEdges;
  rebuildPastures(p);
  for (const pasture of p.pastures) for (const key of pasture.cells) {
    const [x, y] = key.split(",").map(Number);
    claimMoorCellGoods(p, x, y);
  }
  if (freeSegs > 0) pushLog(g, `🌸 春季优惠：${freeSegs} 段栅栏免费`);
  // 现有牧场中若动物被新栅栏切出区域，逃跑（按原版：动物永远在原地，栅栏拆除/围错导致杀退 → 简化：仅当牧场消失/不可容纳时动物逃跑）
  for (const id of Object.keys(p.pastureAnimalCells)) {
    if (!p.pastures.find((x) => x.id === id)) delete p.pastureAnimalCells[id];
  }
  pushLog(g, `🪵 「${p.name}」建了 ${added.length} 段栅栏`);
  if (hasOccupation(p, "hedgeKeeper")) {
    p.resources.wood += 2;
    pushLog(g, `🪵 「${p.name}」栅栏工返还 2 木材`);
  }
  if (hasOccupation(p, "stableArchitect")) {
    p.resources.wood += 1;
    pushLog(g, `🛖 「${p.name}」圈舍建造师返还 1 木材`);
  }
  return { ok: true };
}

// ---------- 行动：烤面包 ----------
function bakeBread(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const ovenId = String(a.oven);
  const minorGrill = ovenId === "M105" && p.minorImprovements.includes("M105");
  if (!minorGrill && (!p.improvements.includes(ovenId) || !MAJOR_IMPROVEMENTS[ovenId]?.bake)) return { ok: false, msg: "你没有这件烘焙改进" };
  const cfg = minorGrill ? { maxGrain: Infinity, foodPerGrain: 2 } : MAJOR_IMPROVEMENTS[ovenId]?.bake;
  let grainWanted = Math.max(0, Math.floor(Number(a.grain) || 0));
  if (grainWanted === 0) return { ok: false, msg: "至少要 1 谷物" };
  // 依据所用改进卡限制单次烘焙谷物数
  if (grainWanted > cfg.maxGrain) grainWanted = cfg.maxGrain;
  if (p.resources.grain < grainWanted) return { ok: false, msg: "谷物不足" };
  const food = cfg.foodPerGrain * grainWanted;
  let extraFood = 0;
  if (hasOccupation(p, "baker") || hasOccupation(p, "breadBakerApprentice")) extraFood += 1;
  if (hasOccupation(p, "miller")) extraFood += grainWanted;
  const totalFood = food + extraFood;
  p.resources.grain -= grainWanted; g.supply.grain += grainWanted;
  p.food += totalFood;
  pushLog(g, `🍞 「${p.name}」用 ${grainWanted} 谷物烤面包 +${totalFood} 食物${extraFood ? `（含职业加成 +${extraFood}）` : ""}`);
  return { ok: true };
}

function sideJob(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (!g.dlc?.moor || g.dlc.moorLevel !== 1 || g.numPlayers === 1) return { ok: false, msg: "副业行动只用于 I 级多人沼泽对局" };
  const stable = !!a.buildStable;
  const bread = !!a.bakeBread;
  if (!stable && !bread) return { ok: false, msg: "请选择建一座马厩或烤面包" };
  const x = Number(a.x), y = Number(a.y);
  if (stable) {
    if (!isValidCell(p, x, y) || p.grid[y][x].kind !== "empty" || p.grid[y][x].terrain || p.grid[y][x].stable)
      return { ok: false, msg: "请选择一块无森林、沼泽的空地建马厩" };
    if (p.stables >= MAX_STABLES || p.resources.wood < 1)
      return { ok: false, msg: "马厩数量已满或木材不足" };
  }
  if (bread) {
    const result = bakeBread(g, p, a);
    if (!result.ok) return result;
  }
  if (stable) {
    p.resources.wood -= 1;
    p.grid[y][x].stable = true;
    p.stables += 1;
    rebuildPastures(p);
    pushLog(g, `🛖 「${p.name}」通过副业建了一座马厩`);
  }
  return { ok: true };
}

// ---------- 行动：家庭成长 ----------
function familyGrowth(g: GameState, p: PlayerState): ActionResult {
  if (p.family >= MAX_FAMILY) return { ok: false, msg: "家里最多 5 人" };
  if (p.rooms + (p.minorImprovements.includes("M032") ? 1 : 0) <= p.family) return { ok: false, msg: "空房间不足" };
  // ★ 官方规则：添丁行动本身不花费食物；新生儿本轮不工作，收获阶段仅需 1 食物
  p.family += 1;
  p.babiesThisRound += 1;
  onMoorFamilyGrowth(p);
  pushLog(g, `👶 「${p.name}」的家庭迎来了新成员`);
  if (hasOccupation(p, "midwife")) {
    p.food += 2;
    pushLog(g, `👶 「${p.name}」助产士贺礼 +2 食物`);
  }
  if (hasOccupation(p, "governess")) {
    p.resources.grain += 1;
    pushLog(g, `📖 「${p.name}」家庭教师启蒙礼 +1 谷物`);
  }
  return { ok: true };
}

function onMoorFamilyGrowth(p: PlayerState) {
  if (p.minorImprovements.includes("M089")) { p.fuel += 1; p.food += 1; p.moorBonusVP += 1; }
  if (p.minorImprovements.includes("M103")) p.food += countTerrain(p, "forest");
}

// ---------- 行动：翻修 ----------
function renovate(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (a.convertPeatHut) {
    if (!g.dlc?.moor || !p.minorImprovements.includes("M032") || p.roomType !== "wood") return { ok: false, msg: "只有木屋可以将泥炭小屋换成房间" };
    const x = Number(a.x), y = Number(a.y);
    if (!isValidCell(p, x, y) || p.grid[y][x].kind !== "empty" || p.grid[y][x].terrain || p.grid[y][x].stable || p.grid[y][x].blockedBy || isCellInPasture(p, x, y)) return { ok: false, msg: "请选择紧邻木屋的空地" };
    const rooms = p.grid.flatMap((row, ry) => row.map((cell, rx) => cell.kind === "room" ? `${rx},${ry}` : "")).filter(Boolean);
    if (!orthAdjacentToAny(p, x, y, rooms)) return { ok: false, msg: "新房间必须紧邻原有房间" };
    p.grid[y][x] = { kind: "room" };
    p.rooms += 1;
    p.minorImprovements.splice(p.minorImprovements.indexOf("M032"), 1);
    rebuildPastures(p);
    pushLog(g, `🏠 「${p.name}」用翻修行动将泥炭小屋换成 1 间木屋`);
    return { ok: true };
  }
  const direction = String(a.direction) as "woodToClay" | "clayToStone";
  if (direction === "woodToClay" && p.roomType !== "wood") return { ok: false, msg: "需要先翻成陶屋" };
  if (direction === "clayToStone" && p.roomType !== "clay") return { ok: false, msg: "需要先翻成石屋" };
  // ★ 官方规则：翻修时陶土/石材按「每间房 1 个」计费，但芦苇整栋房屋统一「仅需 1 芦苇」盖屋顶
  const matKey = direction === "woodToClay" ? "clay" : "stone";
  const cost: Record<string, number> = {
    [matKey]: p.rooms,
    reed: 1,
  };
  if (hasOccupation(p, "renovator") && cost.reed) cost.reed = 0;
  if (hasOccupation(p, "thatcher") && cost.reed) cost.reed = Math.max(0, cost.reed - 1);
  if (hasOccupation(p, "bricklayer") && cost.clay) cost.clay = Math.max(0, cost.clay - 1);
  if (hasOccupation(p, "masterMason") && direction === "clayToStone" && cost.stone) cost.stone = Math.max(1, cost.stone - 1);
  if (!pay(g, p, cost)) {
    const need = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
    return { ok: false, msg: `翻修需 ${need}（共 ${p.rooms} 间房）` };
  }
  p.roomType = direction === "woodToClay" ? "clay" : "stone";
  const spent = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
  pushLog(g, `🔨 「${p.name}」把整栋 ${p.rooms} 间房翻修为${houseLabel(p.roomType)}屋（花费 ${spent}）`);
  if (hasOccupation(p, "plasterer")) {
    p.food += 1;
    pushLog(g, `🖌️ 「${p.name}」抹灰工翻修奖励 +1 食物`);
  }
  return { ok: true };
}

/** 资源 key → 中文单位（用于费用提示） */
function resLabel(k: string): string {
  return ({ wood: "木材", clay: "陶土", reed: "芦苇", stone: "石材", grain: "谷物", vegetable: "蔬菜", food: "食物", fuel: "燃料", hay: "干草" } as Record<string, string>)[k] || k;
}
/** 行动格 id → 中文名 */
function zhSpace(id: string): string {
  return ({ Wood: "木材堆", Clay: "陶土坑", Reed: "芦苇滩", Stone: "采石场", Grain: "谷物堆", Vegetable: "蔬菜地", Fishing: "鱼塘" } as Record<string, string>)[id] || id;
}
/** 资源 key → 中文名 */
function resZh(k: string): string {
  return ({ wood: "木材", clay: "陶土", reed: "芦苇", stone: "石材", grain: "谷物", vegetable: "蔬菜", fuel: "燃料", hay: "干草" } as Record<string, string>)[k] || k;
}
/** 资源 key → 图标 */
function resIcon(k: string): string {
  return ({ wood: "🪵", clay: "🧱", reed: "🎋", stone: "⛏", grain: "🌾", vegetable: "🥕" } as Record<string, string>)[k] || "📦";
}

// ---------- 行动：建重大改进 ----------
function buildMajor(g: GameState, p: PlayerState, a: EngineAction, registerOfCraftsmen = false): ActionResult {
  const name = String(a.improvement) as keyof typeof MAJOR_IMPROVEMENTS;
  if (!MAJOR_IMPROVEMENTS[name]) return { ok: false, msg: "未知道具" };
  const imp = MAJOR_IMPROVEMENTS[name];
  if (imp.moor && !g.dlc?.moor) return { ok: false, msg: "该改进仅限沼泽农夫" };
  if (g.dlc?.moor && ["heatingStove", "peatKiln", "moorCook", "tileOven", "firewood"].includes(name)) {
    return { ok: false, msg: "旧版自定义沼泽改进不在官方卡池中" };
  }
  if (g.players.some(other => other.id !== p.id && other.reservedMajor === name)) return { ok: false, msg: "这张重大改进已被其他玩家预留" };
  if (imp.blockedBy && p.reservedMajor !== name && !g.players.some(other => other.improvements.includes(imp.blockedBy))) {
    return { ok: false, msg: "这张改进仍被上层卡牌覆盖" };
  }
  if (p.improvements.includes(name)) return { ok: false, msg: "你已拥有该改进" };

  // ★ 官方规则：主要发展卡公共陈列，全场唯一。已被其他玩家建造的不能再建
  const otherOwner = g.players.find(other => other.id !== p.id && other.improvements.includes(name));
  if (otherOwner) {
    return { ok: false, msg: `「${majorLabel(name)}」已被「${otherOwner.name}」买走（全场唯一）` };
  }

  // ★ 官方升级规则：如果建造的是烹饪灶（cookingHearth 或 cookingHearthBig），且玩家拥有壁炉（fireplace 或 fireplaceBig），
  // 可以退回壁炉，仅需支付差价（烹饪灶4陶 - 壁炉2陶 = 补 2 陶；或大烹饪灶5陶 - 大壁炉3陶 = 补 2 陶）
  let upgradeFrom: "fireplace" | "fireplaceBig" | "cookingHearth" | "cookingHearthBig" | null = null;
  if (name === "cookingHearth" || name === "cookingHearthBig") {
    if (p.improvements.includes("fireplace")) upgradeFrom = "fireplace";
    else if (p.improvements.includes("fireplaceBig")) upgradeFrom = "fireplaceBig";
  }
  if (name === "cookhouseA" || name === "cookhouseB") {
    upgradeFrom = (["fireplace", "fireplaceBig", "cookingHearth", "cookingHearthBig"] as const)
      .find(id => p.improvements.includes(id)) || null;
  }

  const baseCost = MAJOR_IMPROVEMENTS[name].cost;
  const cost = { ...baseCost };
  if (registerOfCraftsmen && ["joinery", "pottery", "basket"].includes(name)) cost.stone = Math.max(0, (cost.stone || 0) - 1);

  if (upgradeFrom) {
    const refundClay = name === "cookhouseA" || name === "cookhouseB"
      ? 6 : MAJOR_IMPROVEMENTS[upgradeFrom].cost.clay || 0;
    if (cost.clay) cost.clay = Math.max(0, cost.clay - refundClay);
  }
  if (g.dlc?.moor && p.improvements.includes("museumOfMoors") &&
      ["well", "clayOven", "stoneOven", "joinery", "pottery", "basket", "forestersLodge"].includes(name)) {
    const discount = String(a.discountResource || "");
    if (!["wood", "clay", "reed", "stone"].includes(discount) || !cost[discount]) {
      return { ok: false, msg: "沼泽博物馆：请选择要减免的 1 份建材" };
    }
    cost[discount] -= 1;
  }
  if (g.dlc?.moor && p.minorImprovements.includes("M113")) {
    const reduction: Record<string, "wood" | "clay" | "reed" | "stone"> = {
      heatingOven: "clay", villageChurch: "stone", tiledOven: "stone", furnitureStall: "wood",
      ridingStables: "wood", basketStall: "reed", ceramicsStall: "clay",
    };
    const resource = reduction[name];
    if (resource && cost[resource]) cost[resource] -= 1;
  }

  if (hasOccupation(p, "cooper") && cost.wood) cost.wood = Math.max(0, cost.wood - 1);
  if (hasOccupation(p, "blacksmith") && cost.stone) cost.stone = Math.max(0, cost.stone - 1);
  if (hasOccupation(p, "kilnMaster") && cost.clay) cost.clay = Math.max(0, cost.clay - 1);
  const fuelReplace = String(a.fuelReplace || "");
  if (fuelReplace) {
    if (!p.minorImprovements.includes("M093") || !["wood", "clay", "reed", "stone"].includes(fuelReplace) || !cost[fuelReplace] || p.fuel < 1) return { ok: false, msg: "雇农宿舍需要 1 燃料替换 1 份建材" };
    cost[fuelReplace] -= 1;
  }

  // 节气轮转：秋季建大改进减 1 建材（优先减最贵的一项 木/陶/石）
  if (isSeason(g, "autumn")) {
    const cands = (["wood", "clay", "stone"] as const)
      .filter((k) => (cost[k] || 0) > 0)
      .sort((x, y2) => (cost[y2] || 0) - (cost[x] || 0));
    if (cands.length) {
      const pick = cands[0];
      cost[pick] -= 1;
      pushLog(g, `🍂 秋季优惠：建大改进 −1 ${resZh(pick)}`);
    }
  }

  if (!pay(g, p, cost)) return { ok: false, msg: "建造所需资源不足" };
  if (fuelReplace) p.fuel -= 1;

  if (upgradeFrom) {
    // 退还旧壁炉到公共池
    p.improvements = p.improvements.filter(imp => imp !== upgradeFrom);
    pushLog(g, `🔄 「${p.name}」退还了「${majorLabel(upgradeFrom)}」，折价升级为「${majorLabel(name)}」`);
  }

  p.improvements.push(name);
  if (p.reservedMajor === name) p.reservedMajor = undefined;
  // 水井：建成起 5 轮，每轮开始 +1 食物
  if (name === "well") p.wellRounds = 5;
  if (name === "heatingOven") p.fuel += 2;
  if (name === "villageChurch") p.food += 2;
  pushLog(g, `🔧 「${p.name}」建造了「${majorLabel(name)}」`);
  return { ok: true };
}

// ---------- 行动：烹饪 ----------
/**
 * 烹饪改进（Fireplace / Cooking Hearth）：
 *   - 字段 cook[k] = 1 单位 k 换取多少食物（产出乘数）
 *   - 修订版官方规则：
 *       Fireplace（壁炉 2/3 陶）     蔬菜=2食物，羊=2食物，猪=2食物，牛=3食物；烤面包 1谷→2食物
 *       Cooking Hearth（烹饪灶 4/5 陶）蔬菜=3食物，羊=2食物，猪=3食物，牛=4食物；烤面包 1谷→3食物
 *   - 计算：food += used[k] * cook[k]
 */
function cook(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const impName = String(a.improvement) as keyof typeof MAJOR_IMPROVEMENTS;
  const isMasterChef = hasOccupation(p, "masterChef");
  const moorMinorCook = ["M105", "M106"].includes(impName) && p.minorImprovements.includes(impName);
  if (!p.improvements.includes(impName) && !moorMinorCook && !isMasterChef) return { ok: false, msg: "你没用过这个烹饪工具" };
  const imp = MAJOR_IMPROVEMENTS[impName];
  let cookRule = imp && ("cook" in imp) ? imp.cook : (isMasterChef ? { vegetable: 2, grain: 2, sheep: 2, boar: 2, cattle: 2 } : null);
  if (moorMinorCook) cookRule = impName === "M105"
    ? { vegetable: 2, sheep: 2, boar: 3, cattle: 3, horse: 2 }
    : { sheep: 1, boar: 2, cattle: 3, horse: 2 };
  if (cookRule && p.minorImprovements.includes("M107") && ["fireplace", "fireplaceBig", "cookingHearth", "cookingHearthBig"].includes(impName)) {
    cookRule = { ...cookRule, horse: 2 };
  }
  if (!cookRule) return { ok: false, msg: "该改进无烹饪能力" };
  const used: Record<string, number> = {};
  const RESOURCE_KEYS = new Set(["vegetable", "wood", "clay", "reed", "grain"]);
  for (const k of Object.keys(a.used || {}) as (AnimalType | "horse" | "vegetable" | "wood" | "clay" | "reed" | "grain")[]) {
    const n = Math.max(0, Math.floor(Number((a.used as any)[k]) || 0));
    if (!(cookRule as Record<string, number>)[k]) return { ok: false, msg: "该改进不能烹饪这种原料" };
    if (RESOURCE_KEYS.has(k)) {
      if ((p.resources as Record<string, number>)[k] < n) return { ok: false, msg: `${resZh(k)}不足` };
      if (n > 0) (used as Record<string, number>)[k] = n;
    } else if (k === "horse") {
      if (p.horses < n) return { ok: false, msg: "马匹不足" };
      if (n > 0) used.horse = n;
    } else {
      if (p.animals[k as AnimalType] < n) return { ok: false, msg: `${zhAnimal(k)}数量不足` };
      if (n > 0) used[k as AnimalType] = n;
    }
  }
  let food = 0;
  for (const k of Object.keys(used)) {
    const rate = (cookRule as Record<string, number>)[k]; // 1 单位换取的食物数
    if (rate > 0) food += (used as Record<string, number>)[k] * rate;
  }
  food = Math.floor(food);
  if (impName === "M106") food += Math.floor((used.horse || 0) / 2);
  // 职业烹饪加成
  let occFood = 0;
  if (hasOccupation(p, "slaughterer")) {
    const anims = (used.sheep || 0) + (used.boar || 0) + (used.cattle || 0);
    if (anims > 0) occFood += anims;
  }
  if (hasOccupation(p, "tanner")) {
    if ((used.cattle || 0) > 0 || (used.boar || 0) > 0) occFood += 2;
  }
  if (hasOccupation(p, "smokehouseMaster")) {
    if ((used.cattle || 0) > 0 || (used.boar || 0) > 0 || (used.sheep || 0) > 0) occFood += 2;
  }
  if (hasOccupation(p, "herbalist")) {
    if ((used.vegetable || 0) > 0) occFood += (used.vegetable || 0);
  }
  food += occFood;
  if (food === 0) return { ok: false, msg: "至少烹饪一种原料" };
  for (const k of Object.keys(used)) {
    if (RESOURCE_KEYS.has(k)) (p.resources as Record<string, number>)[k] -= (used as Record<string, number>)[k];
    else if (k === "horse") {
      for (let i = 0; i < used.horse; i++) removeHorse(p);
    }
    else for (let i = 0; i < (used as Record<string, number>)[k]; i++) removeMoorTradeAnimal(p, k as AnimalType);
  }
  p.food += food;
  if (p.minorImprovements.includes("M115")) {
    p.resources.wood += (used.boar || 0) + (used.cattle || 0) + (used.horse || 0);
  }
  if (p.minorImprovements.includes("M069") && p.horses >= 3 && (used.cattle || 0) > 0) p.moorBonusVP += used.cattle;
  pushLog(g, `🍳 「${p.name}」烹饪获得 ${food} 食物${occFood ? `（含职业加成 +${occFood}）` : ""}`);
  return { ok: true };
}

function removeHorse(p: PlayerState) {
  const moorIndex = p.moorAnimalSpaces?.findIndex(space => space.animal === "horse") ?? -1;
  if (moorIndex >= 0) { p.moorAnimalSpaces!.splice(moorIndex, 1); p.horses -= 1; return; }
  const inPastures = Object.values(p.horsePastureCells || {}).reduce((sum, n) => sum + n, 0);
  if (p.horses <= inPastures) {
    const id = Object.keys(p.horsePastureCells || {}).find(key => (p.horsePastureCells?.[key] || 0) > 0);
    if (id && p.horsePastureCells) {
      p.horsePastureCells[id] -= 1;
      if (p.horsePastureCells[id] === 0) {
        const pasture = p.pastures.find(pst => pst.id === id);
        if (pasture) pasture.animal = undefined;
      }
    }
  }
  p.horses -= 1;
  if ((p.bogPonies || 0) > 0) p.bogPonies! -= 1;
}

// ---------- 工具 ----------
function isCellInPasture(p: PlayerState, x: number, y: number): boolean {
  const key = `${x},${y}`;
  return (p.pastures || []).some(pst => pst.cells.includes(key));
}

function isValidCell(p: PlayerState, x: number, y: number) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && y < p.grid.length && x < p.grid[y].length && p.grid[y][x].kind !== "void";
}

function houseNeighbors(p: PlayerState, x: number, y: number): string[] {
  const out: string[] = [];
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    const nx = x + dx, ny = y + dy;
    if (!isValidCell(p, nx, ny)) continue;
    if (p.grid[ny][nx].kind === "room") out.push(`${nx},${ny}`);
  }
  return out;
}

function collectFields(p: PlayerState): string[] {
  const out: string[] = [];
  for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) {
    if (p.grid[y][x].kind === "field") out.push(`${x},${y}`);
  }
  return out;
}

function orthAdjacentToAny(p: PlayerState, x: number, y: number, cells: string[]) {
  for (const c of cells) {
    const [cx, cy] = c.split(",").map(Number);
    if (Math.abs(cx - x) + Math.abs(cy - y) === 1) return true;
  }
  return false;
}

function extensionTargets(p: PlayerState, side: string, offset: number): { x: number; y: number }[] | null {
  const origin = p.baseFarmOrigin || { x: 0, y: 0 };
  if (!Number.isInteger(offset)) return null;
  if (side === "left" || side === "right") {
    if (offset < 0 || offset > 3) return null;
    return [0, 1].map(n => ({ x: side === "left" ? origin.x - 1 : origin.x + 3, y: origin.y + offset + n }));
  }
  if (side === "top" || side === "bottom") {
    if (offset < 0 || offset > 1) return null;
    return [0, 1].map(n => ({ x: origin.x + offset + n, y: side === "top" ? origin.y - 1 : origin.y + 5 }));
  }
  return null;
}

function shiftFarm(p: PlayerState, dx: number, dy: number) {
  if (!dx && !dy) return;
  const oldW = p.grid[0].length, oldH = p.grid.length;
  if (dx) for (const row of p.grid) row.unshift({ kind: "void" });
  if (dy) p.grid.unshift(Array.from({ length: p.grid[0].length }, () => ({ kind: "void" as const })));
  const moved = makeEdges(p.grid[0].length, p.grid.length);
  for (let y = 0; y <= oldH; y++) for (let x = 0; x < oldW; x++) moved.h[y + dy][x + dx] = p.edges.h[y][x];
  for (let y = 0; y < oldH; y++) for (let x = 0; x <= oldW; x++) moved.v[y + dy][x + dx] = p.edges.v[y][x];
  p.edges = moved;
  const move = (cell: string) => { const [x, y] = cell.split(",").map(Number); return `${x + dx},${y + dy}`; };
  for (const pasture of p.pastures) pasture.cells = pasture.cells.map(move);
  for (const [id, cells] of Object.entries(p.pastureAnimalCells)) p.pastureAnimalCells[id] = cells.map(move);
  if (p.guestForestCell) p.guestForestCell = move(p.guestForestCell);
  for (const space of p.moorAnimalSpaces || []) if (space.cell) space.cell = move(space.cell);
  for (const sow of p.pendingSow || []) if (sow.onlyCell) sow.onlyCell = move(sow.onlyCell);
  p.baseFarmOrigin = { x: (p.baseFarmOrigin?.x || 0) + dx, y: (p.baseFarmOrigin?.y || 0) + dy };
}

function placeFarmExtension(p: PlayerState, side: string, offset: number, moors: boolean) {
  const oldW = p.grid[0].length, oldH = p.grid.length;
  const target = extensionTargets(p, side, offset)!;
  if (target[0].x < 0) shiftFarm(p, 1, 0);
  else if (target[0].y < 0) shiftFarm(p, 0, 1);
  else if (target[0].x >= oldW) { for (const row of p.grid) row.push({ kind: "void" }); p.edges.h.forEach(row => row.push(false)); p.edges.v.forEach(row => row.push(false)); }
  else if (target[0].y >= oldH) { p.grid.push(Array.from({ length: oldW }, () => ({ kind: "void" as const }))); p.edges.h.push(Array(oldW).fill(false)); p.edges.v.push(Array(oldW + 1).fill(false)); }
  for (const { x, y } of extensionTargets(p, side, offset)!) p.grid[y][x] = { kind: "empty", ...(moors ? { terrain: "moor" as const } : {}) };
}

function houseLabel(t: "wood" | "clay" | "stone") {
  return t === "wood" ? "木" : t === "clay" ? "陶" : t === "stone" ? "石" : "";
}

// ============================================================
// DLC：职业 / 小发展卡
// ============================================================

/** 通过行动格打出职业卡：第 1 张免费，第 2 张及以后支付 1 食物 */
function playOccupation(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const id = String(a.id || "");
  const hand = p.occupationHand || [];
  const idx = hand.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, msg: "这张职业不在你的手牌中" };

  const playedCount = (p.occupations || []).length;
  const costFood = playedCount === 0 ? 0 : 1;
  if (p.food < costFood) return { ok: false, msg: `打出第 ${playedCount + 1} 张职业需要支付 ${costFood} 食物` };

  p.food -= costFood;
  const occ = hand.splice(idx, 1)[0];
  if (!p.occupations) p.occupations = [];
  p.occupations.push(occ);
  p.occupation = occ; // 兼容旧逻辑
  pushLog(g, `🎴 「${p.name}」打出职业「${occ.icon} ${occ.name}」${costFood ? `（支付 ${costFood} 食物）` : "（免费）"}：${occ.effect}`);
  return { ok: true };
}

/** 通过行动格打出小发展卡：校验前置条件并支付资源 */
function playMinorImprovement(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const id = String(a.id || "");
  const hand = p.minorHand || [];
  const idx = hand.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, msg: "这张小发展卡不在你的手牌中" };

  const card = hand[idx];

  if (/^M\d{3}$/.test(card.id)) {
    if (!g.dlc?.moor || !MOOR_PLAYABLE_IDS.has(card.id)) return { ok: false, msg: "这张扩展卡的效果尚未接入游戏" };
    const prerequisite = validateMoorMinor(g, p, card.id, a);
    if (prerequisite) return { ok: false, msg: prerequisite };
    if (card.id === "M018") {
      const major = String(a.improvement || "");
      if (!["joinery", "pottery", "basket"].includes(major)) return { ok: false, msg: "请选择木工坊、陶器坊或编筐坊" };
      const result = buildMajor(g, p, { type: "BuildMajor", improvement: major, discountResource: "stone" }, true);
      if (!result.ok) return result;
    }
    const cost = card.cost || {};
    if ((cost.food || 0) > p.food || (cost.fuel || 0) > p.fuel) return { ok: false, msg: "打出此卡所需食物或燃料不足" };
    const resourceCost = Object.fromEntries(Object.entries(cost).filter(([key]) => key !== "food" && key !== "fuel"));
    if (!pay(g, p, resourceCost)) return { ok: false, msg: `打出「${card.name}」所需建材不足：${card.costText || "请查看卡牌"}` };
    p.food -= cost.food || 0;
    p.fuel -= cost.fuel || 0;
    if (card.id === "M085") p.improvements.splice(p.improvements.indexOf("heatingOven"), 1);
    if (card.id === "M068") p.improvements.splice(p.improvements.indexOf("villageChurch"), 1);
    if (card.id === "M113") p.improvements.splice(p.improvements.indexOf("museumOfMoors"), 1);
    if (card.id === "M105" || card.id === "M106") p.improvements.splice(p.improvements.indexOf(String(a.returnMajor)), 1);
    hand.splice(idx, 1);
    p.minorImprovements.push(card.id);
    resolveMoorMinor(g, p, card.id, a);
    if (card.id === "M027") {
      p.minorImprovements.splice(p.minorImprovements.indexOf("M027"), 1);
      if (g.numPlayers > 1) {
        const next = [...g.players].sort((x, y) => x.seat - y.seat);
        const pos = next.findIndex(other => other.id === p.id);
        const receiver = next[(pos + 1) % next.length];
        receiver.minorHand.push({ ...card, passed: true });
        if (receiver.minorImprovements.includes("M093")) receiver.food += 1;
      }
    }
    pushLog(g, `🎴 「${p.name}」打出沼泽小发展「${card.name}」`);
    return { ok: true };
  }

  // 1. 门槛校验
  if (card.prereq) {
    if (card.prereq.minOccupations && (p.occupations || []).length < card.prereq.minOccupations) {
      return { ok: false, msg: `需要至少打出 ${card.prereq.minOccupations} 张职业卡才可建造` };
    }
    if (card.prereq.minRooms && p.rooms < card.prereq.minRooms) {
      return { ok: false, msg: `需要至少拥有 ${card.prereq.minRooms} 间房间才可建造` };
    }
  }

  // 2. 支付资源
  const cost = card.cost || {};
  if (!pay(g, p, cost as Record<string, number>)) {
    const needDesc = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
    return { ok: false, msg: `建造小发展卡所需资源不足：需要 ${needDesc}` };
  }

  // 3. 移出手牌并生效
  hand.splice(idx, 1);
  p.minorImprovements.push(card.id);

  if (card.oneShot) {
    useMinorImmediate(g, p, card);
  } else {
    pushLog(g, `🎴 「${p.name}」建造了小发展卡「${card.icon} ${card.name}」：${card.effect}`);
  }
  return { ok: true };
}

function countTerrain(p: PlayerState, terrain: "forest" | "moor"): number {
  return p.grid.flat().filter(cell => cell.terrain === terrain).length;
}

function claimMoorCellGoods(p: PlayerState, x: number, y: number) {
  const cell = p.grid[y][x];
  p.food += cell.pendingFood || 0;
  p.fuel += cell.pendingFuel || 0;
  cell.pendingFood = undefined;
  cell.pendingFuel = undefined;
}

function moorTargetCells(p: PlayerState, a: EngineAction): { x: number; y: number }[] | null {
  if (!Array.isArray(a.cells)) return [];
  const cells = a.cells.map(item => ({ x: Number(item?.x), y: Number(item?.y) }));
  if (cells.some(cell => !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || !isValidCell(p, cell.x, cell.y))) return null;
  if (new Set(cells.map(cell => `${cell.x},${cell.y}`)).size !== cells.length) return null;
  return cells;
}

function fenceSingleMoorCell(p: PlayerState, x: number, y: number) {
  p.edges.h[y][x] = true;
  p.edges.h[y + 1][x] = true;
  p.edges.v[y][x] = true;
  p.edges.v[y][x + 1] = true;
  rebuildPastures(p);
}

function singleCellFenceCost(p: PlayerState, x: number, y: number): number {
  return Number(!p.edges.h[y][x]) + Number(!p.edges.h[y + 1][x]) + Number(!p.edges.v[y][x]) + Number(!p.edges.v[y][x + 1]);
}

function validateMoorMinor(g: GameState, p: PlayerState, id: string, a: EngineAction): string | null {
  const majorCount = p.improvements.length;
  const majorNeeded: Record<string, number> = { M017: 3, M018: 2, M019: 4, M020: 1, M023: 3, M029: 3, M048: 2, M114: 3, M115: 2, M120: 1, M122: 1, M129: 1, M130: 1 };
  if (majorNeeded[id] && majorCount < majorNeeded[id]) return `需要至少 ${majorNeeded[id]} 张重大改进`;
  if (id === "M025" && !countGrid(p, "field") && !p.pastures.length && !p.stables) return "需要至少 1 田、1 牧场或 1 马厩";
  if (id === "M065" && (p.food < 4 || p.fuel < 4)) return "消防队要求先拥有至少 4 食物和 4 燃料";
  if (id === "M100" && p.improvements.length + p.minorImprovements.length > 2) return "最多只能已有 2 张发展卡";
  if (id === "M085" && !p.improvements.includes("heatingOven")) return "需要归还已建造的供暖烤炉";
  if (id === "M086" && p.animals.sheep < 1) return "需要至少 1 只绵羊";
  if (id === "M103" && countTerrain(p, "forest") > 3) return "最多只能拥有 3 片森林";
  if (id === "M110" && p.horses < 2) return "需要至少 2 匹马";
  if (id === "M078" && p.improvements.length + p.minorImprovements.length < 2) return "需要至少 2 张已打出的发展卡";
  if (id === "M036" && countTerrain(p, "moor") > 0) return "需要先清除所有沼泽";
  if (id === "M040" && countTerrain(p, "moor") !== 2) return "需要恰好 2 片沼泽";
  if (id === "M068" && !p.improvements.includes("villageChurch")) return "需要归还已建造的乡村教堂";
  if (id === "M107" && p.horses < 2) return "需要至少 2 匹马";
  if (id === "M052" && (p.horses < 4 || p.family >= MAX_FAMILY)) return "需要 4 匹马且家人尚未满员";
  if (id === "M066" && p.improvements.length + p.minorImprovements.length > 2) return "最多只能已有 2 张发展卡";
  if (id === "M069" && p.horses < 2) return "需要至少 2 匹马";
  if (id === "M113" && (p.roomType !== "clay" || !p.improvements.includes("museumOfMoors"))) return "需要陶屋并归还沼泽博物馆";
  if (id === "M121" && p.improvements.length + p.minorImprovements.length < 1) return "需要至少 1 张已打出的发展卡";
  if (id === "M123" && p.food < 3) return "需要 3 食物支付采石场";
  if (id === "M079" && ![2, 4, 7, 10].includes(Number(a.delay))) return "请选择泥炭滑车延迟 2、4、7 或 10 轮";
  if (id === "M125" && p.improvements.length + p.minorImprovements.length < 2) return "需要至少 2 张已打出的发展卡";
  if (["M082", "M084"].includes(id) && p.improvements.length < 1) return "需要至少 1 张重大改进";
  if (id === "M119" && p.improvements.length + p.minorImprovements.length < 2) return "需要至少 2 张已打出的发展卡";
  if (id === "M127" && p.improvements.length < 1) return "需要至少 1 张重大改进";
  if (id === "M071" && countTerrain(p, "moor") < 1) return "需要至少 1 片沼泽";
  if (id === "M064" && p.roomType !== "stone") return "需要石屋";
  if (id === "M070" && p.roomType !== "clay") return "需要陶屋";
  if (id === "M073" && countUsedYard(p) < activeFarmCells(p)) return "需要农场没有未利用空地";
  if (id === "M074" && p.minorHand.length > 4) return "手里最多只能有 4 张发展卡";
  if (id === "M091" && p.improvements.length + p.minorImprovements.length > 0) return "打出日常工作前不能有发展卡";
  if (id === "M092" && p.improvements.length + p.minorImprovements.length < 3) return "需要至少 3 张已打出的发展卡";
  if (id === "M096" && p.improvements.length + p.minorImprovements.length < 2) return "需要至少 2 张已打出的发展卡";
  if (id === "M044" && g.round > 4) return "沼地只能在前 4 轮打出";
  if (id === "M045" && p.improvements.length + p.minorImprovements.length > 0) return "树苗圃要求尚未打出发展卡";
  if (id === "M049" && g.round > 2) return "测量员地图只能在前 2 轮打出";
  if (id === "M056" && p.horses < 1) return "泥炭切割权需要至少 1 匹马";
  if (id === "M041" && g.round < 8) return "牛颈圈只能在第 8 轮及以后打出";
  if (id === "M058" && countGrid(p, "field") < 2) return "泥炭肥料需要至少 2 块田";
  if (id === "M060" && p.horses < 1) return "播种机需要至少 1 匹马";
  if (id === "M111" && countGrid(p, "field") < 2) return "免耕农业需要至少 2 块田";
  if (id === "M063" && p.improvements.length < 2) return "教会信需要至少 2 张重大改进";
  if (id === "M057" && p.improvements.length + p.minorImprovements.length < 2) return "敲鼓者需要至少 2 张已打出的发展卡";
  if (id === "M055" && p.improvements.length + p.minorImprovements.length < 2) return "工具棚需要至少 2 张已打出的发展卡";
  if (id === "M046" && countTerrain(p, "forest") < 4) return "灌木丛需要至少 4 片森林";
  if (id === "M047" && p.improvements.length + p.minorImprovements.length < 3) return "泥塘森林需要至少 3 张已打出的发展卡";
  if (id === "M116" && p.rooms < 3) return "沼泽桦树需要至少 3 间房屋";
  if (id === "M128" && p.improvements.length + p.minorImprovements.length > 4) return "工作台要求至多已有 4 张发展卡";
  if (id === "M034" && p.improvements.length + p.minorImprovements.length < 3) return "自家林子需要至少 3 张已打出的发展卡";
  if (id === "M051" && p.roomType !== "clay") return "沼泽圈地需要陶屋";
  if (id === "M050" || id === "M051") {
    const targets = extensionTargets(p, String(a.side || ""), Number(a.offset));
    if (!targets) return "请选择扩充农场的方向和相邻的两个格子";
    if (targets.some(({ x, y }) => x >= 0 && y >= 0 && y < p.grid.length && x < p.grid[0].length && p.grid[y][x].kind !== "void")) return "扩充农场的位置已被占用";
  }
  if (id === "M101" && HARVEST_AFTER.includes(g.round)) return "肉墩不能在收获轮打出";
  if (id === "M062" && g.players.some(other => other.reservedMajor === "tiledOven" || other.improvements.includes("tiledOven"))) return "瓷砖烤炉已经被预留或建造";
  if (id === "M063" && g.players.some(other => other.reservedMajor === "villageChurch" || other.improvements.includes("villageChurch"))) return "乡村教堂已经被预留或建造";
  if (id === "M061" && p.horses < 2) return "干草货车需要至少 2 匹马";
  if (["M038", "M039"].includes(id) && !p.pastures.length) return "需要至少 1 块已有牧场";
  if (id === "M105" && (!["fireplace", "fireplaceBig"].includes(String(a.returnMajor)) || !p.improvements.includes(String(a.returnMajor)))) return "开放式烤架需要归还已拥有的壁炉";
  if (id === "M106" && (!["horseSlaughterhouseA", "horseSlaughterhouseB"].includes(String(a.returnMajor)) || !p.improvements.includes(String(a.returnMajor)))) return "马肉铺需要归还已拥有的屠马场";
  if (id === "M042" && p.improvements.length + p.minorImprovements.length < 2) return "深犁需要至少 2 张已打出的发展卡";
  if (id === "M031" && totalAnimals(p) + p.horses < 5) return "家畜市场需要至少 5 只动物";
  if (id === "M030" && a.exchange && !canExchangeMoorAnimals(g, p, ["sheep", "sheep"], ["cattle", "horse"])) return "需要 2 只羊，并能圈养换得的牛和马";
  if (id === "M031") {
    const trades = Array.isArray(a.trades) ? a.trades.map(String) : [];
    if (trades.length > 3 || trades.some(source => !["sheep", "boar", "cattle"].includes(source))) return "最多交换 3 只羊、猪或牛";
    const targets = trades.map(source => source === "sheep" ? "boar" : source === "boar" ? "cattle" : "horse");
    if (!canExchangeMoorAnimals(g, p, trades as AnimalType[], targets as (AnimalType | "horse")[])) return "动物数量不足或没有空间圈养换得的动物";
  }
  if (id === "M131") {
    const animals = Array.isArray(a.animals) ? a.animals.map(String) : [];
    if (animals.length !== 4 || new Set(animals).size !== 4 || animals.some(animal => !["sheep", "boar", "cattle", "horse"].includes(animal))) return "请为四个轮次各指定不同的动物";
  }
  if (id === "M016" && countTerrain(p, "forest") > 3) return "最多只能拥有 3 片森林";
  if (id === "M027" && countTerrain(p, "forest") < 1) return "需要至少 1 片森林";
  if (id === "M043" && countGrid(p, "field") < 2) return "需要至少 2 块田";
  if (["M015", "M016", "M017", "M021", "M038", "M039", "M042", "M043", "M046", "M047", "M053", "M064", "M066", "M095"].includes(id)) {
    const cells = moorTargetCells(p, a);
    if (!cells) return "目标地块无效或重复";
    const max = ({ M015: 1, M016: 2, M017: 1, M021: activeFarmCells(p), M038: 1, M039: 1, M042: 1, M043: 2, M046: 2, M047: activeFarmCells(p), M053: 1, M064: 1, M066: 1, M095: 3 } as Record<string, number>)[id];
    if (cells.length > max || (["M017", "M038", "M039", "M053", "M066"].includes(id) && cells.length !== 1)) return `请选择 ${max} 块符合条件的地块`;
    for (const { x, y } of cells) {
      const cell = p.grid[y][x];
      if (id === "M015" || id === "M021") { if (cell.terrain !== "moor") return "只能选择沼泽"; }
      if (id === "M016" && (cell.terrain !== "forest" || cell.kind !== "empty" || cell.stable || cell.buriedMoor || (cell.forestLayers || 1) > 1)) return "只能选择没有叠放板块的森林";
      if (id === "M046" && (cell.terrain !== "forest" || (cell.forestLayers || 1) !== 1 || cell.buriedMoor)) return "灌木丛只能叠放在单层森林上";
      if (id === "M047" && cell.terrain !== "moor") return "泥塘森林只能放在沼泽上";
      if (id === "M053" && cell.terrain !== "forest") return "森林小屋需要选择一片森林";
      if (id === "M038" && !cell.terrain) return "自然保护区须选择有森林或沼泽的地块";
      if (id === "M039" && (cell.kind !== "empty" || cell.terrain || cell.blockedBy)) return "特殊牧场须选择空地或带马厩的空地";
      if (id === "M038" || id === "M039") {
        const adjacent = orthAdjacentToAny(p, x, y, p.pastures.flatMap(pasture => pasture.cells));
        if (id === "M038" && !adjacent) return "自然保护区须紧邻已有牧场";
        if (id === "M039" && adjacent) return "特殊牧场不能紧邻已有牧场";
        if (countEdges(p.edges) + singleCellFenceCost(p, x, y) > FENCE_MAX) return "栅栏标记不足";
      }
      if ((id === "M017" || id === "M042" || id === "M043" || id === "M066" || id === "M064") && (cell.kind !== "empty" || cell.terrain || cell.stable || cell.blockedBy || isCellInPasture(p, x, y))) return "只能选择空地";
      if (id === "M095" && (cell.kind !== "field" || cell.crop || cell.fallowFood)) return "只能选择未播种且没有食物的田";
      if (id === "M043") {
        const allFields = [...collectFields(p), ...cells.filter(other => other.x !== x || other.y !== y).map(other => `${other.x},${other.y}`)];
        if (orthAdjacentToAny(p, x, y, allFields)) return "野外农田不得与任何已有或新建田地相邻";
      }
    }
  }
  return null;
}

function resolveMoorMinor(g: GameState, p: PlayerState, id: string, a: EngineAction) {
  const giveBasicSupply = () => {
    p.food = Math.max(1, p.food);
    p.fuel = Math.max(1, p.fuel);
    for (const key of ["wood", "clay", "reed", "stone", "grain"] as const) p.resources[key] = Math.max(1, p.resources[key]);
  };
  const schedule = (round: number, kind: NonNullable<PlayerState["moorScheduled"]>[number]["kind"], amount = 1) => {
    if (round > g.round && round <= 14) {
      p.moorScheduled ||= [];
      p.moorScheduled.push({ round, kind, amount });
    }
  };
  switch (id) {
    case "M030": if (a.exchange) exchangeMoorAnimals(g, p, ["sheep", "sheep"], ["cattle", "horse"]); break;
    case "M031": {
      const trades = (a.trades as AnimalType[]) || [];
      exchangeMoorAnimals(g, p, trades, trades.map(source => source === "sheep" ? "boar" : source === "boar" ? "cattle" : "horse"));
      break;
    }
    case "M015":
      p.fuel += 1;
      for (const { x, y } of moorTargetCells(p, a) || []) { p.grid[y][x].terrain = undefined; p.grid[y][x].kind = "field"; }
      break;
    case "M016":
      p.resources.wood += 2;
      for (const { x, y } of moorTargetCells(p, a) || []) { p.grid[y][x].terrain = "moor"; relocateForestAnimal(g, p, x, y); if (p.guestForestCell === `${x},${y}`) { p.guestForestCell = undefined; p.guestForestLayer = undefined; } }
      break;
    case "M017": for (const { x, y } of moorTargetCells(p, a) || []) { claimMoorCellGoods(p, x, y); p.grid[y][x].terrain = "forest"; } break;
    case "M019": p.fuel += Math.min(5, Math.max(0, activeFarmCells(p) - countUsedYard(p) - 2)); break;
    case "M020": p.fuel += countTerrain(p, "moor"); break;
    case "M021": {
      const cells = moorTargetCells(p, a) || [];
      for (const { x, y } of cells) p.grid[y][x].terrain = undefined;
      p.moorBonusVP += cells.length;
      p.fuel += cells.length * 2 + (p.horses >= 2 ? Math.min(4, p.horses - 1) : 0);
      break;
    }
    case "M022": {
      const rivals = g.players.filter(other => other.id !== p.id);
      if (["sheep", "boar", "cattle"] .some(kind => p.animals[kind as AnimalType] > 0 && rivals.every(other => !other.animals[kind as AnimalType])) ||
          (p.horses > 0 && rivals.every(other => other.horses === 0))) p.food += 2;
      for (const crop of ["grain", "vegetable"] as const) {
        const owns = p.grid.flat().some(cell => cell.crop === crop);
        if (owns && rivals.every(other => !other.grid.flat().some(cell => cell.crop === crop))) p.food += 1;
      }
      for (const terrain of ["forest", "moor"] as const) {
        const mine = countTerrain(p, terrain);
        if (mine > 0 && rivals.every(other => mine > countTerrain(other, terrain))) p.fuel += 1;
      }
      break;
    }
    case "M023": {
      for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) {
        const cell = p.grid[y][x];
        for (const other of [p.grid[y]?.[x + 1], p.grid[y + 1]?.[x]]) {
          if (!other) continue;
          const forest = cell.terrain === "forest" ? cell : other.terrain === "forest" ? other : null;
          const neighbor = forest === cell ? other : cell;
          if (!forest) continue;
          if (neighbor.kind === "field") p.food += 1;
          if (neighbor.terrain === "moor") p.fuel += 1;
        }
      }
      break;
    }
    case "M024": case "M025": giveBasicSupply(); break;
    case "M026": {
      const best = p.improvements.reduce((n, imp) => Math.max(n, MAJOR_IMPROVEMENTS[imp]?.bake?.foodPerGrain || 0), 0);
      p.food += best;
      break;
    }
    case "M028":
      if (p.improvements.includes("joinery")) p.resources.wood += 3;
      if (p.improvements.includes("pottery")) p.resources.clay += 3;
      if (p.improvements.includes("basket")) p.resources.reed += 2;
      break;
    case "M029":
      if (["joinery", "pottery", "basket"].some(major => p.improvements.includes(major))) {
        for (const key of ["wood", "clay", "reed", "stone"] as const) p.resources[key] += 1;
      }
      break;
    case "M027": p.resources.wood += 3; break;
    case "M043": for (const { x, y } of moorTargetCells(p, a) || []) { claimMoorCellGoods(p, x, y); p.grid[y][x].kind = "field"; } break;
    case "M038": case "M039": for (const { x, y } of moorTargetCells(p, a) || []) fenceSingleMoorCell(p, x, y); if (id === "M039") p.specialPastureRestriction = true; break;
    case "M042": for (const { x, y } of moorTargetCells(p, a) || []) p.grid[y][x].terrain = "moor"; break;
    case "M046": for (const { x, y } of moorTargetCells(p, a) || []) p.grid[y][x].forestLayers = 2; break;
    case "M047": for (const { x, y } of moorTargetCells(p, a) || []) { p.grid[y][x].buriedMoor = true; p.grid[y][x].terrain = "forest"; p.grid[y][x].forestLayers = 1; } break;
    case "M053": for (const { x, y } of moorTargetCells(p, a) || []) { p.guestForestCell = `${x},${y}`; p.guestForestLayer = p.grid[y][x].forestLayers || 1; } break;
    case "M050": case "M051":
      placeFarmExtension(p, String(a.side), Number(a.offset), id === "M051");
      rebuildPastures(p);
      break;
    case "M062": p.reservedMajor = "tiledOven"; p.reservedMajorRound = g.round; break;
    case "M063": p.reservedMajor = "villageChurch"; p.reservedMajorRound = g.round; break;
    case "M101": for (const other of g.players) {
      if (totalAnimals(other) + other.horses < 1) continue;
      if (other.id === p.id) other.optionalButcher = true;
      else other.pendingButcher = true;
    } break;
    case "M044": schedule(12, "moor"); break;
    case "M045": schedule(12, "forest"); schedule(13, "forest"); break;
    case "M049": schedule(11, "field"); schedule(12, "moor"); schedule(13, "forest"); break;
    case "M056": schedule(g.round + 4, "cutpeat"); schedule(g.round + 7, "cutpeat"); break;
    case "M131": for (const [index, animal] of (a.animals as string[]).entries()) {
      schedule(g.round + 2 + index * 2, `offer${animal[0].toUpperCase()}${animal.slice(1)}` as NonNullable<PlayerState["moorScheduled"]>[number]["kind"]);
    } break;
    case "M052": urgentGrowth(g, p); break;
    case "M064": for (const { x, y } of moorTargetCells(p, a) || []) p.grid[y][x].blockedBy = "grave"; break;
    case "M066": for (const { x, y } of moorTargetCells(p, a) || []) { claimMoorCellGoods(p, x, y); p.grid[y][x].terrain = "forest"; } break;
    case "M065":
      p.food += 2;
      p.moorBonusVP += Math.max(0, Math.min(4, countTerrain(p, "forest") - 1));
      break;
    case "M067": p.resources.wood += 1; p.resources.reed += 1; break;
    case "M072": p.fuel += 3; break;
    case "M068": p.food += 2; break;
    case "M074": p.food += 2; break;
    case "M075": for (let n = 0; n < 6; n++) schedule(g.round + 1 + n * 2, n % 2 === 0 ? "wood" : "fuel"); break;
    case "M076": for (let n = 1; n <= 7; n++) schedule(g.round + n, n % 2 === 1 ? "fuel" : "horse"); break;
    case "M078": for (let n = 1; g.round + n <= 14; n++) schedule(g.round + n, n % 2 === 1 ? "fuel" : "food"); break;
    case "M079": {
      const delay = Number(a.delay);
      schedule(g.round + delay, "fuel", ({ 2: 3, 4: 4, 7: 5, 10: 6 } as Record<number, number>)[delay]);
      break;
    }
    case "M083": p.fuel += 1; break;
    case "M082": p.fuel += 1; break;
    case "M080":
      p.fuel += 1; p.food += 1;
      for (const key of ["wood", "clay", "reed", "stone", "grain"] as const) p.resources[key] += 1;
      addAnimal(g, p, "sheep");
      break;
    case "M090": p.moorUses ||= {}; p.moorUses.M090 = 3; break;
    case "M055": p.moorUses ||= {}; p.moorUses.M055 = 1; break;
    case "M125": p.moorUses ||= {}; p.moorUses.M125 = 3; break;
    case "M126": p.moorUses ||= {}; p.moorUses.M126 = 4; break;
    case "M123": p.moorUses ||= {}; p.moorUses.M123 = g.numPlayers === 3 ? 3 : 5; break;
    case "M099": case "M100": p.food += 1; if (id === "M100") {
      for (const other of g.players) if (other.stables > 0 || other.pastures.length > 0) other.food += 2;
    } break;
    case "M115": p.resources.wood += 2; break;
    case "M095": for (const { x, y } of moorTargetCells(p, a) || []) p.grid[y][x].fallowFood = 2; break;
    case "M104": p.food += 1; break;
  }
}

/** 任何玩家抢一次 minor improvement 卡加入个人持有；消耗 1 名工人 */
function takeMinorImprovement(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (g.dlc?.moor) return { ok: false, msg: "沼泽扩展的小发展卡需从手牌打出" };
  if (!g.dlc?.minorImprovements) return { ok: false, msg: "本房间未启用小发展卡 DLC" };
  const id = String(a.id || "");
  const pool = g.minorImprovementCards || [];
  const idx = pool.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, msg: "这张小发展卡不在场" };
  if (p.minorImprovements.includes(id)) return { ok: false, msg: "你已经拥有这张小发展卡了" };
  p.minorImprovements.push(id);
  const card = pool[idx];
  if (card.oneShot) {
    return advance(g, p, "TakeMinorImprovement", useMinorImmediate(g, p, card));
  }
  pushLog(g, `🎴 「${p.name}」获得小发展卡「${card.icon} ${card.name}」：${card.effect}`);
  return advance(g, p, "TakeMinorImprovement", { ok: true });
}

function useMinorImmediate(g: GameState, p: PlayerState, card: MinorImprovement): ActionResult {
  switch (card.id) {
    case "mi.well":
      p.food += 1; pushLog(g, `🪣 「${p.name}」使用了「${card.name}」+1 食物`); break;
    case "mi.market":
      p.food += 3; pushLog(g, `🛒 「${p.name}」使用了「${card.name}」+3 食物`); break;
    case "mi.cookHelper":
      p.food += 2; pushLog(g, `🥣 「${p.name}」使用了「${card.name}」+2 食物`); break;
    case "mi.bigBarn":
      p.resources.grain += 1; p.resources.vegetable += 1;
      pushLog(g, `🏚 「${p.name}」使用了「${card.name}」+1 谷物 +1 蔬菜`); break;
    case "mi.clayHut":
      p.resources.clay += 2; break;
    case "mi.woodCart":
      p.resources.wood += 2; break;
    case "mi.reedPond":
      p.resources.reed += 2; break;
    case "mi.cornStore":
      p.resources.grain += 2; break;
    case "mi.vegGarden":
      p.resources.vegetable += 1; break;
    case "mi.woolBlanket":
      if (p.animals.sheep >= 1) p.food += 3;
      break;
    case "mi.manure":
      if ([p.animals.sheep, p.animals.boar, p.animals.cattle].filter(n => n > 0).length >= 2) {
        p.resources.grain += 1; p.resources.vegetable += 1;
      }
      break;
    case "mi.forestBasket":
      p.resources.wood += 1; p.food += 1; break;
    case "mi.claySieve":
      p.resources.clay += 1; p.resources.reed += 1; break;
    case "mi.seedPouch":
      p.resources.grain += 1; break;
    case "mi.fieldLunch":
      p.food += 2; break;
    case "mi.stoneBasket":
      p.resources.stone += 1; break;
    default:
      break;
  }
  if (!["mi.well", "mi.market", "mi.cookHelper", "mi.bigBarn"].includes(card.id)) {
    pushLog(g, `🎴 「${p.name}」使用了「${card.icon} ${card.name}」：${card.effect}`);
  }
  const i = (g.minorImprovementCards || []).findIndex((c) => c.id === card.id);
  if (i >= 0) g.minorImprovementCards!.splice(i, 1);
  return { ok: true };
}

/** 主动触发小发展卡效果（为日后永久加成的「主动使用」留口） */
function useMinorImprovement(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const id = String(a.id || "");
  if (!p.minorImprovements.includes(id)) return { ok: false, msg: "你没有这张小发展卡" };
  return { ok: false, msg: "此小发展卡不需要主动使用" };
}

// ============================================================
// Farmers of the Moor：燃料 / 干草 / 沼泽相关行动
// ============================================================

function cutPeatTile(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const x = Number(a.x), y = Number(a.y);
  const cell = isValidCell(p, x, y) ? p.grid[y][x] : null;
  if (!cell || cell.terrain !== "moor") return { ok: false, msg: "请选择自己农场内的沼泽" };
  if (p.minorImprovements.includes("M127") && !["wood", "clay", "reed", "stone"].includes(String(a.bonusResource || "wood"))) return { ok: false, msg: "轮推车只能取得一种建材" };
  if (a.archaeology && p.minorImprovements.includes("M070") && countEdges(p.edges) + p.grid.flat().filter(farmCell => farmCell.blockedBy === "archaeology").length >= FENCE_MAX) return { ok: false, msg: "个人栅栏标记已用尽" };
  if (p.minorImprovements.includes("M112")) for (const row of p.grid) for (const field of row) if (field.crop && field.markers) field.markers += 1;
  cell.terrain = undefined;
  if (a.archaeology && p.minorImprovements.includes("M070")) { cell.blockedBy = "archaeology"; rebuildPastures(p); }
  if (p.minorImprovements.includes("M092")) { cell.pendingFood = (cell.pendingFood || 0) + 1; cell.pendingFuel = (cell.pendingFuel || 0) + 1; }
  if (p.minorImprovements.includes("M096")) cell.pendingFood = (cell.pendingFood || 0) + 1;
  p.fuel += 3 + (p.improvements.includes("peatCharcoalKiln") ? (p.horses > 0 ? 2 : 1) : 0);
  if (p.minorImprovements.includes("M116")) p.resources.wood += 2;
  if (p.minorImprovements.includes("M109") && !!a.useGrain && p.resources.grain > 0) { p.resources.grain -= 1; p.food += 4; }
  if (p.minorImprovements.includes("M127")) (p.resources as Record<string, number>)[String(a.bonusResource || "wood")] += 1;
  if (p.minorImprovements.includes("M077") && g.round + 3 <= 14) {
    p.moorScheduled ||= [];
    p.moorScheduled.push({ round: g.round + 3, kind: "fuel", amount: 2 });
  }
  if (p.minorImprovements.includes("M048") && g.round + 4 <= 14) {
    p.moorScheduled ||= [];
    p.moorScheduled.push({ round: g.round + 4, kind: "forest", amount: 1 });
  }
  rebuildPastures(p);
  return { ok: true };
}

function relocateForestAnimal(g: GameState, p: PlayerState, x: number, y: number) {
  const index = p.moorAnimalSpaces?.findIndex(space => space.kind === "forest" && space.cell === `${x},${y}`) ?? -1;
  if (index < 0) return;
  const animal = p.moorAnimalSpaces!.splice(index, 1)[0].animal;
  if (animal === "horse") { p.horses -= 1; if (!addHorse(p, g)) pushLog(g, `🐴 「${p.name}」的马失去林地栖身处，回到供应区`); }
  else { p.animals[animal] -= 1; if (!addAnimal(g, p, animal)) pushLog(g, `🐾 「${p.name}」的${zhAnimal(animal)}失去林地栖身处，回到供应区`); }
}

function slashBurnTile(g: GameState, p: PlayerState, x: number, y: number): ActionResult {
  const cell = isValidCell(p, x, y) ? p.grid[y][x] : null;
  if (!cell || cell.terrain !== "forest") return { ok: false, msg: "请选择自己农场内的森林" };
  if ((cell.forestLayers || 1) > 1 || cell.buriedMoor) return { ok: false, msg: "叠放的森林必须先伐去上层，覆盖沼泽的森林不能刀耕火种" };
  const fields = collectFields(p);
  if (fields.length && !orthAdjacentToAny(p, x, y, fields)) return { ok: false, msg: "刀耕火种的新田必须与已有田地相邻" };
  cell.terrain = undefined;
  cell.kind = "field";
  relocateForestAnimal(g, p, x, y);
  rebuildPastures(p);
  return { ok: true };
}

function takeMoorSpecial(g: GameState, p: PlayerState, a: EngineAction, bonus?: "implement" | "taps"): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "未启用沼泽农夫" };
  const remaining = workersOf(p) - g.placedThisRound.filter(id => id === p.id).length - p.sick;
  if (remaining <= 0 && !bonus) return { ok: false, msg: "没有留在家中可继续工作的家人" };
  const card = (g.specialCards || []).find(c => c.id === a.cardId);
  const kind = String(a.kind || "");
  const solo = g.numPlayers === 1;
  if (!card || !card.actions.includes(kind) || card.usedTwice || (card.holder === p.id && !(solo && card.retained))) {
    return { ok: false, msg: "这张特殊行动卡当前不可使用" };
  }
  const secondUse = !!card.holder && !solo;
  const retain = solo && !card.holder && !!a.retain;
  if (retain && p.food < 2) return { ok: false, msg: "保留单人特殊行动卡需支付 2 食物" };
  if (secondUse && p.food < 2) return { ok: false, msg: "再次使用特殊行动卡需支付 2 食物" };
  let result: ActionResult = { ok: false, msg: "无法执行特殊行动" };
  const x = Number(a.x), y = Number(a.y);
  const cell = isValidCell(p, x, y) ? p.grid[y][x] : null;
  const comboKind = String(a.comboKind || "");
  if (comboKind) {
    if (!p.minorImprovements.includes("M055") || (p.moorUses?.M055 || 0) < 1 || !card.actions.includes("SlashBurn") || !card.actions.includes("CutPeat") ||
        !((kind === "CutPeat" && comboKind === "SlashBurn") || (kind === "SlashBurn" && comboKind === "CutPeat"))) return { ok: false, msg: "工具棚本轮不能同时执行这两个行动" };
    const comboX = Number(a.comboX), comboY = Number(a.comboY);
    if (!isValidCell(p, comboX, comboY) || (x === comboX && y === comboY)) return { ok: false, msg: "请选择两块不同的地形" };
    const trial = structuredClone(g);
    const trialPlayer = trial.players.find(player => player.id === p.id)!;
    const first = kind === "CutPeat" ? cutPeatTile(trial, trialPlayer, a) : slashBurnTile(trial, trialPlayer, x, y);
    if (!first.ok) return first;
    const second = comboKind === "CutPeat" ? cutPeatTile(trial, trialPlayer, { ...a, x: comboX, y: comboY }) : slashBurnTile(trial, trialPlayer, comboX, comboY);
    if (!second.ok) return second;
  }
  if (kind === "FellTrees") {
    if (!cell || cell.terrain !== "forest") return { ok: false, msg: "请选择自己农场内的森林" };
    const removedLayer = cell.forestLayers || 1;
    if ((cell.forestLayers || 1) > 1) cell.forestLayers = (cell.forestLayers || 1) - 1;
    else {
      cell.forestLayers = undefined;
      cell.terrain = cell.buriedMoor ? "moor" : undefined;
      cell.buriedMoor = undefined;
      relocateForestAnimal(g, p, x, y);
      if (p.minorImprovements.includes("M096")) cell.pendingFood = (cell.pendingFood || 0) + 1;
    }
    if (p.guestForestCell === `${x},${y}` && p.guestForestLayer === removedLayer) {
      p.guestForestCell = undefined;
      p.guestForestLayer = undefined;
      p.guestWorkersThisRound = (p.guestWorkersThisRound || 0) + 1;
      g.waitingFor.push(p.id);
    }
    p.resources.wood += 2 + (p.improvements.includes("forestersLodge") ? (p.horses > 0 ? 2 : 1) : 0);
    if (p.minorImprovements.includes("M122")) p.resources.reed += 1;
    if (p.minorImprovements.includes("M119")) {
      if (a.fellBonus === "reed") p.resources.reed += 1;
      else p.resources.wood += 1;
    }
    if (p.minorImprovements.includes("M118")) {
      const useFuel = !!a.timberFuel && p.fuel > 0;
      if (useFuel) p.fuel -= 1;
      p.resources.wood += useFuel ? 2 : 1;
    }
    rebuildPastures(p);
    result = { ok: true };
  } else if (kind === "CutPeat") {
    result = cutPeatTile(g, p, a);
  } else if (kind === "SlashBurn") {
    result = slashBurnTile(g, p, x, y);
    if (!result.ok) return result;
    if (p.guestForestCell === `${x},${y}`) {
      p.guestForestCell = undefined;
      p.guestForestLayer = undefined;
      p.guestWorkersThisRound = (p.guestWorkersThisRound || 0) + 1;
      g.waitingFor.push(p.id);
    }
    if (p.minorImprovements.includes("M041") && p.animals.cattle > 0) p.pendingPlow = (p.pendingPlow || 0) + 1;
    if (p.minorImprovements.includes("M059")) { p.pendingSow ||= []; p.pendingSow.push({ onlyCell: `${x},${y}` }); }
  } else if (kind === "HiringFair") {
    p.food += solo ? (card.hiringFood || 1) : g.numPlayers === 3 ? 2 : 1;
    if (p.minorImprovements.includes("M083")) p.fuel += 1;
    if (p.minorImprovements.includes("M121") && remaining === 1) p.resources.clay += 1;
    if (p.minorImprovements.includes("M123") && (p.moorUses?.M123 || 0) > 0) {
      p.resources.stone += 1;
      p.moorUses!.M123 -= 1;
    }
    result = { ok: true };
  } else if (kind === "HorseMarket") {
    const fee = solo ? (card.horseFee || 0) : g.numPlayers === 2 ? 1 : 0;
    if (p.food < fee + (secondUse ? 2 : 0) + (retain ? 2 : 0)) return { ok: false, msg: "买马和使用行动卡的食物不足" };
    if (!addHorse(p, g)) {
      const cooker = p.improvements.find(id => MAJOR_IMPROVEMENTS[id]?.cook?.horse);
      if (cooker) {
        const gained = MAJOR_IMPROVEMENTS[cooker].cook.horse;
        p.food += gained;
        pushLog(g, `🍳 「${p.name}」没有马匹空位，立即将新马换为 ${gained} 食物`);
      } else pushLog(g, `🐴 「${p.name}」没有空位，马匹跑回供应区`);
    }
    p.food -= fee;
    result = { ok: true };
  } else if (kind === "BlackMarket") {
    if (p.fuel < 1) return { ok: false, msg: "黑市需要 1 燃料" };
    const minor = (p.minorHand || []).find(c => c.id === String(a.id || ""));
    if (p.food < (minor?.cost?.food || 0) + (secondUse ? 2 : 0) + (retain ? 2 : 0)) return { ok: false, msg: "支付小发展卡与特殊行动卡的食物不足" };
    result = playMinorImprovement(g, p, a);
    if (result.ok) p.fuel -= 1;
  } else if (kind === "IllicitWork") {
    if (p.fuel < 1 || p.food < 1 + (secondUse ? 2 : 0) + (retain ? 2 : 0)) return { ok: false, msg: "私活需要 1 食物和 1 燃料，保留或重复用卡另需 2 食物" };
    result = buildMajor(g, p, a);
    if (result.ok) { p.fuel -= 1; p.food -= 1; }
  }
  if (!result.ok) return result;
  if (comboKind) {
    const comboX = Number(a.comboX), comboY = Number(a.comboY);
    const extra = comboKind === "CutPeat" ? cutPeatTile(g, p, { ...a, x: comboX, y: comboY }) : slashBurnTile(g, p, comboX, comboY);
    if (!extra.ok) return extra;
    if (comboKind === "SlashBurn") {
      if (p.guestForestCell === `${comboX},${comboY}`) {
        p.guestForestCell = undefined;
        p.guestForestLayer = undefined;
        p.guestWorkersThisRound = (p.guestWorkersThisRound || 0) + 1;
        g.waitingFor.push(p.id);
      }
      if (p.minorImprovements.includes("M041") && p.animals.cattle > 0) p.pendingPlow = (p.pendingPlow || 0) + 1;
      if (p.minorImprovements.includes("M059")) { p.pendingSow ||= []; p.pendingSow.push({ onlyCell: `${comboX},${comboY}` }); }
    }
    p.moorUses!.M055 -= 1;
  }
  if ((kind === "CutPeat" || comboKind === "CutPeat") && p.minorImprovements.includes("M058")) { p.pendingSow ||= []; p.pendingSow.push({}); }
  if (p.minorImprovements.includes("M060") && p.animals.cattle >= 2) { p.pendingSow ||= []; p.pendingSow.push({}); }
  if (secondUse) { p.food -= 2; card.usedTwice = true; }
  if (solo) {
    if (retain) { p.food -= 2; card.retained = true; }
    else card.usedTwice = true;
  }
  card.holder = p.id;
  if (bonus === "implement") { p.implementSpecial = false; g.immediateSpecialFor = undefined; }
  else if (bonus === "taps") { p.tapsSpecial = false; g.waitingFor.shift(); }
  else {
    const current = g.waitingFor.shift();
    if (current) g.waitingFor.push(current);
  }
  pushLog(g, `🌲 「${p.name}」使用特殊行动「${kind}」${secondUse ? "（支付 2 食物）" : ""}`);
  return bonus ? advanceTurn(g) : { ok: true };
}

function assignMoorAnimalSpace(g: GameState | undefined, p: PlayerState, animal: AnimalType | "horse"): boolean {
  if (!g?.dlc?.moor) return false;
  p.moorAnimalSpaces ||= [];
  if (animal !== "sheep" && p.minorImprovements.includes("M034")) {
    for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) {
      const cell = `${x},${y}`;
      if (p.grid[y][x].terrain === "forest" && !p.moorAnimalSpaces.some(space => space.kind === "forest" && space.cell === cell)) {
        p.moorAnimalSpaces.push({ kind: "forest", animal, cell });
        return true;
      }
    }
  }
  for (const owner of g.players.filter(other => other.minorImprovements.includes("M033"))) {
    const used = p.moorAnimalSpaces.filter(space => space.kind === "night" && space.ownerId === owner.id).length;
    if (used < (owner.id === p.id ? 3 : 1)) {
      p.moorAnimalSpaces.push({ kind: "night", animal, ownerId: owner.id });
      return true;
    }
  }
  return false;
}

function addHorse(p: PlayerState, g?: GameState): boolean {
  rebuildPastures(p);
  if (!p.horsePastureCells) p.horsePastureCells = {};
  for (const pst of p.pastures) {
    if (pst.animal && pst.animal !== "horse") continue;
    const hasStable = pst.cells.some(c => {
      const [x, y] = c.split(",").map(Number);
      return !!p.grid[y]?.[x]?.stable;
    });
    const capacity = pst.cells.length * (hasStable ? 4 : 2);
    if ((p.horsePastureCells[pst.id] || 0) >= capacity) continue;
    pst.animal = "horse";
    p.horsePastureCells[pst.id] = (p.horsePastureCells[pst.id] || 0) + 1;
    p.horses += 1;
    return true;
  }
  const capacity = calculateAnimalCapacity(p);
  const pastureHorses = Object.values(p.horsePastureCells).reduce((a, b) => a + b, 0);
  const outsideAnimals = p.animals.sheep + p.animals.boar + p.animals.cattle
    - Object.values(p.pastureAnimalCells).reduce((a, cells) => a + cells.length, 0);
  const moorHoused = p.moorAnimalSpaces?.length || 0;
  const troughSpace = p.minorImprovements.includes("M035") && p.grid.some((row, y) => row.some((cell, x) =>
    cell.kind === "empty" && !cell.terrain && !cell.stable && !cell.blockedBy &&
    [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => p.grid[ny]?.[nx]?.kind === "room"))) ? 2 : 0;
  if (outsideAnimals + p.horses - pastureHorses - moorHoused < capacity.pet.capacity + capacity.unfencedStables.capacity + troughSpace) {
    p.horses += 1;
    return true;
  }
  if (assignMoorAnimalSpace(g, p, "horse")) { p.horses += 1; return true; }
  return false;
}

function removeMoorTradeAnimal(p: PlayerState, type: AnimalType) {
  const moorIndex = p.moorAnimalSpaces?.findIndex(space => space.animal === type) ?? -1;
  if (moorIndex >= 0) { p.moorAnimalSpaces!.splice(moorIndex, 1); p.animals[type] -= 1; return; }
  const assigned = p.pastures.filter(pasture => pasture.animal === type)
    .reduce((sum, pasture) => sum + (p.pastureAnimalCells[pasture.id] || []).length, 0);
  if (p.animals[type] <= assigned) {
    const pasture = p.pastures.find(item => item.animal === type && (p.pastureAnimalCells[item.id] || []).length > 0);
    if (pasture) {
      p.pastureAnimalCells[pasture.id].pop();
      if (!p.pastureAnimalCells[pasture.id].length) pasture.animal = undefined;
    }
  }
  p.animals[type] -= 1;
}

function exchangeMoorAnimals(g: GameState, p: PlayerState, sources: AnimalType[], targets: (AnimalType | "horse")[]): boolean {
  if (sources.some((source, index) => p.animals[source] < sources.slice(0, index + 1).filter(item => item === source).length)) return false;
  for (const source of sources) removeMoorTradeAnimal(p, source);
  for (const target of targets) if (target === "horse" ? !addHorse(p, g) : !addAnimal(g, p, target)) return false;
  return true;
}

function canExchangeMoorAnimals(g: GameState, p: PlayerState, sources: AnimalType[], targets: (AnimalType | "horse")[]): boolean {
  return exchangeMoorAnimals(g, structuredClone(p), sources, targets);
}

// ============================================================
// Through the Seasons：节气轮转 —— 四季行动（共用「节气行动」格）
// ============================================================

/** 校验房间启用了节气 DLC 且当前正是该季节；返回错误对象或 null（通过） */
function seasonGuard(g: GameState, expected: TtsSeason): ActionResult | null {
  if (!g.dlc?.seasons) return { ok: false, msg: "本房间未启用节气轮转 DLC" };
  if (seasonOf(g) !== expected) return { ok: false, msg: `当前不是${TTS_ZH[expected]}季，无法执行该节气行动` };
  return null;
}

/** 春耕：立即执行一次繁殖阶段（同类成对即 +1 幼崽），并可选撒种一块田 */
function seasonSpring(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const guard = seasonGuard(g, "spring");
  if (guard) return guard;
  let bred = 0;
  for (const t of ["sheep", "boar", "cattle"] as AnimalType[]) {
    if (p.animals[t] >= 2 && addAnimal(g, p, t)) {
      bred += 1;
      pushLog(g, `🌸 「${p.name}」春耕繁殖，${labelAnimal(t)} +1 只`);
    }
  }
  if (a.crop) {
    const r = sow(g, p, a);
    if (!r.ok) return r;
  }
  pushLog(g, `🌸 「${p.name}」春耕忙作${bred ? `（繁殖 ${bred} 只幼崽）` : ""}`);
  return { ok: true };
}

/** 度假（夏）：本轮已放置的每名家人（含本次）+1 节气分 */
function seasonSummer(g: GameState, p: PlayerState): ActionResult {
  const guard = seasonGuard(g, "summer");
  if (guard) return guard;
  const placed = g.placedThisRound.filter((x) => x === p.id).length + 1; // 含本次放置的工人
  p.seasonVP += placed;
  pushLog(g, `☀️ 「${p.name}」带全家度假：本轮已放置 ${placed} 名家人 → +${placed} 节气分`);
  return { ok: true };
}

/** 秋收：立即执行一次田间阶段（所有带作物田各收 1），并可选再拿 1 蔬菜 */
function seasonAutumn(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const guard = seasonGuard(g, "autumn");
  if (guard) return guard;
  let gainedG = 0, gainedV = 0;
  for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) {
    const cell = p.grid[y][x];
    if ((cell.kind !== "field" && !(cell.kind === "empty" && p.minorImprovements.includes("M111"))) || !cell.crop || !cell.markers) continue;
    if (cell.crop === "grain") { p.resources.grain += 1; gainedG += 1; }
    else { p.resources.vegetable += 1; gainedV += 1; }
    cell.markers -= 1;
    if (cell.markers <= 0) { cell.crop = undefined; cell.markers = 0; }
  }
  if (gainedG || gainedV) pushLog(g, `🍂 「${p.name}」秋收田间阶段：+${gainedG} 谷物 +${gainedV} 蔬菜`);
  if (a.takeVeg) {
    p.resources.vegetable += 1;
    pushLog(g, `🥕 「${p.name}」秋收额外拿 1 蔬菜`);
  }
  if (!gainedG && !gainedV && !a.takeVeg) {
    // 空转也允许（玩家自选），但给个日志便于理解
    pushLog(g, `🍂 「${p.name}」秋收：没有可收获的田，也没有拿蔬菜`);
  }
  return { ok: true };
}

/** 家庭扩建（冬）：无需空房添丁，花 2 木 + 3 食物 */
function seasonWinter(g: GameState, p: PlayerState): ActionResult {
  const guard = seasonGuard(g, "winter");
  if (guard) return guard;
  if (p.family >= MAX_FAMILY) return { ok: false, msg: "家里最多 5 人" };
  if (p.resources.wood < 2) return { ok: false, msg: "冬季扩建需要 2 木材" };
  if (p.food < 3) return { ok: false, msg: "冬季扩建需要 3 食物" };
  p.resources.wood -= 2;
  g.supply.wood += 2;
  p.food -= 3;
  p.family += 1;
  p.babiesThisRound += 1;
  onMoorFamilyGrowth(p);
  pushLog(g, `❄️ 「${p.name}」冬季扩建：无需空房，花费 2 木 + 3 食物添 1 名家人`);
  return { ok: true };
}

function majorLabel(n: keyof typeof MAJOR_IMPROVEMENTS) {
  return ({
    fireplace: "壁炉",
    fireplaceBig: "大壁炉",
    cookingHearth: "烹饪灶",
    cookingHearthBig: "大烹饪灶",
    clayOven: "陶土烤炉",
    stoneOven: "石头烤炉",
    well: "水井",
    basket: "编筐坊",
    joinery: "木工坊",
    pottery: "陶器坊",
    heatingStove: "取暖炉",
    peatKiln: "泥炭窑",
    moorCook: "沼泽灶",
    tileOven: "瓷砖烤炉",
    firewood: "柴火棚",
  } as Record<string, string>)[n] || n;
}

function pay(g: GameState, p: PlayerState, cost: Record<string, number>): boolean {
  for (const k of Object.keys(cost)) {
    if ((p.resources as any)[k] < cost[k]) return false;
  }
  for (const k of Object.keys(cost)) {
    (p.resources as any)[k] -= cost[k];
    (g.supply as any)[k] += cost[k];
  }
  return true;
}

// ---------- 动物空间分配与容量重构 ----------
/**
 * 官方 Revised Edition 牲畜容纳规则：
 * 1. 农舍宠物（House Pet）：整栋农舍可容纳 1 只任意动物（即使没有任何牧场或马厩）。
 * 2. 空地独立马厩（Unfenced Stable）：每个未被围进牧场的马厩可容纳 1 只任意动物。
 * 3. 封闭牧场（Pastures）：
 *    - 每个牧场只能放同一种动物。
 *    - 无马厩牧场容量 = 格子数 × 2。
 *    - 含有马厩的牧场（只要有 ≥1 座马厩）容量整体翻倍 = 格子数 × 4。
 */
export function calculateAnimalCapacity(p: PlayerState): {
  pet: { capacity: number; used: number };
  unfencedStables: { capacity: number; used: number };
  pastures: { id: string; cells: number; hasStable: boolean; maxCapacity: number; animal?: AnimalType | "horse"; used: number }[];
  totalByAnimal: Record<AnimalType, number>;
  maxPossibleCapacity: number;
} {
  rebuildPastures(p);

  const pastureCells = new Set<string>();
  const pstInfos = p.pastures.map(pst => {
    let hasStable = false;
    for (const c of pst.cells) {
      pastureCells.add(c);
      const [x, y] = c.split(",").map(Number);
      if (p.grid[y]?.[x]?.stable) hasStable = true;
    }
    const capPerCell = hasStable ? 4 : 2;
    const maxCapacity = pst.cells.length * capPerCell;
    const placed = pst.animal === "horse"
      ? (p.horsePastureCells?.[pst.id] || 0)
      : (p.pastureAnimalCells?.[pst.id] || []).length;
    return {
      id: pst.id,
      cells: pst.cells.length,
      hasStable,
      maxCapacity,
      animal: pst.animal,
      used: placed,
    };
  });

  // 统计未圈进牧场的马厩数量
  let unfencedCount = 0;
  for (let y = 0; y < p.grid.length; y++) {
    for (let x = 0; x < p.grid[y].length; x++) {
      if (p.grid[y][x].stable && !pastureCells.has(`${x},${y}`)) {
        unfencedCount += 1;
      }
    }
  }

  // 计算当前实际总动物
  const currentTotal = p.animals.sheep + p.animals.boar + p.animals.cattle;

  return {
    pet: { capacity: 1, used: Math.min(1, Math.max(0, currentTotal)) },
    unfencedStables: { capacity: unfencedCount, used: 0 },
    pastures: pstInfos,
    totalByAnimal: { ...p.animals },
    maxPossibleCapacity: 1 + unfencedCount + pstInfos.reduce((s, pi) => s + pi.maxCapacity, 0),
  };
}

function addAnimal(g: GameState, p: PlayerState, t: AnimalType): boolean {
  rebuildPastures(p);

  // 1. 优先尝试放入专门容纳该动物的牧场
  for (const pst of p.pastures) {
    if (pst.animal === t) {
      let hasStable = false;
      for (const c of pst.cells) {
        const [x, y] = c.split(",").map(Number);
        if (p.grid[y]?.[x]?.stable) hasStable = true;
      }
      const cap = pst.cells.length * (hasStable ? 4 : 2);
      const placed = p.pastureAnimalCells[pst.id] || [];
      if (placed.length < cap) {
        p.pastureAnimalCells[pst.id] = [...placed, pst.cells[0]];
        p.animals[t] += 1;
        return true;
      }
    }
  }

  // 2. 其次尝试放入尚未分配动物种类的空牧场
  for (const pst of p.pastures) {
    if (!pst.animal) {
      let hasStable = false;
      for (const c of pst.cells) {
        const [x, y] = c.split(",").map(Number);
        if (p.grid[y]?.[x]?.stable) hasStable = true;
      }
      const cap = pst.cells.length * (hasStable ? 4 : 2);
      const placed = p.pastureAnimalCells[pst.id] || [];
      if (placed.length < cap) {
        pst.animal = t;
        p.pastureAnimalCells[pst.id] = [...placed, pst.cells[0]];
        p.animals[t] += 1;
        return true;
      }
    }
  }

  // 3. 计算牧场已容纳动物总数与当前动物总数
  let inPastures = 0;
  for (const pst of p.pastures) {
    inPastures += (p.pastureAnimalCells[pst.id] || []).length;
  }
  const outsidePastures = (p.animals.sheep + p.animals.boar + p.animals.cattle) - inPastures;

  // 4. 空地独立马厩（每座 1 只） + 室内宠物（1 只）
  const pastureCells = new Set<string>();
  for (const pst of p.pastures) for (const c of pst.cells) pastureCells.add(c);
  let unfencedStables = 0;
  for (let y = 0; y < p.grid.length; y++) {
    for (let x = 0; x < p.grid[y].length; x++) {
      if (p.grid[y][x].stable && !pastureCells.has(`${x},${y}`)) unfencedStables += 1;
    }
  }

  const extraCapacity = 1 /* House Pet */ + unfencedStables;
  const pastureHorses = Object.values(p.horsePastureCells || {}).reduce((sum, n) => sum + n, 0);
  const outsideHorses = p.horses - pastureHorses;
  if (outsidePastures + outsideHorses - (p.moorAnimalSpaces?.length || 0) < extraCapacity) {
    p.animals[t] += 1;
    return true;
  }
  if (assignMoorAnimalSpace(g, p, t)) { p.animals[t] += 1; return true; }

  return false;
}

function rebuildPastures(p: PlayerState) {
  const blocked = new Set<string>();
  for (let y = 0; y < p.grid.length; y++) {
    for (let x = 0; x < p.grid[y].length; x++) {
      if (p.grid[y][x].kind === "room" || p.grid[y][x].kind === "field" || p.grid[y][x].kind === "void" || p.grid[y][x].terrain || p.grid[y][x].blockedBy) {
        blocked.add(`${x},${y}`);
      }
    }
  }
  const holes = new Set<string>();
  for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) if (p.grid[y][x].kind === "void") holes.add(`${x},${y}`);
  const list = computePastures(p.grid[0].length, p.grid.length, p.edges, blocked, holes);
  const oldById = new Map(p.pastures.map((pst) => [pst.id, pst]));
  p.pastures = list.map((pst, i) => {
    const old = oldById.get(`p${i}`) || oldById.get(String(i));
    return { id: `p${i}`, cells: pst.cells, animal: old?.animal };
  });
}

// ---------- 回合推进 ----------
function advance(g: GameState, p: PlayerState, space: string, r: ActionResult): ActionResult {
  if (!r.ok) return r;
  g.placedThisRound.push(p.id);
  if ((space === "PlowField" || space === "PlowAndSow") && p.minorImprovements.includes("M054")) {
    p.implementSpecial = true;
    g.immediateSpecialFor = p.id;
  }
  if (p.reservedMajor && g.round > (p.reservedMajorRound || 0)) p.reservedMajorAvailable = true;
  // ★ 占用该行动格（撒种/烤面包同格）
  const occupied = space === "Sow" || space === "BakeBread" ? "SowOrBake" : space;
  if (occupied && occupied !== "Infirmary" && !g.usedSpaces.includes(occupied)) g.usedSpaces.push(occupied);
  if (!g.spaceOccupants) g.spaceOccupants = {};
  if (occupied) g.spaceOccupants[occupied] = p.id;
  // 移除 waitingFor 中该玩家的当前一次
  const idx = g.waitingFor.indexOf(p.id);
  if (idx >= 0) g.waitingFor.splice(idx, 1);
  if (p.minorImprovements.includes("M057") && g.placedThisRound.filter(id => id === p.id).length === workersOf(p)) {
    p.tapsSpecial = true;
    g.waitingFor.push(p.id);
  }
  pushLog(g, `✓ 「${p.name}」行动（${zhAction(space)}）`);
  return advanceTurn(g);
}

function advanceTurn(g: GameState): ActionResult {
  if (g.immediateSpecialFor) return { ok: true };
  if (g.players.some(player => player.pendingButcher)) return { ok: true };
  if (g.players.some(player => player.reservedMajorAvailable)) return { ok: true };
  if (g.players.some(player => player.tapsSpecial)) { autoPassStuck(g); return { ok: true }; }
  // 所有玩家都已放完本轮工人 → 进入收获/下一轮
  const allPlaced = g.players.every(
    (p) => g.placedThisRound.filter((x) => x === p.id).length >= workersOf(p)
  );
  if (allPlaced) {
    for (const player of g.players) {
      if (player.minorImprovements.includes("M097") && !(g.specialCards || []).some(card => card.holder === player.id)) player.food += 2;
    }
    // 收获阶段（第 4/7/9/11/13/14 轮后）
    if (HARVEST_AFTER.includes(g.round)) {
      runHarvest(g);
    }
    if (g.round >= 14) {
      // 第 14 轮收获后游戏结束
      finishGame(g);
    } else {
      startRound(g);
    }
  } else {
    // 安全网：若 waitingFor 队列意外为空但仍有工人未放置，按顺时针为尚未放完工人的玩家补充队列
    if (g.waitingFor.length === 0) {
      const clockwise = getClockwisePlayers(g);
      const placedCount = Object.fromEntries(
        clockwise.map((p) => [p.id, g.placedThisRound.filter((x) => x === p.id).length])
      );
      while (true) {
        let any = false;
        for (const p of clockwise) {
          if (placedCount[p.id] < workersOf(p)) {
            g.waitingFor.push(p.id);
            placedCount[p.id]++;
            any = true;
          }
        }
        if (!any) break;
      }
    }
    // 行动格可能已被占满：让无格可放的玩家自动跳过
    autoPassStuck(g);
    const allPlaced2 = g.players.every(
      (p) => g.placedThisRound.filter((x) => x === p.id).length >= workersOf(p)
    );
    if (allPlaced2) return advanceTurn(g);
  }
  return { ok: true };
}

function pushLog(g: GameState, msg: string) {
  g.log.push({ t: Date.now(), msg });
  if (g.log.length > 200) g.log.splice(0, g.log.length - 200);
}

// ---------- 收获 ----------
function runHarvest(g: GameState) {
  pushLog(g, `🌾 收获阶段开始（第 ${g.round} 轮）`);
  for (const p of g.players) if (p.minorImprovements.includes("M104")) {
    const startCardNumber = 1 + Math.floor(Math.random() * 9);
    if (startCardNumber <= countTerrain(p, "forest")) p.food += 1;
    pushLog(g, `🌲 「${p.name}」野外收成抽到起始卡 ${startCardNumber}，${startCardNumber <= countTerrain(p, "forest") ? "获得 1 食物" : "未获得食物"}`);
  }
  for (const p of g.players) if (p.minorImprovements.includes("M102")) {
    const startCardNumber = 1 + Math.floor(Math.random() * 9);
    if (startCardNumber <= p.resources.clay) {
      p.food += 6;
      p.minorImprovements.splice(p.minorImprovements.indexOf("M102"), 1);
      const seats = [...g.players].sort((left, right) => left.seat - right.seat);
      const next = seats[(seats.findIndex(other => other.id === p.id) + 1) % seats.length];
      const card = MOOR_MINOR_BY_ID.get("M102");
      if (card) {
        next.minorHand.push({ ...card, passed: true });
        if (next.minorImprovements.includes("M093")) next.food += 1;
      }
      pushLog(g, `💰 「${p.name}」存款抽到起始卡 ${startCardNumber}，获得 6 食物并将卡传给「${next.name}」`);
    } else pushLog(g, `💰 「${p.name}」存款抽到起始卡 ${startCardNumber}，没有获得食物`);
  }
  for (const p of g.players) if (p.minorImprovements.includes("M091")) {
    const craftCount = ["joinery", "pottery", "basket"].filter(id => p.improvements.includes(id)).length;
    if (p.routineChoice === "fuel") p.fuel += craftCount;
    else p.food += craftCount;
  }
  for (const p of g.players) if (p.minorImprovements.includes("M088") && countTerrain(p, "moor") >= 2) p.fuel += 1;
  if (g.round === 13 || g.round === 14) for (const p of g.players) if (p.minorImprovements.includes("M128")) {
    p.resources.wood += 3; p.resources.clay += 2; p.resources.reed += 1;
  }
  // 0. 蜂箱（小发展卡）：每收获轮 +1 食物
  for (const p of g.players) {
    if ((p.minorImprovements || []).includes("mi.beehive")) {
      p.food += 1;
      pushLog(g, `🍯 「${p.name}」蜂箱 +1 食物`);
    }
  }
  // 1. 字段阶段
  for (const p of g.players) {
    let gainedG = 0, gainedV = 0;
    let harvestedCount = 0;
    for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) {
      const cell = p.grid[y][x];
      if ((cell.kind !== "field" && !(cell.kind === "empty" && p.minorImprovements.includes("M111"))) || !cell.crop || !cell.markers) continue;
      if (cell.crop === "grain") { p.resources.grain += 1; gainedG += 1; }
      else { p.resources.vegetable += 1; gainedV += 1; }
      harvestedCount += 1;
      cell.markers -= 1;
      if (cell.markers <= 0) {
        if (cell.crop === "vegetable") {
          // 蔬菜田清空（原版：蔬菜田清空，不能再种）
          cell.crop = undefined; cell.markers = 0;
        }
        // 谷物田保留，可再次撒种
        if (cell.crop === "grain" && cell.markers <= 0) {
          cell.crop = undefined; cell.markers = 0;
        }
      }
    }
    if (gainedG || gainedV) pushLog(g, `🌾 「${p.name}」收获农田：${gainedG ? `+${gainedG} 谷物 ` : ""}${gainedV ? `+${gainedV} 蔬菜` : ""}`.trim());
    if (hasOccupation(p, "gardener")) {
      p.resources.vegetable += 1;
      pushLog(g, `🥕 「${p.name}」园丁收获阶段额外直接得 1 蔬菜`);
    }
    if (hasOccupation(p, "smallholder")) {
      const fCount = countGrid(p, "field");
      if (fCount <= 2) {
        p.resources.grain += 1;
        pushLog(g, `🏡 「${p.name}」小农精耕细作额外 +1 谷物`);
      }
    }
    if (hasOccupation(p, "reaper") && harvestedCount >= 2) {
      p.resources.grain += 1;
      pushLog(g, `🌾 「${p.name}」镰刀割手长镰飞舞额外 +1 谷物`);
    }
    if (hasOccupation(p, "ratcatcher")) {
      p.resources.grain += 1;
      pushLog(g, `🪤 「${p.name}」捕鼠人收获阶段额外 +1 谷物`);
    }
    if (hasOccupation(p, "beekeeper")) {
      p.food += 2;
      pushLog(g, `🐝 「${p.name}」养蜂人收获阶段蜂箱 +2 食物`);
    }
  }

  for (const p of g.players) if (p.minorImprovements.includes("M108") && p.distilleryHarvest && p.fuel > 0 && p.resources.grain > 0) {
    p.fuel -= 1;
    p.resources.grain -= 1;
    p.food += 5;
    pushLog(g, `🍶 「${p.name}」谷物酒厂消耗 1 燃料和 1 谷物，获得 5 食物`);
  }

  // 2. 喂养阶段
  for (const p of g.players) {
    // 成年人每人 2 食物；本轮出生的婴儿只需 1 食物（若有保姆则婴儿免食）
    const adults = Math.max(0, p.family - p.babiesThisRound);
    const babyNeed = hasOccupation(p, "wetNurse") ? 0 : p.babiesThisRound * FOOD_PER_BABY_THIS_HARVEST;
    const cookDiscount = hasOccupation(p, "cook") ? 1 : 0;
    const need = Math.max(0, adults * (g.dlc?.moor && g.numPlayers === 1 ? 3 : FOOD_PER_FAMILY) + babyNeed - cookDiscount);
    let needLeft = need;

    // 先用既有食物
    const fromFood = Math.min(p.food, needLeft);
    p.food -= fromFood;
    needLeft -= fromFood;

    // 不够 → 若拥有烹饪设备（壁炉/烹饪灶），优先烹饪牲畜与蔬菜防饥荒
    const hasCookHearth = p.improvements.includes("cookingHearth") || p.improvements.includes("cookingHearthBig");
    const hasFireplace = p.improvements.includes("fireplace") || p.improvements.includes("fireplaceBig");
    const canCookAnimals = hasCookHearth || hasFireplace || (hasOccupation(p, "masterChef"));

    let autoCookedAnimals = 0;
    if (needLeft > 0 && canCookAnimals) {
      // 官方规则：羊/猪/牛烹饪产出
      // 优先宰羊（产出 2）、其次野猪（炉2/灶3）、最后黄牛（炉3/灶4）
      for (const t of ["sheep", "boar", "cattle"] as const) {
        const rate = hasCookHearth ? (t === "sheep" ? 2 : t === "boar" ? 3 : 4)
                   : hasFireplace ? (t === "cattle" ? 3 : 2) : 2;
        while (needLeft > 0 && p.animals[t] > 0) {
          removeMoorTradeAnimal(p, t);
          const gained = rate;
          const usedForNeed = Math.min(needLeft, gained);
          needLeft -= usedForNeed;
          p.food += (gained - usedForNeed); // 结余的食物存入玩家储备
          autoCookedAnimals += 1;
          pushLog(g, `🍳 「${p.name}」在收获期烹饪了 1 只${zhAnimal(t)}获得 ${gained} 食物以喂饱家人`);
        }
      }
    }

    // 不够 → 用谷物（1 谷物 = 1 食物；若有烤炉且烤过，已提前转成食物；普通生吃 1:1）
    let usedGrain = 0;
    while (needLeft > 0 && p.resources.grain > 0) {
      p.resources.grain -= 1;
      g.supply.grain += 1;
      usedGrain += 1;
      needLeft -= GRAIN_TO_FOOD;
    }
    // 还不够 → 用蔬菜（如果有壁炉/烹饪灶可按 2/3 食物换，否则生吃 1:1）
    let usedVeg = 0;
    while (needLeft > 0 && p.resources.vegetable > 0) {
      p.resources.vegetable -= 1;
      g.supply.vegetable += 1;
      usedVeg += 1;
      const vegRate = hasCookHearth ? 3 : hasFireplace ? 2 : VEG_TO_FOOD;
      const usedForNeed = Math.min(needLeft, vegRate);
      needLeft -= usedForNeed;
      p.food += (vegRate - usedForNeed);
    }

    if (needLeft > 0) {
      // 每缺 1 食物 = 1 张乞讨卡
      p.beggings += needLeft;
      pushLog(g, `😢 「${p.name}」缺 ${needLeft} 食物 → ${needLeft} 张乞讨卡`);
    } else {
      const extra = useDetail(fromFood, usedGrain, usedVeg);
      pushLog(g, `🍞 「${p.name}」吃饱了（需 ${need} 食物${extra}）`);
    }
  }

  // 3. 官方沼泽农夫：按房间取暖，陶屋减 1、石屋减 2；缺燃料使家人卧床。
  if (g.dlc?.moor) {
    for (const p of g.players) {
      const discount = p.roomType === "stone" ? 2 : p.roomType === "clay" ? 1 : 0;
      let need = Math.max(0, p.rooms - discount);
      if (p.minorImprovements.includes("M085")) need = 0;
      if (p.improvements.includes("heatingOven")) need = Math.max(0, need - 1);
      if (p.improvements.includes("tiledOven")) need = Math.min(1, need);
      if (p.minorImprovements.includes("M086")) need = Math.max(0, need - Math.floor(p.animals.sheep / 2));
      if (p.minorImprovements.includes("M032")) need += 1;
      if (p.minorImprovements.includes("M082") && p.firewoodUse && need > 0 && p.resources.wood > 0) {
        p.resources.wood -= 1;
        p.fuel += 1;
        need = Math.max(0, need - 1);
      }
      const paid = Math.min(need, p.fuel, p.heatPlan ?? need);
      p.fuel -= paid;
      p.heatPlan = undefined;
      const lack = need - paid;
      if (lack > 0) {
        p.sick = Math.min(p.family, p.sick + lack);
        pushLog(g, `🛏 「${p.name}」取暖缺 ${lack} 燃料，${p.sick} 名家人卧床`);
      } else {
        pushLog(g, `🔥 「${p.name}」支付 ${need} 燃料为农舍取暖`);
      }
      if ((p.improvements.includes("villageChurch") || p.minorImprovements.includes("M068")) && p.churchSpendFuel && p.fuel > 0) {
        p.fuel -= 1;
        const gained = p.minorImprovements.includes("M068") ? 1 : 2;
        p.moorBonusVP += gained;
        pushLog(g, `⛪ 「${p.name}」支付 1 燃料，获得 ${gained} 奖励分`);
      }
    }
  }

  // 4. 繁殖阶段：夜间牧场的持有人最后繁殖
  for (const p of [...g.players].sort((a, b) => Number(a.minorImprovements.includes("M033")) - Number(b.minorImprovements.includes("M033")))) {
    (["sheep", "boar", "cattle"] as AnimalType[]).forEach((t) => {
      if (breedingAnimals(g, p, t) < 2) return;
      // 仅当现有牧场（含马厩加成）确实还有空位时才繁殖
      if (addAnimal(g, p, t)) {
        pushLog(g, `🐣 「${p.name}」的${labelAnimal(t)}繁殖 +1 只（共 ${p.animals[t]} 只）`);
      } else {
        pushLog(g, `🚫 「${p.name}」的${labelAnimal(t)}无法繁殖（牧场容量已满）`);
      }
    });
    // 兽医加成：若至少有 2 种动物，额外多繁衍 1 只
    if (hasOccupation(p, "veterinarian")) {
      const kinds = (["sheep", "boar", "cattle"] as AnimalType[]).filter(t => p.animals[t] >= 1);
      if (kinds.length >= 2) {
        for (const t of kinds) {
          if (addAnimal(g, p, t)) {
            pushLog(g, `🩺 「${p.name}」兽医精心照料，${labelAnimal(t)}额外多繁衍 1 只`);
            break;
          }
        }
      }
    }
    if (hasOccupation(p, "milker") && (p.animals.cattle >= 1 || p.animals.sheep >= 1)) {
      p.food += 1;
      pushLog(g, `🥛 「${p.name}」挤奶工鲜奶收获阶段 +1 食物`);
    }
    if (hasOccupation(p, "woolWeaver") && p.animals.sheep >= 1) {
      p.food += 1;
      pushLog(g, `🧶 「${p.name}」羊毛织工剪毛纺线 +1 食物`);
    }
    if (g.dlc?.moor && breedingAnimals(g, p, "horse") - (p.bogPonies || 0) >= 2 && addHorse(p, g)) {
      pushLog(g, `🐴 「${p.name}」的马匹繁殖 +1 匹`);
    }
  }

  if (g.round === 14) for (const p of g.players) if (p.minorImprovements.includes("M074")) {
    const converted = Math.min(p.food, p.improvements.length, p.moorUses?.M074 || 0);
    p.food -= converted;
    p.moorBonusVP += converted;
    if (converted) pushLog(g, `🏢 「${p.name}」管理部门用 ${converted} 食物换取 ${converted} 奖励分`);
  }

  pushLog(g, `✅ 第 ${g.round} 轮收获阶段结束`);
}

function totalAnimals(p: PlayerState): number {
  return p.animals.sheep + p.animals.boar + p.animals.cattle;
}

function breedingAnimals(g: GameState, p: PlayerState, animal: AnimalType | "horse"): number {
  const own = animal === "horse" ? p.horses : p.animals[animal];
  const onOthersCards = (p.moorAnimalSpaces || []).filter(space => space.kind === "night" && space.ownerId !== p.id && space.animal === animal).length;
  const hosted = g.players.filter(other => other.id !== p.id).reduce((sum, other) => sum + (other.moorAnimalSpaces || []).filter(space => space.kind === "night" && space.ownerId === p.id && space.animal === animal).length, 0);
  return own - onOthersCards + hosted;
}

/** 喂养明细（用于日志可读性） */
function useDetail(fromFood: number, grain: number, veg: number): string {
  const parts: string[] = [];
  if (fromFood > 0) parts.push(`食物 ${fromFood}`);
  if (grain > 0) parts.push(`谷物 ${grain}`);
  if (veg > 0) parts.push(`蔬菜 ${veg}`);
  return parts.length ? `，用：${parts.join(" + ")}` : "";
}

/** 本轮可用工人数 = 家庭成员 - 本轮出生的婴儿（婴儿当轮不能工作） */
function workersOf(p: PlayerState): number {
  return Math.max(0, p.family - p.babiesThisRound + (p.guestWorkersThisRound || 0));
}

function labelAnimal(t: AnimalType) {
  return t === "sheep" ? "绵羊" : t === "boar" ? "野猪" : "黄牛";
}

// ---------- 结算 ----------
function finishGame(g: GameState) {
  for (const p of g.players) {
    if (p.minorImprovements.includes("M108")) {
      const pairs = Math.min(p.resources.grain, p.fuel, p.distilleryScorePlan || 0);
      p.resources.grain -= pairs;
      p.fuel -= pairs;
      p.moorBonusVP += pairs;
      if (pairs) pushLog(g, `🍶 「${p.name}」谷物酒厂终局兑换 ${pairs} 分`);
    }
    if (!p.moorEnabled || !p.improvements.includes("peatCharcoalKiln")) continue;
    const spent = p.fuel >= 5 ? 5 : p.fuel >= 3 ? 3 : 0;
    p.fuel -= spent;
    p.kilnBonusVP = spent === 5 ? 2 : spent === 3 ? 1 : 0;
    if (spent) pushLog(g, `🔥 「${p.name}」泥炭炭窑消耗 ${spent} 燃料，获得 ${p.kilnBonusVP} 分`);
  }
  g.finished = true;
  g.scores = g.players.map((p) => scorePlayer(p, g)).map((s) => ({ id: s.id, name: s.name, total: s.total, breakdown: s.breakdown }));
  g.scores.sort((a, b) => b.total - a.total);
  pushLog(g, `🏁 游戏结束！冠军：${g.scores[0]?.name ?? "—"}`);
}

export function scorePlayer(p: PlayerState, g?: GameState): { id: string; name: string; total: number; breakdown: Record<string, number>; place: number } {
  const fields = countGrid(p, "field");
  const totalFields = fields;

  // 终局作统计：个人存货 + 田地里尚未收获的作物
  let totalGrain = p.resources.grain;
  let totalVeg = p.resources.vegetable;
  for (let y = 0; y < p.grid.length; y++) {
    for (let x = 0; x < p.grid[y].length; x++) {
      const cell = p.grid[y][x];
      if (cell.crop && cell.markers && (cell.kind === "field" || (cell.kind === "empty" && p.minorImprovements.includes("M111")))) {
        if (cell.crop === "grain") totalGrain += cell.markers;
        else if (cell.crop === "vegetable") totalVeg += cell.markers;
      }
    }
  }

  // 农场空地计分：包含扩充农场的可用格，每格未利用空地扣 1 分
  const used = countUsedYard(p);
  const unusedSpaces = Math.max(0, activeFarmCells(p) - used);

  // 圈地内马厩数量统计（每座 1 VP）
  let fencedStables = 0;
  for (const pst of p.pastures) {
    for (const c of pst.cells) {
      const [x, y] = c.split(",").map(Number);
      if (p.grid[y]?.[x]?.stable) fencedStables += 1;
    }
  }

  const breakdown: Record<string, number> = {
    田块: SCORE.fields[Math.min(5, totalFields)],
    牧场: SCORE.pastures[Math.min(4, p.pastures.length)],
    谷物: SCORE.grain[scoreIdx(totalGrain, [0, 1, 4, 6, 8])],
    蔬菜: SCORE.vegetables[scoreIdx(totalVeg, [0, 1, 2, 3, 4])],
    羊: animalScore("sheep", p.animals.sheep),
    猪: animalScore("boar", p.animals.boar),
    牛: animalScore("cattle", p.animals.cattle),
    圈地马厩: fencedStables * SCORE.fencedStable,
    陶屋: roomCount(p, "clay") * SCORE.clayRoom,
    石屋: roomCount(p, "stone") * SCORE.stoneRoom,
    木屋: roomCount(p, "wood") * SCORE.woodRoom,
    家人: p.family * SCORE.familyMember - (p.moorEnabled ? p.sick * 2 : 0),
    空地: unusedSpaces * SCORE.unusedYard,
    乞讨: p.beggings * BEGGING_PENALTY,
    改进: p.improvements.reduce((sum, k) => sum + (MAJOR_IMPROVEMENTS[k]?.vp ?? 0), 0)
      + p.minorImprovements.reduce((sum, id) => sum + (MOOR_MINOR_BY_ID.get(id)?.vp || 0), 0),
  };
  if (p.minorImprovements.includes("M067")) {
    breakdown["商会"] = ["joinery", "pottery", "basket"].filter(id => p.improvements.includes(id)).length;
  }
  if (p.minorImprovements.includes("M072")) {
    breakdown["烤炉风箱"] = ["clayOven", "stoneOven", "heatingOven", "tiledOven"].filter(id => p.improvements.includes(id)).length
      + (p.minorImprovements.includes("M085") ? 1 : 0);
  }
  if (p.minorImprovements.includes("M062") && p.improvements.includes("tiledOven")) breakdown["炉刷"] = 1;
  if (p.minorImprovements.includes("M063")) breakdown["教会信"] = Number(p.improvements.includes("villageChurch")) + Number(p.minorImprovements.includes("M068"));
  if (p.minorImprovements.includes("M066")) {
    const empty = Math.max(0, activeFarmCells(p) - countUsedYard(p));
    breakdown["地块"] = empty === 1 ? 2 : empty === 2 ? -1 : empty >= 3 ? -3 : 0;
  }
  const graveMarkers = p.grid.flat().filter(cell => cell.blockedBy === "grave").length;
  if (graveMarkers) breakdown["家族墓地"] = graveMarkers;
  const archaeologyMarkers = p.grid.flat().filter(cell => cell.blockedBy === "archaeology").length;
  if (archaeologyMarkers) breakdown["沼泽考古"] = archaeologyMarkers;
  if (p.minorImprovements.includes("M073")) {
    const least = Math.min(p.animals.sheep, p.animals.boar, p.animals.cattle, p.horses);
    if (least > 0) breakdown["畜牧奖"] = Math.max(0, (g?.numPlayers || 1) - 1) * Math.min(3, least);
  }
  if (g?.players.some(other => other.minorImprovements.includes("M071")) &&
      (p.improvements.includes("museumOfMoors") || p.minorImprovements.includes("M113"))) breakdown["泥塘尸体"] = 1;
  if (p.minorHand?.some(card => card.id === "M027" && card.passed)) breakdown["森林小径"] = -1;
  if (p.moorEnabled) breakdown["马"] = p.horses > 0 ? p.horses - (p.bogPonies || 0) * 0.5 : -1;
  if (p.moorEnabled && p.moorBonusVP > 0) breakdown["沼泽奖励"] = p.moorBonusVP;
  if (p.moorEnabled && p.improvements.includes("forestersLodge")) {
    breakdown["森林"] = p.grid.flat().filter(cell => cell.terrain === "forest").length;
  }
  if (p.moorEnabled && p.improvements.includes("peatCharcoalKiln")) {
    breakdown["泥炭"] = p.kilnBonusVP ?? (p.fuel >= 5 ? 2 : p.fuel >= 3 ? 1 : 0);
  }

  // 工坊类重大改进余量加分（木工坊/陶器坊/编筐坊）
  // 木工坊：木材 3-4: 1分, 5-6: 2分, 7+: 3分
  // 陶器坊：陶土 3-4: 1分, 5-6: 2分, 7+: 3分
  // 编筐坊：芦苇 2-3: 1分, 4: 2分, 5+: 3分
  let workshopVP = 0;
  if (p.improvements.includes("joinery")) {
    const w = p.resources.wood;
    if (w >= 7) workshopVP += 3;
    else if (w >= 5) workshopVP += 2;
    else if (w >= 3) workshopVP += 1;
  }
  if (p.improvements.includes("pottery")) {
    const c = p.resources.clay;
    if (c >= 7) workshopVP += 3;
    else if (c >= 5) workshopVP += 2;
    else if (c >= 3) workshopVP += 1;
  }
  if (p.improvements.includes("basket")) {
    const r = p.resources.reed;
    if (r >= 5) workshopVP += 3;
    else if (r >= 4) workshopVP += 2;
    else if (r >= 2) workshopVP += 1;
  }
  if (workshopVP > 0) breakdown["工坊余料"] = workshopVP;

  // 职业终局计分加成
  let occBonus = 0;
  if (hasOccupation(p, "tutor")) {
    if ((p.improvements.length + (p.minorImprovements?.length || 0)) >= 3) occBonus += 3;
  }
  if (hasOccupation(p, "villageElder")) {
    if (p.beggings === 0) occBonus += 3;
  }
  if (hasOccupation(p, "architect")) {
    occBonus += (roomCount(p, "clay") + roomCount(p, "stone"));
  }
  if (hasOccupation(p, "estateAgent")) {
    if (p.family >= 5) occBonus += 3;
  }
  if (hasOccupation(p, "agronomist")) {
    if (totalFields >= 4) occBonus += 3;
  }
  if (hasOccupation(p, "pastureCount")) {
    if (p.pastures.length >= 3) occBonus += 3;
  }
  if (hasOccupation(p, "masterBreeder")) {
    if (p.animals.sheep >= 1 && p.animals.boar >= 1 && p.animals.cattle >= 1) occBonus += 4;
  }
  if (hasOccupation(p, "philanthropist")) {
    if (p.food >= 5 && p.beggings === 0) occBonus += 3;
  }
  if (occBonus > 0) breakdown["职业"] = occBonus;

  // 「柴火棚」大改进（Moor）：终局按剩余燃料每份 +1 分
  if (p.improvements.includes("firewood") && (p.fuel || 0) > 0) {
    breakdown["柴火"] = p.fuel * (MAJOR_IMPROVEMENTS.firewood.fuelScore || 1);
  }
  // 节气轮转：假期等季节行动累积的额外胜利点
  if ((p.seasonVP || 0) > 0) {
    breakdown["节气"] = p.seasonVP;
  }
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { id: p.id, name: p.name, total, breakdown, place: 0 };
}

function scoreIdx(n: number, breaks: number[]): number {
  // breaks[k] = 第 k+1 档的下界（开区间）。
  // 例：breaks = [0, 4, 6, 8, +∞] ⇒ n=0..3 → idx 0 / -1 分；n=4..5 → idx 1 / 1 分；n=6..7 → idx 2 / 2 分；n=8+ → idx 3 / 3 分
  let i = 0;
  while (i < breaks.length - 1 && n >= breaks[i + 1]) i++;
  return Math.min(i, breaks.length - 1);
}

function countGrid(p: PlayerState, kind: "field" | "room"): number {
  let n = 0;
  for (let y = 0; y < p.grid.length; y++) for (let x = 0; x < p.grid[y].length; x++) {
    if (p.grid[y][x].kind === kind) n++;
  }
  return n;
}

function activeFarmCells(p: PlayerState): number {
  return p.grid.flat().filter(cell => cell.kind !== "void").length;
}

function roomCount(p: PlayerState, t: "wood" | "clay" | "stone"): number {
  return p.roomType === t ? p.rooms : 0;
}

function countUsedYard(p: PlayerState): number {
  // 修订版："fenced in or has room/field/unfenced stable" 算已使用
  // 遍历全部农场格，如果满足以下任一条件则计为「已利用」，绝不重复计数：
  // 1. 是房间 (kind === "room")
  // 2. 是农田 (kind === "field")
  // 3. 位于某个封闭牧场中 (fenced pasture cell)
  // 4. 格子上建有马厩 (cell.stable)
  const pastureCells = new Set<string>();
  for (const pst of p.pastures) {
    for (const c of pst.cells) pastureCells.add(c);
  }

  let used = 0;
  for (let y = 0; y < p.grid.length; y++) {
    for (let x = 0; x < p.grid[y].length; x++) {
      const key = `${x},${y}`;
      const cell = p.grid[y][x];
      if (cell.kind === "room" || cell.kind === "field" || cell.terrain || cell.blockedBy || pastureCells.has(key) || cell.stable) {
        used += 1;
      }
    }
  }
  return used;
}

export { OCCUPATIONS, MINOR_IMPROVEMENTS } from "./dlc";
