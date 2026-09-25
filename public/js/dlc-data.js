// 与 src/game/dlc.ts 同步的客户端副本 —— 仅用于 DOM 渲染
// 真实逻辑（手牌洗牌、卡牌效果结算）在引擎侧

export const OCCUPATIONS = [
  { id: "woodcutter", name: "伐木工", icon: "🪓", effect: "每轮开始：额外获得 1 木" },
  { id: "clayworker", name: "制陶工", icon: "🏺", effect: "每轮开始：额外获得 1 陶" },
  { id: "reedcutter", name: "芦苇工", icon: "🎋", effect: "每轮开始：额外获得 1 芦苇" },
  { id: "stonemason", name: "石匠", icon: "⛏", effect: "每轮开始：额外获得 1 石" },
  { id: "fisher", name: "渔夫", icon: "🎣", effect: "钓鱼时拿全部 + 1 食物" },
  { id: "fieldWatchman", name: "守望者", icon: "🌾", effect: "撒种/烤面包行动后，撒种不消耗 1 次行动" },
  { id: "shepherd", name: "牧羊人", icon: "🐑", effect: "买羊行动后，额外 +1 只羊" },
  { id: "swineherd", name: "养猪人", icon: "🐗", effect: "买猪行动后，额外 +1 只猪" },
  { id: "cattleFarmer", name: "牧牛人", icon: "🐄", effect: "买牛行动后，额外 +1 只牛" },
  { id: "brewer", name: "酿酒师", icon: "🍺", effect: "每轮开始：拿 1 谷变 5 食物" },
  { id: "grainMerchant", name: "粮商", icon: "🌾", effect: "起手多拿 1 谷；每轮收 1 食物" },
  { id: "fieldHand", name: "田间工", icon: "🌱", effect: "犁地不消耗行动" },
  { id: "lumberjack", name: "伐木工", icon: "🪵", effect: "拿木材时多拿 1 木" },
  { id: "forestCustodian", name: "守林人", icon: "🌲", effect: "拿木材/芦苇各 +1" },
  { id: "beekeeper", name: "养蜂人", icon: "🐝", effect: "每轮收获额外 +1 食物" },
  { id: "masterChef", name: "主厨", icon: "🍳", effect: "烹饪时不需壁炉/烹饪灶，谷/菜任意 1 食物" },
  { id: "wainwright", name: "车匠", icon: "🛞", effect: "建房间 -1 芦苇" },
  { id: "wetNurse", name: "保姆", icon: "👶", effect: "添丁多生 1 人（需有空房）" },
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