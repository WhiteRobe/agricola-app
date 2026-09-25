// ---- 行动 / 原料 → 中文 ----
// 仅用于 pushLog 与错误提示里的中文渲染；动作协议 token 仍保持英文。
const ACTION_NAME_ZH: Record<string, string> = {
  Wood: "木", Clay: "陶", Reed: "芦苇", Stone: "石", Grain: "谷", Vegetable: "菜",
  Fishing: "钓鱼", DayLaborer: "日工",
  Sheep: "买羊", Boar: "买猪", Cattle: "买牛",
  StartPlayer: "起始玩家",
  BuildRoom: "建房间", PlowField: "犁地", SowOrBake: "撒种/烤面包",
  Fences: "建栅栏", FamilyGrowth: "添丁", Renovate: "翻修", BuildMajor: "大改进",
  GatherFuel: "收集燃料", CutMeadow: "割草甸", ReclaimMoor: "拓荒", SowMoor: "沼泽撒种",
  Ore: "矿",
};
const ANIMAL_ZH: Record<string, string> = { sheep: "羊", boar: "猪", cattle: "牛", vegetable: "菜" };
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
  /** DLC：玩家已被分配的职业（仅当选 occupations DLC 时存在） */
  occupation?: { id: string; name: string; icon: string; effect: string };
  /** DLC：玩家可选的剩余手牌（开局 7 张里未选的部分），选完后清空 */
  occupationHand?: { id: string; name: string; icon: string; effect: string }[];
  /** DLC：玩家已拥有的 minor improvements（id 集合） */
  minorImprovements: string[];
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
  revealed: string[]; // 已揭示的回合卡（行动空间名称）
  supply: { wood: number; clay: number; reed: number; stone: number; grain: number; vegetable: number; sheep: number; boar: number; cattle: number; food: number };
  /**
   * 各行动格上的「累积堆」：每轮补充阶段 +1，取用时**拿走全部**并清零。
   * 这是 Agricola 的核心机制 —— 抢的时机决定收益多少。
   */
  piles: {
    Wood: number; Clay: number; Reed: number; Stone: number;
    Grain: number; Vegetable: number; Fishing: number;
    Sheep: number; Boar: number; Cattle: number;
  };
  startPlayerId: string | null;
  players: PlayerState[];
  harvestQueue: number[]; // 本轮收获顺序（family size 升序）
  log: { t: number; msg: string }[];
  finished: boolean;
  scores?: { id: string; name: string; total: number; breakdown: Record<string, number> }[];
  /** DLC 配置：开局从主持人勾选项带入 */
  dlc: DlcConfig;
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
  const minorCards: MinorImprovement[] = [];
  if (dlc.occupations) {
    for (const p of players) handByPlayer[p.id] = sample(OCCUPATIONS, 7);
  }
  if (dlc.minorImprovements) {
    const picked = sample(MINOR_IMPROVEMENTS, Math.min(3, MINOR_IMPROVEMENTS.length));
    // 实际版规则：每局只抽 1 张加入行动板；先做单卡以求稳
    minorCards.push(picked[0]);
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
      // DLC：每名玩家一张 7 张的「职业候选手牌」；开局阶段让玩家从 7 选 1
      occupationHand: dlc.occupations ? handByPlayer[p.id] : [],
      minorImprovements: [],
      // Farmers of the Moor：fuel/hay/moorFields 仅在 moor=true 时使用，0 默认
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
    piles: { Wood: 0, Clay: 0, Reed: 0, Stone: 0, Grain: 0, Vegetable: 0, Fishing: 0, Sheep: 0, Boar: 0, Cattle: 0 },
    startPlayerId: ps[0].id,
    players: ps,
    harvestQueue: [],
    log: [],
    finished: false,
    dlc,
    minorImprovementCards: dlc.minorImprovements ? minorCards : [],
    // Farmers of the Moor：默认空板 + 累积堆 0；startRound 中按 dlc.moor 决定是否累积
    moorBoard: [],
    moorFuelPile: 0,
    moorHayPile: 0,
  };
  startRound(g);
  return g;
}

// ---------- 阶段 ----------
function startRound(g: GameState) {
  g.round += 1;
  g.stage = STAGE_OF_ROUND[g.round - 1];
  g.placedThisRound = [];
  g.usedSpaces = [];
  g.players.forEach((p) => (p.babiesThisRound = 0));
  // ★ 回合卡一经揭示就永久留在版图上（不随回合消失），因此这里不清空 g.revealed

  // 补充阶段：各行动格累积堆 +1（★ 起手为空，取用时拿走全部）
  g.piles.Wood += LEFT_BOARD.forest.acc;
  g.piles.Clay += LEFT_BOARD.clayPit.acc;
  g.piles.Reed += LEFT_BOARD.reedBank.acc;
  g.piles.Grain += LEFT_BOARD.grainPile.acc;
  g.piles.Fishing += LEFT_BOARD.fishing.acc;
  if (g.round >= LEFT_BOARD.stoneQuarry.appearsRound) g.piles.Stone += LEFT_BOARD.stoneQuarry.acc;
  if (g.round >= LEFT_BOARD.vegetable.appearsRound) g.piles.Vegetable += LEFT_BOARD.vegetable.acc;
  // 动物市场同样累积（开放后每轮 +1）
  (Object.keys(ANIMAL_MARKET) as AnimalType[]).forEach((t) => {
    const cfg = ANIMAL_MARKET[t];
    if (g.round >= cfg.appearsRound) {
      const key = (t === "sheep" ? "Sheep" : t === "boar" ? "Boar" : "Cattle") as keyof GameState["piles"];
      g.piles[key] += 1;
    }
  });

  // Farmers of the Moor：燃料堆每轮 +1，干草堆每轮 +1
  if (g.dlc?.moor) {
    g.moorFuelPile += 1;
    g.moorHayPile += 1;
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

  // 揭回合卡（累积：已揭示的永久保留，这里只记录本轮新翻出的）
  // Moor 回合卡只在勾选了「荒野之地」的房间揭示
  const newlyRevealed: string[] = [];
  roundCardFor(g.round).forEach((c) => {
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
}

function orderByStart(g: GameState): string[] {
  const arr = g.players.slice().sort((a, b) => {
    if (a.id === g.startPlayerId) return -1;
    if (b.id === g.startPlayerId) return 1;
    return a.seat - b.seat;
  });
  const order: string[] = [];
  const placedByPlayer = Object.fromEntries(arr.map((p) => [p.id, 0]));
  // 严格轮转：从起始玩家开始，每人放一名工人，循环直到所有人放完
  // 注意：本轮出生的婴儿当轮不能工作（workersOf 已扣除）
  while (true) {
    let any = false;
    for (const p of arr) {
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

/**
 * 每轮揭示的**回合卡行动格**。
 *
 * 依据：
 *  - 犁地 / 撒种·烤面包 / 建房间 / 起始玩家 —— **第 1 轮起永久可用**（不占回合卡）
 *  - 建栅栏 —— 第 1 轮揭示
 *  - 重大改进 —— 第 3 轮
 *  - 翻修 / 添丁 —— 阶段 2（第 5-7 轮）
 *  - 后续轮次再揭示第二、第三次（可重复用的空间）
 *  - 动物市场与菜地/石场有各自的开放轮次（见 ANIMAL_MARKET / LEFT_BOARD）
 */
function roundCardFor(r: number): string[] {
  // 回合卡：一经揭示就永久留在版图上（每格每轮仍只能被用一次），
  // 所以这里表示的是「首次可用轮次」。
  const map: Record<number, string[]> = {
    1: ["Fences"],         // 建栅栏：第 1 轮起永久可用
    3: ["BuildMajor"],     // 建造重大改进
    5: ["Renovate"],       // 翻修
    6: ["FamilyGrowth"],   // 添丁
  };
  // Farmers of the Moor：Moor 专属 3 张回合卡（仅在 dlc.moor=true 时启用）
  const moor: Record<number, string> = {
    2:  "GatherFuel",      // 收集燃料
    4:  "ReclaimMoor",     // 第一次开垦沼泽
    7:  "CutMeadow",       // 第一次割草甸
    10: "ReclaimMoor",     // 第二次开垦
    12: "GatherFuel",
    13: "CutMeadow",
  };
  return (map[r] || []).concat(moor[r] ? [moor[r]] : []);
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

/** 动作 → 占用的行动格 id（撒种与烤面包同属「撒种/烤面包」格） */
function spaceOfAction(a: EngineAction): string | null {
  switch (a.type) {
    case "Take": return String(a.space || "") || null;
    case "BuildRoom": return "BuildRoom";
    case "PlowField": return "PlowField";
    case "Sow": return "SowOrBake";
    case "BakeBread": return "SowOrBake";
    case "BuildFences": return "Fences";
    case "FamilyGrowth": return "FamilyGrowth";
    case "Renovate": return "Renovate";
    case "BuildMajor": return "BuildMajor";
    // Farmers of the Moor：每个 Moor 行动都是独立行动格（每轮一次）
    case "GatherFuel": return "GatherFuel";
    case "CutMeadow": return "CutMeadow";
    case "ReclaimMoor": return "ReclaimMoor";
    case "SowMoor": return "SowMoor";
    default: return null; // Cook / HarvestMoor 等不占行动格
  }
}

/** 回合卡行动：必须已揭示（翻出）才能使用 */
const ROUND_CARD_SPACES = new Set([
  "Fences", "BuildMajor", "Renovate", "FamilyGrowth",
  "GatherFuel", "ReclaimMoor", "CutMeadow",
]);
/** Moor 专属回合卡（仅在 dlc.moor=true 的房间揭示） */
const MOOR_ROUND_CARDS = new Set(["GatherFuel", "ReclaimMoor", "CutMeadow"]);

/** 该玩家本轮是否还有至少一个可用的行动格（用于无格可放时自动跳过） */
function hasLegalSpace(g: GameState, p: PlayerState): boolean {
  const used = g.usedSpaces;
  const open = (id: string) => !used.includes(id);
  const pile = (k: keyof GameState["piles"]) => g.piles[k] > 0;

  if (open("Wood") && pile("Wood")) return true;
  if (open("Clay") && pile("Clay")) return true;
  if (open("Reed") && pile("Reed")) return true;
  if (open("Grain") && pile("Grain")) return true;
  if (open("Vegetable") && g.round >= LEFT_BOARD.vegetable.appearsRound && pile("Vegetable")) return true;
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
    if (open(id) && g.round >= ANIMAL_MARKET[t].appearsRound && g.piles[key] > 0) return true;
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
    case "FamilyGrowth": return advance(g, p, "FamilyGrowth", familyGrowth(g, p));
    case "Renovate": return advance(g, p, "Renovate", renovate(g, p, a));
    case "BuildMajor": return advance(g, p, "BuildMajor", buildMajor(g, p, a));
    case "Cook": return cook(g, p, a); // 不消耗工人
    case "EndTurn":
      // 强制结束（当前实现下工人总会被放置；这里用作安全阀）
      g.placedThisRound.push(p.id);
      return advanceTurn(g);
    case "ChooseOccupation": return chooseOccupation(g, p, a);
    case "TakeMinorImprovement": return takeMinorImprovement(g, p, a);
    case "UseMinorImprovement": return useMinorImprovement(g, p, a);
    // Farmers of the Moor：3 个新行动
    case "GatherFuel": return gatherFuel(g, p);
    case "CutMeadow": return cutMeadow(g, p);
    case "ReclaimMoor": return reclaimMoor(g, p, a);
    case "SowMoor": return sowMoor(g, p, a);
    case "HarvestMoor": return harvestMoor(g, p);
    default: return { ok: false, msg: "未知行动" };
  }
}

// ---------- 行动：取用空间 ----------
function handleTake(g: GameState, p: PlayerState, space: string): ActionResult {
  // 起始玩家 + 食物（"StartPlayer"）
  if (space === "StartPlayer") {
    g.startPlayerId = p.id;
    p.food += START_PLAYER_FOOD;
    p.usedStartPlayer = true;
    pushLog(g, `🚜 「${p.name}」获得起始玩家标记并拿 ${START_PLAYER_FOOD} 食物`);
    return { ok: true };
  }
  if (space === "Wood" || space === "Clay" || space === "Reed" || space === "Grain" || space === "Vegetable") {
    // ★ 累积格：拿走该格全部资源
    const poolKey = space as keyof GameState["piles"];
    const resKey = (space === "Wood" ? "wood" : space === "Clay" ? "clay" : space === "Reed" ? "reed"
      : space === "Grain" ? "grain" : "vegetable") as keyof PlayerState["resources"];
    if (space === "Vegetable" && g.round < LEFT_BOARD.vegetable.appearsRound) {
      return { ok: false, msg: `菜地第 ${LEFT_BOARD.vegetable.appearsRound} 轮起才开放` };
    }
    const got = g.piles[poolKey];
    if (got <= 0) return { ok: false, msg: `${zhSpace(space)}是空的（每轮 +1）` };
    p.resources[resKey] += got;
    g.piles[poolKey] = 0;
    pushLog(g, `${resIcon(resKey)} 「${p.name}」取走 ${zhSpace(space)}上的全部 ${got} ${resZh(resKey)}`);
    return { ok: true };
  }
  if (space === "Stone") {
    if (g.round < LEFT_BOARD.stoneQuarry.appearsRound) return { ok: false, msg: `石场第 ${LEFT_BOARD.stoneQuarry.appearsRound} 轮起才开放` };
    const got = g.piles.Stone;
    if (got <= 0) return { ok: false, msg: "石场是空的（每轮 +1）" };
    p.resources.stone += got;
    g.piles.Stone = 0;
    pushLog(g, `⛏ 「${p.name}」取走石场上的全部 ${got} 石`);
    return { ok: true };
  }
  if (space === "Fishing") {
    const got = g.piles.Fishing;
    if (got <= 0) return { ok: false, msg: "鱼塘是空的（每轮 +1）" };
    p.food += got;
    g.piles.Fishing = 0;
    pushLog(g, `🐟 「${p.name}」钓鱼 +${got} 食物`);
    return { ok: true };
  }
  if (space === "DayLaborer") {
    p.food += LEFT_BOARD.dayLaborer.food;
    pushLog(g, `🛠 「${p.name}」日工 +${LEFT_BOARD.dayLaborer.food} 食物（无须成本，但用掉 1 名家人）`);
    return { ok: true };
  }
  // ---- 动物市场（累积格）：拿走该格全部动物，不花食物；养不下的跑回供应区 ----
  if (space === "Sheep" || space === "Boar" || space === "Cattle") {
    const t: AnimalType = space === "Sheep" ? "sheep" : space === "Boar" ? "boar" : "cattle";
    const zh = t === "sheep" ? "羊" : t === "boar" ? "猪" : "牛";
    const poolKey = space as keyof GameState["piles"];
    if (g.round < ANIMAL_MARKET[t].appearsRound) return { ok: false, msg: `${zh}市第 ${ANIMAL_MARKET[t].appearsRound} 轮起才开放` };
    const pool = g.piles[poolKey];
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
    pushLog(g, `🐑 「${p.name}」从${zh}市带走 ${kept} 只${zh}${lost > 0 ? `（${lost} 只因没有牧场跑掉了）` : ""}`);
    return { ok: true };
  }
  return { ok: false, msg: "无法执行该行动空间" };
}

// ---------- 行动：建房间 ----------
function buildRoom(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const x = Number(a.x), y = Number(a.y);
  if (!isValidCell(x, y)) return { ok: false, msg: "无效坐标" };
  if (p.grid[y][x].kind !== "empty") return { ok: false, msg: "该格已被占用" };
  // 邻接：必须与已有房间正交相邻；首个除外（已有 2 间木屋，邻接必然满足）
  const houseAdj = houseNeighbors(p, x, y).length > 0;
  if (!houseAdj) return { ok: false, msg: "新房间必须紧邻现有房间" };

  const cost = ROOM_COST[p.roomType];
  if (!pay(g, p, cost)) return { ok: false, msg: "资源不足以建造" };
  p.grid[y][x] = { kind: "room" as const };
  p.rooms += 1;
  pushLog(g, `🏠 「${p.name}」建了一间${houseLabel(p.roomType)}房 (${x},${y})`);
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
  // 简化：犁地 1 块需 0 资源（原版无额外费用）
  p.grid[y][x] = { kind: "field" as const };
  pushLog(g, `🌱 「${p.name}」犁地 (${x},${y})`);
  return { ok: true };
}

// ---------- 行动：播种 ----------
function sow(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const x = Number(a.x), y = Number(a.y);
  const crop = String(a.crop) as "grain" | "vegetable";
  if (!isValidCell(x, y)) return { ok: false, msg: "无效坐标" };
  const cell = p.grid[y][x];
  if (cell.kind !== "field") return { ok: false, msg: "这里不是田" };
  if (cell.crop) return { ok: false, msg: "已经播过种" };
  if (crop === "grain") {
    if (p.resources.grain < 1) return { ok: false, msg: "没有谷种" };
    p.resources.grain -= 1; g.supply.grain += 1; // 种由田里扣除，标记数加入田
    cell.crop = "grain";
    cell.markers = SOW_GRAIN_TOTAL;
    pushLog(g, `🌾 「${p.name}」在 (${x},${y}) 撒谷种（收获 3 次）`);
  } else {
    if (p.resources.vegetable < 1) return { ok: false, msg: "没有菜种" };
    p.resources.vegetable -= 1; g.supply.vegetable += 1;
    cell.crop = "vegetable";
    cell.markers = SOW_VEG_TOTAL;
    pushLog(g, `🥕 「${p.name}」在 (${x},${y}) 撒菜种（收获 2 次）`);
  }
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
  const cost = added.length * FENCE_COST_WOOD;
  if (p.resources.wood < cost) return { ok: false, msg: `需要 ${cost} 木头` };
  // 验证：必须是围出矩形牧场
  const v = validateEnclosure(FARM_W, FARM_H, baseEdges, added.map((e) => edgeId(e.kind, e.x, e.y)));
  if (!v.ok) return { ok: false, msg: v.reason || "栅栏布局非法" };
  // 扣资源 & 应用
  p.resources.wood -= cost;
  g.supply.wood += cost;
  p.edges = baseEdges;
  rebuildPastures(p);
  // 现有牧场中若动物被新栅栏切出区域，逃跑（按原版：动物永远在原地，栅栏拆除/围错导致杀退 → 简化：仅当牧场消失/不可容纳时动物逃跑）
  for (const id of Object.keys(p.pastureAnimalCells)) {
    if (!p.pastures.find((x) => x.id === id)) delete p.pastureAnimalCells[id];
  }
  pushLog(g, `🪵 「${p.name}」建了 ${added.length} 段栅栏`);
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
  p.resources.grain -= grainWanted; g.supply.grain += grainWanted;
  p.food += food;
  pushLog(g, `🍞 「${p.name}」用 ${grainWanted} 谷物烤面包 +${food} 食物`);
  return { ok: true };
}

// ---------- 行动：家庭成长 ----------
function familyGrowth(g: GameState, p: PlayerState): ActionResult {
  if (p.family >= MAX_FAMILY) return { ok: false, msg: "家里最多 5 人" };
  if (p.rooms <= p.family) return { ok: false, msg: "空房间不足" };
  if (p.food < FOOD_PER_FAMILY) return { ok: false, msg: "食物不足养孩子" };
  p.food -= FOOD_PER_FAMILY;
  p.family += 1;
  p.babiesThisRound += 1;
  pushLog(g, `👶 「${p.name}」的家庭迎来了新成员（-${FOOD_PER_FAMILY} 食物）`);
  return { ok: true };
}

// ---------- 行动：翻修 ----------
function renovate(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const direction = String(a.direction) as "woodToClay" | "clayToStone";
  if (direction === "woodToClay" && p.roomType !== "wood") return { ok: false, msg: "需要先翻成陶屋" };
  if (direction === "clayToStone" && p.roomType !== "clay") return { ok: false, msg: "需要先翻成石屋" };
  // 规则：翻修按「每间房」计费 —— 木→陶 每间 1 陶 + 1 芦苇；陶→石 每间 1 石 + 1 芦苇
  const perRoom = RENO_COST[direction];
  const cost: Record<string, number> = {};
  for (const k of Object.keys(perRoom)) cost[k] = perRoom[k] * p.rooms;
  if (!pay(g, p, cost)) {
    const need = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
    return { ok: false, msg: `翻修需 ${need}（共 ${p.rooms} 间房）` };
  }
  p.roomType = direction === "woodToClay" ? "clay" : "stone";
  const spent = Object.entries(cost).map(([k, v]) => `${v} ${resLabel(k)}`).join(" + ");
  pushLog(g, `🔨 「${p.name}」把整栋 ${p.rooms} 间房翻修为${houseLabel(p.roomType)}屋（花费 ${spent}）`);
  return { ok: true };
}

/** 资源 key → 中文单位（用于费用提示） */
function resLabel(k: string): string {
  return ({ wood: "木", clay: "陶", reed: "芦苇", stone: "石", grain: "谷", vegetable: "菜", food: "食物" } as Record<string, string>)[k] || k;
}
/** 行动格 id → 中文名 */
function zhSpace(id: string): string {
  return ({ Wood: "木堆", Clay: "陶坑", Reed: "芦苇滩", Stone: "石场", Grain: "谷堆", Vegetable: "菜地", Fishing: "鱼塘" } as Record<string, string>)[id] || id;
}
/** 资源 key → 中文名 */
function resZh(k: string): string {
  return ({ wood: "木", clay: "陶", reed: "芦苇", stone: "石", grain: "谷", vegetable: "菜" } as Record<string, string>)[k] || k;
}
/** 资源 key → 图标 */
function resIcon(k: string): string {
  return ({ wood: "🪵", clay: "🧱", reed: "🎋", stone: "⛏", grain: "🌾", vegetable: "🥕" } as Record<string, string>)[k] || "📦";
}

// ---------- 行动：建重大改进 ----------
function buildMajor(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const name = String(a.improvement) as keyof typeof MAJOR_IMPROVEMENTS;
  if (!MAJOR_IMPROVEMENTS[name]) return { ok: false, msg: "未知道具" };
  if (p.improvements.includes(name)) return { ok: false, msg: "已建造" };
  const cost = MAJOR_IMPROVEMENTS[name].cost;
  if (!pay(g, p, cost)) return { ok: false, msg: "资源不足" };
  p.improvements.push(name);
  // 水井：建成起 5 轮，每轮开始 +1 食物
  if (name === "well") p.wellRounds = 5;
  pushLog(g, `🔧 「${p.name}」建了「${majorLabel(name)}」`);
  return { ok: true };
}

// ---------- 行动：烹饪 ----------
/**
 * 烹饪改进（Fireplace / Cooking Hearth）：
 *   - 字段 cook[k] = 多少单位 k 换 1 食物（整数）
 *   - 修订版规则：
 *       Fireplace（壁炉）      谷/菜/羊/猪 = 2 单位换 1 食物；牛 = 3 单位换 1 食物
 *       Cooking Hearth（烹饪灶）谷/菜/羊/猪 = 1 单位换 2 食物（= 半单位换 1）；牛 = 3 单位换 2 食物
 *     因为烹饪灶有半单位档，fields 我们用「多少单位 = 1 食物」语义时，烹饪灶 = 0.5；
 *     实现时按 (used / cook[k]) 累加；不足 1 时给整数 0。
 */
function cook(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  const impName = String(a.improvement) as keyof typeof MAJOR_IMPROVEMENTS;
  if (!p.improvements.includes(impName)) return { ok: false, msg: "你没用过这个烹饪工具" };
  const imp = MAJOR_IMPROVEMENTS[impName];
  if (!("cook" in imp)) return { ok: false, msg: "该改进无烹饪能力" };
  const cookRule = imp.cook;
  const used: Record<string, number> = {};
  const RESOURCE_KEYS = new Set(["vegetable", "wood", "clay", "reed"]);
  for (const k of Object.keys(a.used || {}) as (AnimalType | "vegetable" | "wood" | "clay" | "reed")[]) {
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
    const ratio = (cookRule as Record<string, number>)[k]; // 多少单位换 1 食物（可非整数，例如 0.5 表示 1 单位出 2 食物）
    if (ratio > 0) food += (used as Record<string, number>)[k] / ratio;
  }
  food = Math.floor(food); // 总食物数向下取整（不允许小数）
  if (food === 0) return { ok: false, msg: "至少烹饪一种原料" };
  for (const k of Object.keys(used)) {
    if (RESOURCE_KEYS.has(k)) (p.resources as Record<string, number>)[k] -= (used as Record<string, number>)[k];
    else p.animals[k as AnimalType] -= (used as Record<string, number>)[k];
  }
  p.food += food;
  pushLog(g, `🍳 「${p.name}」烹饪获得 ${food} 食物`);
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

/** 开局阶段：每位玩家从 7 张手牌里选 1 张职业；不消耗工人，可重选 */
function chooseOccupation(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (!g.dlc?.occupations) return { ok: false, msg: "本房间未启用职业 DLC" };
  const id = String(a.id || "");
  const hand = p.occupationHand || [];
  const idx = hand.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, msg: "这张职业不在你的手牌里" };
  if (p.occupation && p.occupation.id === id) return { ok: false, msg: "你已经选过这张职业了" };
  p.occupation = hand[idx];
  pushLog(g, `🎴 「${p.name}」选了职业「${p.occupation.icon} ${p.occupation.name}」：${p.occupation.effect}`);
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
      pushLog(g, `🏚 「${p.name}」使用了「${card.name}」+1 谷 +1 菜`); break;
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
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用 Farmers of the Moor" };
  if (g.moorFuelPile <= 0) return { ok: false, msg: "燃料堆是空的（每轮 +1）" };
  const got = g.moorFuelPile;
  p.fuel += got;
  g.moorFuelPile = 0;
  pushLog(g, `🔥 「${p.name}」取走燃料堆上的全部 ${got} 燃料`);
  return advance(g, p, "GatherFuel", { ok: true });
}

/** 割草甸：拿走 moorHayPile 全部干草归己 */
function cutMeadow(g: GameState, p: PlayerState): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用 Farmers of the Moor" };
  if (g.moorHayPile <= 0) return { ok: false, msg: "草甸是空的（每轮 +1）" };
  const got = g.moorHayPile;
  p.hay += got;
  g.moorHayPile = 0;
  pushLog(g, `🌾 「${p.name}」割草拿 ${got} 干草`);
  return advance(g, p, "CutMeadow", { ok: true });
}

/** 拓荒：标记 (x, y) 为已开垦的公有田，自身 +1 燃料；消耗 1 木 + 1 芦苇 */
function reclaimMoor(g: GameState, p: PlayerState, a: EngineAction): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用 Farmers of the Moor" };
  const x = Number(a.x), y = Number(a.y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= MOOR_W || y < 0 || y >= MOOR_H) {
    return { ok: false, msg: `沼泽坐标越界（应在 0..${MOOR_W - 1} / 0..${MOOR_H - 1}）` };
  }
  if ((g.moorBoard || []).some((c) => c.x === x && c.y === y)) {
    return { ok: false, msg: "这块沼泽已经被开垦过了" };
  }
  // 资源：1 木 + 1 芦苇（与 base game 修订版一致）
  if ((p.resources.wood || 0) < 1) return { ok: false, msg: "需要 1 木" };
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
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用 Farmers of the Moor" };
  const x = Number(a.x), y = Number(a.y);
  const crop = String(a.crop) as "grain" | "vegetable";
  if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, msg: "无效坐标" };
  if (crop !== "grain" && crop !== "vegetable") return { ok: false, msg: "作物必须是 谷 或 菜" };
  const cell = (g.moorBoard || []).find((c) => c.x === x && c.y === y);
  if (!cell) return { ok: false, msg: "这块沼泽还没开垦" };
  if (cell.crop) return { ok: false, msg: "这块沼泽已经播过种了" };
  if (crop === "grain") {
    if (p.resources.grain < 1) return { ok: false, msg: "没有谷种" };
    p.resources.grain -= 1; g.supply.grain += 1;
    cell.crop = "grain"; cell.markers = SOW_GRAIN_TOTAL; cell.sownBy = p.id;
    pushLog(g, `🌾 「${p.name}」在沼泽 (${x},${y}) 撒谷种（收获 3 次）`);
  } else {
    if (p.resources.vegetable < 1) return { ok: false, msg: "没有菜种" };
    p.resources.vegetable -= 1; g.supply.vegetable += 1;
    cell.crop = "vegetable"; cell.markers = SOW_VEG_TOTAL; cell.sownBy = p.id;
    pushLog(g, `🥕 「${p.name}」在沼泽 (${x},${y}) 撒菜种（收获 2 次）`);
  }
  // 计入此玩家自己的 moorFields（fields 计分用）
  if (!p.moorFields) p.moorFields = [];
  p.moorFields.push({ x, y, crop, markers: cell.markers });
  return advance(g, p, "SowMoor", { ok: true });
}

/** 收获沼泽田：按 moorBoard 扫描，对自己撒过种的格子按 marker -1 取 1 个谷/菜 */
function harvestMoor(g: GameState, p: PlayerState): ActionResult {
  if (!g.dlc?.moor) return { ok: false, msg: "本房间未启用 Farmers of the Moor" };
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
  if (gainedG || gainedV) pushLog(g, `🌾 「${p.name}」收获沼泽 +${gainedG} 谷 +${gainedV} 蔬菜`);
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
    basket: "柳编筐",
    joinery: "木工坊",
    pottery: "陶器坊",
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

// ---------- 动物空间分配 ----------
function addAnimal(g: GameState, p: PlayerState, t: AnimalType): boolean {
  rebuildPastures(p);
  // 每个牧场位置一格可以容纳 2 只动物（+2 if 稳定）
  for (const pst of p.pastures) {
    if (pst.animal && pst.animal !== t) continue; // 已经有别的动物 → 跳过
    const placed = p.pastureAnimalCells[pst.id] || [];
    if (placed.length >= pst.cells.length * 2) continue; // 已满（按每格 2）
    pst.animal = t;
    p.pastureAnimalCells[pst.id] = [...placed, pst.cells[0]];
    p.animals[t] += 1;
    return true;
  }
  return false;
}

function pastureCapacity(p: PlayerState, pst: { id: string; cells: string[]; animal?: AnimalType }, placed: string[]): number {
  // 每格 2 只；本版本未实现马厩，所以稳定加成恒为 0（保留以便日后启用）
  let cellsWithStable = 0;
  for (const c of pst.cells) {
    const [x, y] = c.split(",").map(Number);
    if (p.grid[y][x].stable) cellsWithStable += 1;
  }
  const total = pst.cells.length * ANIMAL_CAPACITY_PER_CELL + cellsWithStable * ANIMAL_CAPACITY_STABLE_BONUS;
  return total;
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
    // 还没放完：重建等待队列（按起始玩家顺序轮转）
    g.waitingFor = nextWorkerQueue(g);
    // 安全网：若队列意外为空但仍未放完，按剩余工人补全
    if (g.waitingFor.length === 0) {
      g.waitingFor = g.players
        .filter((p) => g.placedThisRound.filter((x) => x === p.id).length < workersOf(p))
        .map((p) => p.id);
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

function nextWorkerQueue(g: GameState): string[] {
  const arr = g.players.slice().sort((a, b) => {
    if (a.id === g.startPlayerId) return -1;
    if (b.id === g.startPlayerId) return 1;
    return a.seat - b.seat;
  });
  const out: string[] = [];
  for (const p of arr) {
    const placed = g.placedThisRound.filter((x) => x === p.id).length;
    if (placed < workersOf(p)) out.push(p.id);
  }
  return out;
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
    for (let y = 0; y < FARM_H; y++) for (let x = 0; x < FARM_W; x++) {
      const cell = p.grid[y][x];
      if (cell.kind !== "field" || !cell.crop || !cell.markers) continue;
      if (cell.crop === "grain") { p.resources.grain += 1; gainedG += 1; }
      else { p.resources.vegetable += 1; gainedV += 1; }
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
    if (gainedG || gainedV) pushLog(g, `🌾 「${p.name}」收获 +${gainedG} 谷 +${gainedV} 蔬菜`);
  }

  // 2. 喂养阶段
  for (const p of g.players) {
    // 成年人每人 2 食物；本轮出生的婴儿只需 1 食物
    const adults = Math.max(0, p.family - p.babiesThisRound);
    const need = adults * FOOD_PER_FAMILY + p.babiesThisRound * FOOD_PER_BABY_THIS_HARVEST;
    let needLeft = need;

    // 先用既有食物
    const fromFood = Math.min(p.food, needLeft);
    p.food -= fromFood;
    needLeft -= fromFood;

    // 不够 → 用谷物（1 谷 = 1 食物）
    let usedGrain = 0;
    while (needLeft > 0 && p.resources.grain > 0) {
      p.resources.grain -= 1;
      g.supply.grain += 1;
      usedGrain += 1;
      needLeft -= GRAIN_TO_FOOD;
    }
    // 还不够 → 用蔬菜（1 菜 = 1 食物）
    let usedVeg = 0;
    while (needLeft > 0 && p.resources.vegetable > 0) {
      p.resources.vegetable -= 1;
      g.supply.vegetable += 1;
      usedVeg += 1;
      needLeft -= VEG_TO_FOOD;
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
        pushLog(g, `🐣 「${p.name}」的${labelAnimal(t)}繁殖 +1 只（共 ${p.animals[t]}）`);
      } else {
        pushLog(g, `🚫 「${p.name}」的${labelAnimal(t)}无法繁殖（牧场容量已满）`);
      }
    });
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
      // 「泥炭窑」大改进：每收获轮 +1 燃料
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
        pushLog(g, `💀 「${p.name}」的 1 头牛饿死了（缺干草）`);
      }
      if (need > 0 && lack === 0) {
        // 全部喂饱
        pushLog(g, `🐄 「${p.name}」用 ${need} 干草喂了 ${p.animals.cattle} 头牛`);
      }
    }
  }

  pushLog(g, `✅ 第 ${g.round} 轮收获结束`);
}

function totalAnimals(p: PlayerState): number {
  return p.animals.sheep + p.animals.boar + p.animals.cattle;
}

/** 喂养明细（用于日志可读性） */
function useDetail(fromFood: number, grain: number, veg: number): string {
  const parts: string[] = [];
  if (fromFood > 0) parts.push(`食物 ${fromFood}`);
  if (grain > 0) parts.push(`谷 ${grain}`);
  if (veg > 0) parts.push(`菜 ${veg}`);
  return parts.length ? `，用：${parts.join(" + ")}` : "";
}

/** 本轮可用工人数 = 家庭成员 - 本轮出生的婴儿（婴儿当轮不能工作） */
function workersOf(p: PlayerState): number {
  return Math.max(0, p.family - p.babiesThisRound);
}

function labelAnimal(t: AnimalType) {
  return t === "sheep" ? "羊" : t === "boar" ? "猪" : "牛";
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
  const grainInSupply = p.resources.grain;
  const vegInSupply = p.resources.vegetable;
  const used = countUsedYard(p);
  const breakdown: Record<string, number> = {
    田块: SCORE.fields[Math.min(5, totalFields)],
    牧场: SCORE.pastures[Math.min(4, p.pastures.length)],
    谷物: SCORE.grain[scoreIdx(grainInSupply, [0, 4, 6, 8, 1000])],
    蔬菜: SCORE.vegetables[scoreIdx(vegInSupply, [0, 1, 2, 3, 1000])],
    羊: animalScore("sheep", p.animals.sheep),
    猪: animalScore("boar", p.animals.boar),
    牛: animalScore("cattle", p.animals.cattle),
    陶屋: roomCount(p, "clay") * SCORE.clayRoom,
    石屋: roomCount(p, "stone") * SCORE.stoneRoom,
    木屋: roomCount(p, "wood") * SCORE.woodRoom,
    家人: p.family * SCORE.familyMember,
    空地: used * SCORE.unusedYard,
    乞讨: p.beggings * BEGGING_PENALTY,
    改进: p.improvements.reduce((sum, k) => sum + (MAJOR_IMPROVEMENTS[k]?.vp ?? 0), 0),
    // 「柴火棚」大改进（Moor）：终局按剩余燃料每份 +1 分
    ...(p.improvements.includes("firewood") && (p.fuel || 0) > 0 ? { 柴火: p.fuel * (MAJOR_IMPROVEMENTS.firewood.fuelScore || 1) } : {}),
  };
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
  let fenced = 0;
  for (const pst of p.pastures) fenced += pst.cells.length;
  return fenced + countGrid(p, "field") + countGrid(p, "room") + p.stables;
}