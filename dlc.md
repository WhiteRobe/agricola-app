# Agricola DLC 调研 & 实施参考

本项目目前已完成游戏本体（标准家庭变体，14 轮 3×5 农场，1–4 人）。本文件汇总
**所有可能的扩展（DLC）**、评估每个的兼容性与实现成本、并记录**当前已落地的部分**和**后续推进顺序**。

---

## 0. 接入策略

- **房间级元数据**：`RoomState.dlc: { occupations: boolean, minorImprovements: boolean, moor: boolean, ... }`
  主持人在**新建房间时**通过弹出的「🚜 新建房间配置」对话框勾选（本房间一次性决定，不影响其它房间），
  下发到 `/api/host/create` → `/api/host/init` → `createGame(options)`。
- **全局公共池**：`v4` 起去掉主持人身份隔离，房间统一存于 Registry 的 `g:global` 池中（上限 10 间）。
  任何浏览器 / 任何身份都能看到同一组房间；任何人能创建、列出、删除房间。
  主持页 UI 移除身份 ID / 复制 / 找回原房间按钮。
- **每个房间独立配置**：不同房间可以分别勾选 / 不勾选 DLC。
  主持页没有"上次配置"记忆区，DLC 选择完全由弹窗独立完成（弹窗默认全不勾）。
- **引擎按开关**决定是否洗牌、发手牌、抽小发展卡、启用新行动格、新材料。
  这样同一份代码能跑出「入门款 / 入门+DLC / 标准游戏 / 标准+DLC」四档，
  老房间不受影响。
- **数据驱动**：卡牌全部放在 `src/game/dlc.ts`（引擎权威），
  配套精简 JS 副本 `public/js/dlc-data.js`（客户端 DOM 渲染 lookup）。
  后续扩卡时改 `dlc.ts` 一处，运行 `node scripts/sync-dlc.js` 自动重生成 JS 副本。
- **协议动作**：`ChooseOccupation` / `TakeMinorImprovement` / `UseMinorImprovement`
  都是新的 WS action type，引擎 `dispatchGame` 在 switch 里分发。
- **全局类 DLC**（如 Through the Seasons 改终局计分）会动 `scorePlayer` 这类共享路径，
  风险高于房间级；列入「待讨论」一档。
- **改动成本估算表**中的 ★ 是按这个口径打的。

---

## 1. 主流 DLC 总览（按可接入性 + 性价比排序）

| # | 扩展 | 类别 | 核心增量 | 实现成本 | 状态 |
|---|---|---|---|---|---|
| 1 | 🎴 职业（Occupations）+ 小发展卡（Minor Improvements） | 卡牌（房间级） | 开局发 7 选 1 张职业；场上抽 1 张小发展卡可抢 | ★ | ✅ **已上线**（v`994a2dfd`） |
| 2 | 🌍 World Championship Deck / Gamers' Deck | 卡牌（房间级） | 8 套预组职业 / 8 套预组小发展卡 | ★ | ⏳ 占位 |
| 3 | 🌲 Farmers of the Moor（荒野之地） | 机制（房间级） | 燃料 / 干草 / 沼泽 + 4 张新大改进 + 收获阶段 2 步 | ★★★ | ✅ **已上线** |
| 4 | 📅 Through the Seasons（节气） | 全局终局 | 改终局按轮数阶梯计分 | ★★ | ⏳ 占位 |
| 5 | 🎨 Decorated Farms / Christmas | 主题装饰 | 装饰卡 / 农场主题背景 / 边框 | ★ | ⏳ 占位 |
| 6 | Family A / B / C / D 变体 | 全局预设 | 季节 / 永久卡 / 起始资源等基调切换 | ★★★ | 待讨论 |
| 7 | Anniversary Edition | 整合包 | 把 Moor + 卡组 + 装饰合一 | 取决于 2+3+5 | 待讨论 |
| 8 | 任何 L 公司 / 慈善 / 周年纪念附加包 | 卡片 / 装饰 | 装饰卡 / 新增职业 / 周边 | ★ | 待讨论 |
| 9 | Agricola: The Card Game | 独立游戏 | 改用卡牌而非物理版块 | 不可用 | 不做 |

---

## 2. 已落地：DLC #1（职业 + 小发展卡）

**改动文件**

| 文件 | 改动 |
|---|---|
| `src/game/dlc.ts` | DLC 配置类型、48 张经典官方职业卡池（7 大流派）、12 张小发展卡、抽卡工具 `sample()` |
| `src/game/engine.ts` | PlayerState 加 `occupation` / `occupationHand` / `minorImprovements`；GameState 加 `dlc` / `minorImprovementCards`；挂钩 48 张职业卡完整效果（每轮自然产出、行动格加成、建房/翻修/大改进折扣、烤面包/烹饪食物倍增、收获阶段奖励、终局计分突破） |
| `src/dos.ts` | RoomState 加 `dlc` 字段；`/init` 接收 dlc；`/peek` 回传 dlc |
| `src/index.ts` | `/api/host/create` 接收 dlc 并下发；`/api/host/list` 在房间快照里附带 dlc |
| `public/js/dlc-data.js` | 客户端 48 张职业 + 小发展卡 lookup（精简 JS 副本） |
| `public/js/game.js` | 玩家卡加「职业 / 小发展卡」tag；新建手牌选职业面板；行动板支持 3-Tab 内部分页；新增 `renderMinorCards` 行动格 |
| `public/js/host.js` | 创建房间时收集勾选；列表里带 DLC 的房间显示「🎴 含 DLC」徽章 |
| `public/host.html` | 「⚙ 启用扩展（DLC）」折叠勾选区 |
| `public/css/main.css` | `.dlc-grid` / `.dlc-opt` / `.occ-card` / `.minor-card` / `.dlc-panel` 等样式 |
| `test/engine.mjs` | 新增职业系统测试（木匠减免、柴夫额外木、伐木工每轮自然产出、学者导师终局加分等） |

**用户流程**

1. 主持人在「我的房间」卡片底部展开「⚙ 启用扩展（DLC）」，勾选「🎴 职业 + 小发展卡」
2. 创建房间 → 房间元数据带 `dlc: { occupations: true, minorImprovements: true }`
3. 玩家加入 → 玩家卡下方出现「🎴 从手牌 7 选 1 张职业」面板（点击直接进 WS）
4. 行动板顶部新增「🎴 小发展卡」一行可抢卡，点击消耗 1 名工人
5. 玩家卡库存下方多出「🎴 职业」/「🎴 小发展卡」tag，悬浮显示效果说明与生效数值
6. 职业效果全部在引擎核心循环中实时结算：回合初自增、拿取行动附加、建造折减、烹饪增益、收获阶段补贴、终局计分加成

**协议边界与完整规则**

- 「选职业」不消耗工人，可在开局阶段手牌 7 选 1（开局弹窗，选定后锁定）。
- 「职业卡池」全面扩充至 48 张经典《农家乐》职业，涵盖 7 大流派：
  1. 基础资源流派（伐木工、泥瓦工、芦苇工、石匠、柴夫、运泥工、采石工、林业管理员、采菇人）
  2. 农耕种植流派（谷物商人、粮商种子贩、犁地工、播种者、看田人、捕鼠人）
  3. 牲畜畜牧流派（牧羊人、养猪人、牧牛人、兽医、修篱人）
  4. 建造翻修流派（木匠、砌砖工、车匠、房屋翻修匠、桶匠、铁匠）
  5. 饮食烹饪流派（渔夫、猎人、日工助手、面包师傅、磨坊主、酿酒师、养蜂人、屠夫、制革匠、草药师、主厨、制篮工、烧炭人）
  6. 运营家庭流派（乳母、旅店老板、季节工、仓库管理员、农工）
  7. 终局计分流派（学者导师、村中长者、建筑总监、房产中介）
- 所有职业卡的被动、主动触发、消耗折扣与加分项全部在 `src/game/engine.ts` 中完成自动化规则判定。
- 一次性卡（井 +1、市集 +3、厨助 +2）已经在引擎内立即结算并从场上移除。

**测试**

- 引擎 `139/139` 全部通过（含 48 张职业卡机制、Moor 沼泽燃料干草机制）
- WebSocket 冒烟 + 14 轮双真实玩家端到端全通过
- `tsc --noEmit` 干净通过

**前置 bug 修复（顺手）**

- `loading.js` 的 `unlock()` 会无脑还原按钮文字和 `disabled`，覆盖掉「已达上限」的新渲染。
  改成只在按钮仍停在 loading 文案时才还原；满额时按钮正确显示「已达上限（N/10）」并禁用。

---

## 2.0 主持页：新建房间配置弹窗

### 规则

**主持人点「＋ 新建房间」不会立刻发请求**，而是先弹出「🚜 新建房间配置」对话框：

- 对话框列出当前可勾选的 DLC（已实现的：职业 + 小发展卡；其余占位 disabled 标「待开发」）
- 主持人可勾选 / 不勾选、点「✓ 创建房间」才真正调 `/api/host/create`
- 「取消」/ 右上角 × / Esc / 点背景均关闭弹窗，**不创建房间**

**每个房间的 DLC 勾选状态是独立的**：
- 同一主持人可以为不同的房间分别选 / 不选 DLC
- 旧的房间不会因主持人后来改了选择而变动
- 弹窗默认全不勾；本次选择只决定「这一次点击确认」的房间

### 实现位置

- `public/js/host.js` `openRoomConfigModal()`：弹窗主体，列出可勾选 DLC
- `public/js/host.js` `confirmRoomConfig()`：收集勾选 → 关闭弹窗 → 调 `createRoom({ dlc })`
- `public/js/host.js` `createRoom(opts)`：只接受显式参数；弹窗传入 dlc，没有 fallback 记忆

---

## 2.1 DLC 规则说明（玩家面板）

### 规则

**只要房间启用了任何 DLC（`occupations` / `minorImprovements` 任一为 true），玩家页会出现两处「🎴 DLC 规则」入口：**

1. **顶层右上角**：游戏顶栏右侧（紧贴时间表），点击从右侧抽屉打开本局 DLC 说明
2. **悬浮球（🧰）**：菜单里多出一项「🎴 DLC 规则」按钮

抽屉顶部列出本房间**实际启用的** DLC 清单（其它已发布但本局没勾的不出现，避免新人误读）。每个已勾选的 DLC 单独一节，写明核心机制 / UI 入口 / 本集合精简子集规模与**已知简化**。

**未启用任何 DLC 的房间不显示任何 DLC 规则入口**。

### 关闭方式

右上角 ×、点击背景、Esc（与「📖 游玩教程」抽屉一致）。

---

## 2.2 DLC 职业选框（玩家面板）

### 规则

**职业只能选一次，且没有换卡入口**（已选后不再弹窗、不再提供「换」按钮）。

- **首次进入游戏界面时自动弹一次弹窗**（450ms 后，等入场动画结束），手牌 7 张 → 选 1 张 → 关闭弹窗
- 选过的职业只显示在玩家卡的「🎴 职业」tag 区，**没有「换」按钮、也没有重新弹窗的入口**
- **未启用 occupations DLC** 的房间：整个机制不可见，没有弹窗、没有「换」按钮
- **未启用 minorImprovements DLC** 但启用了 occupations：仍按上述流程

### 不做什么

- 不会在主界面常驻 7 张手牌面板（用户反馈：占空间）
- 选完后不偷偷清除手牌 —— 引擎保留 `p.occupationHand`，但客户端不再触发第二次弹窗
- 不提供换卡 / 重选 / 反悔按钮 —— 避免选完又改反而增加摩擦
- 不会强制让其它玩家等你选完 —— 原版规则就是各自选

### 实现位置

- `public/js/game.js` `renderGame()` 末尾：检测 `dlc.occupations && me.role === "player" && !myPlayer.occupation && occupationHand.length > 0`，自动 `setTimeout(openOccupationPicker, 450)`
- `public/js/game.js` `openOccupationPicker()`：复用 `openModal` 模板，列出 7 张手牌，点击调 `ChooseOccupation` action；**前置守卫**：已选过则直接 return 不弹
- 引擎层：`ChooseOccupation` action 仍然接收新 id（保留为未来可能的「重抽手牌」/「换职业」机制入口），客户端当前不调用

---

### 设计动机

之前玩家卡上有「🎴 职业」/「🎴 小发展卡」tag 与「从手牌 7 选 1」面板，但新玩家不知道这些是干嘛的、能干什么。**把说明就近放在游戏里**（一个按钮直达），比塞进首页通用教程更准——只展示本房间启用的部分，避免引入未用规则。

---

## 3. 待落地：DLC #2（World Championship Deck / Gamers' Deck）

**玩法**

8 套预组（每套 ~ 7 张职业 + 4 张小发展卡），开房时挑 1 套作为本局的卡池。

**改动成本 ★**

1. `src/game/dlc.ts` 加 `PRECON_DECKS: Record<string, { occupations: Occupation[]; minorImprovements: MinorImprovement[] }>`
2. `public/js/dlc-data.js` 同步 JS 副本
3. RoomState 加 `dlc.deck: string` 字段
4. 主持页：勾选「预组卡组」时多一个下拉选择具体套牌
5. 引擎：`createGame` 按 `dlc.deck` 选卡池

**风险**：纯数据扩展，不动引擎。

---

## 2.3 已落地：DLC #3（Farmers of the Moor 荒野之地）

**改动文件**

| 文件 | 改动 |
|---|---|
| `src/game/constants.ts` | 5 张 Moor 专属大改进；`MOOR_W/HOOR_H/HOOR_MAX_RECLAIMED/MOOR_FUEL_PER_FAMILY/MOOR_HAY_PER_CATTLE` 常量 |
| `src/game/dlc.ts` | `DlcConfig.moor: boolean`（与 occupations/minorImprovements 并列） |
| `src/game/engine.ts` | `PlayerState` 加 `fuel / hay / moorFields`；`GameState` 加 `moorBoard / moorFuelPile / moorHayPile`；`createGame` 初始化新字段；`dispatchAction` 加 5 case：`GatherFuel` / `CutMeadow` / `ReclaimMoor` / `SowMoor` / `HarvestMoor`；`runHarvest` 在繁殖阶段之后加 2 步（燃料取暖 + 喂干草）；`roundCardFor` 增 3 张 Moor 回合卡；`scorePlayer` 把私有田 + 自己撒过种的沼泽田合并计 fields break-point |
| `src/dos.ts` | `RoomState.dlc.moor` 字段；`/init` 与 `/peek` 透传 |
| `src/index.ts` | `/api/host/create` 与 `/api/host/list` 透传 moor |
| `public/host.html` | moor 勾选框从 disabled 改为可选 |
| `public/js/host.js` | 新建房间弹窗加 moor 勾选；hint 文案更新；提交 dlc.moor |
| `public/js/game.js` | 玩家状态条加 fuel/hay；行动板加「🌲 Moor」燃料堆/干草堆行 + 4×4 沼泽板；拓荒/撒谷/撒菜按钮 + 选中态；DLC 规则按钮条件加 moor |
| `public/js/tutorial.js` | DLC 抽屉增加 Moor 章节 + TOC 项 + 顶部条件 |
| `public/css/main.css` | `.moor-board-wrap` / `.moor-board` / `.moor-cell` / `.moor-actions` / `.moor-banner` / `.stock-moor` 样式 |
| `test/engine.mjs` | 新增 22 条 Moor 断言：累积堆 + GatherFuel + CutMeadow + ReclaimMoor + SowMoor + 资源校验 + 收获阶段乞讨/牛死 + scorePlayer 字段计分 + 未启用拒绝 |

**用户流程**

1. 主持人在「🚜 新建房间配置」弹窗勾选「🌲 Farmers of the Moor」
2. 玩家加入 → 玩家卡顶部「🔥 燃料 / 🌾 干草」两格可见
3. 行动板多出「🌲 Farmers of the Moor」一行（燃料堆 / 干草堆各 1 张卡，点击拿走全部累积）
4. 行动板再下方 4×4 公有沼泽板：点格子选中，弹「🌱 拓荒」（1 木 + 1 芦苇 + 1 燃料奖励）/「🌾 撒谷」「🥕 撒菜」按钮
5. 自己撒过种的沼泽田，收获阶段自动按 marker 收 1 个谷/菜，计入 fields break-point
6. 每收获轮：先字段 → 再喂养 → 再繁殖 → **再沼泽收获** → **再燃料取暖**（缺 = 乞讨卡）→ **再喂牛**（缺 = 牛 -1）

**规则要点（实现细节）**

- **每名家人 1 燃料/轮**（取暖炉大改进：本玩家本轮只烧 1 燃料，不论家人数）
- **每头牛 1 干草/轮**（干草不足直接牛 -1，跑回 supply；不生成乞讨卡）
- **fuel/hay 累积堆每轮 +1**（与资源/动物市场的「拿走全部」规则一致）
- **ReclaimMoor**：消耗 1 木 + 1 芦苇（按修订版）；奖励 +1 燃料（拓荒奖励）
- **SowMoor**：撒谷 3 markers / 撒菜 2 markers；记录 `sownBy` 给后续计 fields 用
- **HarvestMoor**：每收获轮对每个玩家扫一遍他撒过种的沼泽田，按 marker -1
- **公有沼泽一次开垦不可逆**（直到 marker 用完可重新被任何人撒种）

**Moor 专属大改进（5 张，仅 moor 房可用）**

| id | 成本 | vp | 效果 | 实现 |
|---|---|---|---|---|
| `heatingStove` 取暖炉 | 3 石 + 2 木 | 2 | 每轮只消耗 1 燃料 | ✅ 已实装 |
| `peatKiln` 泥炭窑 | 2 陶 + 1 木 | 2 | 收获 +1 燃料 | ⏳ 占位（数据已在） |
| `moorCook` 沼泽灶 | 2 石 + 1 木 | 3 | 烹饪无需壁炉 | ⏳ 占位 |
| `tileOven` 瓷砖烤炉 | 3 石 + 2 陶 | 3 | 烤面包 +1 谷 | ⏳ 占位 |
| `firewood` 柴火棚 | 2 石 + 2 芦苇 | 2 | 终局按燃料残留加分 | ✅ 已实装 |

**Moor 专属回合卡（与 base 回合卡并行揭示，永久保留）**

- 第 2 轮：GatherFuel
- 第 4 轮：ReclaimMoor（首次）
- 第 7 轮：CutMeadow（首次）
- 第 10 轮：ReclaimMoor（第二次）
- 第 12 轮：GatherFuel
- 第 13 轮：CutMeadow

**协议边界 / 已知简化**

- **未导入 Moor 自带的 20 张职业 / 15 张 Minor Improvement**：与现有精简子集重叠。玩家继续用现有 18 + 12 张，不引入 Moor 专属职业 / 小发展卡
- **沼泽板始终公有**：任何人都可以点击任何格撒种（先撒种者先占）
- **Moor 与「职业 + 小发展卡」可叠加勾选**：互不冲突，UI 上 4 张大改进池加入 Moor 5 张（回合卡揭示时随机抽）
- **Moor 大改进的「peatKiln」/「moorCook」/「tileOven」效果暂未触发结算**：仅作为数据条目存在；玩家看到效果描述但实际计算未联动（待 P3+ 优化）
- **Moor 房间的 `occupations.minorImprovements` 不强联动**：勾了 Moor 后不强制要求 occupations；玩家可以只玩 Moor 不玩职业

**测试**

- 引擎测试 `123/123`（Moor 部分 22 条断言全绿；基线 101 条不变）
- WebSocket 冒烟 + 14 轮端到端全通过（含 Moor 路径）
- `tsc --noEmit` 干净

---


## 5. 待落地：DLC #4（Through the Seasons 节气）

**玩法**

终局按玩家「进入收获阶段的次数」阶梯计分，越早被强制收获（无食物）越亏。

**改动成本 ★★**

1. PlayerState 加 `harvestCount: number`
2. `runHarvest` 入口 +1
3. `scorePlayer` 加 season 计分项（需要查具体表，BGA 有）
4. UI：排行榜加 season 分项

**风险**：动 `scorePlayer`（全局），可能与 #5 冲突。

---

## 6. 待落地：DLC #5（Decorated Farms 装饰农场）

**玩法**

纯装饰：农场背景切换、边框装饰、卡片样式切换。无机制影响。

**改动成本 ★**

1. RoomState 加 `dlc.theme: "default" | "spring" | "autumn" | "winter" | "christmas"`
2. `public/css/game.css` 加主题变体（CSS 变量替换颜色 / 背景）
3. 主持页：勾选主题下拉

**风险**：零。

---

## 7. 待落地：DLC #6（Family A / B / C / D 变体）

**玩法**

标准版 vs 家庭变体之间的过渡档：
- Family A：4 个季节卡
- Family B：3 个季节卡 + 一些大发展卡
- Family C：2 个永久卡
- Family D：纯大发展卡

**改动成本 ★★★**

1. `src/game/constants.ts` 加 `FAMILY_VARIANTS` 配置
2. RoomState 加 `familyVariant` 字段
3. 引擎：`STAGE_OF_ROUND`、`HARVEST_AFTER`、`MAJOR_IMPROVEMENTS` 子集按变体切换
4. 主持页：选 Family 预设

**风险**：和「游戏模式」选项重复，建议**合并**成同一个 dropdown「规则预设：入门款 / 家庭变体 / Family A / Family B / Family C / Family D」。

---

## 8. 后续计划

| 顺序 | DLC | 难度 | 备注 |
|---|---|---|---|
| 1 | ✅ DLC #1 职业 + 小发展卡 | ★ | 已上线 |
| 2 | 🎨 DLC #5 装饰农场 | ★ | 下一步，纯装饰 / 零风险 |
| 3 | 🌍 DLC #2 预组卡组 | ★ | 数据扩展 |
| 4 | 📅 DLC #4 节气 | ★★ | 动终局计分 |
| 5 | 🌲 DLC #3 荒野之地 | ★★★★ | 大改，但提升最大 |
| 6 | Family 变体预设 | ★★★ | 整合到「规则预设」下拉 |
| 7 | Anniversary 整合 | 取决于前置 | 最后做 |

---

## 9. 维护

### 添加新卡牌

1. 在 `src/game/dlc.ts` 的 `OCCUPATIONS` 或 `MINOR_IMPROVEMENTS` 数组里加一条
2. 运行 `node scripts/sync-dlc.js`（待做） → 自动重生成 `public/js/dlc-data.js`
3. 引擎若需要支持新效果，在 `chooseOccupation` / `takeMinorImprovement` /
   `handleTake` / `runHarvest` 里加分支
4. 写测试用例

### 待办（基础设施）

- [ ] `scripts/sync-dlc.js`：自动从 `dlc.ts` 抽出卡牌数据生成 `public/js/dlc-data.js`
- [ ] `dlc.ts` 的 import 路径统一：把卡牌从 dlc.ts 单独抽出 `dlc-data.ts`，避免双副本
- [ ] 主持页「启用扩展」面板的样式优化：当前为折叠 details，可以升级成 modal
---

## 10. 规则对账（2026-09 vs andyventure.com 修订版）

按 https://andyventure.com/boardgame-agricola/ 重新通读修订版规则书后，做了以下「本体」修正：

### 修正前 → 修正后

| 项 | 修正前（经典版 / 自创） | 修正后（修订版） |
|---|---|---|
| 菜地开放轮 | 第 8 轮 | **第 4 轮** |
| 石场开放轮 | 第 9 轮 | **第 4 轮** |
| 羊市开放轮 | 第 5 轮 | **第 4 轮** |
| 猪市开放轮 | 第 9 轮 | **第 8 轮** |
| 牛市开放轮 | 第 13 轮 | **第 12 轮** |
| 钓鱼每轮产出 | +2（含已删除的 Traveling） | **+1** |
| 烹饪（壁炉） | 1 谷 → 2 食物 | **2 谷/菜/羊/猪 → 1 食物；3 牛 → 1 食物** |
| 烹饪（烹饪灶） | 1 谷 → 3 食物 | **1 谷/菜/羊/猪 → 2 食物；3 牛 → 2 食物** |
| 计分 off-by-one | 谷 2 颗已得 2 分 | **谷 0~3 = -1 / 4~5 = 1 / 6~7 = 2 / 8+ = 3 / 不适用（4 分档已并入）** |
| 阶段数 | 6 阶段 | **5 阶段**（S1=R1-4 / S2=R5-7 / S3=R8-10 / S4=R11-12 / S5=R13-14） |

### 计分阶梯（修订版，已同步到引擎 + 排行榜 + 教程）

| 项 | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| 🌾 谷 | -1 | 1-3 → 1 | 4-5 → 2 | 6-7 → 3 | 8+ → 4 |
| 🥕 菜 | -1 | 1 → 1 | 2 → 2 | 3 → 3 | 4+ → 4 |
| 🐑 羊 | -1 | 1-3 → 1 | 4-5 → 2 | 6-7 → 3 | 8+ → 4 |
| 🐗 猪 | -1 | 1-2 → 1 | 3-4 → 2 | 5-6 → 3 | 7+ → 4 |
| 🐄 牛 | -1 | 1 → 1 | 2-3 → 2 | 4-5 → 3 | 6+ → 4 |
| 田 | -1 | 1 → -1 | 2 → 1 | 3 → 2 | 4 → 3 / 5+ → 4 |
| 牧场 | -1 | 1 → 1 | 2 → 2 | 3 → 3 | 4+ → 4 |

### 修过的「本体」bug

1. **DLC 抽屉空白**：`openDlcDrawer` 的早退 guard 没考虑 moor-only 房间（`occupations=false && minorImprovements=false && moor=true` 直接 return），导致纯 Moor 房点「🎴 DLC 规则」抽屉空白。已修
2. **沼泽板布局溢出**：`.moor-board-wrap` 原 `grid-template-columns: 1fr 1fr` 在窄屏把按钮挤出。改为 `minmax(140px,180px) 1fr` + ≤960px 竖排
3. **栅栏段数确认**：核对后确认现有实现（每段 1 木，每角由 h/v 两位组成）与「每段 1 木」规则一致，无需改 countEdges

### 规则对账补遗（第二轮：协议层漏洞修复）

端到端全 DLC 测试（`test/ws-dlc.js`）跑出的两个协议层漏洞，已修：

1. **回合卡不校验揭示状态**：`dispatchAction` 之前不检查 `g.revealed`，伪造 WS 消息可以在第 1 轮使用「翻修/添丁/收燃料」等未揭示卡。已修：`dispatchGame` 对 `ROUND_CARD_SPACES`（栅栏/大改进/翻修/添丁/收燃料/拓荒/割草）统一校验「已揭示才可用」；非 Moor 房间不揭示 Moor 回合卡（`MOOR_ROUND_CARDS` 过滤）。
2. **Moor 行动不计入行动格占用**：`spaceOfAction` 之前漏了 `GatherFuel / CutMeadow / ReclaimMoor / SowMoor`，同一轮可以重复收燃料。已修：四个 Moor 行动各占独立行动格，每轮一次。

**测试矩阵（最终）**：

| 套件 | 数量 | 覆盖 |
|---|---|---|
| `test/engine.mjs` | 123 断言 | 引擎全量（base + 2 个 DLC 单元级） |
| `test/ws-smoke.mjs` | 22 断言 | 房间生命周期（加入/重连/解散） |
| `test/ws-fullgame.js` | 7 断言 | base 房 14 轮真实 WS 对局 |
| `test/ws-dlc.js` | 20 断言 | **全 DLC 房真实 WS 对局**（选职业→抢小发展卡→收燃料→割草→拓荒→沼泽撒种→收获扣燃料） |
