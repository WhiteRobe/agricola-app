# 🌾 农家乐 Agricola · 电子桌游

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Durable Objects](https://img.shields.io/badge/Storage-Durable%20Objects%20SQLite-4B8BBE)](https://developers.cloudflare.com/durable-objects/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-140%20passed-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> 经典德式策略桌游《农家乐 / 农庄主》（*Agricola: Revised Edition 2016* by Uwe Rosenberg）高保真全功能电子化实现。  
> 原生运行于 **Cloudflare 全球边缘网络（Workers + Durable Objects + Static Assets）**，提供 **1–4 人联机对弈**、**纯数字房间匹配**、**实时旁观模式** 与 **极致移动端适配**。

🎮 **在线体验**：[https://farm.whiterobe.top](https://farm.whiterobe.top)  
👑 **全局主持管理台**：[https://farm.whiterobe.top/host](https://farm.whiterobe.top/host)  
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
- **🎴 48 张正统职业卡池（Occupations）**：
  - 涵盖农耕、畜牧、建造、烹饪、声望、资源等 7 大流派；
  - 开局 7 选 1 弹窗抽取，技能深度挂钩游戏引擎，全自动触发永久被动与即时收益；
  - 玩家卡区域以简洁 Tag 芯片展示，鼠标悬浮即弹出详细技能浮窗说明。
- **🎴 小发展卡（Minor Improvements）**：
  - 包含一次性爆发卡（水井、市集、厨助、大谷仓）与永久增益卡（柴堆、纺车、砖块、蜂箱、专用畜圈），抢入个人持有并即刻结算。
- **🌲 荒野之地（Farmers of the Moor）**：
  - 引入「🔥 燃料」与「🌾 干草」两大全新资源体系；
  - 新增 4×4 公有沼泽拓荒板，支持沼泽拓荒、公共播种与产出收割；
  - 每轮必须消耗燃料为房屋取暖，收获阶段必须为牛群提供干草；
  - 配套实装专属 5 张荒野大发展设施（取暖炉、泥炭窑、沼泽灶、瓷砖烤炉、柴火棚）。

### 3. 🎨 17 世纪质朴德式桌面美术
- **纯手绘级矢量资产引擎（`public/js/svg-icons.js`）**：
  - 告别系统 Emoji 拼贴感，全套纯 SVG 矢量 Token：截面年轮原木、烧结红陶砖、麻绳系绑芦苇捆、冷灰凿痕石材、金黄麦穗扎、带叶胡萝卜、土窑酸面包、泥炭块与干草卷；
  - 经典木质动物剪影 Animeeple（羊、猪、牛）与四色玩家木制工人米普（Meeple）；
  - 实体感房屋瓦片：橡木木屋板材、德式半木结构（Half-timbered）白灰陶屋、规整勾缝城堡石屋；
  - 真实犁沟土地与破土生长的麦苗/胡萝卜视觉标记。
- **古典四季天文时钟轮盘**：
  - 背景融合 17 世纪天文星盘与浑天仪日历，外环均匀雕刻 14 轮罗马数字（I 至 XIV），金麦徽饰清晰标注 6 次丰收倒计时。
- **亚麻布纹理与火漆印章**：
  - 发展设施与卡片加入细致亚麻布肌理与深红蜡油浮雕金字 VP 封蜡。

### 4. 📱 极致窄屏响应式与智能新手引导
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

### 5. 🧰 右下角聚合悬浮球（FAB）
- 随时唤出展开：
  - **🏆 实时排行榜**：动态展示全场排名与 13 项详细得分构成拆解；
  - **💡 流派玩法**：四大主力流派深度策略指引（农耕大户、畜牧繁衍、添丁工坊、荒野拓荒）；
  - **📋 价格/规则速查**：建造费用、牲畜容量、烹饪兑换汇率一目了然；
  - **🎴 DLC 规则抽屉**：纯中文精炼规则说明；
  - **📖 完整游玩教程**；
  - **🔊 纯 WebAudio 算法音效开关**（零音频文件依赖，纯合成器拟真）。

### 6. 🔒 4 位纯数字安全房间系统
- 邀请码、匹配码、旁观码全部统一为 **4 位纯数字随机码**（基于 Web Crypto API 强随机数模 10 算法，如 `8200`、`0120`）；
- 手机端数字键盘秒输，杜绝字符易混淆与中英全半角转换困扰；
- 全局 10 间共享房间池，任意设备随时主持、查看或一键解散。

---

## 🏗️ 架构设计与边缘技术栈

```text
                       ┌──────────────────────────────────────────────┐
                       │          Cloudflare Edge Network             │
                       │           (farm.whiterobe.top)               │
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

亦可运行端到端网络对局验证（支持传入自定义域名）：
```bash
# 测试本地或线上双人完整 14 轮推进
node test/ws-twoplay.js https://farm.whiterobe.top
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
  { "pattern": "farm.whiterobe.top", "custom_domain": true }
]
```

---

## 📜 规则参考与致谢

- **游戏设计**：Uwe Rosenberg
- **规则规范**：[Agricola: Revised Edition (Lookout Games, 2016)](https://boardgamegeek.com/boardgame/200680/agricola-revised-edition)
- **机制深度解析**：[AndyVenture 农家乐深度规则指南](https://andyventure.com/boardgame-agricola/)
- **扩展设计**：*Agricola: Farmers of the Moor*

---

## 📄 开源许可

本项目遵循 [MIT License](LICENSE) 开源协议。
