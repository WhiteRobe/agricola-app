// ============================================================
// DLC 数据：职业（Occupations）+ 小发展卡（Minor Improvements）
// 受 Agricola 玩法启发的自定义卡牌数据
//   - 修订版 + 家庭变体兼容（不依赖职业/小发展卡的规则照样能玩）
//   - 每张卡 1 个核心效果，UI 把效果文本化
// 实现目标：精简子集（先 18 张职业 + 12 张小发展卡）覆盖主流流派，
//   后续可按数据驱动的形式扩充更多卡
// ============================================================

export type DlcKey = "occupations" | "minorImprovements" | "moor" | "seasons";

export interface DlcConfig {
  occupations: boolean;
  minorImprovements: boolean;
  /** Farmers of the Moor：私人森林/沼泽、特殊行动卡、燃料取暖、马匹。 */
  moor: boolean;
  /** 旧房间的沼泽规则兼容字段；新房间固定使用完整规则。 */
  moorLevel?: 1 | 2 | 3;
  /** Through the Seasons：节气轮转（每轮一季 + 季节行动格 + 季节特殊规则） */
  seasons: boolean;
}

export const DEFAULT_DLC: DlcConfig = { occupations: false, minorImprovements: false, moor: false, seasons: false };

/** 单张职业卡：玩家起始时从手牌（7 张里）选 1 张获得，从此生效 */
export interface Occupation {
  id: string;
  name: string;
  icon: string;
  effect: string;
  category?: "resource" | "farming" | "livestock" | "building" | "cooking" | "family" | "scoring";
  categoryZh?: string;
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

/** 单张小发展卡 */
export interface MinorImprovement {
  id: string;
  name: string;
  icon: string;
  effect: string;
  /** 建造费用 */
  cost?: Partial<Record<"wood" | "clay" | "reed" | "stone" | "grain" | "vegetable" | "food" | "fuel", number>>;
  /** 卡面分数。基础自定义小发展卡默认为 0。 */
  vp?: number;
  /** 沼泽扩展卡印制的前置条件原文。 */
  prereqText?: string;
  /** 特殊费用原文；升级卡可能要求归还已有发展卡。 */
  costText?: string;
  passed?: boolean;
  /** 前置门槛要求 */
  prereq?: {
    minOccupations?: number;
    minRooms?: number;
    minFields?: number;
    minPastures?: number;
  };
  /** 一次性触发（用掉即弃）。true 表示只能使用一次后清出；false 表示永久加成 */
  oneShot?: boolean;
}

// ---- 职业：88 张自定义卡池，覆盖「基础资源/农耕种植/牲畜畜牧/建造翻修/饮食烹饪/家庭运营/终局声望」----
export const OCCUPATIONS: Occupation[] = [
  // ==========================================
  // 1. 基础资源流派（15 张）
  // ==========================================
  { id: "woodcutter", name: "伐木工", icon: "🪓", category: "resource", categoryZh: "基础资源", effect: "每轮开始：额外获得 1 木材", flavor: "开局就攒建材，适合扩建农舍" },
  { id: "clayworker", name: "泥瓦工", icon: "🏺", category: "resource", categoryZh: "基础资源", effect: "每轮开始：额外获得 1 陶土", flavor: "抢建陶屋用的关键角色" },
  { id: "reedcutter", name: "芦苇工", icon: "🎋", category: "resource", categoryZh: "基础资源", effect: "每轮开始：额外获得 1 芦苇", flavor: "建第 3 间房必备" },
  { id: "stonemason", name: "石匠", icon: "⛏", category: "resource", categoryZh: "基础资源", effect: "每轮开始：额外获得 1 石材", flavor: "后期石屋翻修派的最爱" },
  { id: "lumberjack", name: "柴夫", icon: "🪵", category: "resource", categoryZh: "基础资源", effect: "拿木材行动：额外多拿 1 木材", flavor: "树林劳作的高手" },
  { id: "clayCarrier", name: "运泥工", icon: "🧱", category: "resource", categoryZh: "基础资源", effect: "拿陶土行动：额外多拿 1 陶土", flavor: "陶土堆的搬运工" },
  { id: "quarryman", name: "采石工", icon: "⛰️", category: "resource", categoryZh: "基础资源", effect: "拿石材行动：额外多拿 1 石材", flavor: "采石场的重劳力" },
  { id: "forestCustodian", name: "护林员", icon: "🌲", category: "resource", categoryZh: "基础资源", effect: "拿木材行动：额外获得 1 芦苇", flavor: "林地伴生资源的收集者" },
  { id: "mushroomCollector", name: "蘑菇采摘人", icon: "🍄", category: "resource", categoryZh: "基础资源", effect: "拿木材行动：额外获得 1 食物", flavor: "林间寻觅美味野味" },
  { id: "miner", name: "矿工", icon: "⛏️", category: "resource", categoryZh: "基础资源", effect: "拿陶土或拿石材行动：额外多拿 1 份对应资源", flavor: "深入坑道采掘矿脉的熟练工" },
  { id: "woodMerchant", name: "木柴商", icon: "🪵", category: "resource", categoryZh: "基础资源", effect: "每轮开始：若木材为 0，保底补贴 1 木材", flavor: "林木荒芜时的应急建材来源" },
  { id: "reedCollector", name: "割苇人", icon: "🌿", category: "resource", categoryZh: "基础资源", effect: "拿芦苇行动：额外多拿 1 芦苇", flavor: "深谙沼泽水岸芦苇生长的巧匠" },
  { id: "gravelCarrier", name: "砾石搬运工", icon: "🪨", category: "resource", categoryZh: "基础资源", effect: "拿陶土行动：顺带捡拾获得 1 石材", flavor: "泥土与沙砾混杂中的意外收获" },
  { id: "silviculturist", name: "林农", icon: "🌲", category: "resource", categoryZh: "基础资源", effect: "拿木材行动：若取走 ≥3 木材额外获得 1 食物", flavor: "科学伐木并在林下采集浆果" },
  { id: "peatCutter", name: "泥炭割工", icon: "🧱", category: "resource", categoryZh: "基础资源", effect: "拿陶土行动：额外获得 1 食物（沼泽农夫扩展下获 1 燃料）", flavor: "深层湿地割取可燃黑泥炭" },

  // ==========================================
  // 2. 农耕种植流派（13 张）
  // ==========================================
  { id: "grainMerchant", name: "粮商", icon: "🌾", category: "farming", categoryZh: "农耕种植", effect: "每轮开始：获得 1 谷物", flavor: "开局谷物派的开局神器" },
  { id: "seedMerchant", name: "种子商人", icon: "🌱", category: "farming", categoryZh: "农耕种植", effect: "拿谷物或拿蔬菜行动：多得 1 份对应种子", flavor: "农耕播种的核心支柱" },
  { id: "plowman", name: "犁地手", icon: "🚜", category: "farming", categoryZh: "农耕种植", effect: "犁地行动：额外免费多犁 1 块田", flavor: "高效开垦农田的专家" },
  { id: "sower", name: "播种者", icon: "🪴", category: "farming", categoryZh: "农耕种植", effect: "播种行动：可同时为 2 块农田播种", flavor: "春季大面积播种高手" },
  { id: "fieldWatchman", name: "守望者", icon: "👀", category: "farming", categoryZh: "农耕种植", effect: "每轮开始：田地里有作物时 +1 食物", flavor: "守护丰收田野的哨兵" },
  { id: "ratcatcher", name: "捕鼠人", icon: "🪤", category: "farming", categoryZh: "农耕种植", effect: "每次收获阶段：额外获得 1 谷物", flavor: "保护粮仓免受鼠患侵蚀" },
  { id: "gardener", name: "园丁", icon: "🥕", category: "farming", categoryZh: "农耕种植", effect: "收获阶段开始：额外直接获得 1 蔬菜", flavor: "房前屋后的精细菜园常年丰硕" },
  { id: "smallholder", name: "小农", icon: "🏡", category: "farming", categoryZh: "农耕种植", effect: "收获阶段开始：若拥有 ≤2 块田，额外获得 1 谷物", flavor: "精耕细作的小地块单产惊人" },
  { id: "cornShepherd", name: "麦田看守", icon: "🌾", category: "farming", categoryZh: "农耕种植", effect: "播种行动：播种后立即获得 1 食物", flavor: "巡视新播种麦苗收取护粮酬劳" },
  { id: "plowwright", name: "犁匠", icon: "🚜", category: "farming", categoryZh: "农耕种植", effect: "犁地行动：额外获得 1 木材", flavor: "翻新木犁顺带刨取优质坚木" },
  { id: "reaper", name: "镰刀割手", icon: "🌾", category: "farming", categoryZh: "农耕种植", effect: "收获阶段：若至少收割 2 块田额外多得 1 谷物", flavor: "锋利长镰在金色麦浪间飞速收割" },
  { id: "greengrocer", name: "菜贩", icon: "🥬", category: "farming", categoryZh: "农耕种植", effect: "每轮开始：若库存有蔬菜产出 1 食物", flavor: "挑着新鲜时蔬在村口早市热卖" },
  { id: "grainInspector", name: "谷物检验员", icon: "🔍", category: "farming", categoryZh: "农耕种植", effect: "拿谷物行动：额外多拿 1 谷物", flavor: "辨识良种筛选最饱满的麦粒" },

  // ==========================================
  // 3. 牲畜畜牧流派（11 张）
  // ==========================================
  { id: "shepherd", name: "牧羊人", icon: "🐑", category: "livestock", categoryZh: "牲畜畜牧", effect: "羊市行动：额外获得 1 只绵羊", flavor: "羊群繁衍生息的照料者" },
  { id: "swineherd", name: "养猪人", icon: "🐗", category: "livestock", categoryZh: "牲畜畜牧", effect: "猪市行动：额外获得 1 只野猪", flavor: "猪舍扩建的得力帮手" },
  { id: "cattleFarmer", name: "牧牛人", icon: "🐄", category: "livestock", categoryZh: "牲畜畜牧", effect: "牛市行动：额外获得 1 只黄牛", flavor: "牛群培育的核心支柱" },
  { id: "veterinarian", name: "兽医", icon: "🩺", category: "livestock", categoryZh: "牲畜畜牧", effect: "繁殖阶段：若至少有 2 种动物多繁衍 1 只", flavor: "精心呵护幼崽茁壮成长" },
  { id: "hedgeKeeper", name: "栅栏工", icon: "🪵", category: "livestock", categoryZh: "牲畜畜牧", effect: "建栅栏行动：返还 2 木材", flavor: "巧妙布局围栏省料省力" },
  { id: "milker", name: "挤奶工", icon: "🥛", category: "livestock", categoryZh: "牲畜畜牧", effect: "繁殖阶段：拥有黄牛或绵羊时额外产出 1 食物", flavor: "温热鲜奶是清晨的营养之源" },
  { id: "livestockBroker", name: "牲畜经纪人", icon: "🤝", category: "livestock", categoryZh: "牲畜畜牧", effect: "动物市场行动：每次额外获得 1 食物", flavor: "在集市促成牲畜交易收取口粮" },
  { id: "woolWeaver", name: "羊毛织工", icon: "🧶", category: "livestock", categoryZh: "牲畜畜牧", effect: "繁殖阶段：每繁殖 1 只绵羊额外产出 1 食物", flavor: "剪取初生羊毛织造温暖披风" },
  { id: "stableArchitect", name: "圈舍建造师", icon: "🛖", category: "livestock", categoryZh: "牲畜畜牧", effect: "建圈舍行动：建造圈舍时返还 1 木材", flavor: "榫卯搭建通风干燥的专业圈舍" },
  { id: "pastureManager", name: "牧场领班", icon: "⛳", category: "livestock", categoryZh: "牲畜畜牧", effect: "每轮开始：拥有 ≥2 个封闭牧场产出 1 食物", flavor: "轮换放牧让牧草四季常青" },
  { id: "animalBreeder", name: "动物育种师", icon: "🐣", category: "livestock", categoryZh: "牲畜畜牧", effect: "动物市场行动：若该动物买入后正好成对多得 1 谷物", flavor: "为牲畜挑选绝佳配对以备繁殖" },

  // ==========================================
  // 4. 建造与翻修流派（12 张）
  // ==========================================
  { id: "carpenter", name: "木匠", icon: "📐", category: "building", categoryZh: "建造翻修", effect: "建造木屋：每间房节省 1 木材", flavor: "农舍扩建的基石大师" },
  { id: "bricklayer", name: "砌砖工", icon: "🧱", category: "building", categoryZh: "建造翻修", effect: "翻修或建造陶屋：节省 1 陶土", flavor: "坚固屋舍的建造专家" },
  { id: "wainwright", name: "车匠", icon: "🛞", category: "building", categoryZh: "建造翻修", effect: "建造房间：省去 1 芦苇消耗", flavor: "车拉大料节省关键屋顶草" },
  { id: "renovator", name: "翻修工", icon: "🔨", category: "building", categoryZh: "建造翻修", effect: "翻修行动：省去全部芦苇消耗", flavor: "老旧农舍改造专家" },
  { id: "cooper", name: "箍桶匠", icon: "🛢️", category: "building", categoryZh: "建造翻修", effect: "建造大改进：减免 1 木材", flavor: "工坊改良的辅助巧匠" },
  { id: "blacksmith", name: "铁匠", icon: "⚒️", category: "building", categoryZh: "建造翻修", effect: "建造大改进：减免 1 石材", flavor: "精铁工具助力大建筑落地" },
  { id: "thatcher", name: "盖顶工", icon: "🛖", category: "building", categoryZh: "建造翻修", effect: "建造房间或翻修：减免 1 芦苇消耗", flavor: "用麦秸干草替代昂贵芦苇铺顶" },
  { id: "plasterer", name: "抹灰工", icon: "🖌️", category: "building", categoryZh: "建造翻修", effect: "翻修行动：翻修完成后立即获得 1 食物", flavor: "抹平白灰勾缝让农舍焕然一新" },
  { id: "masterMason", name: "石工大师", icon: "🏰", category: "building", categoryZh: "建造翻修", effect: "翻修石屋行动：减免 1 石材消耗", flavor: "切割石梁建造世代流传的石屋" },
  { id: "masterBuilder", name: "建筑工长", icon: "🏗️", category: "building", categoryZh: "建造翻修", effect: "建造房间行动：完成后额外获得 1 木材", flavor: "统筹工地回收余料化为整木" },
  { id: "surveyor", name: "宅地测量员", icon: "📐", category: "building", categoryZh: "建造翻修", effect: "建造房间行动：房间数达 ≥3 间立即奖励 2 食物", flavor: "科学规划庄园宅基宴请宾客" },
  { id: "kilnMaster", name: "窑炉大师", icon: "🔥", category: "building", categoryZh: "建造翻修", effect: "建造大改进：减免 1 陶土消耗", flavor: "熟练掌握烧窑火候减少黏土损耗" },

  // ==========================================
  // 5. 饮食与烹饪流派（19 张）
  // ==========================================
  { id: "fisher", name: "渔夫", icon: "🎣", category: "cooking", categoryZh: "饮食烹饪", effect: "钓鱼行动：额外多得 1 食物", flavor: "河边满载而归的垂钓者" },
  { id: "hunter", name: "猎人", icon: "🏹", category: "cooking", categoryZh: "饮食烹饪", effect: "钓鱼或拿木材行动：额外捕获 1 食物", flavor: "林野与溪流间的神射手" },
  { id: "dayLaborer", name: "打工达人", icon: "🛠", category: "cooking", categoryZh: "饮食烹饪", effect: "打日工行动：额外多得 1 食物（共 3 食物）", flavor: "市集日薪翻倍的苦力能手" },
  { id: "baker", name: "面包师", icon: "🥖", category: "cooking", categoryZh: "饮食烹饪", effect: "每次烤面包：额外多得 1 食物", flavor: "炉火纯青的烘焙大师" },
  { id: "miller", name: "磨坊主", icon: "🏛️", category: "cooking", categoryZh: "饮食烹饪", effect: "烤面包行动：每份谷物多得 1 食物", flavor: "风车磨坊精细面粉加成" },
  { id: "brewer", name: "酿酒师", icon: "🍺", category: "cooking", categoryZh: "饮食烹饪", effect: "每轮开始：若有谷物自动用 1 谷物换 4 食物", flavor: "大麦酿造高热量麦芽酒" },
  { id: "beekeeper", name: "养蜂人", icon: "🐝", category: "cooking", categoryZh: "饮食烹饪", effect: "每次收获阶段：蜂箱产出 2 食物", flavor: "甘甜蜂蜜是纯天然的口粮" },
  { id: "slaughterer", name: "屠夫", icon: "🔪", category: "cooking", categoryZh: "饮食烹饪", effect: "烹饪牲畜时：每只牲畜额外换 1 食物", flavor: "精湛刀工将肉类价值榨取到极致" },
  { id: "tanner", name: "制皮匠", icon: "👞", category: "cooking", categoryZh: "饮食烹饪", effect: "烹饪黄牛或野猪时：额外获得 2 食物", flavor: "鞣制毛皮换取充足口粮" },
  { id: "herbalist", name: "草药师", icon: "🌿", category: "cooking", categoryZh: "饮食烹饪", effect: "烹饪蔬菜时：每份蔬菜额外产出 1 食物", flavor: "秘制草药浓汤营养翻倍" },
  { id: "masterChef", name: "主厨", icon: "🍳", category: "cooking", categoryZh: "饮食烹饪", effect: "烹饪时不需壁炉/烹饪灶，任意 1 谷物或蔬菜换 2 食物", flavor: "普通农舍土灶也能烧出珍馐" },
  { id: "basketmaker", name: "编筐工", icon: "🧺", category: "cooking", categoryZh: "饮食烹饪", effect: "每轮开始：若有芦苇自动用 1 芦苇换 3 食物", flavor: "编织精美竹筐在集市大受欢迎" },
  { id: "charcoalBurner", name: "炭烧工", icon: "🔥", category: "cooking", categoryZh: "饮食烹饪", effect: "拿木材行动：额外产出 1 燃料/食物", flavor: "闷烧木炭提供热量与温饱" },
  { id: "cook", name: "厨娘", icon: "🍲", category: "cooking", categoryZh: "饮食烹饪", effect: "收获喂养阶段：全家总食物消耗保底减少 1 食物", flavor: "慢火煨炖，喂饱每一位家庭成员" },
  { id: "smokehouseMaster", name: "熏肉师傅", icon: "🥓", category: "cooking", categoryZh: "饮食烹饪", effect: "烹饪牲畜时：每次烹饪额外多产 2 食物", flavor: "松木冷熏，肉香扑鼻利于长久保存" },
  { id: "townCrier", name: "市集叫卖人", icon: "📢", category: "cooking", categoryZh: "饮食烹饪", effect: "拿起始玩家行动：额外获得 1 谷物", flavor: "在集市中心大声宣讲招徕农人" },
  { id: "trapper", name: "野味设阱师", icon: "🪤", category: "cooking", categoryZh: "饮食烹饪", effect: "拿木材行动：顺带捕获野禽额外 +1 食物", flavor: "林间隐蔽的小套索带来意外口粮" },
  { id: "fishBuyer", name: "鱼贩", icon: "🐟", category: "cooking", categoryZh: "饮食烹饪", effect: "钓鱼行动：额外多得 1 食物", flavor: "常年在小码头收购鲜鱼的大户" },
  { id: "breadBakerApprentice", name: "面包学徒", icon: "🥐", category: "cooking", categoryZh: "饮食烹饪", effect: "烤面包行动：额外多产 1 食物", flavor: "勤勉揉面发酵烤出松软面包" },

  // ==========================================
  // 6. 运营与家庭流派（10 张）
  // ==========================================
  { id: "wetNurse", name: "保姆", icon: "👶", category: "family", categoryZh: "家庭运营", effect: "添丁行动：婴儿当轮不产生喂食负担", flavor: "照料新生婴儿无微不至" },
  { id: "innkeeper", name: "旅店老板", icon: "🏮", category: "family", categoryZh: "家庭运营", effect: "每轮开始：旅店客人贡献 1 食物", flavor: "路过旅人留下的热腾腾餐费" },
  { id: "seasonalWorker", name: "季节工", icon: "🍂", category: "family", categoryZh: "家庭运营", effect: "每个阶段第 1 轮：额外获得 1 谷物 + 1 食物", flavor: "随季节迁徙的勤劳打工人" },
  { id: "storehouseClerk", name: "仓库管理员", icon: "📦", category: "family", categoryZh: "家庭运营", effect: "每轮开始：若食物为 0，保底补贴 1 食物", flavor: "精细盘点粮仓防断粮" },
  { id: "fieldHand", name: "田间工", icon: "🌱", category: "family", categoryZh: "家庭运营", effect: "每轮开始：额外获得 1 谷物", flavor: "田埂间忙碌的劳作好手" },
  { id: "midwife", name: "助产士", icon: "👶", category: "family", categoryZh: "家庭运营", effect: "添丁行动：添丁完成后立即获得 2 食物", flavor: "邻里亲友送来喜庆滋补礼品" },
  { id: "governess", name: "家庭教师", icon: "📖", category: "family", categoryZh: "家庭运营", effect: "添丁行动：婴儿当轮立即额外获得 1 谷物", flavor: "启蒙幼童相伴书香与成长" },
  { id: "villageClerk", name: "村书记", icon: "🖋️", category: "family", categoryZh: "家庭运营", effect: "拿起始玩家行动：额外获得 1 芦苇", flavor: "记录村政公文分发集资笔卷" },
  { id: "oddJobMan", name: "杂务工", icon: "🧹", category: "family", categoryZh: "家庭运营", effect: "打日工行动：额外多拿 1 木材（日工共 +2 食物 +1 木材）", flavor: "修修补补杂活包揽在身的勤快人" },
  { id: "laborBroker", name: "劳工经纪", icon: "💼", category: "family", categoryZh: "家庭运营", effect: "打日工行动：额外多拿 1 陶土（日工共 +2 食物 +1 陶土）", flavor: "组织劳工队为工坊提供精壮人手" },

  // ==========================================
  // 7. 终局计分与声望流派（8 张）
  // ==========================================
  { id: "tutor", name: "学者导师", icon: "📜", category: "scoring", categoryZh: "终局声望", effect: "终局计分：拥有 ≥3 项改进卡额外 +3 分", flavor: "教书育人积累崇高威望" },
  { id: "villageElder", name: "村长", icon: "👴", category: "scoring", categoryZh: "终局声望", effect: "终局计分：若全场无任何乞讨卡额外 +3 分", flavor: "治理有方让全家丰衣足食" },
  { id: "architect", name: "建筑师", icon: "🏛️", category: "scoring", categoryZh: "终局声望", effect: "终局计分：每间陶屋或石屋额外 +1 分", flavor: "宏伟建筑为庄园增光添彩" },
  { id: "estateAgent", name: "庄园领主", icon: "🏰", category: "scoring", categoryZh: "终局声望", effect: "终局计分：拥有 5 名家人额外 +3 分", flavor: "人丁兴旺的庞大封建庄园" },
  { id: "agronomist", name: "农艺学者", icon: "🌱", category: "scoring", categoryZh: "终局声望", effect: "终局计分：耕地数量 ≥4 块时额外 +3 分", flavor: "规模化科学轮作树立全乡典范" },
  { id: "pastureCount", name: "牧场伯爵", icon: "🏰", category: "scoring", categoryZh: "终局声望", effect: "终局计分：封闭牧场数量 ≥3 处额外 +3 分", flavor: "连绵牧场彰显贵族领地底蕴" },
  { id: "masterBreeder", name: "育种大师", icon: "🏆", category: "scoring", categoryZh: "终局声望", effect: "终局计分：绵羊/野猪/黄牛三畜齐全额外 +4 分", flavor: "三畜兴旺享誉四方的育种世家" },
  { id: "philanthropist", name: "慈善家", icon: "💖", category: "scoring", categoryZh: "终局声望", effect: "终局计分：食物储备 ≥5 且无乞讨额外 +3 分", flavor: "富足康宁慷慨济贫的大善之家" },
];

// ---- 小发展卡：至少 29 张，供四人各发 7 张并保留公共卡 ----
export const MINOR_IMPROVEMENTS: MinorImprovement[] = [
  { id: "mi.well", name: "微型井", icon: "🪣", effect: "打出时立即获得 1 食物。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.beehive", name: "蜂箱", icon: "🍯", effect: "每次收获时，额外获得 1 食物。", cost: { wood: 1, reed: 1 } },
  { id: "mi.firewood", name: "柴堆", icon: "🪵", effect: "每轮开始时，额外获得 1 木材。", cost: { clay: 1 } },
  { id: "mi.spinning", name: "纺车", icon: "🧶", effect: "每轮开始时，额外获得 1 芦苇。", cost: { wood: 1 } },
  { id: "mi.brick", name: "砖块堆", icon: "🧱", effect: "每轮开始时，额外获得 1 陶土。", cost: { wood: 1 } },
  { id: "mi.stoneHeap", name: "石堆", icon: "⛏", effect: "每轮开始时，额外获得 1 石材。", cost: { wood: 1 } },
  { id: "mi.market", name: "市集货摊", icon: "🛒", effect: "打出时立即获得 3 食物。", cost: { grain: 1 }, oneShot: true },
  { id: "mi.sheepPen", name: "羊圈", icon: "🐏", effect: "每次使用羊市行动时，额外获得 1 只绵羊。", cost: { wood: 1 } },
  { id: "mi.boarPen", name: "猪圈", icon: "🐖", effect: "每次使用猪市行动时，额外获得 1 只野猪。", cost: { wood: 1 } },
  { id: "mi.cowPen", name: "牛圈", icon: "🐄", effect: "每次使用牛市行动时，额外获得 1 只黄牛。", cost: { wood: 1 } },
  { id: "mi.bigBarn", name: "大谷仓", icon: "🏚", effect: "打出时立即获得 1 谷物和 1 蔬菜。", cost: { wood: 2 }, oneShot: true },
  { id: "mi.cookHelper", name: "简易炊具", icon: "🥣", effect: "打出时立即获得 2 食物。", cost: { clay: 1 }, oneShot: true },
  { id: "mi.clayHut", name: "陶土工具棚", icon: "🛖", effect: "打出时立即获得 2 陶土。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.woodCart", name: "运木手推车", icon: "🛒", effect: "打出时立即获得 2 木材。", cost: { reed: 1 }, oneShot: true },
  { id: "mi.reedPond", name: "芦苇池", icon: "🎋", effect: "打出时立即获得 2 芦苇。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.cornStore", name: "小粮仓", icon: "🌾", effect: "打出时立即获得 2 谷物。", cost: { wood: 1, reed: 1 }, oneShot: true },
  { id: "mi.vegGarden", name: "菜园苗床", icon: "🥕", effect: "打出时立即获得 1 蔬菜。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.drinkingTrough", name: "饮水槽", icon: "🪵", effect: "打出时立即获得 2 食物，并额外安置 1 只牲畜。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.woodenHutExtension", name: "木棚披屋", icon: "🏠", effect: "打出时增加 1 间木屋空间；它不参与空房或翻修的计算。", cost: { wood: 2, reed: 1 }, prereq: { minOccupations: 1 }, oneShot: true },
  { id: "mi.stoneAxe", name: "石斧", icon: "🪓", effect: "每次使用木材行动格时，额外获得 1 木材。", cost: { stone: 1 }, prereq: { minOccupations: 1 } },
  { id: "mi.hardwoodPlow", name: "硬木犁", icon: "🚜", effect: "每次犁地时，可以再犁 1 块田。", cost: { wood: 2 }, prereq: { minOccupations: 2 } },
  { id: "mi.spade", name: "铁锹", icon: "⛏️", effect: "打出时可以免费犁 1 块田。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.woolBlanket", name: "羊毛毯", icon: "🧣", effect: "打出时若至少有 1 只绵羊，立即获得 3 食物。", cost: { reed: 1 }, oneShot: true },
  { id: "mi.manure", name: "堆肥", icon: "🍂", effect: "打出时若至少有 2 种牲畜，立即获得 1 谷物和 1 蔬菜。", cost: {}, oneShot: true },
  { id: "mi.forestBasket", name: "林间采集篮", icon: "🧺", effect: "打出时立即获得 1 木材和 1 食物。", cost: { reed: 1 }, oneShot: true },
  { id: "mi.claySieve", name: "淘泥筛", icon: "🪣", effect: "打出时立即获得 1 陶土和 1 芦苇。", cost: { wood: 1 }, oneShot: true },
  { id: "mi.seedPouch", name: "留种袋", icon: "🌱", effect: "打出时立即获得 1 谷物。", cost: { reed: 1 }, oneShot: true },
  { id: "mi.fieldLunch", name: "田间便当", icon: "🍱", effect: "打出时立即获得 2 食物。", cost: { grain: 1 }, oneShot: true },
  { id: "mi.stoneBasket", name: "石料背篓", icon: "🪨", effect: "打出时立即获得 1 石材。", cost: { wood: 1 }, oneShot: true },
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

// 《农夫与沼泽》M015～M131，卡面资料来自仓库根目录「发展卡.md」。
export const MOOR_MINOR_IMPROVEMENTS: MinorImprovement[] = [
  {"id": "M015", "name": "烧化泥炭", "icon": "🔥", "effect": "立即获得 1 [燃料]。你还可以移除 1 片沼泽，在原处放置 1 块农田。", "vp": 0},
  {"id": "M016", "name": "清除树木", "icon": "🌲", "effect": "立即获得 2 [木材]。你可以将最多 2 片未叠放其他板块的森林翻面，变为沼泽。", "vp": 0, "prereqText": "最多有 3 片森林"},
  {"id": "M017", "name": "重新造林", "icon": "🌲", "effect": "立即在农场的一块空地上放置 1 片森林。", "vp": 0, "prereqText": "已建造至少 3 项重大改进"},
  {"id": "M018", "name": "工匠证书", "icon": "🃏", "effect": "立即建造木工坊、陶器工坊或制篮工坊中的 1 项，无需派工人，且少付 1 [石头]。", "vp": 0, "prereqText": "已建造至少 2 项重大改进"},
  {"id": "M019", "name": "泥炭草坪", "icon": "🔥", "effect": "如果农场恰好有 3、4、5、6 或 7 块未使用的格子，分别获得 1、2、3、4 或 5 [燃料]。", "vp": 0, "prereqText": "已建造至少 4 项重大改进"},
  {"id": "M020", "name": "颗粒泥炭", "icon": "🔥", "effect": "农场每有 1 片可见的沼泽，立即获得 1 [燃料]。", "vp": 0, "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M021", "name": "泥炭切割队", "icon": "🔥", "effect": "你可以立即移除任意数量的可见沼泽；每移除 1 片，获得 1 点奖励分和 2 [燃料]。如果你至少有 2 匹马，从第 2 匹起每匹再获得 1 [燃料]，最多额外获得 4 [燃料]。", "vp": 0, "cost": {"food": 4}, "costText": "4 食物"},
  {"id": "M022", "name": "生态位", "icon": "🃏", "effect": "立即检查农场：若你拥有其他玩家都没有的动物种类，获得 2 [食物]；若只有你种植谷物或蔬菜，每符合一种获得 1 [食物]；若你独自拥有最多森林或沼泽，每符合一项获得 1 [燃料]。", "vp": 0},
  {"id": "M023", "name": "森林边缘", "icon": "🌲", "effect": "森林与农田之间每有 1 段栅栏，立即获得 1 [食物]；森林与沼泽之间每有 1 段栅栏，立即获得 1 [燃料]。", "vp": 0, "prereqText": "已建造至少 3 项重大改进"},
  {"id": "M024", "name": "基本供给", "icon": "🃏", "effect": "立即补齐库存，使 [燃料]、[食物]、[木材]、[砖]、[芦苇]、[石头] 和 [谷物] 每种至少有 1 个。", "vp": 0, "cost": {"vegetable": 1}, "costText": "1 蔬菜"},
  {"id": "M025", "name": "家庭库存", "icon": "🃏", "effect": "立即补齐库存，使 [燃料]、[食物]、[木材]、[砖]、[芦苇]、[石头] 和 [谷物] 每种至少有 1 个。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "至少有 1 块农田、1 处牧场或 1 座马厩"},
  {"id": "M026", "name": "烟囱罩", "icon": "🃏", "effect": "立即获得相当于用你的一座烤炉烤制 1 [谷物] 时产出的 [食物]。", "vp": 0, "cost": {"clay": 1}, "costText": "1 陶土"},
  {"id": "M027", "name": "花园小径", "icon": "🃏", "effect": "立即获得 3 [木材]。你左手边的玩家同时获得「花园小径」标记。", "vp": 0, "cost": {"clay": 1}, "costText": "1 陶土", "prereqText": "至少有 1 片森林"},
  {"id": "M028", "name": "无业游历", "icon": "🃏", "effect": "立即按你拥有的工艺建筑领取资源：木工坊给 3 [木材]，陶器工坊给 3 [砖]，制篮工坊给 2 [芦苇]。", "vp": 0},
  {"id": "M029", "name": "修补匠", "icon": "🃏", "effect": "若你拥有木工坊、陶器工坊或制篮工坊中的至少一项，立即获得 1 [木材]、1 [砖]、1 [芦苇] 和 1 [石头]。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "已建造至少 3 项重大改进"},
  {"id": "M030", "name": "耕畜市场", "icon": "🃏", "effect": "你可以立即用 2 [羊] 换取 1 [牛] 和 1 [马]。必须同时交出 2 只羊。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物"},
  {"id": "M031", "name": "家畜市场", "icon": "🃏", "effect": "你可以立即交换最多 3 只动物，前提是有地方安置换来的动物。交换顺序为：[羊] → [猪] → [牛] → [马]。", "vp": 0, "prereqText": "至少有 5 只动物（含马）"},
  {"id": "M032", "name": "泥炭小屋", "icon": "🔥", "effect": "这张卡提供 1 间房，每次收获取暖时须额外支付 1 [燃料]。你可以使用「翻修」行动移除这张卡，在自己的木屋旁免费增建 1 间木屋。", "vp": 1, "cost": {"fuel": 5, "reed": 2}, "costText": "5 燃料 + 2 芦苇"},
  {"id": "M033", "name": "夜间牧场", "icon": "🃏", "effect": "这张卡最多能安置你自己的 3 只动物，也能为其他每位玩家各安置 1 只。繁殖时，这些动物只算作你的动物，且由你最后结算繁殖。", "vp": 0, "cost": {"clay": 2}, "costText": "2 陶土"},
  {"id": "M034", "name": "自家林子", "icon": "🌲", "effect": "每块有森林的农场格可以安置 1 只动物，但不能安置羊。", "vp": 0, "prereqText": "已打出至少 3 张发展卡"},
  {"id": "M035", "name": "马槽", "icon": "🐴", "effect": "在与房屋相邻的一块未使用农场格中，最多安置 2 [马]。这块格子仍算未使用，你可以更换安置马的格子。", "vp": 0, "cost": {"stone": 1}, "costText": "1 石材"},
  {"id": "M036", "name": "泥炭苔", "icon": "🔥", "effect": "建造木屋时，每间只需支付 3 [木材] 和 1 [芦苇]。", "vp": 0, "prereqText": "农场没有沼泽"},
  {"id": "M037", "name": "建筑规划", "icon": "🃏", "effect": "一次建造至少 2 间房后，你可以免费建造最多 2 座马厩。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物"},
  {"id": "M038", "name": "自然保护区", "icon": "🃏", "effect": "立即免费用栅栏围住一块与现有牧场相邻、且有森林或沼泽的格子。清除格内所有地形后，这块格子成为牧场。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "至少有 1 处牧场"},
  {"id": "M039", "name": "特殊牧场", "icon": "🃏", "effect": "立即免费将一块不与现有牧场相邻的格子围成牧场。之后可以将它与其他牧场连接；此后新建的牧场都须与已有牧场相邻。", "vp": 0, "cost": {"wood": 2}, "costText": "2 木材", "prereqText": "至少有 1 处牧场"},
  {"id": "M040", "name": "沼泽火", "icon": "🃏", "effect": "当农场只剩 1 片沼泽时，你可以随时移除它，在原处放置 1 块农田。", "vp": 0, "prereqText": "恰好有 2 片沼泽"},
  {"id": "M041", "name": "牛颈圈", "icon": "🃏", "effect": "使用「犁地」「耕种」或「刀耕火种」后，如果你至少有 1 [牛]，可以额外犁 1 块田。", "vp": 1, "cost": {"wood": 1}, "costText": "1 木材", "prereqText": "只能在第 8 轮及以后打出"},
  {"id": "M042", "name": "深犁", "icon": "🌾", "effect": "你可以立即在空地上放置 1 片沼泽。此后每次使用「犁地」或「耕种」行动时，可以移除 1 片沼泽，在原处放置 1 块农田。", "vp": 2, "cost": {"wood": 3}, "costText": "3 木材", "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M043", "name": "野外农田", "icon": "🌾", "effect": "你可以立即在不与现有农田相邻的空地上，依次放置最多 2 块农田。之后可以与其他农田连接；此后新犁的田仍须与已有农田相邻。", "vp": 0, "cost": {"food": 2}, "costText": "2 食物", "prereqText": "至少有 2 块农田"},
  {"id": "M044", "name": "沼地", "icon": "🃏", "effect": "打出时将 1 片沼泽放到第 12 轮。该轮开始时，可以将它放在一块空地上。", "vp": 0, "prereqText": "只能在第 1～4 轮打出"},
  {"id": "M045", "name": "树苗圃", "icon": "🌲", "effect": "打出时在第 12、13 轮各放 1 片森林。对应轮次开始时，可以将森林放在一块空地上。", "vp": 0, "cost": {"wood": 1}, "costText": "1 木材", "prereqText": "尚未打出任何发展卡"},
  {"id": "M046", "name": "灌木丛", "icon": "🌲", "effect": "选择最多 2 片森林，在每片上方再叠放 1 片森林。要在这些格子上「刀耕火种」，必须先伐去上层森林。", "vp": 0, "prereqText": "至少有 4 片森林"},
  {"id": "M047", "name": "泥塘森林", "icon": "🌲", "effect": "你可以在任意数量的沼泽上各叠放 1 片森林。要使用下层沼泽或在该格「刀耕火种」，必须先伐去上层森林。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "已打出至少 3 张发展卡"},
  {"id": "M048", "name": "森林沼地", "icon": "🌲", "effect": "每次「切割泥炭」时，在 4 轮后的轮次格放 1 片森林。到该轮开始时，可以将它放在一块空地上。", "vp": 0, "prereqText": "已建造至少 2 项重大改进"},
  {"id": "M049", "name": "测量员地图", "icon": "🃏", "effect": "打出时分别在第 11、12、13 轮放置 1 块农田、1 片沼泽和 1 片森林。对应轮次开始时，可以按正常规则将该板块放在一块未使用的农场格上。", "vp": 0, "cost": {"food": 2}, "costText": "2 食物", "prereqText": "只能在第 1～2 轮打出"},
  {"id": "M050", "name": "扩充农田", "icon": "🌾", "effect": "在农场的一侧放置 1 块扩充农场板。板上的两块新格子都须与现有农场相邻。", "vp": 1, "cost": {"clay": 1}, "costText": "1 陶土"},
  {"id": "M051", "name": "沼泽圈地", "icon": "🃏", "effect": "在农场的一侧放置 1 块扩充农场板，并在两块新格子上各放 1 片沼泽。两块新格子都须与现有农场相邻。", "vp": 1, "cost": {"stone": 1}, "costText": "1 石材", "prereqText": "已翻修为陶屋"},
  {"id": "M052", "name": "婚礼马车", "icon": "🐴", "effect": "打出时，你可以立即进行一次无需空房的家庭增长，无需派工人。新生儿暂放在这张卡上，回家阶段再归队。", "vp": 0, "cost": {"wood": 2, "vegetable": 1}, "costText": "2 木材 + 1 蔬菜", "prereqText": "至少有 4 匹马"},
  {"id": "M053", "name": "森林小屋", "icon": "🌲", "effect": "从个人储备中取 1 名家人，放在一片森林上。移除这片森林时，你可以在当轮派出这名家人；回家阶段再将其放回储备中。此前不能用他作为家庭增长的新生儿。", "vp": 1, "cost": {"wood": 2}, "costText": "2 木材"},
  {"id": "M054", "name": "农业工具", "icon": "🌾", "effect": "每次使用「犁地」或「耕种」行动后，你可以立即拿取 1 张正面朝上的特殊行动卡。费用仍按正常规则支付：首次免费，再用需 2 [食物]。", "vp": 0, "cost": {"wood": 1}, "costText": "1 木材"},
  {"id": "M055", "name": "工具棚", "icon": "🃏", "effect": "每轮限一次。执行「刀耕火种」或「切割泥炭」前后，你可以再执行一次另一种特殊行动。", "vp": 1, "cost": {"wood": 1, "clay": 1}, "costText": "1 木材 + 1 陶土", "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M056", "name": "泥炭切割权", "icon": "🔥", "effect": "打出时在第 4 轮后和第 7 轮后的轮次格各放 1 [燃料]。对应轮次开始时，你可以弃掉该燃料，拿取特殊行动卡并执行「切割泥炭」。", "vp": 0, "prereqText": "至少有 1 匹马"},
  {"id": "M057", "name": "敲鼓者", "icon": "🃏", "effect": "每轮派完全部家人后，等再次轮到你时，可以额外拿取 1 张正面朝上的特殊行动卡。卡牌费用仍按正常规则支付。", "vp": 0, "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M058", "name": "泥炭肥料", "icon": "🔥", "effect": "每次「切割泥炭」后，你还可以立即播种。", "vp": 0, "prereqText": "至少有 2 块农田"},
  {"id": "M059", "name": "自然肥料", "icon": "🃏", "effect": "每次「刀耕火种」后，你可以立即在刚开垦的田里播种。用小发展卡将沼泽改成农田时，也能这样播种。", "vp": 0, "cost": {"food": 2}, "costText": "2 食物"},
  {"id": "M060", "name": "播种机", "icon": "🌾", "effect": "每次执行特殊行动后，如果你至少有 2 [牛]，还可以立即播种。", "vp": 1, "cost": {"wood": 3}, "costText": "3 木材", "prereqText": "至少有 1 匹马"},
  {"id": "M061", "name": "干草货车", "icon": "🃏", "effect": "从累积格拿取至少 3 [木材]、3 [砖]、2 [芦苇]或 2 [石头]后，你可以立即建房或翻修，无需再派工人。", "vp": 1, "cost": {"wood": 2}, "costText": "2 木材", "prereqText": "至少有 2 匹马"},
  {"id": "M062", "name": "炉刷", "icon": "🃏", "effect": "立即将「垒砖烤炉」移到可建造位置。从下一轮起，你可以在家人行动后支付费用，立即建造它。终局时，这座烤炉额外得 1 分。", "vp": 0, "cost": {"reed": 1}, "costText": "1 芦苇"},
  {"id": "M063", "name": "教会信", "icon": "🃏", "effect": "立即将「乡村教堂」移到可建造位置。从下一轮起，你可以在家人行动后支付费用，立即建造它。终局时，教堂和乡村教堂各额外得 1 分。", "vp": 0, "prereqText": "已建造至少 2 项重大改进"},
  {"id": "M064", "name": "家族墓地", "icon": "🃏", "effect": "打出时，你可以在一块空地上放置墓碑。该格从此算已使用，但不能再建造或耕种；终局额外得 1 分。", "vp": 1, "cost": {"stone": 1}, "costText": "1 石材", "prereqText": "已翻修为石屋"},
  {"id": "M065", "name": "消防队", "icon": "🃏", "effect": "打出时立即获得 2 [食物]。如果农场有至少 2、3、4 或 5 片森林，再分别获得 1、2、3 或 4 点奖励分。", "vp": 0, "cost": {"clay": 1, "stone": 1}, "costText": "1 陶土 + 1 石材", "prereqText": "打出前至少有 4 食物和 4 燃料"},
  {"id": "M066", "name": "地块", "icon": "🃏", "effect": "立即在空地上放置 1 片森林。终局时若还有 1、2 或至少 3 块未使用的农场格，这张卡分别提供 +2、−1 或 −3 点奖励分；空地本身仍按通常规则计分。", "vp": 0, "prereqText": "已打出的发展卡不超过 2 张"},
  {"id": "M067", "name": "商会", "icon": "🃏", "effect": "打出时立即获得 1 [木材]和 1 [芦苇]。终局时，每拥有木工坊、陶器工坊或制篮工坊中的一项，额外得 1 分。", "vp": 1, "cost": {"clay": 2, "stone": 1}, "costText": "2 陶土 + 1 石材"},
  {"id": "M068", "name": "教堂", "icon": "🃏", "effect": "建造这张升级卡时，立即获得 2 [食物]。之后每次回家阶段，你可以支付 1 [燃料]获得 1 点奖励分。", "vp": 5, "costText": "归还已建造的乡村教堂"},
  {"id": "M069", "name": "皮鞍", "icon": "🃏", "effect": "当你至少有 3 匹马时，每次把 1 [牛]加工成[食物]，额外得 1 点奖励分。", "vp": 1, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "至少有 2 匹马"},
  {"id": "M070", "name": "沼泽考古", "icon": "🃏", "effect": "每次「切割泥炭」时，你可以在刚清出的格子上放置 1 段栅栏作为考古标记。该格算已使用，但直到游戏结束都不能再使用；终局额外得 1 分。", "vp": 1, "prereqText": "已翻修为陶屋"},
  {"id": "M071", "name": "泥塘尸体", "icon": "🃏", "effect": "终局时，沼泽博物馆和生活史博物馆的持有者各获得 1 点奖励分。", "vp": 1, "prereqText": "至少有 1 片沼泽"},
  {"id": "M072", "name": "烤炉风箱", "icon": "🔥", "effect": "打出时立即获得 3 [燃料]。终局时，每拥有一座砖土烤炉、石造烤炉、供暖烤炉、垒砖烤炉或烤炉装置，额外得 1 分。", "vp": 1, "cost": {"stone": 2}, "costText": "2 石材"},
  {"id": "M073", "name": "畜牧奖", "icon": "🃏", "effect": "终局时，如果你四种动物各有至少 1 只，每有 1 位其他玩家就得 1 分；每种都至少有 2 只或 3 只时，该分数分别翻倍或变为三倍。", "vp": 0, "cost": {"grain": 1}, "costText": "1 谷物", "prereqText": "农场没有未使用的地块"},
  {"id": "M074", "name": "管理部门", "icon": "🃏", "effect": "打出时立即获得 2 [食物]。第 14 轮收获时，每拥有 1 项重大改进，你可以支付 1 [食物]换取 1 点奖励分。", "vp": 0, "cost": {"wood": 1, "clay": 2}, "costText": "1 木材 + 2 陶土", "prereqText": "手牌中的小发展卡不超过 4 张"},
  {"id": "M075", "name": "燃料仓库", "icon": "🔥", "effect": "打出时，从 1 [木材]开始，在当前轮数加 1、3、5、7、9、11 的轮次格交替放置 1 [木材]和 1 [燃料]。对应轮次开始时领取。", "vp": 1, "cost": {"clay": 1, "reed": 1}, "costText": "1 陶土 + 1 芦苇"},
  {"id": "M076", "name": "平底船", "icon": "🃏", "effect": "打出时，从 1 [燃料]开始，在接下来的 7 轮交替放置 1 [燃料]和 1 [马]。对应轮次开始时领取。", "vp": 0, "cost": {"wood": 4}, "costText": "4 木材"},
  {"id": "M077", "name": "早田", "icon": "🌾", "effect": "每次「切割泥炭」时，在 3 轮后的轮次格放 2 [燃料]；到该轮开始时领取。", "vp": 1, "cost": {"food": 2}, "costText": "2 食物"},
  {"id": "M078", "name": "驳船", "icon": "🃏", "effect": "打出时，从 1 [燃料]开始，在余下各轮交替放置 1 [燃料]和 1 [食物]。对应轮次开始时领取。", "vp": 1, "cost": {"wood": 3}, "costText": "3 木材", "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M079", "name": "泥炭滑车", "icon": "🔥", "effect": "打出时选择 2、4、7 或 10 轮后的一轮，分别在该轮放置 3、4、5 或 6 [燃料]；到该轮开始时领取。", "vp": 0, "cost": {"wood": 1}, "costText": "1 木材"},
  {"id": "M080", "name": "定金", "icon": "🃏", "effect": "立即获得 1 [燃料]、1 [食物]、1 [木材]、1 [砖]、1 [芦苇]、1 [石头]、1 [羊]和 1 [谷物]。", "vp": -4},
  {"id": "M081", "name": "泥炭船", "icon": "🔥", "effect": "你可以随时兑换：3 [燃料]换 2 [木材]或 2 [砖]；4 [燃料]换 2 [芦苇]或 2 [石头]；2 [燃料]换 1 [谷物]；3 [燃料]换 1 [蔬菜]。兑换建材时必须一次拿 2 个。", "vp": 3, "cost": {"wood": 3, "reed": 2}, "costText": "3 木材 + 2 芦苇"},
  {"id": "M082", "name": "木柴", "icon": "🔥", "effect": "打出时立即获得 1 [燃料]。每次收获时，若你用至少 1 [木材]换取燃料来给房屋取暖，本次取暖少需 1 [燃料]。", "vp": 0, "cost": {"wood": 1}, "costText": "1 木材", "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M083", "name": "煤层", "icon": "🃏", "effect": "打出时立即获得 1 [燃料]。此后每次执行「劳务市场」特殊行动或使用「临时工」行动格，再获得 1 [燃料]。", "vp": 1, "cost": {"wood": 1, "clay": 1}, "costText": "1 木材 + 1 陶土"},
  {"id": "M084", "name": "泥塘小驹", "icon": "🃏", "effect": "你可以随时让 1 匹站立的马侧躺，获得 2 [燃料]。侧躺的马不参与繁殖，终局只得半分；仍可通过合适的发展卡加工成[食物]。", "vp": 0, "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M085", "name": "烤炉装置", "icon": "🔥", "effect": "你的房屋不再需要燃料取暖。", "vp": -1, "costText": "归还已建造的供暖烤炉"},
  {"id": "M086", "name": "纺织厂", "icon": "🃏", "effect": "每次收获时，每有 2 [羊]，本次取暖少需 1 [燃料]，最低减至 0。", "vp": 2, "cost": {"wood": 2, "clay": 2}, "costText": "2 木材 + 2 陶土", "prereqText": "至少有 1 只羊"},
  {"id": "M087", "name": "泥炭驳船", "icon": "🔥", "effect": "每次使用「钓鱼」累积格，额外获得 2 [燃料]。", "vp": 1, "cost": {"wood": 2}, "costText": "2 木材"},
  {"id": "M088", "name": "泥炭铁铲", "icon": "🔥", "effect": "每次收获开始时，若农场至少有 2 片沼泽，获得 1 [燃料]。", "vp": 0, "cost": {"wood": 1}, "costText": "1 木材"},
  {"id": "M089", "name": "生育屋", "icon": "🃏", "effect": "每次家庭增长后，立即获得 1 [燃料]、1 [食物]和 1 点奖励分。无论是否需要空房，都能触发。", "vp": 2, "cost": {"clay": 2, "stone": 1}, "costText": "2 陶土 + 1 石材"},
  {"id": "M090", "name": "冬季仓库", "icon": "🃏", "effect": "这张卡有 3 次使用机会。每次使用时，补充[燃料]和[食物]，直到两种资源各至少有 2 个。", "vp": 0, "cost": {"wood": 1, "clay": 2}, "costText": "1 木材 + 2 陶土"},
  {"id": "M091", "name": "日常工作", "icon": "🃏", "effect": "每次收获时，每有一座本次未用来加工[食物]的木工坊、陶器工坊或制篮工坊，可选得 1 [燃料]或 1 [食物]。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "尚未打出任何发展卡"},
  {"id": "M092", "name": "荒田", "icon": "🌾", "effect": "每次「切割泥炭」后，在清出的格子上放 1 [燃料]和 1 [食物]。该格仍算未使用；日后使用这块地时，再领取这两种资源。", "vp": 0, "prereqText": "已打出至少 3 张发展卡"},
  {"id": "M093", "name": "雇农宿舍", "icon": "🌾", "effect": "每次建造重大改进时，可以用 1 [燃料]代替其中 1 份建材。每次从右手边玩家处获得发展卡加入手牌，额外获得 1 [食物]。", "vp": 0, "cost": {"wood": 1, "reed": 1}, "costText": "1 木材 + 1 芦苇"},
  {"id": "M094", "name": "泥炭浴", "icon": "🔥", "effect": "每次使用「医务所」时，按农场中可见沼泽的数量，在之后相同数量的轮次格各放 1 [食物]；到对应轮次开始时领取。", "vp": 1, "cost": {"wood": 1, "clay": 1}, "costText": "1 木材 + 1 陶土"},
  {"id": "M095", "name": "休耕田", "icon": "🌾", "effect": "在最多 3 块未播种的农田上各放 2 [食物]。这些食物不能收割；播种对应农田时才能领取。", "vp": 0},
  {"id": "M096", "name": "休耕地", "icon": "🃏", "effect": "每次「伐木」或「切割泥炭」后，在清出的格子上放 1 [食物]。该格仍算未使用；日后使用这块地时再领取。", "vp": 0, "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M097", "name": "村公所", "icon": "🃏", "effect": "每次回家阶段开始时，若你面前没有特殊行动卡，获得 2 [食物]。", "vp": 1, "cost": {"wood": 2, "clay": 2}, "costText": "2 木材 + 2 陶土"},
  {"id": "M098", "name": "熏鱼屋", "icon": "🃏", "effect": "每次使用「钓鱼」累积格，你可以支付 1 [燃料]，额外获得 3 [食物]。", "vp": 2, "cost": {"wood": 1, "clay": 2}, "costText": "1 木材 + 2 陶土"},
  {"id": "M099", "name": "治愈黏土", "icon": "🃏", "effect": "打出时立即获得 1 [食物]。之后每次派卧床家人去「医务所」，额外获得 1 [食物]。", "vp": 1, "cost": {"clay": 1}, "costText": "1 陶土"},
  {"id": "M100", "name": "信息素", "icon": "🃏", "effect": "打出时立即获得 1 [食物]。此外，所有至少有 1 座马厩或 1 处牧场的玩家（包括你）各获得 2 [食物]。", "vp": 0, "prereqText": "已打出的发展卡不超过 2 张"},
  {"id": "M101", "name": "肉墩", "icon": "🃏", "effect": "这张卡不能在收获轮打出。打出后，其他玩家必须、你可以各选 1 只动物加工成[食物]：羊换 1、牛换 3、猪换 2、马换 2 [食物]。", "vp": 1, "cost": {"wood": 1}, "costText": "1 木材", "prereqText": "不能在收获轮打出（第 4、7、9、11、13、14 轮）"},
  {"id": "M102", "name": "存款", "icon": "🃏", "effect": "每次收获开始时，随机抽 1 张起始卡。若卡号不大于你拥有的陶土数，立即获得 6 [食物]，然后将此卡传给左手边玩家，加入其手牌。", "vp": 1, "cost": {"food": 2}, "costText": "2 食物"},
  {"id": "M103", "name": "森林幼儿园", "icon": "🌲", "effect": "每次家庭增长后，农场每有 1 块含森林的格子，立即获得 1 [食物]。无论是否需要空房，都能触发。", "vp": 1, "cost": {"wood": 1, "stone": 2}, "costText": "1 木材 + 2 石材", "prereqText": "最多有 3 片森林"},
  {"id": "M104", "name": "野外收成", "icon": "🃏", "effect": "打出时立即获得 1 [食物]。每次收获开始时，随机抽 1 张起始卡；若卡号不大于你拥有的森林数，再获得 1 [食物]。", "vp": 0},
  {"id": "M105", "name": "开放式烤架", "icon": "🃏", "effect": "你可以随时加工：1 [蔬菜]换 2 [食物]、1 [羊]换 2 [食物]、1 [牛]或 1 [猪]换 3 [食物]、1 [马]换 2 [食物]。执行「烤面包」时，1 [谷物]换 2 [食物]。", "vp": 2, "costText": "归还已建造的壁炉"},
  {"id": "M106", "name": "马肉铺", "icon": "🐴", "effect": "你可以随时加工：1 [羊]换 1 [食物]、1 [牛]换 3 [食物]、1 [猪]或 1 [马]换 2 [食物]、2 [马]换 5 [食物]。", "vp": 3, "costText": "归还已建造的屠马场"},
  {"id": "M107", "name": "炖肉食谱", "icon": "🃏", "effect": "拥有火炉或灶台时，你可以随时将 1 [马]加工成 2 [食物]。", "vp": 0, "prereqText": "至少有 2 匹马"},
  {"id": "M108", "name": "谷物酒厂", "icon": "🃏", "effect": "每次收获时，你可以用 1 [燃料]和 1 [谷物]换 5 [食物]。终局计分时，每交出 1 [燃料]和 1 [谷物]，可再获得 1 点奖励分。", "vp": 1, "cost": {"stone": 2, "grain": 1}, "costText": "2 石材 + 1 谷物"},
  {"id": "M109", "name": "麦芽加工屋", "icon": "🃏", "effect": "每次「切割泥炭」时，你可以用 1 [谷物]换 4 [食物]。", "vp": 1, "cost": {"clay": 2}, "costText": "2 陶土"},
  {"id": "M110", "name": "农用拖车", "icon": "🌾", "effect": "从累积格拿取至少 5 [木材]、4 [砖]、3 [芦苇]或 2 [石头]时，再获得 1 [谷物]。", "vp": 0, "cost": {"wood": 3}, "costText": "3 木材", "prereqText": "至少有 2 匹马"},
  {"id": "M111", "name": "免耕农业", "icon": "🌾", "effect": "你可以在最多 2 块未使用的农场格上种植[谷物]或[蔬菜]。这些格子仍不算农田，也仍算未使用；你可以随时弃掉上面的作物。", "vp": 0, "prereqText": "至少有 2 块农田"},
  {"id": "M112", "name": "泥炭灰肥", "icon": "🔥", "effect": "每次「切割泥炭」前，你可以为每块已种植的农田或农场格再添 1 个同种作物。没有作物的格子不能获得。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物"},
  {"id": "M113", "name": "生活史博物馆", "icon": "🃏", "effect": "建造下列重大改进时少付 1 份对应建材：供暖烤炉少付 1 [砖]、乡村教堂少付 1 [石头]、垒砖烤炉少付 1 [石头]、家具摊少付 1 [木材]、跑马场少付 1 [木材]、篮摊少付 1 [芦苇]、陶器摊少付 1 [砖]。", "vp": 4, "costText": "归还已建造的沼泽博物馆", "prereqText": "已翻修为陶屋"},
  {"id": "M114", "name": "河边树木", "icon": "🌲", "effect": "每次使用「钓鱼」累积格，农场每有 1 块含森林的格子，额外获得 1 [木材]，最多获得 3 [木材]。", "vp": 0, "prereqText": "已建造至少 3 项重大改进"},
  {"id": "M115", "name": "栎树皮", "icon": "🌲", "effect": "打出时立即获得 2 [木材]。此后每加工 1 只猪、牛或马成为[食物]，额外获得 1 [木材]。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "已建造至少 2 项重大改进"},
  {"id": "M116", "name": "沼泽桦树", "icon": "🌲", "effect": "每次「切割泥炭」时，额外获得 2 [木材]。", "vp": 0, "cost": {"food": 2}, "costText": "2 食物", "prereqText": "至少有 3 间房屋"},
  {"id": "M117", "name": "役驹", "icon": "🃏", "effect": "从累积格恰好拿取 3 [木材]时，若至少有 1 [马]，可支付 1 [食物]多拿 1 [木材]；拿取至少 4 [木材]时，可支付 1 [食物]多拿 2 [木材]。", "vp": 0},
  {"id": "M118", "name": "木料厂", "icon": "🌲", "effect": "每次「伐木」或从累积格拿取至少 4 [木材]时，额外获得 1 [木材]；你也可以支付 1 [燃料]，改为额外获得 2 [木材]。", "vp": 3, "cost": {"clay": 3, "stone": 2}, "costText": "3 陶土 + 2 石材"},
  {"id": "M119", "name": "桤木沼地", "icon": "🌲", "effect": "每次「伐木」时，额外选择获得 1 [木材]或 1 [芦苇]。", "vp": 1, "cost": {"food": 2}, "costText": "2 食物", "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M120", "name": "河边黏土", "icon": "🃏", "effect": "每次使用「钓鱼」累积格，额外获得 2 [砖]。", "vp": 0, "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M121", "name": "壤土", "icon": "🃏", "effect": "每轮执行「劳务市场」时，若只剩 1 名家人还未派出，额外获得 1 [砖]。", "vp": 0, "prereqText": "已打出至少 1 张发展卡"},
  {"id": "M122", "name": "柳树河畔", "icon": "🌲", "effect": "每次「伐木」时，额外获得 1 [芦苇]。", "vp": 0, "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M123", "name": "挖掘采石场", "icon": "🃏", "effect": "打出时在这张卡上放 5 [石头]，3 人游戏只放 3 个。每次执行「劳务市场」时，从卡上拿 1 [石头]。", "vp": 1, "cost": {"food": 3}, "costText": "3 食物"},
  {"id": "M124", "name": "石材货车", "icon": "🃏", "effect": "每次使用「临时工」行动格，额外获得 1 [石头]。", "vp": 0, "cost": {"wood": 2}, "costText": "2 木材"},
  {"id": "M125", "name": "五金商店", "icon": "🃏", "effect": "这张卡有 3 次使用机会。每次使用时，库存中没有的每种建材各获得 1 份。", "vp": 0, "cost": {"clay": 2, "reed": 1}, "costText": "2 陶土 + 1 芦苇", "prereqText": "已打出至少 2 张发展卡"},
  {"id": "M126", "name": "合作商店", "icon": "🃏", "effect": "这张卡有 4 次使用机会。每次使用时，交出任意 1 份建材，换取另一种建材，但不能换取[石头]。", "vp": 1, "cost": {"wood": 2, "clay": 1}, "costText": "2 木材 + 1 陶土"},
  {"id": "M127", "name": "轮推车", "icon": "🃏", "effect": "每次从累积格拿取至少 4 份同一种建材，额外获得 1 [燃料]。每次「切割泥炭」时，额外选择获得 1 份建材。", "vp": 0, "cost": {"wood": 2}, "costText": "2 木材", "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M128", "name": "工作台", "icon": "🃏", "effect": "第 13、14 轮收获的收割步骤，各获得 3 [木材]、2 [砖]和 1 [芦苇]；这些资源可以用于工艺建筑的奖励。", "vp": 0, "cost": {"wood": 2}, "costText": "2 木材", "prereqText": "已打出的发展卡不超过 4 张"},
  {"id": "M129", "name": "犁马市场", "icon": "🐴", "effect": "每次使用「犁地」或「耕种」行动格，你可以支付 1 [食物]购买 1 [马]。", "vp": 0, "cost": {"clay": 1}, "costText": "1 陶土", "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M130", "name": "马粮袋", "icon": "🐴", "effect": "每次使用「谷物种子」行动格，额外获得 1 [马]。", "vp": 0, "cost": {"food": 1}, "costText": "1 食物", "prereqText": "已建造至少 1 项重大改进"},
  {"id": "M131", "name": "畜摊", "icon": "🃏", "effect": "打出时在当前轮数加 2、4、6、8 的轮次格各放 1 只不同种类的动物。对应轮次开始时，你可以花 1 [食物]购买该轮的动物。", "vp": 1, "cost": {"wood": 2, "clay": 2}, "costText": "2 木材 + 2 陶土"},
];
