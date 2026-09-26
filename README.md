# 🌾 农家乐 Agricola · 电子桌游

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Durable Objects](https://img.shields.io/badge/Storage-Durable%20Objects%20SQLite-4B8BBE)](https://developers.cloudflare.com/durable-objects/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-140%20passed-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> 经典德式策略桌游《农家乐 / 农庄主》（*Agricola: Revised Edition 2016* by Uwe Rosenberg）高保真全功能电子化实现。  
> 原生运行于 **Cloudflare 全球边缘网络（Workers + Durable Objects + Static Assets）**，提供 **1–4 人联机对弈**、**纯数字房间匹配**、**实时旁观模式** 与 **极致移动端适配**。

📖 **详细 DLC 设计文档**：[dlc.md](dlc.md)

---

## 🌟 核心特性与亮点

### 1. 👨‍🌾 严谨还原 2016 官方修订版规则
- **标准时间轴与农事阶段**：14 回合推进、6 个阶段（Stage 1–6）、6 次农事收获（第 4、7、9、11、13、14 轮）。
- **经典工人放置（Worker Placement）**：每回合每格行动互斥占用；木/陶/苇/石/谷/菜/鱼累积格回合自动补充。
- **家园拓荒与营造**：
  - 3×5 个人农庄网格，木屋扩建、半木陶屋与城堡石屋阶梯翻修；
  - 犁地、播种、随轮次递减收割；
  - 基于**严格几何泛洪算法**自动校验闭合栅栏牧场，实时计算容纳上限（2 头/格）。
- **收获三部曲闭环**：
  - 田间收割（Field Phase）→ 家人喂养（Feeding Phase，食物不足罚出 -3 分乞讨卡）→ 双数牲畜自然繁衍（Breeding Phase）。
- **终局 13 维明细精准计分**：
  - 田地数量阶梯、牧场数量阶梯、谷物/蔬菜库存量、羊/猪/牛分阶断点、房屋材质加分、家庭成员数、未利用荒地扣分、主要发展卡胜利点。

### 2. 🧩 模块化扩展包（DLC）独立开关
可在主持开房时按需勾选，未开启时保证本体纯净度：
- **🎴 88 张官方经典职业卡池（Occupations）**：
  - 涵盖农耕、畜牧、建造、烹饪、声望、资源等 7 大流派；
  - 开局 7 选 1 弹窗抽取，技能深度挂钩游戏引擎，全自动触发永久被动与即时收益；
  - 玩家卡区域以简洁 Tag 芯片展示，鼠标悬浮即弹出详细技能浮窗说明。
- **🎴 小发展卡（Minor Improvements）**：
  - 包含一次性爆发卡（水井、市集、厨助、大谷仓）与永久增益卡（柴堆、纺车、砖块、蜂箱、专用畜圈），抢入个人持有并即刻结算。
- **🌲 沼泽农夫（荒野之地扩展）**：
  - 引入「🔥 燃料」与「🌾 干草」两大全新资源体系；
  - 新增 4×4 公有沼泽拓荒板，支持沼泽拓荒、公共播种与产出收割；
  - 每轮必须消耗燃料为房屋取暖，收获阶段必须为牛群提供干草；
  - 配套实装专属 5 张荒野大发展设施（取暖炉、泥炭窑、沼泽灶、瓷砖烤炉、柴火棚）。

### 3. 🎨 17 世纪质朴德式桌面美术与资产重塑
- **纯手绘级矢量资产引擎（`public/js/svg-icons.js`）**：
  - 告别系统 Emoji 拼贴感，全套纯 SVG 矢量 Token：截面年轮原木、烧结红陶砖、麻绳系绑芦苇捆、冷灰凿痕石材、金黄麦穗扎、带叶胡萝卜、土窑酸面包、泥炭块与干草卷；
  - 经典木质动物剪影 Animeeple（羊、猪、牛）与四色玩家木制工人米普（Meeple）；
  - **补全马厩/圈舍实体（`stableSvg`）**：德式实木山墙圈舍，直观区分荒地独栋圈舍与封闭牧场双倍大马厩；
  - **8 款重大设施中世纪版画徽章**：水井（辘轳木桶）、壁炉（红炭铁锅）、烹饪灶（铸铁大锅）、陶土/石烤炉（柴火窑与长木铲）、三大工坊（木工手摇钻、陶轮拉胚、柳条编筐），彻底替代简易文字标签；
  - **7 大职业流派火漆印章徽饰**：资源（镐木交错）、农耕（双麦镰刀）、畜牧（羊角栅栏）、建造（泥抹方尺）、烹饪（麦香炖锅）、家庭（初升晨星木摇篮）、声望（桂冠火漆蜡印）；
  - 实体感房屋与地貌：原木长板屋、德式半木结构（Half-timbered / Fachwerk）白灰陶屋、规整勾缝城堡石屋；翻耕泥垄耕地与碎石杂草荒地。
- **古典四季天文时钟轮盘**：
  - 背景融合 17 世纪天文星盘与浑天仪日历，外环均匀雕刻 14 轮罗马数字（I 至 XIV），金麦徽饰清晰标注 6 次丰收倒计时。
- **亚麻布纹理与火漆印章**：
  - 发展设施与卡片加入细致亚麻布肌理与深红蜡油浮雕金字 VP 封蜡。

### 4. 📐 2.5D Isometric 农庄透视沙盘与灵动微交互
- **2D 平铺 / 2.5D 透视一键自由切换**：
  - 农场标题栏提供「📐 2.5D / 📋 2D」切换开关，偏好通过 `localStorage` 记忆；
  - 桌面端默认开启 2.5D 透视（`perspective: 1100px; rotateX(54deg) rotateZ(-32deg)`），打造真实等轴测桌游沙盘质感；
  - 手机窄屏端加入等比自适应动态缩放（`scale`），杜绝旋转后两翼破框，严格恪守 `scrollWidth <= clientWidth`。
- **三维积木厚度与立牌（Billboard）透视矫正**：
  - 房屋地基向 Z 轴拔高 9px，形成立体厚度与斜向投影；耕地下沉 2px 呈现凹陷泥垄；
  - 生长的麦穗、胡萝卜绿缨、木雕动物和马厩应用 Billboard 算法自动抵消倾角（`rotateZ(32deg) rotateX(-54deg)`），始终直立面向玩家视线。
- **实体抛物线飞行动效系统（`public/js/fx.js`）**：
  - **工人米普放置**：工人从玩家底栏起跳，划出优美抛物线弧度坠入目标行动格，附带落地微震；
  - **资源拾取飞入**：原木、陶砖、芦苇、石材从公池喷涌飞入玩家物资栏，数字即时跳动脉冲；
  - **收割进仓**：收获阶段麦穗与蔬菜脱落化作飞行动画落入玩家库存。
- **生机农场微动效**：
  - 麦浪与胡萝卜绿缨带有随机延迟的微风吹拂摇曳动画（Breeze Sway）；
  - 牧场木雕小动物呼吸微动，鼠标悬浮或点击时呈现弹性轻颠（Squash & Stretch）。

### 5. 🌤️ 四季动态 Canvas 氛围层与 14 轮昼夜光影系统
- **轻量节电 Canvas 氛围画布（`public/js/ambient.js`）**：
  - 春（嫩粉花瓣与和煦草屑）、夏（暖金光斑与微尘漂浮）、秋（随风旋转落叶与麦芒金粉）、冬（轻柔白雪花）；
  - **丰收礼花（Harvest Confetti）**：触发收获阶段或终局结算时，全屏喷射金色麦穗与红蜡火漆庆祝礼花；
  - **移动端与节电优化**：移动端粒子自动减半（12 颗），高分屏 DPR 限制为最大 1.5，页面切入后台（`document.hidden`）或开启 `prefers-reduced-motion` 时自动挂起，零无效能耗。
- **14 轮四季昼夜光影推移**：
  - 配合顶盘时钟平滑推移主界面光温：春晨嫩青 → 夏日烈金 → 秋暮金红 → 终局冬夜温润烛光。

### 6. 🔊 实体桌游物理拟真音效系统（Procedural WebAudio · 0 音频文件）
- **100% 纯算法物理合成（零 MP3/WAV/OGG 文件请求）**：
  - **木质实重敲击 (`woodThud`)**：带通滤波白噪声（390Hz）+ 低频正弦谐波下落，还原实体原木棋子敲击实木桌面的沉稳厚重质感；
  - **石块/陶砖清脆碰击 (`stoneClink`)**：高 Q 值带通共振峰（2600Hz, Q=12）+ 金属矿物泛音；
  - **农田麦浪沙沙声 (`cropRustle`)**：高通扫频噪声模拟麦浪翻滚与泥土破土；
  - **木雕小动物轻颠滑音 (`animalHop`)**：调频滑音模拟把玩 Animeeple 木偶玩具的趣味弹性；
  - **收获田园大三和弦 (`harvest`)**：C4-E4-G4-C5 慢琶音欧陆田园庆典音色。

### 7. 📱 极致窄屏响应式与智能新手引导
- **多端视口无死角适配**：
  - 经 320px、360px、375px、390px、414px、768px、1024px、1280px 全量视口检验，彻底根治“横向超框”（`scrollWidth <= clientWidth`）。
- **行动板内部分页**：
  - 科学划分为「🌾 资源 & 市场」、「🎯 行动 & 回合卡」、「🌲 荒野之地」，告别长屏滚动。
- **智能联动新手引导系统（Walkthrough Guide）**：
  - **Tab 跨面板智能自动切换**：高亮行动板目标时自动切到公共 Tab，高亮玩家卡时自动切回当前行动玩家面板；
  - **视口居中平滑滚动**：自动规避顶部 Sticky Tab 与底部浮层，将目标元素优雅置于可视区中央；
  - **Scroll 实时跟随**：页面滑动时 Spotlight 高亮框毫秒级紧随目标，杜绝脱节穿模；
  - **移动端 Bottom Sheet**：支持 iOS / Android 底部安全区（`env(safe-area-inset-bottom)`），内容区域支持内滚，操作按钮永不被挤出；
  - **完善退出交互**：右上角显眼关闭 `✕`、左下角“退出引导”跳过按钮，以及点击半透明遮罩背景一键退出。

### 8. 🧰 右下角聚合悬浮球（FAB）
- 随时唤出展开：
  - **🏆 实时排行榜**：动态展示全场排名与 13 项详细得分构成拆解；
  - **💡 流派玩法**：四大主力流派深度策略指引（农耕大户、畜牧繁衍、添丁工坊、荒野拓荒）；
  - **📋 价格/规则速查**：建造费用、牲畜容量、烹饪兑换汇率一目了然；
  - **🎴 DLC 规则抽屉**：纯中文精炼规则说明；
  - **📖 完整游玩教程**；
  - **🔊 纯 WebAudio 物理音效开关**（零音频文件依赖，纯物理算法合成）。

### 9. 🔒 4 位纯数字安全房间系统
- 邀请码、匹配码、旁观码全部统一为 **4 位纯数字随机码**（基于 Web Crypto API 强随机数模 10 算法，如 `8200`、`0120`）；
- 手机端数字键盘秒输，杜绝字符易混淆与中英全半角转换困扰；
- 全局 10 间共享房间池，任意设备随时主持、查看或一键解散。

---

## 🏗️ 架构设计与边缘技术栈

```text
                       ┌──────────────────────────────────────────────┐
                       │          Cloudflare Edge Network             │
                       │        (Workers + Durable Objects)           │
                       └──────────────────────┬───────────────────────┘
                                              │
              ┌───────────────────────────────┴───────────────────────────────┐
              ▼                                                               ▼
   ┌───────────────────────┐                                     ┌─────────────────────────┐
   │     Static Assets     │                                     │     Cloudflare Worker   │
   │  HTML5 / CSS3 / ES-M  │                                     │   REST API + WS Gateway │
   └───────────────────────┘                                     └────────────┬────────────┘
                                                                              │
                                             ┌────────────────────────────────┴────────────────┐
                                             ▼                                                 ▼
                                  ┌────────────────────┐                            ┌─────────────────────┐
                                  │    Registry DO     │                            │       Room DO       │
                                  │ (全局单例注册中心)   │                            │ (每房间独立 Durable) │
                                  │ - 10 房间池全局仲裁  │                            │ - WebSocket 睡眠唤醒 │
                                  │ - 4位纯数字匹配路由  │                            │ - 状态存储与事件广播 │
                                  └────────────────────┘                            └──────────┬──────────┘
                                                                                               ▼
                                                                                    ┌─────────────────────┐
                                                                                    │  src/game/engine.ts │
                                                                                    │  纯函数状态机与规则  │
                                                                                    └─────────────────────┘
```

- **边缘算力**：Cloudflare Workers (V8 Edge Runtime)
- **长连接与持久化**：Cloudflare Durable Objects（WebSocket Hibernation API，休眠唤醒降低资源开销）
- **核心游戏引擎**：纯 TypeScript 编写的无副作用离散事件驱动状态机
- **前端技术**：无框架原生 ES Modules、CSS Grid/Flexbox、Web Crypto API、WebAudio API、纯内联 SVG

---

## 📂 项目结构

```text
agricola-app/
├── public/                  # 静态前端资源（Cloudflare Assets 直出）
│   ├── css/
│   │   ├── main.css         # 全局色彩、排版、防超框与拟态样式
│   │   ├── game.css         # 农场棋盘、行动板、移动端 Tab 与新手引导样式
│   │   └── anim.css         # 动画、光效与视觉过渡
│   ├── js/
│   │   ├── play.js          # 客户端主入口、WebSocket 状态同步与重连
│   │   ├── game.js          # 棋盘渲染、行动派发、悬浮球、Bottom Sheet 引导
│   │   ├── svg-icons.js     # 纯手绘矢量 Token、Animeeple 与版画插画引擎
│   │   ├── host.js          # 主持端房间池与 DLC 勾选管理
│   │   ├── tutorial.js      # 纯中文规则教程与 DLC 手册抽屉
│   │   ├── sound.js         # WebAudio 纯算法合成音效
│   │   └── dlc-data.js      # 48 职业与小发展卡常量数据
│   ├── index.html           # 首页（4位数字输入、匹配、教程）
│   ├── host.html            # 主持台管理页面
│   └── play.html            # 游戏主对局界面
├── src/
│   ├── index.ts             # Worker 路由分发与 API 网关
│   ├── dos.ts               # Registry DO 与 Room DO 实现（含 4 位数字安全码）
│   └── game/
│       ├── engine.ts        # 农家乐核心游戏引擎（14 轮流转、收获、计分、防卡死）
│       ├── constants.ts     # 2016 修订版官方常量、计分断点、大发展卡
│       ├── grid.ts          # 农田/房屋/牧场几何连通与封闭栅栏泛洪校验
│       └── dlc.ts           # 扩展包逻辑（48 职业结算/小发展卡/荒野之地）
├── test/                    # 自动化测试套件（140 项全量断言）
│   ├── engine.mjs           # 规则引擎与几何连通测试
│   ├── ws-smoke.mjs         # 房间生命周期与 WebSocket 冒烟测试
│   ├── ws-dlc.js            # 全 DLC 开启端到端真实 WS 模拟对局
│   ├── ws-twoplay.js        # 双真实玩家 14 轮全行动完整推进测试
│   └── ws-fullgame.js       # 单人 14 轮自动化对局测试
├── dlc.md                   # 扩展包机制深度调研与规则说明
├── wrangler.jsonc           # Cloudflare 配置文件
├── tsconfig.json            # TypeScript 编译配置
└── package.json             # 依赖与脚本
```

---

## 🚀 本地开发与测试

### 1. 环境准备
确保已安装 Node.js 20+，克隆本仓库：
```bash
git clone git@github.com:WhiteRobe/agricola-app.git
cd agricola-app
npm install
```

### 2. 启动本地开发服务
使用 Wrangler 启动本地 Edge 运行时环境（Miniflare 自动模拟 Durable Objects 与静态资产）：
```bash
npm run dev
# 本地服务默认运行于 http://127.0.0.1:8787
```

### 3. TypeScript 静态类型检查
```bash
npm run typecheck
```

### 4. 运行全量自动化测试
套件包含 140 项覆盖底层引擎、几何拓扑、DLC 机制与真实 WebSocket 生命周期的断言：
```bash
npm test
```

亦可运行端到端网络对局验证（支持传入自定义服务地址）：
```bash
# 测试本地或私有部署双人完整 14 轮推进
node test/ws-twoplay.js http://127.0.0.1:8787
```

---

## ☁️ 生产部署

项目基于 Cloudflare Workers 全托管运行：

```bash
npx wrangler deploy
```

绑定自定义域名时，在 `wrangler.jsonc` 中配置：
```jsonc
"routes": [
  { "pattern": "your-domain.example.com", "custom_domain": true }
]
```

---

## 📜 规则参考、知识产权与商用合规说明

### 1. 游戏机制与规则致谢
- **游戏原创设计**：Uwe Rosenberg
- **规则出版规范**：[Agricola: Revised Edition (Lookout Games, 2016)](https://boardgamegeek.com/boardgame/200680/agricola-revised-edition)
- **机制深度解析**：[AndyVenture 农家乐深度规则指南](https://andyventure.com/boardgame-agricola/)
- **扩展设计**：《农家乐：沼泽农夫》（Farmers of the Moor 荒野之地扩展）
- **复刻与学术性质**：本项目属于非官方的经典德式桌面游戏机制电子化开源复刻与规则状态机学术研究实现，严格遵守桌面游戏规则逻辑不受版权保护原则（Idea-Expression Dichotomy）及合理使用范畴（Fair Use）。

### 2. 美术、音效与前端技术 100% 独立自研声明（防侵权与商业合规）
- **零外部位图与音频文件依赖**：本项目不包含任何官方桌游扫描件、盗用插画、字体或商用音频文件（0 MP3, 0 WAV, 0 PNG）；
- **纯手绘内联 SVG 资产**：所有 Token（原木、陶砖、芦苇、石材、麦穗、胡萝卜）、木雕动物剪影（Animeeple）、工坊设施版画及 7 大流派印章均为独立手绘与代码级几何编写；
- **2.5D 透视沙盘与动效引擎**：基于原生 CSS 3D Preserved Transforms 与 Web Animations API 独立编写；
- **纯物理算法音效（Procedural Audio）**：利用 WebAudio 实时滤镜与振荡器合成，零第三方音频黑盒，彻底消除商用侵权风险。

---

## 📄 开源许可

本项目前端代码、后端 Worker 架构、状态机引擎、SVG 美术矢量库与音效合成系统全量遵循 **[MIT License](LICENSE)** 开源协议，允许自由学习、修改与开源分发。
