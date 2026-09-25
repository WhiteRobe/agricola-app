# 🌾 農家樂 Agricola · 电子桌游

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Durable Objects](https://img.shields.io/badge/Storage-Durable%20Objects%20SQLite-4B8BBE)](https://developers.cloudflare.com/durable-objects/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)

> 经典德式桌游《农家乐 / 农场主》（*Agricola: Revised Edition 2016* by Uwe Rosenberg）高保真电子化实现。  
> 运行于 **Cloudflare 全球边缘网络（Workers + Durable Objects + Static Assets）**，支持 **1–4 人联机对弈** 与 **无延迟实时旁观**。

🎮 **在线体验体验地址**：[https://farm.whiterobe.top](https://farm.whiterobe.top)  
👑 **全局主持控制台**：[https://farm.whiterobe.top/host](https://farm.whiterobe.top/host)

---

## 🌟 核心特性

- 👨‍🌾 **完整复刻 2016 官方修订版规则**：
  - 14 回合、5 个阶段、6 次收获（第 4、7、9、11、13、14 轮）。
  - 工人轮流行动，行动格互斥且先到先得；木/陶/苇/石/粮/菜/渔累积格自动自然增长。
  - 耕地、播种、收割、建造木屋/翻修陶屋石屋、生儿育女添丁。
  - 严格几何泛洪算法验证封闭栅栏牧场，自动计算每格动物容量（2 头/格）。
  - 阶段收获结算：田地收割 → 口粮喂养（缺粮产生乞讨卡，-3分/张）→ 双数成对繁衍。
  - 终局 13 维明细精准计分（农田、牧场、粮食蔬菜、牲畜分阶断点、房屋材质、家庭成员、未开发空地、大发展卡等）。
- 🧩 **模块化扩展包（DLC）灵活开关**：
  - **48 张经典官方职业卡池**：覆盖 7 大核心流派（基础资源、农耕种植、牲畜畜牧、建造翻修、饮食烹饪、运营家庭、终局计分），开局手牌 7 选 1 弹窗抽取，引擎核心深度挂钩自动结算。
  - **小发展卡（Minor Improvements）**：场上小发展卡动态抢购，提供多样化成长路线。
  - **荒野之地（Farmers of the Moor）**：新增公有 4×4 沼泽拓荒板、全新资源「燃料」与「干草」、收获阶段家人保暖与牛群草料喂养、专属 5 张沼泽大发展卡。
  - 严格隔离设计：所有扩展特性均有条件守卫，未开启时保证基础版 100% 纯净体验。
- 🛡️ **对局健壮性与防卡死安全阀（`autoPassStuck`）**：
  - 当行动格被占满且玩家无任何合法行动时，状态机智能判定跳过当前工人，彻底杜绝死锁。
- 👥 **灵活多样的对战与旁观机制**：
  - 支持 1–4 人模式；全员进入大厅后一键投票即可立即开启对局。
  - 独立 **4 位旁观码**：支持观众实时连入旁观，不占用玩家坐席；支持开局后加入自动转旁观。
  - **断线重连**：基于本地 Token 的无感重连恢复，保证移动端切屏不丢状态。
- 📱 **移动端优先的现代响应式交互**：
  - **行动板 3-Tab 内部分页**：科学划分「🌾 资源 & 市场」、「🎯 行动 & 回合卡」、「🌲 荒野之地」，彻底告别超长竖向滚动，窄屏极速切换。
  - **全新新手引导卡片**：无内部限高和滚动条，卡片自然完全展开，移动端自适应贴底无遮挡。
  - 移动端多 Tab 自由切换（行动看板、农场棋盘、资源仓库、操作日志）。
  - 95% 玻璃拟态半透明美学设计与四季动态时间轮盘。
  - 行动格防重复点击防抖、当前行动玩家醒目脉冲边框。
  - 基于 WebAudio 纯算法合成的轻量音效（放置声、回合提示、收获和弦）。
- 🌐 **全局公共主持系统**：
  - 全局 10 间共享房间池，任何浏览器均可直接查阅、管理或一键解散，无需绑定本地 Cookie。

---

## 🏗️ 架构与技术栈

```
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
                                  │ (全局单例注册中心)   │                            │ (每房间独占 SQLite)   │
                                  │ - 10 房间池全局仲裁  │                            │ - WebSocket 睡眠唤醒 │
                                  │ - 4位匹配/旁观码路由 │                            │ - 纯函数游戏引擎流转 │
                                  └────────────────────┘                            └──────────┬──────────┘
                                                                                               ▼
                                                                                    ┌─────────────────────┐
                                                                                    │  src/game/engine.ts │
                                                                                    │  确定性状态机与规则  │
                                                                                    └─────────────────────┘
```

- **后端运行时**：Cloudflare Workers (Edge Runtime)
- **长连接与状态持久化**：Cloudflare Durable Objects（启用 `new_sqlite_classes`，内存 SQLite 本地嵌入）
- **核心逻辑**：纯 TypeScript 编写的无副作用状态机与确定性离散事件流转
- **前端技术**：原生标准现代 Web API（HTML5、CSS Flex/Grid、ES Modules、WebSocket、WebAudio）

---

## 📂 项目结构

```text
agricola-app/
├── public/                  # 静态前端资源（Cloudflare Assets 直出）
│   ├── css/
│   │   ├── main.css         # 全局视觉、布局与拟态样式
│   │   ├── game.css         # 游戏棋盘、行动板与面板样式
│   │   └── anim.css         # 动画、光效与过渡
│   ├── js/
│   │   ├── play.js          # 玩家客户端主入口与 WebSocket 通信
│   │   ├── game.js          # 游戏内渲染、状态展示与行动派发
│   │   ├── host.js          # 主持端房间管理逻辑
│   │   ├── tutorial.js      # 互动新手教程与 DLC 手册抽屉
│   │   ├── sound.js         # WebAudio 算法音效生成器
│   │   └── dlc-data.js      # 发展卡与职业常量元数据
│   ├── index.html           # 首页（加入房间、旁观入口、教程）
│   ├── host.html            # 主持台管理页面
│   └── play.html            # 游戏主对局界面
├── src/
│   ├── index.ts             # Worker 路由分发网关
│   ├── dos.ts               # Registry DO 与 Room DO 实现
│   └── game/
│       ├── engine.ts        # 农家乐核心游戏引擎（14 轮流转、收获、计分）
│       ├── constants.ts     # 2016 修订版官方常量、计分断点、大发展卡
│       ├── grid.ts          # 农田/房屋/牧场几何连通与封闭栅栏校验
│       └── dlc.ts           # 扩展包逻辑（职业/小发展卡/荒野之地）
├── test/                    # 完整自动化测试套件
│   ├── engine.mjs           # 规则引擎与几何连通测试（134 项断言）
│   ├── ws-smoke.mjs         # 房间生命周期与 WebSocket 冒烟测试
│   ├── ws-dlc.js            # 全 DLC 开启端到端真实 WS 模拟对局
│   ├── ws-twoplay.js        # 双真实玩家 + 主持 14 轮全行动完整推进测试
│   └── ws-fullgame.js       # 单人 14 轮自动化完整跑通测试
├── dlc.md                   # 扩展包设计方案与详细规则说明文档
├── wrangler.jsonc           # Cloudflare 配置文件
├── tsconfig.json            # TypeScript 编译配置
└── package.json             # 依赖与脚本
```

---

## 🚀 本地开发与测试

### 1. 环境准备
确保已安装 Node.js 20+，并克隆本仓库：
```bash
git clone git@github.com:WhiteRobe/agricola-app.git
cd agricola-app
npm install
```

### 2. 运行本地模拟服务
使用 Wrangler 在本地启动 Cloudflare 模拟环境（Miniflare 提供本地 DO 与 Assets 支持）：
```bash
npm run dev
# 服务将运行于 http://127.0.0.1:8787
```

### 3. 类型校验
```bash
npm run typecheck
```

### 4. 运行全量测试套件
本项目包含覆盖率极高的规则引擎与真实网络端到端测试：

```bash
# 1. 运行底层规则引擎与栅栏拓扑单元测试（134 项全部通过）
node test/engine.mjs

# 2. 运行 WebSocket 房间与玩家生命周期冒烟测试
node test/ws-smoke.mjs

# 3. 运行全 DLC 扩展（职业+小发展+沼泽）端到端对局测试
node test/ws-dlc.js

# 4. 运行双真实玩家 14 轮端到端完整推进与计分测试
node test/ws-twoplay.js
```

> **提示**：测试脚本支持传入指定 URL，例如测试线上生产环境：
> ```bash
> node test/ws-twoplay.js https://farm.whiterobe.top
> ```

---

## ☁️ 生产部署

项目配置于 `wrangler.jsonc`，支持一键部署到 Cloudflare Workers：

```bash
npm run deploy
```

若需配置自定义域名，可在 `wrangler.jsonc` 中增加：
```jsonc
"routes": [
  { "pattern": "farm.whiterobe.top", "custom_domain": true }
]
```

---

## 📜 规则参考与鸣谢

- 游戏设计：Uwe Rosenberg
- 基础规则参考：[Agricola: Revised Edition (Lookout Games, 2016)](https://boardgamegeek.com/boardgame/200680/agricola-revised-edition)
- 规则解析与速查：[AndyVenture 农家乐深度规则指南](https://andyventure.com/boardgame-agricola/)
- 扩展设计参考：*Agricola: Farmers of the Moor*

---

## 📄 License

本项目采用 [MIT License](LICENSE) 开源协议。
仅供桌游爱好者学习、研究与个人娱乐使用，商业版权归属原版桌游发行方所有。
