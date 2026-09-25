// 与 src/game/dlc.ts 同步的客户端副本 —— 仅用于 DOM 渲染
// 真实逻辑（手牌洗牌、卡牌效果结算）在引擎侧

export const OCCUPATIONS = [
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

export const MINOR_IMPROVEMENTS = [
  { id: "mi.well", name: "井", icon: "🪣", effect: "一次性：立即 +1 食物", oneShot: true },
  { id: "mi.beehive", name: "蜂箱", icon: "🍯", effect: "永久：收获阶段额外 +1 食物" },
  { id: "mi.firewood", name: "柴堆", icon: "🪵", effect: "永久：每轮额外 +1 木材" },
  { id: "mi.spinning", name: "纺车", icon: "🧶", effect: "永久：每轮额外 +1 芦苇" },
  { id: "mi.brick", name: "砖块", icon: "🧱", effect: "永久：每轮额外 +1 陶土" },
  { id: "mi.stoneHeap", name: "石堆", icon: "⛏", effect: "永久：每轮额外 +1 石材" },
  { id: "mi.market", name: "市集", icon: "🛒", effect: "一次性：立刻 +3 食物", oneShot: true },
  { id: "mi.sheepPen", name: "羊圈", icon: "🐏", effect: "永久：羊市行动额外 +1 只绵羊" },
  { id: "mi.boarPen", name: "猪圈", icon: "🐖", effect: "永久：猪市行动额外 +1 只野猪" },
  { id: "mi.cowPen", name: "牛圈", icon: "🐄", effect: "永久：牛市行动额外 +1 只黄牛" },
  { id: "mi.bigBarn", name: "大谷仓", icon: "🏚", effect: "一次性：立即 +1 谷物 +1 蔬菜", oneShot: true },
  { id: "mi.cookHelper", name: "厨助", icon: "🥣", effect: "一次性：立刻 +2 食物", oneShot: true },
];

// TODO: 与 src/game/dlc.ts 同步（手工复制）