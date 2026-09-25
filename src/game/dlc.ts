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

// ---- 职业：48 张完整卡池，覆盖「基础资源/农耕种植/牲畜畜牧/建造翻修/饮食烹饪/运营家庭/终局计分」----
export const OCCUPATIONS: Occupation[] = [
  // ---- 基础资源流派 ----
  { id: "woodcutter", name: "伐木工", icon: "🪓", effect: "每轮开始：额外获得 1 木", flavor: "开局就攒建材，适合冲房子" },
  { id: "clayworker", name: "泥瓦工", icon: "🏺", effect: "每轮开始：额外获得 1 陶", flavor: "抢陶屋用的狠角色" },
  { id: "reedcutter", name: "芦苇工", icon: "🎋", effect: "每轮开始：额外获得 1 芦苇", flavor: "建第 3 间房必备" },
  { id: "stonemason", name: "石匠", icon: "⛏", effect: "每轮开始：额外获得 1 石", flavor: "后期翻修派的最爱" },
  { id: "lumberjack", name: "柴夫", icon: "🪵", effect: "拿木材行动：额外多拿 1 木", flavor: "树林劳作的高手" },
  { id: "clayCarrier", name: "运泥工", icon: "🧱", effect: "拿陶土行动：额外多拿 1 陶", flavor: "陶土堆的搬运工" },
  { id: "quarryman", name: "采石工", icon: "⛰️", effect: "拿石头行动：额外多拿 1 石", flavor: "石场的重劳力" },
  { id: "forestCustodian", name: "护林员", icon: "🌲", effect: "拿木材行动：额外获得 1 芦苇", flavor: "林地伴生资源的收集者" },
  { id: "mushroomCollector", name: "蘑菇采摘人", icon: "🍄", effect: "拿木材行动：额外获得 1 食物", flavor: "林间寻觅美味野味" },

  // ---- 农耕种植流派 ----
  { id: "grainMerchant", name: "粮商", icon: "🌾", effect: "每轮开始：获得 1 谷物", flavor: "开局谷物派的开局神器" },
  { id: "seedMerchant", name: "种子商人", icon: "🌱", effect: "拿谷或拿菜行动：多得 1 份对应种子", flavor: "农耕播种的核心支柱" },
  { id: "plowman", name: "犁地手", icon: "🚜", effect: "犁地行动：额外免费多犁 1 块田", flavor: "高效开垦农田的专家" },
  { id: "sower", name: "播种者", icon: "🪴", effect: "撒种行动：可同时为 2 块田撒种", flavor: "春季大面积播种高手" },
  { id: "fieldWatchman", name: "守望者", icon: "👀", effect: "每轮开始：田地里有作物时 +1 食物", flavor: "守护丰收田野的哨兵" },
  { id: "ratcatcher", name: "捕鼠人", icon: "🪤", effect: "每次收获阶段：额外获得 1 谷物", flavor: "保护粮仓免受鼠患侵蚀" },

  // ---- 牲畜畜牧流派 ----
  { id: "shepherd", name: "牧羊人", icon: "🐑", effect: "买羊行动：额外获得 1 只羊", flavor: "羊群繁衍生息的照料者" },
  { id: "swineherd", name: "养猪人", icon: "🐗", effect: "买猪行动：额外获得 1 只猪", flavor: "猪舍扩建的得力帮手" },
  { id: "cattleFarmer", name: "牧牛人", icon: "🐄", effect: "买牛行动：额外获得 1 只牛", flavor: "牛群培育的核心支柱" },
  { id: "veterinarian", name: "兽医", icon: "🩺", effect: "繁殖阶段：若至少有 2 种动物，额外多繁衍 1 只", flavor: "精心呵护幼崽茁壮成长" },
  { id: "hedgeKeeper", name: "栅栏工", icon: "🪵", effect: "建栅栏行动：返还 2 木材", flavor: "巧妙布局围栏省料省力" },

  // ---- 建造与翻修流派 ----
  { id: "carpenter", name: "木匠", icon: "📐", effect: "建造木屋：每间房节省 1 木材", flavor: "农舍扩建的基石大师" },
  { id: "bricklayer", name: "砌砖工", icon: "🧱", effect: "翻修或建造陶屋：节省 1 陶土", flavor: "坚固屋舍的建造专家" },
  { id: "wainwright", name: "车匠", icon: "🛞", effect: "建造房间：省去 1 芦苇消耗", flavor: "车拉大料节省关键屋顶草" },
  { id: "renovator", name: "翻修工", icon: "🔨", effect: "翻修行动：省去全部芦苇消耗", flavor: "老旧农舍改造专家" },
  { id: "cooper", name: "箍桶匠", icon: "🛢️", effect: "建造大改进：减免 1 木材", flavor: "工坊改良的辅助巧匠" },
  { id: "blacksmith", name: "铁匠", icon: "⚒️", effect: "建造大改进：减免 1 石头", flavor: "精铁工具助力大建筑落地" },

  // ---- 饮食与烹饪流派 ----
  { id: "fisher", name: "渔夫", icon: "🎣", effect: "钓鱼行动：额外多得 1 食物", flavor: "河边满载而归的垂钓者" },
  { id: "hunter", name: "猎人", icon: "🏹", effect: "钓鱼或拿木材行动：额外捕获 1 食物", flavor: "林野与溪流间的神射手" },
  { id: "dayLaborer", name: "打工达人", icon: "🛠", effect: "打日工行动：额外多得 1 食物（共 3 食物）", flavor: "市集日薪翻倍的苦力能手" },
  { id: "baker", name: "面包师", icon: "🥖", effect: "每次烤面包：额外多得 1 食物", flavor: "炉火纯青的烘焙大师" },
  { id: "miller", name: "磨坊主", icon: "🏛️", effect: "烤面包行动：每份谷物多得 1 食物", flavor: "风车磨坊精细面粉加成" },
  { id: "brewer", name: "酿酒师", icon: "🍺", effect: "每轮开始：若有谷物自动用 1 谷换 4 食物", flavor: "大麦酿造高热量麦芽酒" },
  { id: "beekeeper", name: "养蜂人", icon: "🐝", effect: "每次收获阶段：蜂箱产出 2 食物", flavor: "甘甜蜂蜜是纯天然的口粮" },
  { id: "slaughterer", name: "屠夫", icon: "🔪", effect: "烹饪牲畜时：每只牲畜额外换 1 食物", flavor: "精湛刀工将肉类价值榨取到极致" },
  { id: "tanner", name: "制皮匠", icon: "👞", effect: "烹饪牛或猪时：额外获得 2 食物", flavor: "鞣制毛皮换取充足口粮" },
  { id: "herbalist", name: "草药师", icon: "🌿", effect: "烹饪蔬菜时：每份蔬菜额外产出 1 食物", flavor: "秘制草药浓汤营养翻倍" },
  { id: "masterChef", name: "主厨", icon: "🍳", effect: "烹饪时不需壁炉/烹饪灶，任意 1 谷/菜换 2 食物", flavor: "普通农舍土灶也能烧出珍馐" },
  { id: "basketmaker", name: "编筐工", icon: "🧺", effect: "每轮开始：若有芦苇自动用 1 芦苇换 3 食物", flavor: "编织精美竹筐在集市大受欢迎" },
  { id: "charcoalBurner", name: "炭烧工", icon: "🔥", effect: "拿木材行动：额外产出 1 燃料/食物", flavor: "闷烧木炭提供热量与温饱" },

  // ---- 运营与家庭流派 ----
  { id: "wetNurse", name: "保姆", icon: "👶", effect: "添丁行动：婴儿当轮不产生喂食负担", flavor: "照料新生婴儿无微不至" },
  { id: "innkeeper", name: "旅店老板", icon: "🏮", effect: "每轮开始：旅店客人贡献 1 食物", flavor: "路过旅人留下的热腾腾餐费" },
  { id: "seasonalWorker", name: "季节工", icon: "🍂", effect: "每个阶段第 1 轮：额外获得 1 谷 + 1 食物", flavor: "随季节迁徙的勤劳打工人" },
  { id: "storehouseClerk", name: "仓库管理员", icon: "📦", effect: "每轮开始：若食物为 0，保底补贴 1 食物", flavor: "精细盘点粮仓防断粮" },
  { id: "fieldHand", name: "田间工", icon: "🌱", effect: "每轮开始：额外获得 1 谷物", flavor: "田埂间忙碌的劳作好手" },

  // ---- 终局计分与声望流派 ----
  { id: "tutor", name: "学者导师", icon: "📜", effect: "终局计分：拥有 ≥3 项改进卡额外 +3 分", flavor: "教书育人积累崇高威望" },
  { id: "villageElder", name: "村长", icon: "👴", effect: "终局计分：若全场无任何乞讨卡额外 +3 分", flavor: "治理有方让全家丰衣足食" },
  { id: "architect", name: "建筑师", icon: "🏛️", effect: "终局计分：每间陶屋或石屋额外 +1 分", flavor: "宏伟建筑为庄园增光添彩" },
  { id: "estateAgent", name: "庄园领主", icon: "🏰", effect: "终局计分：拥有 5 名家人额外 +3 分", flavor: "人丁兴旺的庞大封建庄园" },
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