<div align="center">

# 🌾 农家乐 Agricola

### 网页版经典德式策略桌游《*Agricola: Revised Edition 2016*》

> Uwe Rosenberg 设计 · 1～4 人在线联机 · 浏览器即开即玩

<p>
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Workers"/>
  <img src="https://img.shields.io/badge/Durable_Objects-000000?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Durable Objects"/>
  <img src="https://img.shields.io/badge/Node-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/license-MIT-FF7139?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="License"/>
</p>

<p>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&logo=githubactions&logoColor=white" alt="Build"/>
  <img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/maintainer-active-success?style=flat-square" alt="Maintainer"/>
</p>

[🚀 立即试玩](https://farm.whiterobe.top) · [📖 玩法手册](#-游戏特色) · [🛠️ 本地开发](#-本地开发与测试) · [🐛 提 Issue](https://github.com/agricola-app/issues)

</div>

---

## 📑 目录

<details>
<summary><b>点击展开 / 收起目录</b></summary>

- [🌾 项目一览](#-项目一览)
- [🎮 游戏特色](#-游戏特色)
  - [1️⃣ 还原 2016 官方修订版规则](#1️⃣-还原-2016-官方修订版规则)
  - [2️⃣ 丰富的手牌与人数扩展](#2️⃣-丰富的手牌与人数扩展)
  - [3️⃣ 原生手绘矢量风格](#3️⃣-原生手绘矢量风格)
  - [4️⃣ 2.5D 立体沙盘与平面视角切换](#4️⃣-25d-立体沙盘与平面视角切换)
  - [5️⃣ 纯算法田园背景音乐与物理拟真音效](#5️⃣-纯算法田园背景音乐与物理拟真音效零外部音频文件)
  - [6️⃣ 便捷的多端适配与辅助工具](#6️⃣-便捷的多端适配与辅助工具)
- [🏗️ 系统架构与工程目录](#️-系统架构与工程目录)
  - [架构示意图](#架构示意图)
  - [目录结构](#目录结构)
- [💻 本地开发与测试](#-本地开发与测试)
- [☁️ 线上部署](#️-线上部署)
- [📜 规则参考与声明](#-规则参考与声明)
- [⚖️ 许可证](#️-许可证)

</details>

---

## 🌾 项目一览

| 🏷️ 项目标签 | 🌟 详情 |
|:---|:---|
| **🎲 游戏类型** | 德式策略桌游 · 工人放置 · 农场模拟 |
| **👥 玩家人数** | 1 ～ 4 人（动态行动板自适应） |
| **🖥️ 客户端** | 纯浏览器（手机 / 桌面），无需下载 App |
| **⚙️ 服务端** | Cloudflare Workers + Durable Objects（边缘部署） |
| **🎨 美术风格** | 中世纪版画 · 矢量绘制 · 2.5D 沙盘 |
| **🔊 音频方案** | 100% WebAudio 物理建模合成，零外部音频文件 |
| **⏱️ 对局时长** | 单局约 45 ～ 90 分钟（14 回合） |
| **📦 开源协议** | MIT |

> [!IMPORTANT]
> **这不是官方 Lookout Games 出品**，而是根据《Agricola: Revised Edition 2016》官方规则书独立实现的开源复刻（[MIT 协议](LICENSE)），所有矢量图标与音效均为原创代码生成。

---

## 🎮 游戏特色

### 1️⃣ 还原 2016 官方修订版规则

| 📌 核心机制 | 🔍 说明 |
|:---|:---|
| **🗓️ 回合推进** | 全场共 **14 轮、6 个阶段**，在第 `4 / 7 / 9 / 11 / 13 / 14` 轮结束后进入收获期 |
| **👷 工人放置** | 顺时针轮流派出；每个行动格每轮仅限 **1 人** 占用；持有起始标记的玩家 **不可连抢** |
| **🪵 资源累积** | 木材（每轮补 3 根）、陶土、芦苇、石材、钓鱼随轮次自动补给；谷物与蔬菜为固定获取格 |
| **🏡 家园开垦** | `3×5` 农庄空地开拓，支持木屋加盖，陶屋、石屋逐级翻修 |
| **🐑 牧场规则** | 自由形状连通牧场（L 型 / 凹凸型均合法）；圈地建马厩容量翻倍至 **每格 4 只**；空地独立马厩养 1 只并免荒地扣分；农舍自带宠物位免费寄养 1 只 |
| **🌾 收获闭环** | 田间收割 → 喂养家庭成员（成人 2 份 / 新生婴儿 1 份）→ 不足可宰牲畜 → 再不足罚发乞讨卡 → 同类满 2 只自然繁衍 |
| **🧮 终局计分** | 农田 · 牧场 · 作物阶梯 · 牲畜阶梯 · 房屋材质 · 家庭人口 · 马厩 · 工坊余量 · 荒地扣分 · 乞讨扣分，每项算分依据清晰 |

### 2️⃣ 丰富的手牌与人数扩展

<details>
<summary><b>🃏 点击查看手牌 & 人数扩展详情</b></summary>

- **88 张经典职业卡**：开局每人分发 **7 张职业 + 7 张小发展**，涵盖农耕、畜牧、建造、烹饪、运营等流派；工人格打出，首张免费，后续按规则支付口粮
- **小发展卡联动**：打出时校验前置房间数 / 职业数门槛并支付建材，包含即时物资与永久全场收益
- **动态行动板**：根据人数自动调整板面
  - `3 人局` → 额外补充 **4 个** 行动（灌木林、陶土矿、资源市场等）
  - `4 人局` → 额外补充 **6 个** 行动
- **可选扩展**：✅ 四季交替 · ✅ 荒野之地沼泽（开房时按需勾选）

</details>

### 3️⃣ 原生手绘矢量风格

- 🎨 **纯矢量组件绘制** — 告别表情符号拼贴感
  - `🪵` 木材年轮截面 · `🧱` 陶砖 · `🌾` 系绑芦苇捆 · `⛰️` 凿痕石材 · `🌾` 麦穗 · `🥕` 胡萝卜 · `🍞` 酸面包 · `🐑🐂` 木质牲畜剪影 · `🧍` 四色木人
- 🏛️ **中世纪版画风格大发展设施**
  - `辘轳水井` · `炭火壁炉` · `烹饪灶` · `烤炉` · `木工坊` · `陶器坊` · `编筐坊`
- 🌌 **古典四季农事星盘** — 17 世纪复古天文日历，14 个罗马数字扇区展示当前轮次进度与丰收倒计时

### 4️⃣ 2.5D 立体沙盘与平面视角切换

```text
       ┌─────────────────────┐         ┌─────────────────────┐
       │   📐 平面图纸视角    │  ⇄⇄⇄   │   🏞️  立体沙盘视角   │
       │   适合精密布局计算   │   自由   │   沉浸式中世纪氛围   │
       └─────────────────────┘   切换   └─────────────────────┘
```

- **双视角随时切换**：平面 ↔ 立体，设置自动保存在本地浏览器
- **立体厚度与朝向校正**：房屋地基微抬成厚度阴影，耕地自然下沉呈泥垄，作物 / 动物 / 圈舍均立于地块之上
- **微动效**：工人派遣划抛物线落入格子，资源飞入物资栏，麦浪微风与牲畜呼吸微动

### 5️⃣ 纯算法田园背景音乐与物理拟真音效（零外部音频文件）

> [!TIP]
> 全游戏 **不加载任何外部 MP3 / WAV / OGG**，零网络带宽消耗，不拖慢边缘加载。

<table>
<tr>
<th>🎵 BGM 引擎 <code>public/js/bgm.js</code></th>
<th>🔊 音效引擎 <code>public/js/sfx.js</code></th>
</tr>
<tr>
<td valign="top">

- 🪕 **古典鲁特琴** 拨弦（Karplus-Strong 变体）
- 🎶 **欧洲田园木笛** 带气息摩擦 + 5.2Hz 揉弦
- 🎻 **原声大提琴** 拨奏低音
- 🔔 **冰晶风铃** + **八音盒**
- 🎼 自然多利亚调式，4 小节无缝循环
- 🌀 **智能感知季节自适应变奏**

</td>
<td valign="top">

- 🏛️ **Convolver 卷积混响** 还原原木庄园挑高空间感
- 🎲 **±4% 频率扰动** 微随机抗听觉疲劳
- 🐑🐗🐄 **三类牲畜个性化木偶滑音**
- 🔥 柴窑微爆裂火星 + 深耕泥垄阻尼声
- 🟢 **右下角 FAB 悬浮球** 独立控制「🔊 音效」/「🎵 音乐」开关

</td>
</tr>
</table>

<details>
<summary><b>🌸🎵🎃❄️ 四季 BGM 节奏预览</b></summary>

| 🌸 季节 | 💓 BPM | 🎨 听感 |
|:---:|:---:|:---|
| 春 | `96` | 🌱 清盈生机 |
| 夏 | `104` | 🌾 丰饶麦浪 |
| 秋 | `88` | 🍂 沉静收获 |
| 冬 | `76` | ❄️ 飘雪静谧 |

毫秒级硬件时钟（Look-ahead Scheduler）防卡顿调度；切后台自动平滑淡出，切回前台自动平滑淡入。

</details>

### 6️⃣ 便捷的多端适配与辅助工具

- 📱 **手机与桌面全适配** — 棋盘自适应居中缩放；行动板分「资源与市场」「农事与建造」两页，启用沼泽扩展时增加「沼泽」页
- 🎓 **新手交互引导** — 高亮查看工人格说明与农场建设路径，支持随时退出
- 🔮 **右下角快捷工具球 FAB**
  - 📊 **实时榜单** — 全场排名与详细算分构成
  - 🎯 **流派打法** — 农耕 / 畜牧 / 造房添丁路线说明
  - 📦 **物资速查** — 建筑造价 / 牲畜容量 / 烹饪兑换比例
  - 📖 **规则手册** — 全中文精简规则与扩展说明
- 🔢 **4 位纯数字房间码** — 进房、观战与邀请均用 4 位数字，手机输入法直接敲数字即可进房

---

## 🏗️ 系统架构与工程目录

### 架构示意图

```text
                       ┌──────────────────────────────────────────────┐
                       │          Cloudflare Edge Network             │
                       │        (Workers + Durable Objects)           │
                       └──────────────────────┬───────────────────────┘
                                              │
              ┌───────────────────────────────┴───────────────────────────────┐
              ▼                                                               ▼
   ┌───────────────────────┐                                     ┌─────────────────────────┐
   │     静态资源服务      │                                     │     Worker 接入层       │
   │  HTML5 / CSS3 / ES-M  │                                     │   REST API + WS Gateway │
   └───────────────────────┘                                     └────────────┬────────────┘
                                                                              │
                                             ┌────────────────────────────────┴────────────────┐
                                             ▼                                                 ▼
                                  ┌────────────────────┐                            ┌─────────────────────┐
                                  │    Registry DO     │                            │       Room DO       │
                                  │ (全局单例注册中心)   │                            │ (每个房间独立实例)  │
                                  │ - 房间池分配与仲裁   │                            │ - WebSocket 睡眠唤醒 │
                                  │ - 4位纯数字匹配路由  │                            │ - 状态存储与事件广播 │
                                  └────────────────────┘                            └──────────┬──────────┘
                                                                                               ▼
                                                                                    ┌─────────────────────┐
                                                                                    │  src/game/engine.ts │
                                                                                    │  核心游戏规则状态机  │
                                                                                    └─────────────────────┘
```

| 🧩 模块 | 📍 文件 | 🎯 职责 |
|:---|:---|:---|
| 接入与路由 | `src/index.ts` | Cloudflare Workers 静态页面分发 + WebSocket 网关代理 |
| 状态存储 | `src/dos.ts` | 基于 Durable Objects 的房间空闲休眠 / 唤醒机制 |
| 核心逻辑 | `src/game/engine.ts` | 纯 TypeScript 规则状态机（行动校验 / 牧场连通 / 顺时针轮替 / 终局计分） |
| 前端实现 | `public/js/*` | 原生 JS 模块化，**不依赖任何大型前端框架**，图形与音效全用浏览器原生能力 |

### 目录结构

```text
agricola-app/
├── public/                  # 前端静态资源
│   ├── css/
│   │   ├── main.css         # 全局样式与基础排版
│   │   ├── game.css         # 农场棋盘、行动板与浮窗组件
│   │   └── anim.css         # 动效与过渡视觉
│   ├── js/
│   │   ├── play.js          # 客户端主入口与通信同步
│   │   ├── game.js          # 棋盘渲染、行动交互与计分板
│   │   ├── svg-icons.js     # 原生矢量 Token、动物模型与版画图标
│   │   ├── host.js          # 房主后台与房间管理
│   │   ├── tutorial.js      # 规则教学与扩展说明
│   │   ├── sfx.js           # 网页物理拟真音效系统
│   │   ├── bgm.js           # 纯算法中世纪田园背景音乐合成引擎
│   │   ├── ambient.js       # 四季氛围粒子系统
│   │   ├── fx.js            # 物资飞行动效
│   │   └── dlc-data.js      # 职业卡与发展卡数据
│   ├── index.html           # 首页与进房大厅
│   ├── host.html            # 房主控制台
│   └── play.html            # 游戏主对局界面
├── src/
│   ├── index.ts             # 路由分发与 API 网关
│   ├── dos.ts               # 注册中心与房间 Durable Objects
│   └── game/
│       ├── engine.ts        # 农家乐核心游戏引擎（回合推进、收获、计分）
│       ├── constants.ts     # 官方规则常量、计分阶梯与发展卡配置
│       ├── grid.ts          # 农田/房屋/牧场几何连通与闭合栅栏校验
│       └── dlc.ts           # 职业、小发展与扩展包规则逻辑
├── test/                    # 自动化测试套件（覆盖引擎规则与网络流程）
│   ├── engine.mjs           # 规则引擎与几何连通测试
│   ├── ws-smoke.mjs         # 房间生命周期与 WebSocket 冒烟测试
│   ├── ws-dlc.js            # 扩展规则端到端对局模拟
│   ├── ws-twoplay.js        # 双人 14 轮全行动自动化推进测试
│   └── ws-fullgame.js       # 单人 14 轮完整对局模拟
├── scripts/
│   └── sync-dlc.mjs         # dlc.ts → dlc-data.js 自动同步
├── wrangler.jsonc           # 部署配置文件
├── tsconfig.json            # TypeScript 编译配置
└── package.json             # 依赖与脚本
```

---

## 💻 本地开发与测试

> [!NOTE]
> 运行环境建议使用 **Node.js 20 及以上版本**。

### 🚀 快速开始

```bash
# 1️⃣ 安装依赖
npm install

# 2️⃣ 启动本地开发服务（运行在 http://127.0.0.1:8787）
npm run dev

# 3️⃣ 运行代码类型检查与全量规则测试（包含 310 项断言）
npm run typecheck
npm test
```

### 🧪 联机验证

本地启动后，可用 **两个不同的浏览器标签页** 或 **无痕窗口** 分别进入游戏房间，验证联机与顺时针轮流行动。

### 🃏 卡牌数据同步

职业与小发展卡以 `src/game/dlc.ts` 为数据源。`npm run dev` 和 `npm run deploy` 会自动更新前端使用的 `public/js/dlc-data.js`；单独修改卡牌时可运行：

```bash
npm run sync:dlc
```

---

## ☁️ 线上部署

项目配置适配 Cloudflare Workers 与 Durable Objects 边缘架构：

```bash
npm run deploy
```

> [!TIP]
> 默认路由配置在 `wrangler.jsonc` 中指向自定义域名 `farm.whiterobe.top`，部署前请按需调整。

---

## 📜 规则参考与声明

- 🎲 **桌游原作设计**：Uwe Rosenberg
- 📘 **规则参考标准**：Lookout Games 出版的《Agricola: Revised Edition 2016》官方规则说明书
- ⚖️ **版权声明**：本项目为非商业开源复刻实现，旨在提供流畅的线上游玩体验。界面中所有的矢量图形、卡牌排版与音效程序均为独立绘制与编码制作，**不包含官方出版物的扫描图样或商业音频素材**

---

## ⚖️ 许可证

<div align="center">

```
MIT License — 详见 LICENSE 文件
Copyright © 2026 WhiteRobe
```

</div>

---

<div align="center">

### 🌾 Happy Farming! 🌾

**愿你的农场五谷丰登，六畜兴旺。**

<sub>Made with ❤️ · 由 [Cloudflare Workers](https://workers.cloudflare.com/) 边缘驱动 · 由 [WebAudio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) 纯算法发声</sub>

</div>