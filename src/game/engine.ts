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
  Ore: "采矿", Season: "节气行动",
};
const ANIMAL_ZH: Record<string, string> = { sheep: "绵羊", boar: "野猪", cattle: "黄牛", vegetable: "蔬菜" };
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
  // Farmers of the Moor
  MOOR_W, MOOR_H, MOOR_MAX_RECLAIMED, MOOR_FUEL_PER_FAMILY, MOOR_HAY_PER_CATTLE,
} from "./constants";
import {
  makeEdges, cloneEdges, countEdges, computePastures,
  validateEnclosure, edgeId, parseEdgeId,
} from "./grid";
import { DEFAULT_DLC, OCCUPATIONS, MINOR_IMPROVEMENTS, sample, type DlcConfig, type Occupation, type MinorImprovement } from "./dlc";

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
  grid: { kind: "empty" | "room" | "field"; crop?: "grain" | "vegetable"; markers?: number; stable?: boolean }[][];
  edges: { h: boolean[][]; v: boolean[][] };
  pastures: { id: string; cells: string[]; animal?: AnimalType }[];
  pastureAnimalCells: Record<string, string[]>; // 动物所在牧场分配（id -> cellList）
  beggings: number;
  improvements: (keyof typeof MAJOR_IMPROVEMENTS)[];
  startingPlayer: boolean;
  usedStartPlayer: boolean;
  usedSpaces: string[]; // 本轮已被占用的行动格
  // ===== Farmers of the Moor（仅 dlc.moor=true 时使用） =====
  fuel: number;            // 燃料储备（每收获轮消耗 MOOR_FUEL_PER_FAMILY）
  hay: number;             // 干草储备（每收获轮为每头牛消耗 MOOR_HAY_PER_CATTLE）
  moorFields: { x: number; y: number; crop?: "grain" | "vegetable"; markers?: number }[]; // 此玩家**自己撒种过**的沼泽田（计分用）
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
  /** 公有沼泽板：每格记录是否开垦、当前作物与撒种者 */
  moorBoard: { x: number; y: number; crop?: "grain" | "vegetable"; markers?: number; sownBy?: string }[];
  /** 燃料累积堆：每轮 +1（从 GatherFuel 行动格拿走全部） */
  moorFuelPile: number;
  /** 干草累积堆：每轮 +1（从 CutMeadow 行动格拿走全部） */
  moorHayPile: number;
  /** DLC：抽出的 minor improvements（加入行动板，所有人都能用） */
  minorImprovementCards?: MinorImprovement[];
}

export function createGame(
  players: { id: string; name: string; seat: number }[],
  options?: { dlc?: DlcConfig }
): GameState {
  const num = players.length;
  const dlc = options?.dlc || DEFAULT_DLC;
  // DLC：职业洗牌（每名玩家开局 7 张候选），抽 minor improvement 优先
  const handByPlayer: Record<string, Occupation[]> = {};
  const minorHandByPlayer: Record<string, MinorImprovement[]> = {};
  const minorCards: MinorImprovement[] = [];

  // 开局发牌：仅当启用对应 DLC 时发牌
  const occDeck = dlc.occupations ? sample(OCCUPATIONS, OCCUPATIONS.length) : [];
  const minorDeck = dlc.minorImprovements ? sample(MINOR_IMPROVEMENTS, MINOR_IMPROVEMENTS.length) : [];

  for (const p of players) {
    handByPlayer[p.id] = occDeck.splice(0, 7);
    minorHandByPlayer[p.id] = minorDeck.splice(0, 7);
  }
  if (dlc.minorImprovements && minorDeck.length > 0) {
    minorCards.push(minorDeck[0]);
  }
  const ps: PlayerState[] = players.map((p, i) => {
    const sp = startingFood(num, i === 0);
    const grid: PlayerState["grid"] = Array.from({ length: FARM_H }, () =>
      Array.from({ length: FARM_W }, () => ({ kind: "empty" as const })),
    );
    // 初始 2 间木屋，放在左下 2x2 内的两个相邻格
    const houses: [number, number][] = [[0, 3], [1, 3]];
    for (const [x, y] of houses) grid[y][x] = { kind: "room" as const };
    return {
      id: p.id,
      name: p.name,
      seat: p.seat,
      food: sp,
      resources: { wood: 0, clay: 0, reed: 0, stone: 0, grain: 0, vegetable: 0 },
      animals: { sheep: 0, boar: 0, cattle: 0 },
      family: 2,
      babiesThisRound: 0,
      rooms: 2,
      roomType: "wood",
      stables: 0,
      grid,
      edges: makeEdges(FARM_W, FARM_H),
      pastures: [],
      pastureAnimalCells: {},
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
      hay: 0,
      moorFields: [],
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
    piles: { Wood: 0, Clay: 0, Reed: 0, Stone: 0, Fishing: 0, Sheep: 0, Boar: 0, Cattle: 0, EasternQuarry: 0 },
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
    // Farmers of the Moor：默认空板 + 累积堆 0；startRound 中按 dlc.moor 决定是否累积
    moorBoard: [],
    moorFuelPile: 0,
    moorHayPile: 0,
  };
  startRound(g);
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
  });
  // 节气轮转：刷新当前季节
  g.season = seasonOf(g) || "none";
  // ★ 回合卡一经揭示就永久留在版图上（不随回合消失），因此这里不清空 g.revealed

  // 补充阶段：各行动格累积堆（★ 树林每轮 +3，陶土/芦苇/钓鱼每轮 +1）
  g.piles.Wood += LEFT_BOARD.forest.acc;
  g.piles.Clay += LEFT_BOARD.clayPit.acc;
  g.piles.Reed += LEFT_BOARD.reedBank.acc;
  g.piles.Fishing += LEFT_BOARD.fishing.acc;
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

  // Farmers of the Moor：燃料堆每轮 +1，干草堆每轮 +1
  if (g.dlc?.moor) {
    g.moorFuelPile += 1;
    g.moorHayPile += 1;
  }

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
    if (!p.occupation) continue;
    const oid = p.occupation.id;
    if (oid === "woodcutter") { p.resources.wood += 1; pushLog(g, `🪓 「${p.name}」伐木工 +1 木材`); }
    else if (oid === "clayworker") { p.resources.clay += 1; pushLog(g, `🏺 「${p.name}」泥瓦工 +1 陶土`); }
    else if (oid === "reedcutter") { p.resources.reed += 1; pushLog(g, `🎋 「${p.name}」芦苇工 +1 芦苇`); }
    else if (oid === "stonemason") { p.resources.stone += 1; pushLog(g, `⛏ 「${p.name}」石匠 +1 石材`); }
    else if (oid === "grainMerchant" || oid === "fieldHand") { p.resources.grain += 1; pushLog(g, `🌾 「${p.name}」${p.occupation.name} +1 谷物`); }
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

  // 揭回合卡（累积：已揭示的永久保留，这里只记录本轮新翻出的）
  // Moor 回合卡只在勾选了「荒野之地」的房间揭示
  const newlyRevealed: string[] = [];
  roundCardFor(g, g.round).forEach((c) => {
    if (ROUND_CARD_SPACES.has(c) && MOOR_ROUND_CARDS.has(c) && !g.dlc?.moor) return;
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
  // Farmers of the Moor：Moor 专属回合卡（仅在 dlc.moor=true 时启用）
  const moor: Record<number, string> = {
    2:  "GatherFuel",
    4:  "ReclaimMoor",
    7:  "CutMeadow",
    10: "ReclaimMoor",
    12: "GatherFuel",
    13: "CutMeadow",
  };
  if (g.dlc?.moor && moor[r]) {
    cards.push(moor[r]);
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
  const scored = g.players.map((p) => scorePlayer(p));
  scored.sort((a, b) => b.total - a.total);
  scored.forEach((s, i) => (s.place = i + 1));
  return scored;
}

/** 动作 → 占用的行动格 id */
function spaceOfAction(a: EngineAction): string | null {
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
    case "EasternQuarry": return "EasternQuarry";
    case "PlowAndSow": return "PlowAndSow";
    case "UrgentGrowth": return "UrgentGrowth";
    case "RenovateFences": return "RenovateFences";
    // Farmers of the Moor：每个 Moor 行动都是独立行动格（每轮一次）
    case "GatherFuel": return "GatherFuel";
    case "CutMeadow": return "CutMeadow";
    case "ReclaimMoor": return "ReclaimMoor";
    case "SowMoor": return "SowMoor";
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
  "GatherFuel", "ReclaimMoor", "CutMeadow",
]);
/** Moor 专属回合卡（仅在 dlc.moor=true 的房间揭示） */
const MOOR_ROUND_CARDS = new Set(["GatherFuel", "ReclaimMoor", "CutMeadow"]);

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
    if (p.food >= 2 && p.rooms > p.family && p.family < MAX_FAMILY) return true;
  }
  if (open("Renovate") && g.revealed.includes("Renovate")) {
    const n = p.rooms;
    const c = p.roomType === "wood" ? { clay: n, reed: n } : p.roomType === "clay" ? { stone: n, reed: n } : null;
    if (c && Object.entries(c).every(([k, v]) => (p.resources as Record<string, number>)[k] >= v)) return true;
  }
  if (open("BuildMajor") && g.revealed.includes("BuildMajor")) return true;
  // Farmers of the Moor 回合卡（需已揭示）
  if (g.dlc?.moor) {
    if (open("GatherFuel") && g.revealed.includes("GatherFuel") && g.moorFuelPile > 0) return true;
    if (open("CutMeadow") && g.revealed.includes("CutMeadow") && g.moorHayPile > 0) return true;
    if (open("ReclaimMoor") && g.revealed.includes("ReclaimMoor")) {
      if ((g.moorBoard || []).length < MOOR_W * MOOR_H && p.resources.wood >= 1 && p.resources.reed >= 1) return true;
    }
    if (open("SowMoor") && (g.moorBoard || []).some((c) => !c.crop) && (p.resources.grain > 0 || p.resources.vegetable > 0)) return true;
  }
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

  // 烹饪不占工人，任何时候可做
  if (action.type === "Cook") return cook(g, p, action);

  // 严格回合序：只允许队列首位行动
  if (g.waitingFor.length === 0) return { ok: false, msg: "本轮已结束，等待结算" };
  if (g.waitingFor[0] !== pid) {
    const cur = g.players.find((x) => x.id === g.waitingFor[0]);
    return { ok: false, msg: cur ? `现在轮到「${cur.name}」` : "现在不该你放" };
  }
  if (g.placedThisRound.filter((x) => x === pid).length >= workersOf(p)) {
    return { ok: false, msg: "你已经放完本轮工人" };
  }
  // 行动格占用：每格每轮只能被使用一次
  const space = spaceOfAction(action);
  if (space && g.usedSpaces.includes(space)) {
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
      const r = handleTake(g, p, space);
      if (r.ok) return advance(g, p, space, r);
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
      return advanceTurn(g);
    }
    case "ChooseOccupation": return playOccupation(g, p, a);
    case "PlayOccupation": return advance(g, p, "Occupation", playOccupation(g, p, a));
    case "PlayMinor": return advance(g, p, "MinorImprovement", playMinorImprovement(g, p, a));
    case "TakeMinorImprovement": return takeMinorImprovement(g, p, a);
    case "UseMinorImprovement": return useMinorImprovement(g, p, a);
    // Farmers of the Moor：3 个新行动
    case "GatherFuel": return gatherFuel(g, p);
    case "CutMeadow": return cutMeadow(g, p);
    case "ReclaimMoor": return reclaimMoor(g, p, a);
    case "SowMoor": return sowMoor(g, p, a);
    case "HarvestMoor": return harvestMoor(g, p);
    // Through the Seasons：季节行动（共用「节气行动」格）
    case "SeasonSpring": return advance(g, p, "Season", seasonSpring(g, p, a));
    case "SeasonSummer": return advance(g, p, "Season", seasonSummer(g, p));
    case "SeasonAutumn": return advance(g, p, "Season", seasonAutumn(g, p, a));
    case "SeasonWinter": return advance(g, p, "Season", seasonWinter(g, p));
    default: return { ok: false, msg: "未知行动" };
  }
}

// ---------- 行动：取用空间 ----------
function handleTake(g: GameState, p: PlayerState, space: string): ActionResult {
  // 起始玩家 + 食物（"StartPlayer"）
  if (space === "StartPlayer") {
    if (g.startPlayerId === p.id) {
      return { ok: false, msg: "你当前已持有起始玩家标记，无需重复拿取" };
    }
    g.startPlayerId = p.id;
    p.food += START_PLAYER_FOOD;
    p.usedStartPlayer = true;
    for (const pl of g.players) {
      pl.startingPlayer = (pl.id === p.id);
    }
    pushLog(g, `🚜 「${p.name}」拿取起始玩家标记（下轮先动）并获得 ${START_PLAYER_FOOD} 食物`);
    if (p.occupation?.id === "townCrier") {
      p.resources.grain += 1;
      pushLog(g, `📢 「${p.name}」市集叫卖人额外 +1 谷物`);
    }
    if (p.occupation?.id === "villageClerk") {
      p.resources.reed += 1;
      pushLog(g, `🖋️ 「${p.name}」村书记额外 +1 芦苇`);
    }
    return { ok: true };
  }
  if (space === "Grain") {
    p.resources.grain += 1;
    pushLog(g, `🌾 「${p.name}」取走谷物堆上的 1 谷物`);
    if (p.occupation?.id === "seedMerchant") { p.resources.grain += 1; pushLog(g, `🌱 「${p.name}」种子商人多得 1 份谷物种子`); }
    if (p.occupation?.id === "grainInspector") { p.resources.grain += 1; pushLog(g, `🔍 「${p.name}」谷物检验员额外 +1 谷物`); }
    return { ok: true };
  }
  if (space === "Vegetable") {
    if (g.round < LEFT_BOARD.vegetable.appearsRound) {
      return { ok: false, msg: `菜地第 ${LEFT_BOARD.vegetable.appearsRound} 轮起才开放` };
    }
    p.resources.vegetable += 1;
    pushLog(g, `🥕 「${p.name}」取走蔬菜地上的 1 蔬菜`);
    if (p.occupation?.id === "seedMerchant") { p.resources.vegetable += 1; pushLog(g, `🌱 「${p.name}」种子商人多得 1 份蔬菜种子`); }
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
      if (p.occupation?.id === "lumberjack") { p.resources.wood += 1; pushLog(g, `🪵 「${p.name}」柴夫额外 +1 木材`); }
      if (p.occupation?.id === "forestCustodian") { p.resources.reed += 1; pushLog(g, `🌲 「${p.name}」护林员额外 +1 芦苇`); }
      if (p.occupation?.id === "mushroomCollector") { p.food += 1; pushLog(g, `🍄 「${p.name}」蘑菇采摘人额外 +1 食物`); }
      if (p.occupation?.id === "hunter") { p.food += 1; pushLog(g, `🏹 「${p.name}」猎人额外 +1 食物`); }
      if (p.occupation?.id === "trapper") { p.food += 1; pushLog(g, `🪤 「${p.name}」野味设阱师额外 +1 食物`); }
      if (p.occupation?.id === "silviculturist" && got >= 3) { p.food += 1; pushLog(g, `🌲 「${p.name}」林农额外 +1 食物`); }
      if (p.occupation?.id === "charcoalBurner") {
        if (g.dlc?.moor) p.fuel += 1; else p.food += 1;
        pushLog(g, `🔥 「${p.name}」炭烧工额外 +1 燃料/食物`);
      }
    } else if (space === "Clay") {
      if (p.occupation?.id === "clayCarrier") { p.resources.clay += 1; pushLog(g, `🧱 「${p.name}」运泥工额外 +1 陶土`); }
      if (p.occupation?.id === "miner") { p.resources.clay += 1; pushLog(g, `⛏️ 「${p.name}」矿工额外 +1 陶土`); }
      if (p.occupation?.id === "gravelCarrier") { p.resources.stone += 1; pushLog(g, `🪨 「${p.name}」砾石搬运工额外 +1 石材`); }
      if (p.occupation?.id === "peatCutter") {
        if (g.dlc?.moor) p.fuel += 1; else p.food += 1;
        pushLog(g, `🧱 「${p.name}」泥炭割工额外 +1 燃料/食物`);
      }
    } else if (space === "Reed") {
      if (p.occupation?.id === "reedCollector") { p.resources.reed += 1; pushLog(g, `🌿 「${p.name}」割苇人额外 +1 芦苇`); }
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
    if (p.occupation?.id === "quarryman") { p.resources.stone += 1; pushLog(g, `⛰️ 「${p.name}」采石工额外 +1 石材`); }
    if (p.occupation?.id === "miner") { p.resources.stone += 1; pushLog(g, `⛏️ 「${p.name}」矿工额外 +1 石材`); }
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
    if (p.occupation?.id === "fisher") { p.food += 1; pushLog(g, `🎣 「${p.name}」渔夫额外 +1 食物`); }
    if (p.occupation?.id === "hunter") { p.food += 1; pushLog(g, `🏹 「${p.name}」猎人额外 +1 食物`); }
    if (p.occupation?.id === "fishBuyer") { p.food += 1; pushLog(g, `🐟 「${p.name}」鱼贩额外 +1 食物`); }
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
    pushLog(g, `🛠 「${p.name}」日工 +${LEFT_BOARD.dayLaborer.food} 食物（无须成本，但用掉 1 名家人）`);
    // 节气轮转：夏季日工额外 +1 谷物
    if (isSeason(g, "summer")) {
      p.resources.grain += 1;
      pushLog(g, `☀️ 「${p.name}」夏季日工雇主管饭，额外 +1 谷物`);
    }
    if (p.occupation?.id === "dayLaborer") { p.food += 1; pushLog(g, `🛠 「${p.name}」打工达人额外 +1 食物（共 3 食物）`); }
    if (p.occupation?.id === "oddJobMan") { p.resources.wood += 1; pushLog(g, `🧹 「${p.name}」杂务工额外 +1 木材`); }
    if (p.occupation?.id === "laborBroker") { p.resources.clay += 1; pushLog(g, `💼 「${p.name}」劳工经纪额外 +1 陶土`); }
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
    if (t === "sheep" && p.occupation?.id === "shepherd" && addAnimal(g, p, "sheep")) {
      kept += 1;
      pushLog(g, `🐑 「${p.name}」牧羊人额外 +1 只羊`);
    } else if (t === "boar" && p.occupation?.id === "swineherd" && addAnimal(g, p, "boar")) {
      kept += 1;
      pushLog(g, `🐗 「${p.name}」养猪人额外 +1 只猪`);
    } else if (t === "cattle" && p.occupation?.id === "cattleFarmer" && addAnimal(g, p, "cattle")) {
      kept += 1;
      pushLog(g, `🐄 「${p.name}」牧牛人额外 +1 只牛`);
    }
    if (p.occupation?.id === "livestockBroker") {
      p.food += 1;
      pushLog(g, `🤝 「${p.name}」牲畜经纪人交易佣金 +1 食物`);
    }
    if (p.occupation?.id === "animalBreeder" && p.animals[t] === 2) {
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
      if (!isValidCell(x, y)) return { ok: false, msg: "无效的房间坐标" };
      if (tempGrid[y][x].kind !== "empty") return { ok: false, msg: `坐标 (${x},${y}) 不是空地，无法建房` };
      // 检查邻接：必须与原房间或已在本批次放置的房间相邻
      let hasNeighbor = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const nx = x + dx, ny = y + dy;
        if (isValidCell(nx, ny) && tempGrid[ny][nx].kind === "room") {
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
      if (!isValidCell(x, y)) return { ok: false, msg: "无效的马厩坐标" };
      const key = `${x},${y}`;
      if (seenStableCells.has(key)) return { ok: false, msg: "同一格子不能重复建造马厩" };
      seenStableCells.add(key);
      const cell = p.grid[y][x];
      if (cell.stable) return { ok: false, msg: `(${x},${y}) 已经建有马厩` };
      // 不能建在房间或田地上，也不能建在本批次即将变成房间的格子上
      if (cell.kind === "room" || cell.kind === "field" || roomsToBuild.some(r => r.x === x && r.y === y)) {
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

  if (p.occupation?.id === "carpenter" && p.roomType === "wood") totalMat = Math.max(roomsToBuild.length, totalMat - roomsToBuild.length);
  if (p.occupation?.id === "bricklayer" && p.roomType === "clay") totalMat = Math.max(roomsToBuild.length, totalMat - roomsToBuild.length);
  if (p.occupation?.id === "wainwright" || p.occupation?.id === "thatcher") totalReed = Math.max(0, totalReed - roomsToBuild.length);

  // 马厩：每座 2 木
  let totalStableWood = stablesToBuild.length * STABLE_COST_WOOD;
  if (p.occupation?.id === "stableArchitect" && totalStableWood > 0) {
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
    p.grid[y][x].kind = "room";
    p.rooms += 1;
    pushLog(g, `🏠 「${p.name}」建了一间${houseLabel(p.roomType)}房 (${x},${y})`);
    if (p.occupation?.id === "masterBuilder") {
      p.resources.wood += 1;
      pushLog(g, `🏗️ 「${p.name}」建筑工长回收余料 +1 木材`);
    }
    if (p.occupation?.id === "surveyor" && p.rooms >= 3) {
      p.food += 2;
      pushLog(g, `📐 「${p.name}」宅地测量员落成庆典 +2 食物`);
    }
  }

  for (const { x, y } of stablesToBuild) {
    p.grid[y][x].stable = true;
    p.stables += 1;
    pushLog(g, `🛖 「${p.name}」建造了 1 座马厩 (${x},${y})（共 ${p.stables} 座）`);
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
  if (!isValidCell(x, y)) return { ok: false, msg: "无效坐标" };
  if (p.grid[y][x].kind !== "empty") return { ok: false, msg: "该格不是空地" };
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
  p.grid[y][x] = { kind: "field" as const };
  pushLog(g, `🌱 「${p.name}」犁地 (${x},${y})`);
  if (p.occupation?.id === "plowwright") {
    p.resources.wood += 1;
    pushLog(g, `🚜 「${p.name}」犁匠刨取优质木料 +1 木`);
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
    if (!isValidCell(x, y)) return { ok: false, msg: "无效坐标" };
    const key = `${x},${y}`;
    if (seenCells.has(key)) return { ok: false, msg: "不能在同一块田重复播种" };
    seenCells.add(key);

    const cell = p.grid[y][x];
    if (cell.kind !== "field") return { ok: false, msg: `(${x},${y}) 不是耕地` };
    if (cell.crop) return { ok: false, msg: `(${x},${y}) 已经播过种` };

    if (crop === "grain") needGrain += 1;
    else needVeg += 1;
  }

  if (p.resources.grain < needGrain) return { ok: false, msg: `谷物种子不足（需要 ${needGrain}，当前拥有 ${p.resources.grain}）` };
  if (p.resources.vegetable < needVeg) return { ok: false, msg: `蔬菜种子不足（需要 ${needVeg}，当前拥有 ${p.resources.vegetable}）` };

  p.resources.grain -= needGrain; g.supply.grain += needGrain;
  p.resources.vegetable -= needVeg; g.supply.vegetable += needVeg;

  for (const item of items) {
    const { x, y, crop } = item;
    const cell = p.grid[y][x];
    cell.crop = crop;
    cell.markers = crop === "grain" ? SOW_GRAIN_TOTAL : SOW_VEG_TOTAL;
    pushLog(g, `${crop === "grain" ? "🌾" : "🥕"} 「${p.name}」在 (${x},${y}) 播种${zhAnimal(crop)}（标记 ${cell.markers}）`);
  }

  if (p.occupation?.id === "cornShepherd" && items.length > 0) {
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
  pushLog(g, `👶 「${p.name}」急迫添丁：家庭增添了新成员（无需空房）`);
  if (p.occupation?.id === "midwife") {
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
  // 验证：必须是围出矩形牧场
  const v = validateEnclosure(FARM_W, FARM_H, baseEdges, added.map((e) => edgeId(e.kind, e.x, e.y)));
  if (!v.ok) return { ok: false, msg: v.reason || "栅栏布局非法" };
  // 扣资源 & 应用
  p.resources.wood -= cost;
  g.supply.wood += cost;
  p.edges = baseEdges;
  rebuildPastures(p);
  if (freeSegs > 0) pushLog(g, `🌸 春季优惠：${freeSegs} 段栅栏免费`);
  // 现有牧场中若动物被新栅栏切出区域，逃跑（按原版：动物永远在原地，栅栏拆除/围错导致杀退 → 简化：仅当牧场消失/不可容纳时动物逃跑）
  for (const id of Object.keys(p.pastureAnimalCells)) {
    if (!p.pastures.find((x) => x.id === id)) delete p.pastureAnimalCells[id];
  }
  pushLog(g, `🪵 「${p.name}」建了 ${added.length} 段栅栏`);
  if (p.occupation?.id === "hedgeKeeper") {
    p.resources.wood += 2;
    pushLog(g, `🪵 「${p.name}」栅栏工返还 2 木材`);
  }
  if (p.occupation?.id === "stableArchitect") {
    p.resources.wood += 1;
    pushLog(g, `🛖 「${p.name}」圈舍建造师返还 1 木材`);
  }
  return { ok: true };
}

// ---------- 行动：烤面包 ----------
function bakeBread(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const ovenId = String(a.oven);
  const ovens = p.improvements.filter((x) => x === "clayOven" || x === "stoneOven" || x === "tileOven");
  if (!ovens.includes(ovenId as any)) return { ok: false, msg: "你没有这个烤炉" };
  const cfg = MAJOR_IMPROVEMENTS[ovenId]?.bake;
  if (!cfg) return { ok: false, msg: "该改进不能烤面包" };
  let grainWanted = Math.max(0, Math.floor(Number(a.grain) || 0));
  if (grainWanted === 0) return { ok: false, msg: "至少要 1 谷物" };
  // 陶炉每次最多 1 谷；石炉每次最多 2 谷
  if (grainWanted > cfg.maxGrain) grainWanted = cfg.maxGrain;
  if (p.resources.grain < grainWanted) return { ok: false, msg: "谷物不足" };
  const food = cfg.foodPerGrain * grainWanted;
  let extraFood = 0;
  if (p.occupation?.id === "baker" || p.occupation?.id === "breadBakerApprentice") extraFood += 1;
  if (p.occupation?.id === "miller") extraFood += grainWanted;
  const totalFood = food + extraFood;
  p.resources.grain -= grainWanted; g.supply.grain += grainWanted;
  p.food += totalFood;
  pushLog(g, `🍞 「${p.name}」用 ${grainWanted} 谷物烤面包 +${totalFood} 食物${extraFood ? `（含职业加成 +${extraFood}）` : ""}`);
  return { ok: true };
}

// ---------- 行动：家庭成长 ----------
function familyGrowth(g: GameState, p: PlayerState): ActionResult {
  if (p.family >= MAX_FAMILY) return { ok: false, msg: "家里最多 5 人" };
  if (p.rooms <= p.family) return { ok: false, msg: "空房间不足" };
  // ★ 官方规则：添丁行动本身不花费食物；新生儿本轮不工作，收获阶段仅需 1 食物
  p.family += 1;
  p.babiesThisRound += 1;
  pushLog(g, `👶 「${p.name}」的家庭迎来了新成员`);
  if (p.occupation?.id === "midwife") {
    p.food += 2;
    pushLog(g, `👶 「${p.name}」助产士贺礼 +2 食物`);
  }
  if (p.occupation?.id === "governess") {
    p.resources.grain += 1;
    pushLog(g, `📖 「${p.name}」家庭教师启蒙礼 +1 谷物`);
  }
  return { ok: true };
}

// ---------- 行动：翻修 ----------
function renovate(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const direction = String(a.direction) as "woodToClay" | "clayToStone";
  if (direction === "woodToClay" && p.roomType !== "wood") return { ok: false, msg: "需要先翻成陶屋" };
  if (direction === "clayToStone" && p.roomType !== "clay") return { ok: false, msg: "需要先翻成石屋" };
  // ★ 官方规则：翻修时陶土/石材按「每间房 1 个」计费，但芦苇整栋房屋统一「仅需 1 芦苇」盖屋顶
  const matKey = direction === "woodToClay" ? "clay" : "stone";
  const cost: Record<string, number> = {
    [matKey]: p.rooms,
    reed: 1,
  };
  if (p.occupation?.id === "renovator" && cost.reed) cost.reed = 0;
  if (p.occupation?.id === "thatcher" && cost.reed) cost.reed = Math.max(0, cost.reed - 1);
  if (p.occupation?.id === "bricklayer" && cost.clay) cost.clay = Math.max(0, cost.clay - 1);
  if (p.occupation?.id === "masterMason" && direction === "clayToStone" && cost.stone) cost.stone = Math.max(1, cost.stone - 1);
  if (!pay(g, p, cost)) {
    const need = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
    return { ok: false, msg: `翻修需 ${need}（共 ${p.rooms} 间房）` };
  }
  p.roomType = direction === "woodToClay" ? "clay" : "stone";
  const spent = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
  pushLog(g, `🔨 「${p.name}」把整栋 ${p.rooms} 间房翻修为${houseLabel(p.roomType)}屋（花费 ${spent}）`);
  if (p.occupation?.id === "plasterer") {
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
function buildMajor(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const name = String(a.improvement) as keyof typeof MAJOR_IMPROVEMENTS;
  if (!MAJOR_IMPROVEMENTS[name]) return { ok: false, msg: "未知道具" };
  if (p.improvements.includes(name)) return { ok: false, msg: "你已拥有该改进" };

  // ★ 官方规则：主要发展卡公共陈列，全场唯一。已被其他玩家建造的不能再建
  const otherOwner = g.players.find(other => other.id !== p.id && other.improvements.includes(name));
  if (otherOwner) {
    return { ok: false, msg: `「${majorLabel(name)}」已被「${otherOwner.name}」买走（全场唯一）` };
  }

  // ★ 官方升级规则：如果建造的是烹饪灶（cookingHearth 或 cookingHearthBig），且玩家拥有壁炉（fireplace 或 fireplaceBig），
  // 可以退回壁炉，仅需支付差价（烹饪灶4陶 - 壁炉2陶 = 补 2 陶；或大烹饪灶5陶 - 大壁炉3陶 = 补 2 陶）
  let upgradeFrom: "fireplace" | "fireplaceBig" | null = null;
  if (name === "cookingHearth" || name === "cookingHearthBig") {
    if (p.improvements.includes("fireplace")) upgradeFrom = "fireplace";
    else if (p.improvements.includes("fireplaceBig")) upgradeFrom = "fireplaceBig";
  }

  const baseCost = MAJOR_IMPROVEMENTS[name].cost;
  const cost = { ...baseCost };

  if (upgradeFrom) {
    const refundClay = MAJOR_IMPROVEMENTS[upgradeFrom].cost.clay || 0;
    if (cost.clay) cost.clay = Math.max(0, cost.clay - refundClay);
  }

  if (p.occupation?.id === "cooper" && cost.wood) cost.wood = Math.max(0, cost.wood - 1);
  if (p.occupation?.id === "blacksmith" && cost.stone) cost.stone = Math.max(0, cost.stone - 1);
  if (p.occupation?.id === "kilnMaster" && cost.clay) cost.clay = Math.max(0, cost.clay - 1);

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

  if (upgradeFrom) {
    // 退还旧壁炉到公共池
    p.improvements = p.improvements.filter(imp => imp !== upgradeFrom);
    pushLog(g, `🔄 「${p.name}」退还了「${majorLabel(upgradeFrom)}」，折价升级为「${majorLabel(name)}」`);
  }

  p.improvements.push(name);
  // 水井：建成起 5 轮，每轮开始 +1 食物
  if (name === "well") p.wellRounds = 5;
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
  const isMasterChef = p.occupation?.id === "masterChef";
  if (!p.improvements.includes(impName) && !isMasterChef) return { ok: false, msg: "你没用过这个烹饪工具" };
  const imp = MAJOR_IMPROVEMENTS[impName];
  const cookRule = imp && ("cook" in imp) ? imp.cook : (isMasterChef ? { vegetable: 2, grain: 2, sheep: 2, boar: 2, cattle: 2 } : null);
  if (!cookRule) return { ok: false, msg: "该改进无烹饪能力" };
  const used: Record<string, number> = {};
  const RESOURCE_KEYS = new Set(["vegetable", "wood", "clay", "reed", "grain"]);
  for (const k of Object.keys(a.used || {}) as (AnimalType | "vegetable" | "wood" | "clay" | "reed" | "grain")[]) {
    const n = Math.max(0, Math.floor(Number((a.used as any)[k]) || 0));
    if (RESOURCE_KEYS.has(k)) {
      if ((p.resources as Record<string, number>)[k] < n) return { ok: false, msg: `${resZh(k)}不足` };
      if (n > 0) (used as Record<string, number>)[k] = n;
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
  // 职业烹饪加成
  let occFood = 0;
  if (p.occupation?.id === "slaughterer") {
    const anims = (used.sheep || 0) + (used.boar || 0) + (used.cattle || 0);
    if (anims > 0) occFood += anims;
  }
  if (p.occupation?.id === "tanner") {
    if ((used.cattle || 0) > 0 || (used.boar || 0) > 0) occFood += 2;
  }
  if (p.occupation?.id === "smokehouseMaster") {
    if ((used.cattle || 0) > 0 || (used.boar || 0) > 0 || (used.sheep || 0) > 0) occFood += 2;
  }
  if (p.occupation?.id === "herbalist") {
    if ((used.vegetable || 0) > 0) occFood += (used.vegetable || 0);
  }
  food += occFood;
  if (food === 0) return { ok: false, msg: "至少烹饪一种原料" };
  for (const k of Object.keys(used)) {
    if (RESOURCE_KEYS.has(k)) (p.resources as Record<string, number>)[k] -= (used as Record<string, number>)[k];
    else p.animals[k as AnimalType] -= (used as Record<string, number>)[k];
  }
  p.food += food;
  pushLog(g, `🍳 「${p.name}」烹饪获得 ${food} 食物${occFood ? `（含职业加成 +${occFood}）` : ""}`);
  return { ok: true };
}

// ---------- 工具 ----------
function isValidCell(x: number, y: number) {
  return x >= 0 && x < FARM_W && y >= 0 && y < FARM_H;
}

function houseNeighbors(p: PlayerState, x: number, y: number): string[] {
  const out: string[] = [];
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    const nx = x + dx, ny = y + dy;
    if (!isValidCell(nx, ny)) continue;
    if (p.grid[ny][nx].kind === "room") out.push(`${nx},${ny}`);
  }
  return out;
}

function collectFields(p: PlayerState): string[] {
  const out: string[] = [];
  for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
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

/** 任何玩家抢一次 minor improvement 卡加入个人持有；消耗 1 名工人 */
function takeMinorImprovement(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
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
    default:
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

/** 收集燃料：拿走 moorFuelPile 全部燃料归己（不消耗工人，按 round card 每轮一次） */
function gatherFuel(g: GameState, p: PlayerState): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用「沼泽农夫（荒野之地）」扩展" };
  if (g.moorFuelPile <= 0) return { ok: false, msg: "燃料堆是空的（每轮 +1）" };
  const got = g.moorFuelPile;
  p.fuel += got;
  g.moorFuelPile = 0;
  pushLog(g, `🔥 「${p.name}」取走燃料堆上的全部 ${got} 燃料`);
  return advance(g, p, "GatherFuel", { ok: true });
}

/** 割草甸：拿走 moorHayPile 全部干草归己 */
function cutMeadow(g: GameState, p: PlayerState): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用「沼泽农夫（荒野之地）」扩展" };
  if (g.moorHayPile <= 0) return { ok: false, msg: "草甸是空的（每轮 +1）" };
  const got = g.moorHayPile;
  p.hay += got;
  g.moorHayPile = 0;
  pushLog(g, `🌾 「${p.name}」割草拿 ${got} 干草`);
  return advance(g, p, "CutMeadow", { ok: true });
}

/** 拓荒：标记 (x, y) 为已开垦的公有田，自身 +1 燃料；消耗 1 木 + 1 芦苇 */
function reclaimMoor(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用「沼泽农夫（荒野之地）」扩展" };
  const x = Number(a.x), y = Number(a.y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= MOOR_W || y < 0 || y >= MOOR_H) {
    return { ok: false, msg: `沼泽坐标越界（应在 0..${MOOR_W - 1} / 0..${MOOR_H - 1}）` };
  }
  if ((g.moorBoard || []).some((c) => c.x === x && c.y === y)) {
    return { ok: false, msg: "这块沼泽已经被开垦过了" };
  }
  // 资源：1 木材 + 1 芦苇（与 base game 修订版一致）
  if ((p.resources.wood || 0) < 1) return { ok: false, msg: "需要 1 木材" };
  if ((p.resources.reed || 0) < 1) return { ok: false, msg: "需要 1 芦苇" };
  p.resources.wood -= 1;
  p.resources.reed -= 1;
  g.supply.wood += 1;
  g.supply.reed += 1;
  // 标记开垦
  if (!g.moorBoard) g.moorBoard = [];
  g.moorBoard.push({ x, y });
  // 拓荒奖励：自身 +1 燃料
  p.fuel += 1;
  pushLog(g, `🌱 「${p.name}」开垦了沼泽 (${x},${y})，得 1 燃料`);
  return advance(g, p, "ReclaimMoor", { ok: true });
}

/** 在已开垦的沼泽田 (x,y) 撒种（计入 p.moorFields 以便计 fields break-point） */
function sowMoor(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用「沼泽农夫（荒野之地）」扩展" };
  const x = Number(a.x), y = Number(a.y);
  const crop = String(a.crop) as "grain" | "vegetable";
  if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, msg: "无效坐标" };
  if (crop !== "grain" && crop !== "vegetable") return { ok: false, msg: "作物必须是谷物或蔬菜" };
  const cell = (g.moorBoard || []).find((c) => c.x === x && c.y === y);
  if (!cell) return { ok: false, msg: "这块沼泽还没开垦" };
  if (cell.crop) return { ok: false, msg: "这块沼泽已经播过种了" };
  if (crop === "grain") {
    if (p.resources.grain < 1) return { ok: false, msg: "库存中没有谷物种子" };
    p.resources.grain -= 1; g.supply.grain += 1;
    cell.crop = "grain"; cell.markers = SOW_GRAIN_TOTAL; cell.sownBy = p.id;
    pushLog(g, `🌾 「${p.name}」在沼泽 (${x},${y}) 播种谷物（未来可收获 3 次）`);
  } else {
    if (p.resources.vegetable < 1) return { ok: false, msg: "库存中没有蔬菜种子" };
    p.resources.vegetable -= 1; g.supply.vegetable += 1;
    cell.crop = "vegetable"; cell.markers = SOW_VEG_TOTAL; cell.sownBy = p.id;
    pushLog(g, `🥕 「${p.name}」在沼泽 (${x},${y}) 播种蔬菜（未来可收获 2 次）`);
  }
  // 计入此玩家自己的 moorFields（fields 计分用）
  if (!p.moorFields) p.moorFields = [];
  p.moorFields.push({ x, y, crop, markers: cell.markers });
  return advance(g, p, "SowMoor", { ok: true });
}

/** 收获沼泽田：按 moorBoard 扫描，对自己撒过种的格子按 marker -1 取 1 个谷/菜 */
function harvestMoor(g: GameState, p: PlayerState): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用「沼泽农夫（荒野之地）」扩展" };
  let gainedG = 0, gainedV = 0;
  for (const cell of (g.moorBoard || [])) {
    if (cell.sownBy !== p.id) continue;
    if (!cell.crop || !cell.markers) continue;
    if (cell.crop === "grain") { p.resources.grain += 1; gainedG += 1; }
    else { p.resources.vegetable += 1; gainedV += 1; }
    cell.markers -= 1;
    if (cell.markers <= 0) {
      // 沼泽田清空后可重新被自己 / 其他人开垦
      // （占位：保留为「已开垦但未耕种」状态，不释放 sownBy）
      cell.crop = undefined;
      cell.markers = 0;
      cell.sownBy = undefined;
      // 从 p.moorFields 同步移除
      if (p.moorFields) {
        const i = p.moorFields.findIndex((f) => f.x === cell.x && f.y === cell.y);
        if (i >= 0) p.moorFields.splice(i, 1);
      }
    }
  }
  if (gainedG || gainedV) pushLog(g, `🌾 「${p.name}」收获沼泽田：${gainedG ? `+${gainedG} 谷物 ` : ""}${gainedV ? `+${gainedV} 蔬菜` : ""}`.trim());
  return { ok: true };
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
  for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
    const cell = p.grid[y][x];
    if (cell.kind !== "field" || !cell.crop || !cell.markers) continue;
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
  pastures: { id: string; cells: number; hasStable: boolean; maxCapacity: number; animal?: AnimalType; used: number }[];
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
    const placed = (p.pastureAnimalCells?.[pst.id] || []).length;
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
  for (let y = 0; y < FARM_H; y++) {
    for (let x = 0; x < FARM_W; x++) {
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
  for (let y = 0; y < FARM_H; y++) {
    for (let x = 0; x < FARM_W; x++) {
      if (p.grid[y][x].stable && !pastureCells.has(`${x},${y}`)) unfencedStables += 1;
    }
  }

  const extraCapacity = 1 /* House Pet */ + unfencedStables;
  if (outsidePastures < extraCapacity) {
    p.animals[t] += 1;
    return true;
  }

  return false;
}

function rebuildPastures(p: PlayerState) {
  const blocked = new Set<string>();
  for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
    if (p.grid[y][x].kind === "room") blocked.add(`${x},${y}`);
  }
  const list = computePastures(FARM_W, FARM_H, p.edges, blocked);
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
  // ★ 占用该行动格（撒种/烤面包同格）
  const occupied = space === "Sow" || space === "BakeBread" ? "SowOrBake" : space;
  if (occupied && !g.usedSpaces.includes(occupied)) g.usedSpaces.push(occupied);
  if (!g.spaceOccupants) g.spaceOccupants = {};
  if (occupied) g.spaceOccupants[occupied] = p.id;
  // 移除 waitingFor 中该玩家的当前一次
  const idx = g.waitingFor.indexOf(p.id);
  if (idx >= 0) g.waitingFor.splice(idx, 1);
  pushLog(g, `✓ 「${p.name}」行动（${zhAction(space)}）`);
  return advanceTurn(g);
}

function advanceTurn(g: GameState): ActionResult {
  // 所有玩家都已放完本轮工人 → 进入收获/下一轮
  const allPlaced = g.players.every(
    (p) => g.placedThisRound.filter((x) => x === p.id).length >= workersOf(p)
  );
  if (allPlaced) {
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
    for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
      const cell = p.grid[y][x];
      if (cell.kind !== "field" || !cell.crop || !cell.markers) continue;
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
    if (p.occupation?.id === "gardener") {
      p.resources.vegetable += 1;
      pushLog(g, `🥕 「${p.name}」园丁收获阶段额外直接得 1 蔬菜`);
    }
    if (p.occupation?.id === "smallholder") {
      const fCount = countGrid(p, "field");
      if (fCount <= 2) {
        p.resources.grain += 1;
        pushLog(g, `🏡 「${p.name}」小农精耕细作额外 +1 谷物`);
      }
    }
    if (p.occupation?.id === "reaper" && harvestedCount >= 2) {
      p.resources.grain += 1;
      pushLog(g, `🌾 「${p.name}」镰刀割手长镰飞舞额外 +1 谷物`);
    }
    if (p.occupation?.id === "ratcatcher") {
      p.resources.grain += 1;
      pushLog(g, `🪤 「${p.name}」捕鼠人收获阶段额外 +1 谷物`);
    }
    if (p.occupation?.id === "beekeeper") {
      p.food += 2;
      pushLog(g, `🐝 「${p.name}」养蜂人收获阶段蜂箱 +2 食物`);
    }
  }

  // 2. 喂养阶段
  for (const p of g.players) {
    // 成年人每人 2 食物；本轮出生的婴儿只需 1 食物（若有保姆则婴儿免食）
    const adults = Math.max(0, p.family - p.babiesThisRound);
    const babyNeed = p.occupation?.id === "wetNurse" ? 0 : p.babiesThisRound * FOOD_PER_BABY_THIS_HARVEST;
    const cookDiscount = p.occupation?.id === "cook" ? 1 : 0;
    const need = Math.max(0, adults * FOOD_PER_FAMILY + babyNeed - cookDiscount);
    let needLeft = need;

    // 先用既有食物
    const fromFood = Math.min(p.food, needLeft);
    p.food -= fromFood;
    needLeft -= fromFood;

    // 不够 → 若拥有烹饪设备（壁炉/烹饪灶），优先烹饪牲畜与蔬菜防饥荒
    const hasCookHearth = p.improvements.includes("cookingHearth") || p.improvements.includes("cookingHearthBig");
    const hasFireplace = p.improvements.includes("fireplace") || p.improvements.includes("fireplaceBig");
    const canCookAnimals = hasCookHearth || hasFireplace || (p.occupation?.id === "masterChef");

    let autoCookedAnimals = 0;
    if (needLeft > 0 && canCookAnimals) {
      // 官方规则：羊/猪/牛烹饪产出
      // 优先宰羊（产出 2）、其次野猪（炉2/灶3）、最后黄牛（炉3/灶4）
      for (const t of ["sheep", "boar", "cattle"] as const) {
        const rate = hasCookHearth ? (t === "sheep" ? 2 : t === "boar" ? 3 : 4)
                   : hasFireplace ? (t === "cattle" ? 3 : 2) : 2;
        while (needLeft > 0 && p.animals[t] > 0) {
          p.animals[t] -= 1;
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

  // 3. 繁殖阶段：同类 ≥2 只即生 1 只，前提是牧场真的放得下
  for (const p of g.players) {
    (["sheep", "boar", "cattle"] as AnimalType[]).forEach((t) => {
      if (p.animals[t] < 2) return;
      // 仅当现有牧场（含马厩加成）确实还有空位时才繁殖
      if (addAnimal(g, p, t)) {
        pushLog(g, `🐣 「${p.name}」的${labelAnimal(t)}繁殖 +1 只（共 ${p.animals[t]} 只）`);
      } else {
        pushLog(g, `🚫 「${p.name}」的${labelAnimal(t)}无法繁殖（牧场容量已满）`);
      }
    });
    // 兽医加成：若至少有 2 种动物，额外多繁衍 1 只
    if (p.occupation?.id === "veterinarian") {
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
    if (p.occupation?.id === "milker" && (p.animals.cattle >= 1 || p.animals.sheep >= 1)) {
      p.food += 1;
      pushLog(g, `🥛 「${p.name}」挤奶工鲜奶收获阶段 +1 食物`);
    }
    if (p.occupation?.id === "woolWeaver" && p.animals.sheep >= 1) {
      p.food += 1;
      pushLog(g, `🧶 「${p.name}」羊毛织工剪毛纺线 +1 食物`);
    }
  }

  // 4. Farmers of the Moor：沼泽田收获（每个玩家扫一遍自己撒过种的格子）
  if (g.dlc?.moor) {
    for (const p of g.players) {
      harvestMoor(g, p);
    }
  }

  // 5. Farmers of the Moor：燃料消耗（每名家人 1 燃料，缺 = 1 张乞讨卡）
  if (g.dlc?.moor) {
    for (const p of g.players) {
      // 「泥炭窑」大改进：每次收获阶段 +1 燃料
      if ((p.improvements || []).includes("peatKiln")) {
        p.fuel += 1;
        pushLog(g, `🧱 「${p.name}」泥炭窑 +1 燃料`);
      }
      // 「取暖炉」大改进：本玩家本轮只消耗 1 燃料（不论家人数）
      const hasHeatingStove = (p.improvements || []).includes("heatingStove");
      const need = hasHeatingStove ? (p.family > 0 ? 1 : 0) : (p.family * MOOR_FUEL_PER_FAMILY);
      let lack = Math.max(0, need - (p.fuel || 0));
      p.fuel = Math.max(0, (p.fuel || 0) - need);
      if (lack > 0) {
        p.beggings += lack;
        pushLog(g, `🧊 「${p.name}」缺 ${lack} 燃料 → ${lack} 张乞讨卡${hasHeatingStove ? "（取暖炉仍不够）" : ""}`);
      } else if (need > 0) {
        pushLog(g, `🔥 「${p.name}」燃烧 ${need} 燃料取暖`);
      }
    }

    // 6. Farmers of the Moor：喂牛（每头牛 1 干草，缺 = 牛 -1，跑回供应区）
    for (const p of g.players) {
      const need = p.animals.cattle * MOOR_HAY_PER_CATTLE;
      let lack = Math.max(0, need - (p.hay || 0));
      p.hay = Math.max(0, (p.hay || 0) - need);
      while (lack > 0 && p.animals.cattle > 0) {
        p.animals.cattle -= 1;
        g.supply.cattle += 1;
        lack -= 1;
        pushLog(g, `💀 「${p.name}」的 1 头黄牛饿死了（缺少干草）`);
      }
      if (need > 0 && lack === 0) {
        // 全部喂饱
        pushLog(g, `🐄 「${p.name}」用 ${need} 干草喂饱了 ${p.animals.cattle} 头黄牛`);
      }
    }
  }

  pushLog(g, `✅ 第 ${g.round} 轮收获阶段结束`);
}

function totalAnimals(p: PlayerState): number {
  return p.animals.sheep + p.animals.boar + p.animals.cattle;
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
  return Math.max(0, p.family - p.babiesThisRound);
}

function labelAnimal(t: AnimalType) {
  return t === "sheep" ? "绵羊" : t === "boar" ? "野猪" : "黄牛";
}

// ---------- 结算 ----------
function finishGame(g: GameState) {
  g.finished = true;
  g.scores = g.players.map((p) => scorePlayer(p)).map((s) => ({ id: s.id, name: s.name, total: s.total, breakdown: s.breakdown }));
  g.scores.sort((a, b) => b.total - a.total);
  pushLog(g, `🏁 游戏结束！冠军：${g.scores[0]?.name ?? "—"}`);
}

export function scorePlayer(p: PlayerState): { id: string; name: string; total: number; breakdown: Record<string, number>; place: number } {
  const fields = countGrid(p, "field");
  // Farmers of the Moor：私有田 + 此玩家自己撒过种的沼泽田，合并计 fields break-point
  const moorFields = (p.moorFields || []).length;
  const totalFields = fields + moorFields;

  // 终局作统计：个人存货 + 田地里尚未收获的作物
  let totalGrain = p.resources.grain;
  let totalVeg = p.resources.vegetable;
  for (let y = 0; y < FARM_H; y++) {
    for (let x = 0; x < FARM_W; x++) {
      const cell = p.grid[y][x];
      if (cell.kind === "field" && cell.crop && cell.markers) {
        if (cell.crop === "grain") totalGrain += cell.markers;
        else if (cell.crop === "vegetable") totalVeg += cell.markers;
      }
    }
  }

  // 农场空地计分：15 格农场中未利用的格子，每格扣 1 分
  const used = countUsedYard(p);
  const unusedSpaces = Math.max(0, 15 - used);

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
    家人: p.family * SCORE.familyMember,
    空地: unusedSpaces * SCORE.unusedYard,
    乞讨: p.beggings * BEGGING_PENALTY,
    改进: p.improvements.reduce((sum, k) => sum + (MAJOR_IMPROVEMENTS[k]?.vp ?? 0), 0),
  };

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
  if (p.occupation?.id === "tutor") {
    if ((p.improvements.length + (p.minorImprovements?.length || 0)) >= 3) occBonus += 3;
  } else if (p.occupation?.id === "villageElder") {
    if (p.beggings === 0) occBonus += 3;
  } else if (p.occupation?.id === "architect") {
    occBonus += (roomCount(p, "clay") + roomCount(p, "stone"));
  } else if (p.occupation?.id === "estateAgent") {
    if (p.family >= 5) occBonus += 3;
  } else if (p.occupation?.id === "agronomist") {
    if (totalFields >= 4) occBonus += 3;
  } else if (p.occupation?.id === "pastureCount") {
    if (p.pastures.length >= 3) occBonus += 3;
  } else if (p.occupation?.id === "masterBreeder") {
    if (p.animals.sheep >= 1 && p.animals.boar >= 1 && p.animals.cattle >= 1) occBonus += 4;
  } else if (p.occupation?.id === "philanthropist") {
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
  for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
    if (p.grid[y][x].kind === kind) n++;
  }
  return n;
}

function roomCount(p: PlayerState, t: "wood" | "clay" | "stone"): number {
  return p.roomType === t ? p.rooms : 0;
}

function countUsedYard(p: PlayerState): number {
  // 修订版："fenced in or has room/field/unfenced stable" 算已使用
  // 遍历 15 格农场，每个格子如果满足以下任一条件则计为「已利用」，绝不重复计数：
  // 1. 是房间 (kind === "room")
  // 2. 是农田 (kind === "field")
  // 3. 位于某个封闭牧场中 (fenced pasture cell)
  // 4. 格子上建有马厩 (cell.stable)
  const pastureCells = new Set<string>();
  for (const pst of p.pastures) {
    for (const c of pst.cells) pastureCells.add(c);
  }

  let used = 0;
  for (let y = 0; y < FARM_H; y++) {
    for (let x = 0; x < FARM_W; x++) {
      const key = `${x},${y}`;
      const cell = p.grid[y][x];
      if (cell.kind === "room" || cell.kind === "field" || pastureCells.has(key) || cell.stable) {
        used += 1;
      }
    }
  }
  return used;
}

export { OCCUPATIONS, MINOR_IMPROVEMENTS } from "./dlc";