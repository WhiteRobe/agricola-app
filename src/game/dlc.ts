// ============================================================
// DLC 数据：职业（Occupations）+ 小发展卡（Minor Improvements）
// 数据来源：Uwe Rosenberg 设计 / Hasbro & Lookout Games 出版
//   - 修订版 + 家庭变体兼容（不依赖职业/小发展卡的规则照样能玩）
//   - 每张卡 1 个核心效果，UI 把效果文本化
// 实现目标：精简子集（先 18 张职业 + 12 张小发展卡）覆盖主流流派，
//   后续可按数据驱动的形式扩充更多卡
// ============================================================

export type DlcKey = "occupations" | "minorImprovements" | "moor";

export interface DlcConfig {
  occupations: boolean;
  minorImprovements: boolean;
  /** Farmers of the Moor：燃料/干草/沼泽资源 + 收获阶段 2 步 + 公有沼泽板 */
  moor: boolean;
}

export const DEFAULT_DLC: DlcConfig = { occupations: false, minorImprovements: false, moor: false };

/** 单张职业卡：玩家起始时从手牌（7 张里）选 1 张获得，从此生效 */
export interface Occupation {
  id: string;
  name: string;
  icon: string;
  effect: string;
  /**
   * engineHook：当引擎收到 "ActivateOccupation" 行动或某个原生时机（建房间/犁地/收获等）时调用
   * 该函数若返回 string，则 pushLog 这条文本；返回 ok/错误对象则用于行动校验
   * （本集合里大部分卡的效果都用条件触发，由 client 在合适时机弹出「使用职业 X？」
   * 的按钮 + engine 做一次状态变更）
   */
  flavor?: string;
  /** 引擎内部触发：返回 { ok, msg } 用于占位（具体见每个 hook 的实现） */
  hook?: "firstBuilding" | "firstHarvest" | "buildRoom" | "renovate" | "familyGrowth" | "sow";
}

/** 单张小发展卡：在游戏开始时从牌库抽 1 张加入永久行动板（任何人可使用） */
export interface MinorImprovement {
  id: string;
  name: string;
  icon: string;
  effect: string;
  /** 一次性触发（用掉即弃）。true 表示只能使用一次后清出；false 表示永久加成 */
  oneShot?: boolean;
}

// ---- 职业：18 张，覆盖「开局资源 / 建房减费 / 收获加成 / 行动格消耗降低 / 复制行动」等流派 ----
export const OCCUPATIONS: Occupation[] = [
  { id: "woodcutter", name: "伐木工", icon: "🪓", effect: "每轮开始：额外获得 1 木", flavor: "开局就攒建材，适合冲房子" },
  { id: "clayworker", name: "制陶工", icon: "🏺", effect: "每轮开始：额外获得 1 陶", flavor: "抢陶屋用的狠角色" },
  { id: "reedcutter", name: "芦苇工", icon: "🎋", effect: "每轮开始：额外获得 1 芦苇", flavor: "建第 3 间房必备" },
  { id: "stonemason", name: "石匠", icon: "⛏", effect: "每轮开始：额外获得 1 石", flavor: "后期翻修派的最爱" },
  { id: "fisher", name: "渔夫", icon: "🎣", effect: "钓鱼时拿全部 + 1 食物", flavor: "把钓鱼变 4 食物" },
  { id: "fieldWatchman", name: "守望者", icon: "🌾", effect: "撒种/烤面包行动后，撒种不消耗 1 次行动", flavor: "撒种白送一回合" },
  { id: "shepherd", name: "牧羊人", icon: "🐑", effect: "买羊行动后，额外 +1 只羊", flavor: "开局羊市夺 3 只" },
  { id: "swineherd", name: "养猪人", icon: "🐗", effect: "买猪行动后，额外 +1 只猪", flavor: "猪市第 9 轮翻盘常用" },
  { id: "cattleFarmer", name: "牧牛人", icon: "🐄", effect: "买牛行动后，额外 +1 只牛", flavor: "牛市专属" },
  { id: "brewer", name: "酿酒师", icon: "🍺", effect: "每轮开始：拿 1 谷变 5 食物", flavor: "谷物换食物的稳定器" },
  { id: "grainMerchant", name: "粮商", icon: "🌾", effect: "起手多拿 1 谷；每轮收 1 食物", flavor: "开局谷物派的开局神器" },
  { id: "fieldHand", name: "田间工", icon: "🌱", effect: "犁地不消耗行动", flavor: "第 1 轮就可以把田犁满" },
  { id: "lumberjack", name: "伐木工", icon: "🪵", effect: "拿木材时多拿 1 木", flavor: "同名不同流派：单格夺 2 木" },
  { id: "forestCustodian", name: "守林人", icon: "🌲", effect: "拿木材/芦苇各 +1", flavor: "建材组合派" },
  { id: "beekeeper", name: "养蜂人", icon: "🐝", effect: "每轮收获额外 +1 食物", flavor: "稳扎稳打的食物线" },
  { id: "masterChef", name: "主厨", icon: "🍳", effect: "烹饪时不需壁炉/烹饪灶，谷/菜任意 1 食物", flavor: "跳过改良建筑直接换食物" },
  { id: "wainwright", name: "车匠", icon: "🛞", effect: "建房间 -1 芦苇", flavor: "节省建造成本" },
  { id: "wetNurse", name: "保姆", icon: "👶", effect: "添丁多生 1 人（需有空房）", flavor: "家人扩张流核心" },
];

// ---- 小发展卡：12 张，涵盖永久加成 / 一次性奖励 / 永久扣资源 ----
export const MINOR_IMPROVEMENTS: MinorImprovement[] = [
  { id: "mi.well", name: "井", icon: "🪣", effect: "一次性：立即 +1 食物", oneShot: true },
  { id: "mi.beehive", name: "蜂箱", icon: "🍯", effect: "永久：收获时额外 +1 食物" },
  { id: "mi.firewood", name: "柴堆", icon: "🪵", effect: "永久：每轮额外 +1 木" },
  { id: "mi.spinning", name: "纺车", icon: "🧶", effect: "永久：每轮额外 +1 芦苇" },
  { id: "mi.brick", name: "砖块", icon: "🧱", effect: "永久：每轮额外 +1 陶" },
  { id: "mi.stoneHeap", name: "石堆", icon: "⛏", effect: "永久：每轮额外 +1 石" },
  { id: "mi.market", name: "市集", icon: "🛒", effect: "一次性：立刻 +3 食物", oneShot: true },
  { id: "mi.sheepPen", name: "羊圈", icon: "🐏", effect: "永久：买羊 +1 只" },
  { id: "mi.boarPen", name: "猪圈", icon: "🐖", effect: "永久：买猪 +1 只" },
  { id: "mi.cowPen", name: "牛圈", icon: "🐄", effect: "永久：买牛 +1 只" },
  { id: "mi.bigBarn", name: "大谷仓", icon: "🏚", effect: "一次性：立即 +1 谷 +1 菜", oneShot: true },
  { id: "mi.cookHelper", name: "厨助", icon: "🥣", effect: "一次性：立刻 +2 食物", oneShot: true },
];

/** 抽 n 张不重复的卡（Fisher-Yates，引擎内使用） */
export function sample<T>(arr: T[], n: number, rng: () => number = Math.random): T[] {
  const a = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n && a.length > 0; i++) {
    const idx = Math.floor(rng() * a.length);
    out.push(a.splice(idx, 1)[0]);
  }
  return out;
}