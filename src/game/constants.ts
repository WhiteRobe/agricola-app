// ============================================================
// Agricola: Revised Edition — 家庭变体常量表
// 注释 ★ = 多次源核对确认；其他来自单源，可在 src/game/engine.ts 调
// ============================================================

export type AnimalType = "sheep" | "boar" | "cattle";

// ---- 农场棋盘：3×5 = 15 格 ----
export const FARM_W = 3;
export const FARM_H = 5;

// ---- 起始设置 ----
export function startingFood(_numPlayers: number, isStarter: boolean): number {
  return isStarter ? 2 : 3;
}
export const MAX_FAMILY = 5;
export const MAX_STABLES = 4;

// ---- 资源/食物 ----
export const FOOD_PER_FAMILY = 2;
export const FOOD_PER_BABY_THIS_HARVEST = 1;
export const GRAIN_TO_FOOD = 1;
export const VEG_TO_FOOD = 1;
export const BEGGING_PENALTY = -3;
/** 取「起始玩家」格时额外获得的食物 */
export const START_PLAYER_FOOD = 1;

// ---- 房间费用 ----
export const ROOM_COST: Record<string, Record<string, number>> = {
  wood:  { wood: 5, reed: 2 },
  clay:  { clay: 5, reed: 2 },
  stone: { stone: 5, reed: 2 },
};
export const RENO_COST: Record<string, Record<string, number>> = {
  woodToClay:  { clay: 1, reed: 1 },
  clayToStone: { stone: 1, reed: 1 },
};
export const STABLE_COST_WOOD = 1;

// ---- 栅栏 ----
export const FENCE_COST_WOOD = 1;
export const FENCE_MAX = 15;

// ---- 耕地与播种 ----
export const FIELDS_PER_PLOW = 1;
export const SOW_GRAIN_TOTAL = 3;
export const SOW_VEG_TOTAL = 2;
export const SOW_GRAIN_NEW = 1;
export const SOW_GRAIN_ADDX = 2;
export const SOW_VEG_NEW = 1;
export const SOW_VEG_ADDX = 1;

// ---- 阶段/收获 ----
// 修订版（2016）6 阶段：S1=R1-4 / S2=R5-7 / S3=R8-9 / S4=R10-11 / S5=R12-13 / S6=R14
export const STAGE_OF_ROUND: number[] = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6];
export const HARVEST_AFTER: number[] = [4, 7, 9, 11, 13, 14];

// ---- 左板 / 永远可用空间 ----
// ★ 修订版（2016）规则：
//   - Wood / Clay / Reed / Grain / Fishing：每轮 +1
//   - Vegetable：第 4 轮起每轮 +1（修订版）
//   - Stone（石场）：第 4 轮起每轮 +1（修订版）
//   - Day Laborer：固定 +2 食物（无成本）
//   - Start Player：拿走标记 +1 食物
//   - 「Traveling / 取建材」格在修订版已删除（仅经典版有）
export const LEFT_BOARD: any = {
  forest: { acc: 1 },
  clayPit: { acc: 1 },
  reedBank: { acc: 1 },
  fishing: { acc: 1 },
  // ★ 修订版：日工固定 +2 食物（旧版才是 +1 食物 +1 建材）
  dayLaborer: { food: 2 },
  stoneQuarry: { appearsRound: 4, acc: 1 },   // 修订版：第 4 轮起开放
  vegetable: { appearsRound: 4, acc: 1 },    // 修订版：第 4 轮起开放（菜地）
  grainPile: { acc: 1 },                     // 谷堆每轮 +1
};

// ---- 动物市场 ----
// ★ 修订版（2016）规则：
//   - 羊市第 4 轮、猪市第 8 轮、牛市第 12 轮起开放
//   - 每个市场每轮 +1 头，取用时拿走该格**全部**，**不花食物**
//   - 养不下的动物跑回总供应区
export const ANIMAL_MARKET: Record<AnimalType, { appearsRound: number }> = {
  sheep:  { appearsRound: 4 },   // 修订版：第 4 轮起开放
  boar:   { appearsRound: 8 },   // 修订版：第 8 轮起开放
  cattle: { appearsRound: 12 },  // 修订版：第 12 轮起开放
};

// ---- 重大改进（修订版固定 10 个 + Farmers of the Moor 5 个）----
//  cost: 建造费用 | vp: 游戏结束得分 | cook/bake: 转换能力 | moor: 仅 Moor 房间
export const MAJOR_IMPROVEMENTS: Record<string, any> = {
  fireplace:     { cost: { clay: 2 },  vp: 1, cook: { grain: 2, vegetable: 2, sheep: 2, boar: 2, cattle: 3 }, zh: "壁炉（2 陶土）" },
  fireplaceBig:  { cost: { clay: 3 },  vp: 1, cook: { grain: 2, vegetable: 2, sheep: 2, boar: 2, cattle: 3 }, zh: "大壁炉（3 陶土）" },
  cookingHearth: { cost: { clay: 4 },  vp: 1, cook: { grain: 0.5, vegetable: 0.5, sheep: 0.5, boar: 0.5, cattle: 1.5 }, zh: "烹饪灶（4 陶土）" },
  cookingHearthBig: { cost: { clay: 5 }, vp: 1, cook: { grain: 0.5, vegetable: 0.5, sheep: 0.5, boar: 0.5, cattle: 1.5 }, zh: "大烹饪灶（5 陶土）" },
  clayOven:      { cost: { clay: 3, stone: 1 }, vp: 2, bake: { maxGrain: 1, foodPerGrain: 5 }, zh: "陶土烤炉（3 陶土 + 1 石材）" },
  stoneOven:     { cost: { stone: 3, clay: 1 }, vp: 3, bake: { maxGrain: 2, foodPerGrain: 4 }, zh: "石头烤炉（3 石材 + 1 陶土）" },
  well:          { cost: { stone: 3, wood: 1 }, vp: 4, wellFood: true, zh: "水井（3 石材 + 1 木材）· 建成后 5 轮每轮开始 +1 食物" },
  joinery:       { cost: { stone: 2, wood: 2 }, vp: 2, cook: { wood: 0.5 }, zh: "木工坊（2 石材 + 2 木材）· 每次收获阶段 1 木材 → 2 食物" },
  pottery:       { cost: { stone: 2, clay: 2 }, vp: 2, cook: { clay: 0.5 }, zh: "陶器坊（2 石材 + 2 陶土）· 每次收获阶段 1 陶土 → 2 食物" },
  basket:        { cost: { stone: 2, reed: 2 }, vp: 2, cook: { reed: 1 / 3 }, zh: "编筐坊（2 石材 + 2 芦苇）· 每次收获阶段 1 芦苇 → 3 食物" },
  // ---- Farmers of the Moor 专属大改进（仅 dlc.moor=true 时大改进池才包含）----
  heatingStove:  { cost: { stone: 3, wood: 2 }, vp: 2, moor: true, fuelOnlyOne: true, zh: "取暖炉（3 石材 + 2 木材）· 收获阶段全家仅消耗 1 燃料" },
  peatKiln:      { cost: { clay: 2, wood: 1 }, vp: 2, moor: true, harvestFuelBonus: 1, zh: "泥炭窑（2 陶土 + 1 木材）· 每次收获阶段 +1 燃料" },
  moorCook:      { cost: { stone: 2, wood: 1 }, vp: 3, moor: true, cook: { grain: 0.5, vegetable: 0.5, sheep: 0.5, boar: 0.5, cattle: 1.5 }, zh: "沼泽灶（2 石材 + 1 木材）· 随时烹饪无需壁炉" },
  tileOven:      { cost: { stone: 3, clay: 2 }, vp: 3, moor: true, bake: { maxGrain: 2, foodPerGrain: 4, moorTile: true }, zh: "瓷砖烤炉（3 石材 + 2 陶土）· 烤面包每次额外 +1 谷物容量" },
  firewood:      { cost: { stone: 2, reed: 2 }, vp: 2, moor: true, fuelScore: 1, zh: "柴火棚（2 石材 + 2 芦苇）· 终局按剩余燃料折算胜利点" },
};

// ---- Farmers of the Moor：沼泽板尺寸常量 ----
export const MOOR_W = 4;
export const MOOR_H = 4;
/** 沼泽板最大格子数（Moor 容量校验） */
export const MOOR_MAX_RECLAIMED = MOOR_W * MOOR_H;
/** 沼泽田撒种规则：grain = 3 markers / vegetable = 2 markers（与普通田一致） */
export const MOOR_FUEL_PER_FAMILY = 1;
export const MOOR_HAY_PER_CATTLE = 1;

// ---- 计分表（★ 全部确认）----
export const SCORE: any = {
  fields:       [-1, -1, 1, 2, 3, 4],
  pastures:     [-1, 1, 2, 3, 4],
  grain:        [-1, 1, 2, 3, 4],
  vegetables:   [-1, 1, 2, 3, 4],
  sheep:        [-1, 1, 2, 3, 4],
  boar:         [-1, 1, 2, 3, 4],
  cattle:       [-1, 1, 2, 3, 4],
  unusedYard:   -1,
  fencedStable: 1,
  clayRoom:     1,
  stoneRoom:    2,
  woodRoom:     0,
  familyMember: 3,
  begging:      -3,
};

export function animalScore(t: AnimalType, n: number): number {
  // 修订版（2016）阶梯：
  //   羊  0 = -1 / 1~3 = 1 / 4~5 = 2 / 6~7 = 3 / 8+ = 4
  //   猪  0 = -1 / 1~2 = 1 / 3~4 = 2 / 5~6 = 3 / 7+ = 4
  //   牛  0 = -1 / 1 = 1   / 2~3 = 2 / 4~5 = 3 / 6+ = 4
  const breakpoints: Record<AnimalType, number[]> = {
    sheep:  [0, 1, 4, 6, 8],
    boar:   [0, 1, 3, 5, 7],
    cattle: [0, 1, 2, 4, 6],
  };
  const b = breakpoints[t];
  let i = 0;
  while (i < b.length - 1 && n >= b[i + 1]) i++;
  return SCORE[t][Math.min(i, b.length - 1)];
}

// ---- 动物容量 ----
export const ANIMAL_CAPACITY_PER_CELL = 2;
export const ANIMAL_CAPACITY_STABLE_BONUS = 2;