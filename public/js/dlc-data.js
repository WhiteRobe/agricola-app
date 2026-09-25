// 与 src/game/dlc.ts 同步的客户端副本 —— 仅用于 DOM 渲染
// 真实逻辑（手牌洗牌、卡牌效果结算）在引擎侧

export const OCCUPATIONS = [
  // ---- 基础资源流派 ----
  { id: "woodcutter", name: "伐木工", icon: "🪓", effect: "每轮开始：额外获得 1 木" },
  { id: "clayworker", name: "泥瓦工", icon: "🏺", effect: "每轮开始：额外获得 1 陶" },
  { id: "reedcutter", name: "芦苇工", icon: "🎋", effect: "每轮开始：额外获得 1 芦苇" },
  { id: "stonemason", name: "石匠", icon: "⛏", effect: "每轮开始：额外获得 1 石" },
  { id: "lumberjack", name: "柴夫", icon: "🪵", effect: "拿木材行动：额外多拿 1 木" },
  { id: "clayCarrier", name: "运泥工", icon: "🧱", effect: "拿陶土行动：额外多拿 1 陶" },
  { id: "quarryman", name: "采石工", icon: "⛰️", effect: "拿石头行动：额外多拿 1 石" },
  { id: "forestCustodian", name: "护林员", icon: "🌲", effect: "拿木材行动：额外获得 1 芦苇" },
  { id: "mushroomCollector", name: "蘑菇采摘人", icon: "🍄", effect: "拿木材行动：额外获得 1 食物" },

  // ---- 农耕种植流派 ----
  { id: "grainMerchant", name: "粮商", icon: "🌾", effect: "每轮开始：获得 1 谷物" },
  { id: "seedMerchant", name: "种子商人", icon: "🌱", effect: "拿谷或拿菜行动：多得 1 份对应种子" },
  { id: "plowman", name: "犁地手", icon: "🚜", effect: "犁地行动：额外免费多犁 1 块田" },
  { id: "sower", name: "播种者", icon: "🪴", effect: "撒种行动：可同时为 2 块田撒种" },
  { id: "fieldWatchman", name: "守望者", icon: "👀", effect: "每轮开始：田地里有作物时 +1 食物" },
  { id: "ratcatcher", name: "捕鼠人", icon: "🪤", effect: "每次收获阶段：额外获得 1 谷物" },

  // ---- 牲畜畜牧流派 ----
  { id: "shepherd", name: "牧羊人", icon: "🐑", effect: "买羊行动：额外获得 1 只羊" },
  { id: "swineherd", name: "养猪人", icon: "🐗", effect: "买猪行动：额外获得 1 只猪" },
  { id: "cattleFarmer", name: "牧牛人", icon: "🐄", effect: "买牛行动：额外获得 1 只牛" },
  { id: "veterinarian", name: "兽医", icon: "🩺", effect: "繁殖阶段：若至少有 2 种动物，额外多繁衍 1 只" },
  { id: "hedgeKeeper", name: "栅栏工", icon: "🪵", effect: "建栅栏行动：返还 2 木材" },

  // ---- 建造与翻修流派 ----
  { id: "carpenter", name: "木匠", icon: "📐", effect: "建造木屋：每间房节省 1 木材" },
  { id: "bricklayer", name: "砌砖工", icon: "🧱", effect: "翻修或建造陶屋：节省 1 陶土" },
  { id: "wainwright", name: "车匠", icon: "🛞", effect: "建造房间：省去 1 芦苇消耗" },
  { id: "renovator", name: "翻修工", icon: "🔨", effect: "翻修行动：省去全部芦苇消耗" },
  { id: "cooper", name: "箍桶匠", icon: "🛢️", effect: "建造大改进：减免 1 木材" },
  { id: "blacksmith", name: "铁匠", icon: "⚒️", effect: "建造大改进：减免 1 石头" },

  // ---- 饮食与烹饪流派 ----
  { id: "fisher", name: "渔夫", icon: "🎣", effect: "钓鱼行动：额外多得 1 食物" },
  { id: "hunter", name: "猎人", icon: "🏹", effect: "钓鱼或拿木材行动：额外捕获 1 食物" },
  { id: "dayLaborer", name: "打工达人", icon: "🛠", effect: "打日工行动：额外多得 1 食物（共 3 食物）" },
  { id: "baker", name: "面包师", icon: "🥖", effect: "每次烤面包：额外多得 1 食物" },
  { id: "miller", name: "磨坊主", icon: "🏛️", effect: "烤面包行动：每份谷物多得 1 食物" },
  { id: "brewer", name: "酿酒师", icon: "🍺", effect: "每轮开始：若有谷物自动用 1 谷换 4 食物" },
  { id: "beekeeper", name: "养蜂人", icon: "🐝", effect: "每次收获阶段：蜂箱产出 2 食物" },
  { id: "slaughterer", name: "屠夫", icon: "🔪", effect: "烹饪牲畜时：每只牲畜额外换 1 食物" },
  { id: "tanner", name: "制皮匠", icon: "👞", effect: "烹饪牛或猪时：额外获得 2 食物" },
  { id: "herbalist", name: "草药师", icon: "🌿", effect: "烹饪蔬菜时：每份蔬菜额外产出 1 食物" },
  { id: "masterChef", name: "主厨", icon: "🍳", effect: "烹饪时不需壁炉/烹饪灶，任意 1 谷/菜换 2 食物" },
  { id: "basketmaker", name: "编筐工", icon: "🧺", effect: "每轮开始：若有芦苇自动用 1 芦苇换 3 食物" },
  { id: "charcoalBurner", name: "炭烧工", icon: "🔥", effect: "拿木材行动：额外产出 1 燃料/食物" },

  // ---- 运营与家庭流派 ----
  { id: "wetNurse", name: "保姆", icon: "👶", effect: "添丁行动：婴儿当轮不产生喂食负担" },
  { id: "innkeeper", name: "旅店老板", icon: "🏮", effect: "每轮开始：旅店客人贡献 1 食物" },
  { id: "seasonalWorker", name: "季节工", icon: "🍂", effect: "每个阶段第 1 轮：额外获得 1 谷 + 1 食物" },
  { id: "storehouseClerk", name: "仓库管理员", icon: "📦", effect: "每轮开始：若食物为 0，保底补贴 1 食物" },
  { id: "fieldHand", name: "田间工", icon: "🌱", effect: "每轮开始：额外获得 1 谷物" },

  // ---- 终局计分与声望流派 ----
  { id: "tutor", name: "学者导师", icon: "📜", effect: "终局计分：拥有 ≥3 项改进卡额外 +3 分" },
  { id: "villageElder", name: "村长", icon: "👴", effect: "终局计分：若全场无任何乞讨卡额外 +3 分" },
  { id: "architect", name: "建筑师", icon: "🏛️", effect: "终局计分：每间陶屋或石屋额外 +1 分" },
  { id: "estateAgent", name: "庄园领主", icon: "🏰", effect: "终局计分：拥有 5 名家人额外 +3 分" },
];

export const MINOR_IMPROVEMENTS = [
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

// TODO: 与 src/game/dlc.ts 同步（手工复制）