// ============================================================
// 游戏棋盘 UI（v6：所有农场平铺 + 回合外框高亮 + 移动 tab）
// ============================================================
import { toast } from "/js/common.js";
import { escapeHtml, fmtTime } from "/js/dom.js";
import {
  pulseCount, cellPop, cellShine, fenceDraw, ripple,
  staggerIn, revealFlipIn, logStagger, classifyLog,
  showHarvestBanner, reducedMotion, bindRipples, viewportKind,
} from "/js/anim.js";
import { lock, unlock, run, debounce } from "/js/loading.js";
import { bindSfx, sfx, isSfxOn, toggleSfx } from "/js/sfx.js";
import { OCCUPATIONS, MINOR_IMPROVEMENTS } from "/js/dlc-data.js";

const ICONS = ["🧑‍🌾", "👩‍🌾", "🧑‍🍳", "👴"];
const PLAYER_COLORS = ["#e05d44", "#3f9d55", "#3d7ea6", "#d9932f"];

/** 客户端本地副本：DLC 卡牌 lookup（用于 DOM 渲染，权威数据由引擎持有） */
const OCC_LOOKUP = Object.fromEntries(OCCUPATIONS.map((o) => [o.id, o]));
const MINOR_LOOKUP = Object.fromEntries(MINOR_IMPROVEMENTS.map((m) => [m.id, m]));
function minorNameById(id) { return MINOR_LOOKUP[id] ? MINOR_LOOKUP[id].icon + " " + MINOR_LOOKUP[id].name : id; }
function minorEffectById(id) { return MINOR_LOOKUP[id] ? MINOR_LOOKUP[id].effect : ""; }

// 资源/行动图标 + 中文标签
const SPACES = [
  // 永远可用（累积型）
  { id: "Wood",      name: "木",       icon: "🪵", desc: "+1 木头",     pool: "wood", always: true },
  { id: "Clay",      name: "陶",       icon: "🧱", desc: "+1 陶土",     pool: "clay", always: true },
  { id: "Reed",      name: "芦苇",     icon: "🎋", desc: "+1 芦苇",     pool: "reed", always: true },
  { id: "Stone",     name: "石",       icon: "⛏", desc: "第 4 轮起+1 石", pool: "stone", fromRound: 4 },
  { id: "Grain",     name: "谷",       icon: "🌾", desc: "+1 谷",       pool: "grain", always: true },
  { id: "Vegetable", name: "菜",       icon: "🥕", desc: "第 4 轮起+1 蔬菜", pool: "vegetable", fromRound: 4 },
  { id: "Fishing",   name: "钓鱼",     icon: "🐟", desc: "+1 食物",     pool: "food", always: true },
  { id: "DayLaborer",name: "日工",     icon: "🛠", desc: "+2 食物（消耗 1 家人）", pool: "special", always: true },
  // 动物市场
  { id: "Sheep",     name: "羊市",     icon: "🐑", desc: "取走全部羊", pool: "sheep",  fromRound: 5 },
  { id: "Boar",      name: "猪市",     icon: "🐗", desc: "取走全部猪", pool: "boar",   fromRound: 9 },
  { id: "Cattle",    name: "牛市",     icon: "🐄", desc: "取走全部牛", pool: "cattle", fromRound: 13 },
  // ---- 常规行动：第 1 轮起永久可用 ----
  { id: "PlowField",     name: "犁地",       icon: "🌱", desc: "放一块田（须与现有田相邻）", alwaysAction: true },
  { id: "SowOrBake",     name: "撒种/烤面包", icon: "🌾", desc: "田里撒谷/菜，或用烤炉烤面包", alwaysAction: true },
  { id: "BuildRoom",     name: "建房间",     icon: "🏠", desc: "5 木/陶/石 + 2 芦苇，需邻接现有房间", alwaysAction: true },
  { id: "StartPlayer",   name: "起始玩家",   icon: "🚜", desc: "拿走起始玩家标记 +1 食物", alwaysAction: true },
  // ---- 回合卡行动：按轮次揭示 ----
  { id: "Fences",        name: "建栅栏",     icon: "🪵", desc: "围出矩形牧场（每段 1 木）", roundCard: true },
  { id: "FamilyGrowth",  name: "添丁",       icon: "👶", desc: "花 2 食物 + 1 间空房，家人 +1", roundCard: true },
  { id: "Renovate",      name: "翻修",       icon: "🔨", desc: "整栋翻修（每间 1 陶/石 + 1 芦苇）", roundCard: true },
  { id: "BuildMajor",    name: "大改进",     icon: "🔧", desc: "建造重大改进（先到先得）", roundCard: true },
];

// id → 中文名；用于把服务端揭示的英文 token 渲染成中文
const SPACE_NAME_ZH = Object.fromEntries(SPACES.map((s) => [s.id, s.name]));
const SPACE_NAME_FALLBACK = { Ore: "矿" };
function spaceName(id) { return SPACE_NAME_ZH[id] || SPACE_NAME_FALLBACK[id] || id; }

// 实时计分（与 src/game/engine.ts scorePlayer 同源；客户端实时显示）
const SCORE_T = {
  fields: [-1, -1, 1, 2, 3, 4],
  pastures: [-1, 1, 2, 3, 4],
  grain: [-1, 1, 2, 3, 4],
  vegetables: [-1, 1, 2, 3, 4],
  sheep: [-1, 1, 2, 3, 4],
  boar: [-1, 1, 2, 3, 4],
  cattle: [-1, 1, 2, 3, 4],
  unusedYard: -1, fencedStable: 1, clayRoom: 1, stoneRoom: 2, woodRoom: 0,
  familyMember: 3, begging: -3,
};
// 修订版上界 breaks（与引擎 constants.ts 一致）：最后一个 1000 表示「无穷」
const ANIMAL_BREAKS = { sheep: [0, 1, 4, 6, 1000], boar: [0, 1, 3, 5, 1000], cattle: [0, 1, 2, 4, 1000] };
function animalScoreT(t, n) {
  const b = ANIMAL_BREAKS[t];
  let i = 0;
  while (i < b.length - 1 && n >= b[i + 1]) i++;
  return SCORE_T[t][Math.min(i, b.length - 1)];
}
function scoreIdxT(n, breaks) {
  let i = 0;
  while (i < breaks.length - 1 && n >= breaks[i + 1]) i++;
  return Math.min(i, breaks.length - 1);
}
function liveScorePlayer(p) {
  const fields = p.grid.flat().filter(c => c.kind === "field").length;
  const pastures = p.pastures.length;
  const grain = p.resources.grain;
  const veg = p.resources.vegetable;
  const used = p.grid.flat().filter(c => c.kind === "field" || c.kind === "room").length + p.stables
    + p.pastures.reduce((s, ps) => s + ps.cells.length, 0);
  const breakdown = {
    "田块": SCORE_T.fields[Math.min(5, fields)],
    "牧场": SCORE_T.pastures[Math.min(4, pastures)],
    "谷物": SCORE_T.grain[scoreIdxT(grain, [0, 4, 6, 8, 1000])],
    "蔬菜": SCORE_T.vegetables[scoreIdxT(veg, [0, 1, 2, 3, 1000])],
    "羊": animalScoreT("sheep", p.animals.sheep),
    "猪": animalScoreT("boar", p.animals.boar),
    "牛": animalScoreT("cattle", p.animals.cattle),
    "陶屋": (p.roomType === "clay" ? p.rooms : 0) * SCORE_T.clayRoom,
    "石屋": (p.roomType === "stone" ? p.rooms : 0) * SCORE_T.stoneRoom,
    "木屋": (p.roomType === "wood" ? p.rooms : 0) * SCORE_T.woodRoom,
    "家人": p.family * SCORE_T.familyMember,
    "空地": used * SCORE_T.unusedYard,
    "乞讨": p.beggings * SCORE_T.begging,
  };
  return { id: p.id, name: p.name, total: Object.values(breakdown).reduce((a, b) => a + b, 0), breakdown };
}
function liveScores(g) {
  const arr = g.players.map(p => liveScorePlayer(p));
  arr.sort((a, b) => b.total - a.total);
  arr.forEach((s, i) => (s.place = i + 1));
  return arr;
}

// 季节：14 轮 → 春夏秋冬（1-4 春，5-7 夏，8-10 秋，11-14 冬）
function seasonOfRound(r) {
  if (r <= 4) return "spring";
  if (r <= 7) return "summer";
  if (r <= 10) return "autumn";
  return "winter";
}
const SEASON_LABEL_ZH = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
const SEASON_ICON = { spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };

let _state = null;
let _me = null;
let _conn = null;
let _selFences = new Set();
let _selCell = null;
let _prev = null;
let _activeTab = "common"; // 移动端默认 tab：公共面板（包含行动板）
let _showGuide = false; // 新手引导开关
let _guideStep = 0;
/**
 * 是否播放入场动画 —— 只在「首次渲染 / 玩家人数变化 / 切换 tab」时播放，
 * 避免每次行动后重渲染都重播动画（体感差）
 */
let _intro = true;
let _animKey = null;
/** DLC：是否已对当前房间弹出过「职业选框」（每位玩家各一次） */
let _occPromptedFor = null;
/** 栅栏编辑模式（不遮挡棋盘，选好后统一提交） */
let _fenceMode = false;
/** 当前渲染的农场上下文（用于局部刷新棋盘） */
let _farmCtx = null;

export function renderGame(root, s, me, conn) {
  _state = s; _me = me; _conn = conn;
  const prev = _prev;
  _prev = JSON.parse(JSON.stringify(s.game || {}));
  bindSfx(root);

  // 判断是否是新场景（决定要不要播入场动画）
  const gKey = s.game && s.game.players ? `${s.code}:${s.game.players.length}:${_activeTab}` : "none";
  if (_animKey !== gKey) { _intro = true; _animKey = gKey; } else { _intro = false; }

  // 音效：新回合 / 收获阶段
  const gNow = s.game;
  if (gNow && prev && gNow.round !== prev.round) sfx.turn();
  const lastMsg = gNow && gNow.log && gNow.log.length ? gNow.log[gNow.log.length - 1].msg : "";
  const prevMsg = prev && prev.log && prev.log.length ? prev.log[prev.log.length - 1].msg : "";
  if (/收获阶段开始/.test(lastMsg) && !/收获阶段开始/.test(prevMsg)) sfx.harvest();

  root.innerHTML = "";

  const g = s.game;
  if (!g || !g.players) {
    root.innerHTML = `<div class="card"><h3 class="mt0">正在加载游戏…</h3></div>`;
    return;
  }

  const myPlayer = me.role === "player" ? g.players.find(p => p.id === me.pid) : null;
  const myTurn = g.waitingFor[0] === me.pid;

  // 顶栏（轮次 + 阶段 + 季节 + 揭示 + 油量表）
  const season = seasonOfRound(g.round);
  const seasonInfo = SEASONS.find((s) => s.key === season);
  const top = document.createElement("div");
  top.className = "card mb16";
  top.style.padding = "12px 16px";
  top.innerHTML = `
    <div class="row spread" style="align-items:center">
      <div class="row" style="gap:10px; align-items:center; min-width:0; flex-wrap:wrap">
        <span style="font-size:18px">🎲</span>
        <strong>第 ${g.round} / 14 轮</strong>
        <span class="badge" style="background:${seasonInfo.tint};border-color:${seasonInfo.color};color:#5c4a2e">
          ${seasonInfo.icon} ${seasonInfo.label}季
        </span>
        <span class="badge gold">阶段 ${g.stage}</span>
        ${g.revealed.length ? `<span class="badge">可用回合卡：${g.revealed.map(spaceName).join(" · ")}</span>` : ""}
      </div>
      <div class="row" style="gap:8px; align-items:center">
        ${myTurn && !me.spectator ? '<span class="badge green anim-my-turn" style="display:inline-block">👉 该你行动</span>' : me.spectator ? '<span class="badge">👀 旁观模式</span>' : '<span class="badge">等待中…</span>'}
        ${myPlayer ? buildActionsLeft(g, myPlayer) : ""}
        ${buildGauge(g.round)}
        ${g.dlc && (g.dlc.occupations || g.dlc.minorImprovements || g.dlc.moor) ? '<button class="btn ghost small" id="btnDlcHelp" type="button">🎴 DLC 规则</button>' : ""}
      </div>
    </div>
  `;
  root.appendChild(top);

  // 季节主题 + 背景时间轮
  applySeasonTheme(g.round);

  // 右下角悬浮球（排行榜 / 新手引导 / 教程）
  ensureFab(g);

  // 移动端 tab bar（仅 < 768px 显示）
  if (viewportKind().startsWith("phone") || window.innerWidth < 768) {
    const tabs = document.createElement("nav");
    tabs.id = "mobileTabs";
    g.players.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.className = "m-tab" + (_activeTab === `p${i}` ? " sel" : "");
      btn.dataset.tab = `p${i}`;
      const isTurn = g.waitingFor[0] === p.id;
      btn.innerHTML = `${ICONS[p.seat] || "🙂"} ${escapeHtml(p.name)}${isTurn ? '<span class="turn-dot"></span>' : ""}`;
      btn.onclick = () => switchMobileTab(`p${i}`);
      tabs.appendChild(btn);
    });
    const commonBtn = document.createElement("button");
    commonBtn.className = "m-tab" + (_activeTab === "common" ? " sel" : "");
    commonBtn.dataset.tab = "common";
    const turnP = g.players.find(p => p.id === g.waitingFor[0]);
    commonBtn.innerHTML = `📋 公共${turnP ? ` · 轮到 <b>${escapeHtml(turnP.name)}</b>` : ""}`;
    commonBtn.onclick = () => switchMobileTab("common");
    tabs.appendChild(commonBtn);

    const logBtn = document.createElement("button");
    logBtn.className = "m-tab" + (_activeTab === "log" ? " sel" : "");
    logBtn.dataset.tab = "log";
    logBtn.innerHTML = "📜 日志";
    logBtn.onclick = () => switchMobileTab("log");
    tabs.appendChild(logBtn);

    root.appendChild(tabs);
  }

  // 主体布局（日志已独立成页，不再占用网格）
  const layout = document.createElement("div");
  layout.className = "game-layout";
  layout.innerHTML = `
    <div class="pairs" id="pairsGrid"></div>
    <div class="action-board" id="actionBoard">
      <h3>📋 行动板 <span class="head-info">轮到 <b id="turnName">●</b></span>${g.dlc && (g.dlc.occupations || g.dlc.minorImprovements) ? ' <span class="dlc-banner">🎴 DLC</span>' : ""}${g.dlc?.moor ? ' <span class="dlc-banner moor-banner">🌲 荒野之地</span>' : ""}</h3>
      ${g.dlc && g.dlc.minorImprovements ? `
      <div class="section-sub">🎴 小发展卡（抢一次入个人持有）</div>
      <div id="minorGrid" class="spaces-grid"></div>` : ""}
      ${g.dlc?.moor ? `
      <div class="section-sub">🌲 荒野之地（燃料 / 干草 · 每轮累积）</div>
      <div id="moorPileGrid" class="spaces-grid"></div>
      <div class="section-sub">🌱 沼泽板（公有 · 4×4 · 拓荒后撒种 / 收获）</div>
      <div class="moor-board-wrap">
        <div id="moorBoard" class="moor-board"></div>
        <div class="moor-actions">
          <button class="btn small" id="moorReclaimBtn" type="button" disabled>🌱 拓荒 (-1 木 +1 芦苇)</button>
          <div class="moor-actions-row">
            <button class="btn small" id="moorSowGBtn" type="button" disabled>🌾 撒谷</button>
            <button class="btn small" id="moorSowVBtn" type="button" disabled>🥕 撒菜</button>
          </div>
          <p class="muted moor-hint">先点沼泽格，再点拓荒或撒种按钮</p>
        </div>
      </div>` : ""}
      <div class="section-sub">🪵 永久资源格（每轮累积，取走全部）</div>
      <div id="alwaysGrid" class="spaces-grid"></div>
      <div class="section-sub">🌱 常规行动（第 1 轮起永久可用）</div>
      <div id="actionGrid" class="spaces-grid"></div>
      <div class="section-sub">🐑 动物市场（每轮 +1，取走全部 · 免费）</div>
      <div id="animalGrid" class="spaces-grid"></div>
      <div class="section-sub">🎴 回合卡行动（揭示后永久可用 · 每轮每格一次）</div>
      <div id="roundGrid" class="spaces-grid"></div>
    </div>
  `;
  root.appendChild(layout);

  bindRipples(root);

  // ★ 每个玩家一行：[stock | farm]，同一行内两张卡自动等高（改进 tag 增多也不会错位）
  renderPlayersAndFarms(layout.querySelector("#pairsGrid"), g.players, me, g.waitingFor[0], myTurn, myPlayer);

  // 行动板
  const focusPlayer = myPlayer || g.players[0];
  layout.querySelector("#turnName").textContent = (g.players.find(p => p.id === g.waitingFor[0]) || {}).name || "—";
  renderSpaces(layout.querySelector("#alwaysGrid"), g, focusPlayer, myTurn, "resource");
  renderSpaces(layout.querySelector("#actionGrid"), g, focusPlayer, myTurn, "action");
  renderSpaces(layout.querySelector("#animalGrid"), g, focusPlayer, myTurn, "animal");
  renderSpaces(layout.querySelector("#roundGrid"), g, focusPlayer, myTurn, "round");
  if (g.dlc?.minorImprovements) renderMinorCards(layout.querySelector("#minorGrid"), g, focusPlayer, myTurn);
  if (g.dlc?.moor) {
    renderMoorPile(layout.querySelector("#moorPileGrid"), g, focusPlayer, myTurn);
    renderMoorBoard(layout.querySelector("#moorBoard"), g, focusPlayer, myTurn);
    bindMoorActions(g, focusPlayer, myTurn);
  }
  // 顶栏「🎴 DLC 规则」按钮（仅在游戏内容渲染后存在）
  const btnDlc = document.querySelector("#btnDlcHelp");
  if (btnDlc) btnDlc.onclick = () => import("/js/tutorial.js").then((m) => m.openDlcDrawer(g.dlc));

  // 日志（独立面板：移动端 tab / 桌面抽屉）
  renderLogInto(layout.querySelector("#liveLog"), g.log, prev);
  refreshLogDrawer(g.log, prev);

  // 移动端面板可见性
  applyMobileTabVisibility();

  // diff 动画：资源数字脉冲
  if (!reducedMotion() && prev && g.players && prev.players) {
    layout.querySelectorAll(".resource-num").forEach((el) => {
      const key = el.dataset.key;
      const pid = el.closest(".col-card")?.dataset.pid;
      const oldPlayer = prev.players.find(p => p.id === pid);
      if (!oldPlayer) return;
      const newVal = parseInt(el.textContent, 10);
      const oldVal = key === "food" ? oldPlayer.food
        : key === "grain" ? oldPlayer.resources.grain
        : key === "vegetable" ? oldPlayer.resources.vegetable
        : oldPlayer.resources[key];
      if (Number.isFinite(newVal) && Number.isFinite(oldVal) && newVal > oldVal) pulseCount(el);
    });
  }

  // 收获横幅
  const lastLog = (g.log && g.log[g.log.length - 1]) || null;
  const isHarvestPhase = lastLog && /收获阶段开始/.test(lastLog.msg);
  if (isHarvestPhase && (!prev || !/收获阶段开始/.test(((prev.log && prev.log[prev.log.length - 1]) || {}).msg || ""))) {
    showHarvestBanner("收获阶段开始");
  }

  // 引导重新挂载（每次重渲染位置会变）
  if (_showGuide) renderGuide();
  // 栅栏编辑面板重挂载（重渲染会移除）
  if (_fenceMode) {
    if (!document.getElementById("fencePanel")) buildFencePanel();
    // 棋盘重建后恢复选中态视觉
    requestAnimationFrame(() => refreshFenceUI());
  }

  // DLC：开局每位玩家第一次进入时弹一次「职业选框」
  // （房间级开关 + 仅自己未选 + 仅对当前房间一次）
  if (
    g.dlc?.occupations &&
    me.role === "player" &&
    myPlayer &&
    !myPlayer.occupation &&
    Array.isArray(myPlayer.occupationHand) &&
    myPlayer.occupationHand.length > 0 &&
    _occPromptedFor !== s.code + ":" + me.pid
  ) {
    _occPromptedFor = s.code + ":" + me.pid;
    // 推迟一帧，等入场动画结束
    setTimeout(() => openOccupationPicker(), 450);
  }
}

// ---- 玩家 stock + farm：每个玩家输出一行（同一 grid 行内两张卡自动等高）----
function renderPlayersAndFarms(host, players, me, currentTurnId, myTurn, myPlayer) {
  host.innerHTML = "";
  players.forEach((p, i) => {
    const isMe = p.id === me.pid;
    const isTurn = p.id === currentTurnId;
    const card = document.createElement("div");
    card.className = "col-card" + (_intro ? " anim-pop-in" : "") + (isMe ? " me" : "") + (isTurn ? " is-current-turn" : "");
    card.dataset.pid = p.id;
    card.dataset.panel = `p${i}`;
    const stk = (key, ic, val, name, isNum = true) =>
      `<div class="stk" data-key="${key}" data-name="${name}">
         <span class="stk-ic">${ic}</span>
         <b class="stk-v${isNum ? " resource-num" : ""}" data-key="${key}">${val}</b>
       </div>`;
    card.innerHTML = `
      <h4>
        <span class="avatar" style="width:24px;height:24px;border-radius:6px;background:${PLAYER_COLORS[p.seat]};color:#fff;display:grid;place-items:center;font-size:13px">${ICONS[p.seat] || "🙂"}</span>
        <span class="nm">${escapeHtml(p.name)}</span>
        ${isMe ? '<span class="badge green">你</span>' : ""}
        ${isTurn ? '<span class="turn">行动中</span>' : ""}
      </h4>
      <div class="stock">
        <div class="stock-row stock-key">
          ${stk("food", "🍞", p.food, "食物")}
          ${stk("family", "👨‍👩‍👧", p.family, "家人", false)}
          ${stk("beggings", "🃏", p.beggings, "乞讨卡", false)}
        </div>
        ${_state.game.dlc?.moor ? `<div class="stock-label">荒野物资</div>
        <div class="stock-row stock-moor">
          ${stk("fuel", "🔥", p.fuel || 0, "燃料")}
          ${stk("hay", "🌾", p.hay || 0, "干草")}
        </div>` : ""}
        <div class="stock-label">建材</div>
        <div class="stock-row stock-mat">
          ${stk("wood", "🪵", p.resources.wood, "木材")}
          ${stk("clay", "🧱", p.resources.clay, "陶土")}
          ${stk("reed", "🎋", p.resources.reed, "芦苇")}
          ${stk("stone", "⛏", p.resources.stone, "石头")}
        </div>
        <div class="stock-label">农产品</div>
        <div class="stock-row stock-crop">
          ${stk("grain", "🌾", p.resources.grain, "谷物")}
          ${stk("vegetable", "🥕", p.resources.vegetable, "蔬菜")}
        </div>
        <div class="stock-label">牲畜</div>
        <div class="stock-row stock-animal">
          ${stk("sheep", "🐑", p.animals.sheep, "羊", false)}
          ${stk("boar", "🐗", p.animals.boar, "猪", false)}
          ${stk("cattle", "🐄", p.animals.cattle, "牛", false)}
        </div>
      </div>
      ${p.improvements.length ? `<div class="stock-imp">
        <span class="imp-tag-label">🔧 已建改进</span>
        <div class="imp-tags">${p.improvements.map(impTagHTML).join("")}</div>
      </div>` : ""}
      ${p.occupation ? `<div class="stock-imp">
        <span class="imp-tag-label">🎴 职业</span>
        <div class="imp-tags"><span class="imp-tag">${p.occupation.icon} ${escapeHtml(p.occupation.name)}<span class="imp-tip">${escapeHtml(p.occupation.effect)}</span></span></div>
      </div>` : ""}
      ${p.minorImprovements && p.minorImprovements.length ? `<div class="stock-imp">
        <span class="imp-tag-label">🎴 小发展卡</span>
        <div class="imp-tags">${p.minorImprovements.map((id) => `<span class="imp-tag">${minorNameById(id)}<span class="imp-tip">${minorEffectById(id)}</span></span>`).join("")}</div>
      </div>` : ""}
    `;
    host.appendChild(card);
    // 自己卡上的「可烹饪」改进标签 → 点击打开烹饪模态
    if (isMe) {
      card.querySelectorAll(".imp-tag-cook").forEach((el) => {
        el.onclick = () => openCookModal(el.dataset.imp);
      });
    }

    // ★ 紧接着输出该玩家的农场卡（同一行右侧，等高等宽自适应）
    const farmCard = document.createElement("div");
    farmCard.className = "farm-card" + (_intro ? " anim-pop-in" : "") + (p.id === currentTurnId ? " is-current-turn" : "");
    farmCard.dataset.pid = p.id;
    farmCard.dataset.panel = `p${i}`;
    const isMyFarm = p.id === myPlayer?.id;
    farmCard.innerHTML = `
      <div class="farm-head">
        <h3>${p.id === currentTurnId ? "👉 " : ""}🚜 ${escapeHtml(p.name)} 的农场${isMyFarm ? ' <span class="badge green">你</span>' : ""}</h3>
        <span class="muted" style="font-size:11px">${p.rooms} 间${houseLabel(p.roomType)}屋 · 剩余 ${Math.max(0, p.rooms - p.family)} 空房 · 乞讨 ${p.beggings} 张</span>
      </div>
      <div class="farm-board-wrap"></div>
    `;
    renderFarm(farmCard.querySelector(".farm-board-wrap"), p, isMyFarm && myTurn);
    host.appendChild(farmCard);
  });
}

// ---- 日志渲染（供独立面板 / 桌面抽屉共用）----
function buildLogHTML(log, prev) {
  const prevLogCount = prev ? (prev.log ? prev.log.length : 0) : 0;
  const recent = log.slice(-80);
  return recent.map((l, i) => {
    const absoluteIdx = log.length - recent.length + i;
    const isNew = absoluteIdx >= prevLogCount;
    const cls = classifyLog(l.msg);
    const clsAll = `li${isNew ? " new" : ""}${cls ? " " + cls : ""}`;
    return `<div class="${clsAll}"><time>${fmtTime(l.t)}</time><span class="msg">${escapeHtml(l.msg)}</span></div>`;
  }).join("");
}

function renderLogInto(el, log, prev) {
  if (!el) return;
  el.innerHTML = buildLogHTML(log, prev);
  if (!reducedMotion()) logStagger(el);
  el.scrollTop = el.scrollHeight;
}

// ---- 日志抽屉（桌面）----
let _logDrawerEl = null;
function openLogDrawer() {
  if (_logDrawerEl) return;
  const backdrop = document.createElement("div");
  backdrop.className = "tut-backdrop";
  backdrop.id = "logBackdrop";
  backdrop.onclick = closeLogDrawer;
  document.body.appendChild(backdrop);

  const d = document.createElement("aside");
  d.className = "log-drawer";
  d.innerHTML = `
    <div class="log-drawer-head">
      <h2 class="mt0 mb0" style="font-size:17px">📜 动态日志</h2>
      <button class="btn ghost small" id="logClose">关闭 ×</button>
    </div>
    <div class="log-drawer-body">
      <div class="mini-log" id="logDrawerBody"></div>
    </div>
  `;
  document.body.appendChild(d);
  _logDrawerEl = d;
  d.querySelector("#logClose").onclick = closeLogDrawer;
  requestAnimationFrame(() => { backdrop.classList.add("show"); d.classList.add("show"); });

  // 立即填充一次
  if (_state && _state.game) {
    renderLogInto(d.querySelector("#logDrawerBody"), _state.game.log, null);
  }
  document.addEventListener("keydown", onLogEsc);
}
function onLogEsc(e) { if (e.key === "Escape") closeLogDrawer(); }
function closeLogDrawer() {
  if (_logDrawerEl) {
    _logDrawerEl.classList.remove("show");
    const el = _logDrawerEl;
    _logDrawerEl = null;
    setTimeout(() => el.remove(), 280);
  }
  const b = document.getElementById("logBackdrop");
  if (b) { b.classList.remove("show"); setTimeout(() => b.remove(), 280); }
  document.removeEventListener("keydown", onLogEsc);
}
function refreshLogDrawer(log, prev) {
  if (!_logDrawerEl) return;
  const body = _logDrawerEl.querySelector("#logDrawerBody");
  if (body) renderLogInto(body, log, prev);
}

// ---- 油量表（小屏替代背景时间轮）----
/** 本轮剩余行动次数（每名家人 1 次；新生儿当轮不能工作） */
function buildActionsLeft(g, p) {
  const workers = Math.max(0, p.family - (p.babiesThisRound || 0));
  const used = g.placedThisRound.filter((x) => x === p.id).length;
  const left = Math.max(0, workers - used);
  const dst = Array.from({ length: workers }, (_, i) => i < used ? "used" : "left");
  return `<span class="actions-left" title="每名家人每轮提供 1 次行动">
    <span class="al-txt">本轮行动</span>
    <span class="al-dots">${dst.map((s) => `<i class="al-dot ${s}"></i>`).join("")}</span>
    <b>${left}</b><span class="al-of">/${workers}</span>
  </span>`;
}

function buildGauge(round) {
  const segs = [];
  for (let r = 1; r <= 14; r++) {
    const s = SEASONS.find((x) => r >= x.from && r <= x.to);
    const cls = "gauge-seg" + (r < round ? " on" : r === round ? " on now" : "");
    segs.push(`<span class="${cls}" data-s="${s.key}"></span>`);
  }
  const s = SEASONS.find((x) => x.key === seasonOfRound(round));
  return `<div class="gauge" title="第 ${round} / 14 轮 · ${s.label}季">
    <span class="gauge-track">${segs.join("")}</span>
    <span class="gauge-txt">${round}/14</span>
  </div>`;
}

// ---- 移动端 tab 切换 ----
function isNarrowLayout() { return window.innerWidth < 768; }

function switchMobileTab(tabId) {
  _activeTab = tabId;
  _intro = true;        // 切 tab 时播放入场动画
  _animKey = null;
  document.querySelectorAll(".m-tab").forEach((b) => b.classList.toggle("sel", b.dataset.tab === tabId));
  applyMobileTabVisibility();
}

function applyMobileTabVisibility() {
  const narrow = isNarrowLayout();
  if (!narrow) {
    // 宽屏：所有面板显示（日志面板由 CSS 隐藏，改走抽屉）
    document.querySelectorAll(".col-card[data-panel]").forEach((el) => el.classList.add("active"));
    document.querySelectorAll(".farm-card[data-panel]").forEach((el) => el.classList.add("active"));
    const actionBoard = document.getElementById("actionBoard");
    if (actionBoard) actionBoard.style.display = "";
    return;
  }
  // 窄屏：根据 _activeTab
  const activeTab = _activeTab;
  document.querySelectorAll(".col-card[data-panel]").forEach((el) => {
    el.classList.toggle("active", el.dataset.panel === activeTab);
  });
  document.querySelectorAll(".farm-card[data-panel]").forEach((el) => {
    el.classList.toggle("active", el.dataset.panel === activeTab);
  });
  const actionBoard = document.getElementById("actionBoard");
  if (actionBoard) actionBoard.style.display = (activeTab === "common" ? "block" : "none");
}

// ---- 农场渲染 ----
function renderFarm(wrap, p, myTurn) {
  wrap.innerHTML = "";
  const prevPlayer = (_prev && _prev.players) ? _prev.players.find((pp) => pp.id === p.id) : null;
  const board = document.createElement("div");
  board.className = "farm-board";
  const cellSize = getCellSize();
  board.style.setProperty("--cell", cellSize + "px");
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    const cell = p.grid[y][x];
    const el = document.createElement("div");
    el.className = "cell hoverable";
    let html = "";
    if (cell.kind === "room") html = `<span>${houseEmoji(p.roomType)}</span>`;
    else if (cell.kind === "field") {
      if (cell.crop === "grain") { html = `<span>🌾</span><span class="badge-cnt">×${cell.markers ?? 0}</span>`; el.classList.add("sown-g"); }
      else if (cell.crop === "vegetable") { html = `<span>🥕</span><span class="badge-cnt">×${cell.markers ?? 0}</span>`; el.classList.add("sown-v"); }
      else html = `<span>🌱</span>`;
    } else {
      const pasture = p.pastures.find(ps => ps.cells.includes(`${x},${y}`));
      if (pasture) {
        // 只有真的养了动物才显示动物图标；空牧场不显示（围完栅栏不会自动来动物）
        if (pasture.animal) {
          const ai = { sheep: "🐑", boar: "🐗", cattle: "🐄" }[pasture.animal];
          html = `<span style="opacity:0.6">${ai}</span>`;
        } else {
          html = `<span class="pasture-empty">牧场</span>`;
        }
      }
    }
    el.innerHTML = html;
    el.title = `(${x},${y}) · ${cell.kind}${cell.crop ? " · " + cell.crop : ""}${cell.markers ? " · markers=" + cell.markers : ""}`;
    el.dataset.x = x; el.dataset.y = y;
    if (myTurn && !_fenceMode) el.onclick = () => onCellClick(p, x, y, cell);
    board.appendChild(el);

    if (prevPlayer && prevPlayer.grid && prevPlayer.grid[y] && prevPlayer.grid[y][x]) {
      const prevCell = prevPlayer.grid[y][x];
      const key = `${x},${y}`;
      const nowSown = (cell.kind === "field" && !!cell.crop && !prevCell.crop);
      const cropChanged = (prevCell.crop !== cell.crop) && cell.crop;
      const pastureNow = (p.pastures.find(ps => ps.cells.includes(key)));
      const pasturePrev = (prevPlayer.pastures || []).find(ps => ps.cells.includes(key));
      const animalAdded = pastureNow && (!pasturePrev || pasturePrev.animal !== pastureNow.animal);
      if (nowSown) cellShine(el);
      else if (cropChanged) cellPop(el);
      if (animalAdded) cellPop(el);
      if (prevCell.kind !== cell.kind) cellPop(el);
    }
  }

  const fence = document.createElement("div");
  fence.className = "fence-layer";
  fence.style.gridTemplateColumns = `repeat(3, ${cellSize}px)`;
  fence.style.gridTemplateRows = `repeat(5, ${cellSize}px)`;
  const prevEdges = prevPlayer && prevPlayer.edges ? prevPlayer.edges : null;
  // 棋盘有 2px gap，栅栏层坐标必须计入，否则整圈偏移
  const GAP = 2;
  const step = cellSize + GAP;
  const editable = myTurn && _fenceMode;
  if (editable) fence.classList.add("editing");
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    // ---- 上边 h[y][x] ----
    const h = document.createElement("div");
    h.className = "seg fh";
    const hadH = prevEdges ? prevEdges.h[y][x] === true : false;
    const nowH = p.edges.h[y][x] === true;
    if (nowH && !hadH) queueFenceDraw(h);
    if (nowH) h.classList.add("built");
    if (_selFences.has(`h${x},${y}`)) h.classList.add("sel");
    // 段厚 14px，居中于格边（top edge of cell y）
    h.style.left = (x * step) + "px";
    h.style.top = (y * step - 7) + "px";
    h.dataset.edge = `h${x},${y}`;
    h.title = `横向栅栏 h${x},${y}`;
    // 已建好的栅栏不能再选（规则：栅栏不可拆除）
    if (editable && !nowH) h.onclick = (e) => { e.stopPropagation(); toggleFence("h", x, y); };
    fence.appendChild(h);
    // ---- 左边 v[y][x] ----
    const v = document.createElement("div");
    v.className = "seg fv";
    const hadV = prevEdges ? prevEdges.v[y][x] === true : false;
    const nowV = p.edges.v[y][x] === true;
    if (nowV && !hadV) queueFenceDraw(v);
    if (nowV) v.classList.add("built");
    if (_selFences.has(`v${x},${y}`)) v.classList.add("sel");
    v.style.left = (x * step - 7) + "px";
    v.style.top = (y * step) + "px";
    v.dataset.edge = `v${x},${y}`;
    v.title = `纵向栅栏 v${x},${y}`;
    // 已建好的栅栏不能再选（规则：栅栏不可拆除）
    if (editable && !nowV) v.onclick = (e) => { e.stopPropagation(); toggleFence("v", x, y); };
    fence.appendChild(v);
  }
  board.appendChild(fence);
  wrap.appendChild(board);
  // 记录上下文，供栅栏点选后局部刷新
  _farmCtx = { wrap, p, myTurn };
}

function queueFenceDraw(el) {
  requestAnimationFrame(() => fenceDraw(el));
}

function getCellSize() {
  const w = window.innerWidth;
  if (w < 380) return 38;
  if (w < 480) return 42;
  if (w < 768) return 50;
  // 桌面/平板：每个玩家独占一行，农场卡宽度 ≈ 视口 - 左栏 - 行动板 - 间距
  const avail = w - 220 - 340 - 60;
  if (avail >= 520) return 60;
  if (avail >= 420) return 56;
  if (avail >= 340) return 50;
  return 44;
}

// ---- 行动板渲染 ----
/**
 * 渲染行动格（整张卡可点）
 * kind: "resource"（累积资源格）| "action"（永久常规行动）| "animal"（动物市场）| "round"（回合卡）
 */
function renderSpaces(container, g, p, myTurn, kind) {
  container.innerHTML = "";
  SPACES.forEach((sp) => {
    const isAnimal = ["Sheep", "Boar", "Cattle"].includes(sp.id);
    if (kind === "animal") { if (!isAnimal) return; }
    else if (kind === "action") { if (!sp.alwaysAction) return; }
    else if (kind === "round") { if (!sp.roundCard) return; if (!g.revealed.includes(sp.id)) return; }
    else { if (sp.roundCard || sp.alwaysAction || isAnimal) return; }

    let desc = sp.desc;
    let badge = "";
    let open = true;
    let stock = 1;
    // ★ 行动格每轮只能被使用一次
    const used = (g.usedSpaces || []).includes(sp.id);

    if (kind === "resource" && PILE_KEY[sp.id]) {
      const n = (g.piles && g.piles[PILE_KEY[sp.id]]) || 0;
      open = sp.fromRound ? g.round >= sp.fromRound : true;
      stock = n;
      desc = open
        ? (n > 0 ? `取走全部 ${n} 个` : "空着 · 每轮 +1")
        : `第 ${sp.fromRound} 轮开放`;
      if (open && n > 0) badge = `<span class="stock-badge">${n}</span>`;
    } else if (sp.id === "DayLaborer") {
      desc = "打日工 +2 食物";
      stock = 1;
    } else if (isAnimal) {
      const t = sp.id === "Sheep" ? "sheep" : sp.id === "Boar" ? "boar" : "cattle";
      const openRound = ANIMAL_OPEN_ROUND[t];
      open = g.round >= openRound;
      stock = (g.piles && g.piles[sp.id]) || 0;
      desc = open
        ? (stock > 0 ? `取走全部 ${stock} 只` : "空着 · 每轮 +1")
        : `第 ${openRound} 轮开放`;
      if (open && stock > 0) badge = `<span class="stock-badge">${stock}</span>`;
    } else {
      desc = sp.desc;
    }

    // 本轮已被占用：优先展示占用状态
    if (used && open) {
      desc = "本轮已被占用 · 下轮再用";
      stock = 0;
      badge = "";
    }

    const canAct = myTurn && open && stock > 0 && !used;
    const card = document.createElement("div");
    card.className = "space" + (canAct ? " actable" : " disabled") + (used ? " is-used" : "");
    card.innerHTML = `
      <div class="icon">${sp.icon}</div>
      <div class="name">${sp.name}</div>
      <div class="meta">${desc}</div>
      ${badge}
      ${used ? '<div class="used-stamp">已占用</div>' : ""}
    `;
    if (canAct) card.onclick = () => onSpaceClick(sp, p);
    container.appendChild(card);
  });
}

/**
 * DLC（Farmers of the Moor）：渲染燃料 / 干草累积堆
 *  - 燃料堆 (GatherFuel): 每轮 +1
 *  - 干草堆 (CutMeadow): 每轮 +1
 * 两者都在 round card 揭示后占用 1 名工人，取走时拿全部。
 */
function renderMoorPile(container, g, p, myTurn) {
  if (!container) return;
  container.innerHTML = "";
  const mk = (kind, icon, name, pile, used, onclick) => {
    const card = document.createElement("div");
    const canAct = myTurn && pile > 0 && !used;
    card.className = "minor-card" + (canAct ? " actable" : " disabled");
    card.innerHTML = `
      <div class="occ-ic">${icon}</div>
      <div class="minor-name">${name}</div>
      <div class="minor-eff">累积 ${pile} · 可取全部${pile > 0 ? `（${pile}）` : "（空）"}</div>
    `;
    if (canAct) card.onclick = onclick;
    container.appendChild(card);
  };
  mk("fuel", "🔥", "燃料堆", g.moorFuelPile || 0, (g.usedSpaces || []).includes("GatherFuel"), () => sendAction({ type: "GatherFuel" }));
  mk("hay",  "🌾", "干草堆", g.moorHayPile  || 0, (g.usedSpaces || []).includes("CutMeadow"),  () => sendAction({ type: "CutMeadow" }));
}

/** 当前选中的沼泽格（私存在 _moorSel） */
let _moorSel = null;

/**
 * DLC（Farmers of the Moor）：渲染 4×4 公有沼泽板
 *  - 未开垦：浅棕色
 *  - 已开垦未播种：土色
 *  - 已开垦已播种：撒种者头像 + 谷/菜图标 + markers 数
 */
function renderMoorBoard(container, g, p, myTurn) {
  if (!container) return;
  container.innerHTML = "";
  const W = 4, H = 4;
  const reclaimed = (g.moorBoard || []).reduce((m, c) => { m[`${c.x},${c.y}`] = c; return m; }, {});
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = document.createElement("div");
      const key = `${x},${y}`;
      const data = reclaimed[key];
      const sel = _moorSel && _moorSel.x === x && _moorSel.y === y;
      cell.className = "moor-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      if (data) {
        cell.classList.add("is-reclaimed");
        if (data.crop) {
          cell.classList.add("is-sown");
          const cropIcon = data.crop === "grain" ? "🌾" : "🥕";
          const sownBy = data.sownBy ? data.sownBy.slice(0, 4) : "?";
          cell.innerHTML = `<span class="moor-crop">${cropIcon}</span><span class="moor-marker">×${data.markers || 0}</span><span class="moor-owner" title="撒种者">${sownBy}</span>`;
        } else {
          cell.innerHTML = `<span class="moor-empty">▢</span>`;
        }
      } else {
        cell.innerHTML = `<span class="moor-locked">#</span>`;
      }
      if (sel) cell.classList.add("is-sel");
      if (myTurn) cell.onclick = () => {
        _moorSel = { x, y };
        renderMoorBoard(container, g, p, myTurn);
        bindMoorActions(g, p, myTurn);
      };
      container.appendChild(cell);
    }
  }
}

/**
 * 绑定沼泽板"拓荒 / 撒谷 / 撒菜"按钮的可用性 + 点击
 */
function bindMoorActions(g, p, myTurn) {
  const reclaimBtn = document.getElementById("moorReclaimBtn");
  const sowGBtn = document.getElementById("moorSowGBtn");
  const sowVBtn = document.getElementById("moorSowVBtn");
  if (!reclaimBtn) return;
  const sel = _moorSel;
  const isMyTurn = !!myTurn;
  const canReclaim = isMyTurn && sel && !(g.moorBoard || []).some((c) => c.x === sel.x && c.y === sel.y);
  const reclaimed = sel && (g.moorBoard || []).find((c) => c.x === sel.x && c.y === sel.y);
  const canSow = isMyTurn && reclaimed && !reclaimed.crop && ((p.resources || {}).grain > 0 || (p.resources || {}).vegetable > 0);
  reclaimBtn.disabled = !canReclaim;
  sowGBtn.disabled = !(canSow && (p.resources || {}).grain > 0);
  sowVBtn.disabled = !(canSow && (p.resources || {}).vegetable > 0);
  reclaimBtn.onclick = () => sel && sendAction({ type: "ReclaimMoor", x: sel.x, y: sel.y });
  sowGBtn.onclick  = () => sel && sendAction({ type: "SowMoor",     x: sel.x, y: sel.y, crop: "grain" });
  sowVBtn.onclick  = () => sel && sendAction({ type: "SowMoor",     x: sel.x, y: sel.y, crop: "vegetable" });
}

/** DLC：渲染场上当前可抢的小发展卡（任何玩家 1 名工人可抢一次） */
function renderMinorCards(container, g, p, myTurn) {
  if (!container) return;
  container.innerHTML = "";
  const cards = g.minorImprovementCards || [];
  if (!cards.length) {
    container.innerHTML = `<div class="muted" style="grid-column:1/-1;font-size:12px">本局抽空了</div>`;
    return;
  }
  for (const c of cards) {
    const owned = !!(p && p.minorImprovements && p.minorImprovements.includes(c.id));
    const card = document.createElement("div");
    card.className = "minor-card" + (myTurn && !owned ? " actable" : owned ? " disabled" : " disabled");
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="occ-ic">${c.icon}</div>
      <div class="minor-name">${c.name}${owned ? ' <span class="badge" style="font-size:9px;padding:1px 5px">已持有</span>' : ""}</div>
      <div class="minor-eff">${c.effect}</div>
    `;
    if (myTurn && !owned) card.onclick = () => {
      sendAction({ type: "TakeMinorImprovement", id: c.id });
    };
    container.appendChild(card);
  }
}

/** 资源格 id → piles 键 */
const PILE_KEY = {
  Wood: "Wood", Clay: "Clay", Reed: "Reed", Stone: "Stone",
  Grain: "Grain", Vegetable: "Vegetable", Fishing: "Fishing",
};

/** 动物市场开放轮次（与引擎 ANIMAL_MARKET 一致） */
const ANIMAL_OPEN_ROUND = { sheep: 4, boar: 8, cattle: 12 };

// ---- 行动处理（带 loading + 防抖）----
/**
 * 栅栏编辑：只切换本地选择，不发送请求。
 * 由底部浮动面板的「确认建造」统一提交。
 */
function toggleFence(kind, x, y) {
  const id = `${kind}${x},${y}`;
  if (_selFences.has(id)) _selFences.delete(id);
  else _selFences.add(id);
  refreshFenceUI();
}

/** 刷新栅栏视觉 + 浮动面板计数 */
function refreshFenceUI() {
  // 更新棋盘上每段的选中态
  document.querySelectorAll(".fence-layer .seg").forEach((el) => {
    const id = el.dataset.edge;
    if (!id) return;
    el.classList.toggle("sel", _selFences.has(id));
  });
  const cnt = document.getElementById("fenceCount");
  if (cnt) cnt.textContent = String(_selFences.size);
  const btn = document.getElementById("fenceConfirm");
  if (btn) {
    btn.textContent = _selFences.size > 0 ? `✅ 确认建造（${_selFences.size} 段 · ${_selFences.size} 木）` : "✅ 确认建造";
    btn.disabled = _selFences.size === 0;
  }
}

/** 进入 / 退出栅栏编辑模式 */
function setFenceMode(on) {
  _fenceMode = !!on;
  if (!on) _selFences.clear();
  const panel = document.getElementById("fencePanel");
  if (panel) panel.remove();
  if (_fenceMode) {
    buildFencePanel();
  }
  refreshBoard();
}

function buildFencePanel() {
  const panel = document.createElement("div");
  panel.id = "fencePanel";
  panel.className = "fence-panel";
  panel.innerHTML = `
    <div class="fence-panel-txt">
      <b>🪵 建栅栏</b>
      <span class="muted">点击棋盘上的<b>虚线格边</b>选择栅栏段 · 每段 1 木 · 上限 15 段<br>
      必须围成<b>完整矩形</b>牧场（可多个）才能提交</span>
    </div>
    <div class="fence-panel-ops">
      <span class="badge">已选 <b id="fenceCount">0</b> 段</span>
      <button class="btn ghost small" id="fenceClear">清空</button>
      <button class="btn ghost small" id="fenceCancel">取消</button>
      <button class="btn small" id="fenceConfirm" disabled>✅ 确认建造</button>
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector("#fenceClear").onclick = () => { _selFences.clear(); refreshFenceUI(); };
  panel.querySelector("#fenceCancel").onclick = () => setFenceMode(false);
  panel.querySelector("#fenceConfirm").onclick = () => {
    if (_selFences.size === 0) return;
    doWithLoading("build-fence", "建栅栏…", () => sendAction({ type: "BuildFences", edges: [..._selFences] }));
    setFenceMode(false);
  };
}

/** 只重绘农场棋盘（保留滚动位置） */
function refreshBoard() {
  if (!_farmCtx) return;
  renderFarm(_farmCtx.wrap, _farmCtx.p, _farmCtx.myTurn);
}

function onCellClick(p, x, y, cell) {
  _selCell = { x, y };
  const opts = [];
  const usedSpaces = (_state.game && _state.game.usedSpaces) || [];
  const busy = (id, label) => usedSpaces.includes(id) ? `${label} 本轮已被占用，请下轮再来` : null;
  // 犁地 / 建房间 是第 1 轮起永久可用的常规行动（不是回合卡），随时可以点棋盘操作
  if (cell.kind === "empty") {
    const bRoom = busy("BuildRoom", "建房间");
    const bPlow = busy("PlowField", "犁地");
    if (bRoom) opts.push({ label: "建房间（已占用）", disabled: true, hint: bRoom });
    else opts.push({ label: "建房间", action: () => doWithLoading(`buildRoom-${x}-${y}`, "建房间", () => sendAction({ type: "BuildRoom", x, y })) });
    if (bPlow) opts.push({ label: "犁地（已占用）", disabled: true, hint: bPlow });
    else opts.push({ label: "犁地", action: () => doWithLoading(`plow-${x}-${y}`, "犁地", () => sendAction({ type: "PlowField", x, y })) });
  }
  if (cell.kind === "field" && !cell.crop) {
    const bSow = busy("SowOrBake", "撒种/烤面包");
    if (bSow) opts.push({ label: "撒种（已占用）", disabled: true, hint: bSow });
    else {
      opts.push({ label: "撒谷", action: () => doWithLoading(`sow-g-${x}-${y}`, "撒谷种", () => sendAction({ type: "Sow", x, y, crop: "grain" })) });
      opts.push({ label: "撒菜", action: () => doWithLoading(`sow-v-${x}-${y}`, "撒菜种", () => sendAction({ type: "Sow", x, y, crop: "vegetable" })) });
    }
  }
  if (opts.length === 0) return;
  openModal(`操作 (${x},${y})`, `<div class="field-grid">${opts.map((o, i) => `<button class="btn ghost" data-i="${i}" ${o.disabled ? "disabled" : ""}>${o.label}</button>`).join("")}</div>${
    opts.some((o) => o.disabled) ? `<p class="muted" style="font-size:12px;margin-top:8px">每个行动格每轮只能被使用一次，被占用的格子下轮恢复。</p>` : ""}`,
    (root) => root.querySelectorAll("button[data-i]").forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.i];
      if (o.disabled) return toast(o.hint, true);
      o.action(); closeModal();
    }));
}

function onSpaceClick(sp, p) {
  if (!debounce(`space-${sp.id}`, 300)) return;
  // 简单 take action
  if (["Wood", "Clay", "Reed", "Stone", "Grain", "Vegetable", "Fishing", "DayLaborer",
       "StartPlayer", "Sheep", "Boar", "Cattle"].includes(sp.id)) {
    doWithLoading(`take-${sp.id}`, `⏳ ${sp.name}…`, () => sendAction({ type: "Take", space: sp.id }));
    return;
  }
  if (sp.id === "SowOrBake") {
    openModal("🌾 撒种 / 烤面包", `
      <p class="muted">撒种：在已犁地格里撒谷/菜（消耗 1 谷/菜）。</p>
      <p class="muted">烤面包：陶炉 1 谷 → 5 食物 / 石炉・瓷砖炉 每谷 4 食物（按炉子限谷数）。</p>
      <p class="muted">提示：先在棋盘上选一块空田，再用撒谷/撒菜；烤面包会弹出输入框。</p>
      <hr class="sep">
      <button class="btn" id="mBake">🍞 烤面包</button>
    `, (root) => {
      root.querySelector("#mBake").onclick = () => {
        const OVEN_MAX = { clayOven: 1, stoneOven: 2, tileOven: 2 };
        const OVEN_ZH = { clayOven: "陶土烤炉", stoneOven: "石头烤炉", tileOven: "瓷砖烤炉" };
        const ovens = p.improvements.filter(x => x === "clayOven" || x === "stoneOven" || x === "tileOven");
        if (ovens.length === 0) return toast("你需要先建造陶炉、石炉或瓷砖烤炉", true);
        const oven = ovens[0];
        const maxN = Math.min(OVEN_MAX[oven] || 1, p.resources.grain || 0);
        if (maxN < 1) return toast("没有谷物可烤", true);
        const grainN = prompt(`用「${OVEN_ZH[oven]}」烤面包：最多 ${OVEN_MAX[oven]} 谷，你有 ${p.resources.grain} 谷。烤几个？`, "1");
        const n = +grainN;
        if (!n || n < 1) return;
        doWithLoading("bake", "烤面包…", () => sendAction({ type: "BakeBread", oven, grain: Math.min(n, OVEN_MAX[oven] || 1) }));
        closeModal();
      };
    });
    return;
  }
  if (sp.id === "Fences") {
    // 进入栅栏编辑模式：不弹遮挡棋盘的模态，直接在棋盘上点选
    _selFences.clear();
    setFenceMode(true);
    toast("点击棋盘上的虚线格边来围牧场，选好后点「确认建造」");
    return;
  }
  if (sp.id === "BuildRoom") {
    const rooms = p.rooms;
    const okCost = canAfford(p, ROOM_COST_BY_TYPE[p.roomType]);
    openModal("🏠 建房间", `
      <p class="muted" style="margin-top:0">点击棋盘上 <b>紧邻现有房间</b> 的空格来建造。</p>
      <div class="kb-card" style="background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px;line-height:1.9">
        <div><b>每建 1 间${houseLabel(p.roomType)}房</b>：${costLine(ROOM_COST_BY_TYPE[p.roomType])}</div>
        <div class="muted">你现在 ${rooms} 间房 · ${p.family} 名家人 · ${Math.max(0, rooms - p.family)} 间空房</div>
        <div style="color:${okCost ? "var(--leaf-dark)" : "var(--barn)"}">
          ${okCost ? "✅ 资源充足，可以建" : `❌ 资源不足（缺 ${shortfall(p, ROOM_COST_BY_TYPE[p.roomType])}）`}
        </div>
      </div>
      <p class="muted">你的资源：🪵 ${p.resources.wood} 木 · 🧱 ${p.resources.clay} 陶 · 🎋 ${p.resources.reed} 芦苇 · ⛏ ${p.resources.stone} 石</p>
      <p class="muted">提示：每间房 +1 个家人居住位，空房才能「添丁」。</p>
    `);
    return;
  }
  if (sp.id === "PlowField") {
    openModal("🌱 犁地", `<p class="muted">点击棋盘空格（必须与现有田正交相邻，或任意位置若无田）。</p>`);
    return;
  }
  if (sp.id === "FamilyGrowth") {
    openModal("👶 添丁", `<p class="muted">消耗 <b>2 食物</b>。必须有空房，且家人 < 5 人。<br>新成员本轮出生仅需 1 食物，下一轮起需 2。</p>
      <p class="muted">你有 ${p.food} 食物，${Math.max(0, p.rooms - p.family)} 间空房。</p>
      <button class="btn big" id="mFG">确定</button>`,
      (root) => root.querySelector("#mFG").onclick = () => {
        doWithLoading("family-growth", "添丁…", () => sendAction({ type: "FamilyGrowth" }));
        closeModal();
      });
    return;
  }
  if (sp.id === "Renovate") {
    const rooms = p.rooms;
    // 规则：翻修按每间房计费
    const cClay = { clay: rooms, reed: rooms };
    const cStone = { stone: rooms, reed: rooms };
    const can = (cost) => Object.entries(cost).every(([k, v]) => (p.resources[k] || 0) >= v);
    const ok1 = p.roomType === "wood" && can(cClay);
    const ok2 = p.roomType === "clay" && can(cStone);
    const costLine = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${resZh(k)}`).join(" + ");
    openModal("🔨 翻修", `
      <p class="muted" style="margin-top:0">
        翻修是 <b>整栋一起翻</b>，按房间数量计费（你现在 <b>${rooms} 间</b>房）。
      </p>
      <div class="kb-card" style="background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0">
        <div style="font-size:13px;line-height:1.9">
          <div><b>木屋 → 陶屋</b>：${costLine(cClay)}
            <span style="color:${ok1 ? "var(--leaf-dark)" : "var(--barn)"}">
              ${p.roomType !== "wood" ? "（当前不是木屋）" : can(cClay) ? "✅ 可以翻" : `❌ 资源不足（缺 ${shortfall(p, cClay)}）`}
            </span>
            <span class="muted"> · 翻后每间 +1 分</span>
          </div>
          <div><b>陶屋 → 石屋</b>：${costLine(cStone)}
            <span style="color:${ok2 ? "var(--leaf-dark)" : "var(--barn)"}">
              ${p.roomType !== "clay" ? "（当前不是陶屋）" : can(cStone) ? "✅ 可以翻" : `❌ 资源不足（缺 ${shortfall(p, cStone)}）`}
            </span>
            <span class="muted"> · 翻后每间 +2 分</span>
          </div>
        </div>
      </div>
      <p class="muted">你的资源：🪵 ${p.resources.wood} 木 · 🧱 ${p.resources.clay} 陶 · 🎋 ${p.resources.reed} 芦苇 · ⛏ ${p.resources.stone} 石</p>
      <div class="row mt8">
        <button class="btn" id="mR1" ${ok1 ? "" : "disabled"}>木 → 陶</button>
        <button class="btn" id="mR2" ${ok2 ? "" : "disabled"}>陶 → 石</button>
      </div>
    `, (root) => {
      root.querySelector("#mR1").onclick = () => {
        doWithLoading("renovate-1", "翻修…", () => sendAction({ type: "Renovate", direction: "woodToClay" }));
        closeModal();
      };
      root.querySelector("#mR2").onclick = () => {
        doWithLoading("renovate-2", "翻修…", () => sendAction({ type: "Renovate", direction: "clayToStone" }));
        closeModal();
      };
    });
    return;
  }
  if (sp.id === "BuildMajor") {
    openModal("🔧 重大改进", `
      <p class="muted" style="margin-top:0">重大改进先到先得（每种只能建一个）${_state.game.dlc?.moor ? "；含「荒野之地」专属 5 张" : ""}。</p>
      <div class="imp-list" id="mImpGrid"></div>
      <p class="muted" style="margin-top:10px;font-size:12px">
        🍳 壁炉/烹饪灶：<b>随时</b>可把谷物/蔬菜/牲畜换成食物（不占行动，点玩家卡上的改进标签即可烹饪）。<br>
        🍞 陶炉/石炉/瓷砖烤炉：在「撒种/烤面包」行动中烤面包。
      </p>
    `, (root) => {
      const grid = root.querySelector("#mImpGrid");
      const list = [
        ["fireplace",     "壁炉",       "2 陶",        "1 分", "2 谷/菜/羊/猪 → 1 食物；3 牛 → 1 食物（随时）"],
        ["fireplaceBig",  "大壁炉",     "3 陶",        "1 分", "同壁炉（自创可选卡）"],
        ["cookingHearth", "烹饪灶",     "4 陶",        "1 分", "1 谷/菜/羊/猪 → 2 食物；3 牛 → 2 食物（随时）"],
        ["cookingHearthBig","大烹饪灶",  "5 陶",        "1 分", "同烹饪灶（自创可选卡）"],
        ["clayOven",      "陶土烤炉",   "3 陶 + 1 石", "2 分", "烤面包：1 谷 → 5 食物"],
        ["stoneOven",     "石头烤炉",   "3 石 + 1 陶", "3 分", "烤面包：2 谷 → 每谷 4 食物"],
        ["well",          "水井",       "3 石 + 1 木", "4 分", "建成后 5 轮，每轮开始 +1 食物"],
        ["joinery",       "木工坊",     "2 石 + 2 木", "2 分", "随时 1 木 → 2 食物（点标签使用）"],
        ["pottery",       "陶器坊",     "2 石 + 2 陶", "2 分", "随时 1 陶 → 2 食物（点标签使用）"],
        ["basket",        "柳编筐",     "2 石 + 2 芦苇","2 分", "随时 1 芦苇 → 3 食物（点标签使用）"],
      ];
      if (_state.game.dlc?.moor) list.push(
        ["heatingStove",  "取暖炉",     "3 石 + 2 木", "2 分", "每轮只消耗 1 燃料取暖"],
        ["peatKiln",      "泥炭窑",     "2 陶 + 1 木", "2 分", "每收获轮 +1 燃料"],
        ["moorCook",      "沼泽灶",     "2 石 + 1 木", "3 分", "随时烹饪：1 谷/菜/羊/猪 → 2 食物"],
        ["tileOven",      "瓷砖烤炉",   "3 石 + 2 陶", "3 分", "烤面包：最多 2 谷 → 每谷 4 食物"],
        ["firewood",      "柴火棚",     "2 石 + 2 芦苇","2 分", "终局每份剩余燃料 +1 分"],
      );
      grid.innerHTML = list.map(([k, name, cost, vp, eff]) => {
        const built = p.improvements.includes(k);
        const costObj = MAJOR_COST[k] || {};
        const ok = canAfford(p, costObj);
        const disabled = built || !ok;
        return `<button class="imp-item${built ? " built" : ""}${!built && !ok ? " poor" : ""}" data-i="${k}" ${disabled ? "disabled" : ""}>
          <div class="imp-line1"><b>${built ? "✓ " : ""}${name}</b><span class="imp-vp">${vp}</span></div>
          <div class="imp-line2">${cost}${!built && !ok ? ` <span style="color:var(--barn)">（缺 ${shortfall(p, costObj)}）</span>` : ""}</div>
          <div class="imp-line3">${eff}</div>
        </button>`;
      }).join("");
      grid.querySelectorAll("button[data-i]").forEach(b => b.onclick = () => {
        const imp = b.dataset.i;
        doWithLoading(`build-major-${imp}`, "建改进…", () => sendAction({ type: "BuildMajor", improvement: imp }));
        closeModal();
      });
    });
    return;
  }
}

function sendAction(action) {
  if (!_conn || !_conn.isOpen?.()) {
    toast("正在连接服务器，请稍候…", true, 1500);
    sfx.err();
    return;
  }
  _conn.send({ t: "act", action });
}

/**
 * 用 lock/unlock 包装一个同步函数（不会真的"加载"，但提供反馈 + 防重）
 */
function doWithLoading(key, text, fn) {
  if (!debounce(key, 600)) return;
  lock(makeFakeBtn(key), text);
  try {
    fn();
  } finally {
    // 立即解锁（state 更新后会自动重渲染并清掉）
    setTimeout(() => unlock(makeFakeBtn(key)), 800);
  }
}
const _fakeBtns = new Map();
function makeFakeBtn(key) {
  if (!_fakeBtns.has(key)) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.style.position = "absolute";
    btn.style.left = "-9999px";
    btn.textContent = key;
    document.body.appendChild(btn);
    _fakeBtns.set(key, btn);
  }
  return _fakeBtns.get(key);
}

// ---- 模态 ----
function openModal(title, bodyHTML, onMount) {
  const mask = document.getElementById("modalRoot");
  const box = document.getElementById("modalBox");
  mask.classList.remove("hiding");
  box.innerHTML = `
    <div class="act-modal entering">
      <div class="act-modal-head">
        <h3>${title}</h3>
        <button class="act-modal-x" type="button" data-modal-close aria-label="关闭">×</button>
      </div>
      <div class="act-modal-body">${bodyHTML}</div>
      <div class="act-modal-foot">
        <button class="btn ghost" type="button" data-modal-close>取消</button>
      </div>
    </div>`;
  mask.classList.remove("hidden");
  bindRipples(box);
  // 所有 data-modal-close（右上角 × 与底部「取消」）统一关闭
  box.querySelectorAll("[data-modal-close]").forEach((el) => { el.onclick = closeModal; });
  // ESC 关闭（仅本模态，不影响其他弹层）
  if (!window.__modalEscBound) {
    window.__modalEscBound = true;
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const m = document.getElementById("modalRoot");
      if (m && !m.classList.contains("hidden")) closeModal();
    });
  }
  if (onMount) onMount(box);
}

/** DLC：开局弹出「职业选框」，每位玩家各一次。选过后不提供换卡入口。 */
function openOccupationPicker() {
  const me = _me && _me.role === "player" ? _me : null;
  const g = _state && _state.game;
  if (!me || !g || !g.dlc?.occupations) return;
  const myPlayer = g.players.find((p) => p.id === me.pid);
  if (!myPlayer) return;
  if (myPlayer.occupation) return; // 已选过，不再弹出
  const hand = myPlayer.occupationHand || [];
  if (!hand.length) return;
  const cards = hand.map((occ) => `
    <button class="occ-card" data-occ="${escapeHtml(occ.id)}" type="button">
      <span class="occ-ic">${occ.icon}</span>
      <span class="occ-name">${escapeHtml(occ.name)}</span>
      <span class="occ-eff">${escapeHtml(occ.effect)}</span>
    </button>
  `).join("");
  openModal("🎴 选职业（7 选 1）", `
    <p class="muted" style="margin-top:0">从开局随机发的 7 张职业里挑 1 张，整局生效。<b>一旦选定无法更换</b>。</p>
    <div class="occ-hand">${cards}</div>
  `, (root) => {
    root.querySelectorAll(".occ-card").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.occ;
        doWithLoading(`choose-occ-${id}`, "选职业…", () => sendAction({ type: "ChooseOccupation", id }));
        closeModal();
      };
    });
  });
}
function closeModal() {
  const mask = document.getElementById("modalRoot");
  if (!mask) return;
  if (reducedMotion()) { mask.classList.add("hidden"); return; }
  mask.classList.add("hiding");
  setTimeout(() => {
    mask.classList.add("hidden");
    mask.classList.remove("hiding");
  }, 160);
}

// ---- resize 监听 + 移动端 tab 刷新 ----
let _resizeListener = null;
window.addEventListener("resize", () => {
  if (!applyMobileTabVisibility) return;
  applyMobileTabVisibility();
  // 棋盘尺寸变化
  document.querySelectorAll(".farm-board").forEach((b) => {
    const cs = getCellSize();
    b.style.setProperty("--cell", cs + "px");
  });
});

/** 重大改进费用（与引擎 MAJOR_IMPROVEMENTS 一致） */
const MAJOR_COST = {
  fireplace:         { clay: 2 },
  fireplaceBig:      { clay: 3 },
  cookingHearth:     { clay: 4 },
  cookingHearthBig:  { clay: 5 },
  clayOven:          { clay: 3, stone: 1 },
  stoneOven:         { stone: 3, clay: 1 },
  well:              { stone: 3, wood: 1 },
  joinery:           { stone: 2, wood: 2 },
  pottery:           { stone: 2, clay: 2 },
  basket:            { stone: 2, reed: 2 },
  heatingStove:      { stone: 3, wood: 2 },
  peatKiln:          { clay: 2, wood: 1 },
  moorCook:          { stone: 2, wood: 1 },
  tileOven:          { stone: 3, clay: 2 },
  firewood:          { stone: 2, reed: 2 },
};
/** 改进中文名 */
const MAJOR_ZH = {
  fireplace: "壁炉", fireplaceBig: "大壁炉", cookingHearth: "烹饪灶", cookingHearthBig: "大烹饪灶",
  clayOven: "陶土烤炉", stoneOven: "石头烤炉", well: "水井",
  joinery: "木工坊", pottery: "陶器坊", basket: "柳编筐",
  heatingStove: "取暖炉", peatKiln: "泥炭窑", moorCook: "沼泽灶", tileOven: "瓷砖烤炉", firewood: "柴火棚",
};
/** 改进悬浮说明（费用 / 得分 / 效果）—— 修订版数值 */
const MAJOR_TIP = {
  fireplace:        "壁炉 · 2 陶 · +1 分\n随时烹饪：2 谷/菜/羊/猪 → 1 食物；3 牛 → 1 食物\n👉 点此标签烹饪",
  fireplaceBig:     "大壁炉 · 3 陶 · +1 分\n随时烹饪，比同壁炉（自创可选卡）\n👉 点此标签烹饪",
  cookingHearth:    "烹饪灶 · 4 陶 · +1 分\n随时烹饪：1 谷/菜/羊/猪 → 2 食物；3 牛 → 2 食物\n👉 点此标签烹饪",
  cookingHearthBig: "大烹饪灶 · 5 陶 · +1 分\n随时烹饪，比同烹饪灶（自创可选卡）\n👉 点此标签烹饪",
  clayOven:         "陶土烤炉 · 3 陶 + 1 石 · +2 分\n烤面包：每次最多 1 谷 → 5 食物",
  stoneOven:        "石头烤炉 · 3 石 + 1 陶 · +3 分\n烤面包：每次最多 2 谷 → 每谷 4 食物",
  well:             "水井 · 3 石 + 1 木 · +4 分\n建成后 5 轮，每轮开始 +1 食物（自动结算）",
  joinery:          "木工坊 · 2 石 + 2 木 · +2 分\n随时 1 木 → 2 食物（不占行动）\n👉 点此标签转换",
  pottery:          "陶器坊 · 2 石 + 2 陶 · +2 分\n随时 1 陶 → 2 食物（不占行动）\n👉 点此标签转换",
  basket:           "柳编筐 · 2 石 + 2 芦苇 · +2 分\n随时 1 芦苇 → 3 食物（不占行动）\n👉 点此标签转换",
  heatingStove:     "取暖炉 · 3 石 + 2 木 · +2 分\n每轮只消耗 1 燃料取暖（不论家人数）",
  peatKiln:         "泥炭窑 · 2 陶 + 1 木 · +2 分\n每收获轮自动 +1 燃料",
  moorCook:         "沼泽灶 · 2 石 + 1 木 · +3 分\n随时烹饪：1 谷/菜/羊/猪 → 2 食物\n👉 点此标签烹饪",
  tileOven:         "瓷砖烤炉 · 3 石 + 2 陶 · +3 分\n烤面包：最多 2 谷 → 每谷 4 食物",
  firewood:         "柴火棚 · 2 石 + 2 芦苇 · +2 分\n终局每份剩余燃料 +1 分",
};
/** 可烹饪/转换的改进 → 消耗比（多少单位换 1 食物，与引擎 cook 字段一致） */
const COOK_RULES = {
  fireplace:     { grain: 2, vegetable: 2, sheep: 2, boar: 2, cattle: 3 },
  fireplaceBig:  { grain: 2, vegetable: 2, sheep: 2, boar: 2, cattle: 3 },
  cookingHearth: { grain: 0.5, vegetable: 0.5, sheep: 0.5, boar: 0.5, cattle: 1.5 },
  cookingHearthBig: { grain: 0.5, vegetable: 0.5, sheep: 0.5, boar: 0.5, cattle: 1.5 },
  moorCook:      { grain: 0.5, vegetable: 0.5, sheep: 0.5, boar: 0.5, cattle: 1.5 },
  joinery:       { wood: 0.5 },
  pottery:       { clay: 0.5 },
  basket:        { reed: 1 / 3 },
};

// ---- 工具 ----
/** 单个已建改进的 tag（带原生 title + CSS 悬浮提示；可烹饪的改进可点击打开烹饪模态） */
function impTagHTML(k) {
  const name = MAJOR_ZH[k] || k;
  const tip = MAJOR_TIP[k] || name;
  const cookable = !!COOK_RULES[k];
  return `<span class="imp-tag${cookable ? " imp-tag-cook" : ""}" data-imp="${escapeHtml(k)}" data-tip="${escapeHtml(tip)}" title="${escapeHtml(tip).replace(/\n/g, " · ")}">${escapeHtml(name)}${cookable ? " 🍳" : ""}</span>`;
}

/** 烹饪模态：列出该改进可消耗的原料与数量，实时预览食物产出 */
function openCookModal(impName) {
  const g = _state && _state.game;
  const me = _me;
  if (!g || !me || me.role !== "player") return;
  const p = g.players.find((x) => x.id === me.pid);
  if (!p || !p.improvements.includes(impName)) return toast("你还没有这个改进", true);
  const rule = COOK_RULES[impName];
  if (!rule) return;
  const ANIMAL_ZH_C = { sheep: "羊", boar: "猪", cattle: "牛" };
  const rows = Object.entries(rule).map(([k, ratio]) => {
    const owned = k === "grain" || k === "vegetable" || k === "wood" || k === "clay" || k === "reed"
      ? (p.resources[k] || 0)
      : (p.animals[k] || 0);
    const hint = ratio >= 1 ? `${ratio} 单位 → 1 食物` : `1 单位 → ${Math.round(1 / ratio)} 食物`;
    const zhName = ANIMAL_ZH_C[k] || resZh(k);
    return { k, ratio, owned, hint, zhName };
  }).filter((r) => r.owned > 0);
  const totalOwned = rows.reduce((s, r) => s + r.owned, 0);
  if (totalOwned === 0) return toast("没有可烹饪的原料", true);
  const body = `
    <p class="muted" style="margin-top:0">用「${MAJOR_ZH[impName]}」烹饪（不占行动）。填数量，确认后换取食物。</p>
    <div class="cook-rows">${rows.map((r) => `
      <div class="cook-row" data-k="${r.k}" data-ratio="${r.ratio}" data-owned="${r.owned}">
        <span class="cook-ic">${({ grain: "🌾", vegetable: "🥕", wood: "🪵", clay: "🧱", reed: "🎋", sheep: "🐑", boar: "🐗", cattle: "🐄" })[r.k] || "•"}</span>
        <span class="cook-name">${r.zhName} <span class="muted">（有 ${r.owned} · ${r.hint}）</span></span>
        <input type="number" class="input cook-n" min="0" max="${r.owned}" value="0" data-k="${r.k}">
      </div>`).join("")}
    </div>
    <div class="row spread mt8" style="align-items:center">
      <span>可换 <b id="cookPreview">0</b> 食物</span>
      <button class="btn big" id="cookConfirm" disabled>🍳 烹饪</button>
    </div>
  `;
  openModal(`🍳 烹饪 · ${MAJOR_ZH[impName] || impName}`, body, (root) => {
    const inputs = Array.prototype.slice.call(root.querySelectorAll(".cook-n"));
    const preview = root.querySelector("#cookPreview");
    const confirmBtn = root.querySelector("#cookConfirm");
    const recalc = () => {
      let food = 0;
      inputs.forEach((inp) => {
        const row = inp.closest(".cook-row");
        const ratio = parseFloat(row.dataset.ratio);
        const n = Math.max(0, Math.min(parseInt(inp.value || "0", 10) || 0, parseInt(row.dataset.owned, 10)));
        if (ratio > 0) food += n / ratio;
      });
      food = Math.floor(food);
      preview.textContent = String(food);
      confirmBtn.disabled = food <= 0;
      return food;
    };
    inputs.forEach((inp) => inp.addEventListener("input", recalc));
    confirmBtn.onclick = () => {
      const used = {};
      inputs.forEach((inp) => {
        const n = parseInt(inp.value || "0", 10) || 0;
        if (n > 0) used[inp.dataset.k] = n;
      });
      if (!Object.keys(used).length) return;
      doWithLoading(`cook-${impName}`, "烹饪…", () => sendAction({ type: "Cook", improvement: impName, used }));
      closeModal();
    };
  });
}

function houseLabel(t) { return t === "wood" ? "木" : t === "clay" ? "陶" : "石"; }
function houseEmoji(t) { return t === "wood" ? "🏚" : t === "clay" ? "🛖" : "🏛"; }
function houseCostLabel(t) {
  return t === "wood" ? "5 木 + 2 芦苇" : t === "clay" ? "5 陶 + 2 芦苇" : "5 石 + 2 芦苇";
}

/** 房间建造费用（与引擎 ROOM_COST 一致） */
const ROOM_COST_BY_TYPE = {
  wood:  { wood: 5,  reed: 2 },
  clay:  { clay: 5,  reed: 2 },
  stone: { stone: 5, reed: 2 },
};
/** 资源 key → 中文 */
function resZh(k) {
  return ({ wood: "木", clay: "陶", reed: "芦苇", stone: "石", grain: "谷", vegetable: "菜", food: "食物" })[k] || k;
}
/** 费用行文本，如 "5 木 + 2 芦苇" */
function costLine(cost) {
  return Object.entries(cost).map(([k, v]) => `${v} ${resZh(k)}`).join(" + ");
}
/** 是否付得起 */
function canAfford(p, cost) {
  return Object.entries(cost).every(([k, v]) => (p.resources[k] || 0) >= v);
}
/** 缺什么，如 "3 木、1 芦苇" */
function shortfall(p, cost) {
  const lack = Object.entries(cost)
    .filter(([k, v]) => (p.resources[k] || 0) < v)
    .map(([k, v]) => `${v - (p.resources[k] || 0)} ${resZh(k)}`);
  return lack.length ? lack.join("、") : "无";
}

// 调试挂载：开发期从 console 调
if (typeof window !== "undefined") {
  window.__gameDebug = {
    openLeaderboard, closeLeaderboard, toggleGuide, renderGuide, liveScores, applySeasonTheme,
    openModal, closeModal, onSpaceClick, sendAction,
    setFenceMode, toggleFence, refreshFenceUI,
    /** 用当前内存中的 state 重渲染（调试用） */
    rerender() { renderGame(document.getElementById("gameRoot"), _state, _me, _conn); },
    get fenceSel() { return [..._selFences]; },
    get fenceMode() { return _fenceMode; },
    get state() { return _state; },
    get me() { return _me; },
  };
}
function improvementLabel(name) {
  return MAJOR_ZH[name] || ({ fireplace:"壁炉", cookingHearth:"烹饪灶", clayOven:"陶土烤炉", stoneOven:"石头烤炉",
    well:"水井", basket:"柳编筐", joinery:"木工坊", pottery:"陶器坊" })[name] || name;
}

// ============================================================
// 实时排行榜
// ============================================================
/**
 * 右下角悬浮球（FAB）：排行榜 / 新手引导 / 教程
 * 每次 renderGame 都重建，保留展开状态。
 */
function ensureFab(g) {
  const old = document.getElementById("gameFab");
  const wasOpen = old ? old.classList.contains("open") : false;
  if (old) old.remove();

  const scores = liveScores(g);
  const leader = scores[0];
  const fab = document.createElement("div");
  fab.id = "gameFab";
  fab.className = "fab" + (wasOpen ? " open" : "");
  const dlcOn = !!(g.dlc && (g.dlc.occupations || g.dlc.minorImprovements || g.dlc.moor));
  fab.innerHTML = `
    <div class="fab-menu">
      <button class="fab-item" data-fab="leaderboard">
        <span class="fab-ic">🏆</span>
        <span class="fab-txt">排行榜</span>
        <span class="fab-score">${leader ? leader.total : 0}</span>
      </button>
      <button class="fab-item" data-fab="log">
        <span class="fab-ic">📜</span>
        <span class="fab-txt">动态日志</span>
      </button>
      <button class="fab-item" data-fab="rules">
        <span class="fab-ic">📋</span>
        <span class="fab-txt">价格 / 规则速查</span>
      </button>
      ${dlcOn ? `<button class="fab-item" data-fab="dlc">
        <span class="fab-ic">🎴</span>
        <span class="fab-txt">DLC 规则</span>
      </button>` : ""}
      <button class="fab-item${_showGuide ? " on" : ""}" data-fab="guide">
        <span class="fab-ic">❓</span>
        <span class="fab-txt">新手引导</span>
      </button>
      <button class="fab-item" data-fab="tutorial">
        <span class="fab-ic">📖</span>
        <span class="fab-txt">游玩教程</span>
      </button>
      <button class="fab-item" data-fab="sfx">
        <span class="fab-ic">${isSfxOn() ? "🔊" : "🔇"}</span>
        <span class="fab-txt">音效${isSfxOn() ? "开" : "关"}</span>
      </button>
    </div>
    <button class="fab-main" aria-label="菜单" aria-expanded="${wasOpen}">
      <span class="fab-main-ic">🧰</span>
    </button>
  `;
  document.body.appendChild(fab);

  const main = fab.querySelector(".fab-main");
  main.onclick = (e) => {
    e.stopPropagation();
    const open = fab.classList.toggle("open");
    main.setAttribute("aria-expanded", String(open));
  };
  fab.querySelector('[data-fab="leaderboard"]').onclick = () => {
    openLeaderboard(_state && _state.game);
    fab.classList.remove("open");
  };
  fab.querySelector('[data-fab="log"]').onclick = () => {
    if (isNarrowLayout()) switchMobileTab("log");
    else openLogDrawer();
    fab.classList.remove("open");
  };
  fab.querySelector('[data-fab="rules"]').onclick = () => {
    openRulesSheet(_state && _state.game);
    fab.classList.remove("open");
  };
  fab.querySelector('[data-fab="guide"]').onclick = () => {
    toggleGuide();
    fab.classList.remove("open");
    fab.querySelector('[data-fab="guide"]').classList.toggle("on", _showGuide);
  };
  fab.querySelector('[data-fab="tutorial"]').onclick = () => {
    import("/js/tutorial.js").then((m) => m.openTutorialDrawer());
    fab.classList.remove("open");
  };
  const dlcBtn = fab.querySelector('[data-fab="dlc"]');
  if (dlcBtn) dlcBtn.onclick = () => {
    import("/js/tutorial.js").then((m) => m.openDlcDrawer(_state && _state.game && _state.game.dlc));
    fab.classList.remove("open");
  };
  fab.querySelector('[data-fab="sfx"]').onclick = (e) => {
    e.stopPropagation();
    const on = toggleSfx();
    const btn = fab.querySelector('[data-fab="sfx"]');
    btn.querySelector(".fab-ic").textContent = on ? "🔊" : "🔇";
    btn.querySelector(".fab-txt").textContent = `音效${on ? "开" : "关"}`;
    toast(on ? "音效已开启" : "音效已关闭");
    // 不收起菜单，方便继续点
  };

  // ---- 按宽度降序重排（最长的在最上面，右对齐时形成整齐的阶梯）----
  const menu = fab.querySelector(".fab-menu");
  if (menu) {
    const items = Array.from(menu.children);
    items
      .map((el) => ({ el, w: el.getBoundingClientRect().width || el.textContent.length * 8 }))
      .sort((a, b) => b.w - a.w)
      .forEach(({ el }) => menu.appendChild(el));
  }

  // 点击空白处收起
  if (!window.__fabBound) {
    window.__fabBound = true;
    document.addEventListener("click", (e) => {
      const f = document.getElementById("gameFab");
      if (f && !f.contains(e.target)) f.classList.remove("open");
    });
    // ESC 关闭弹窗
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeLeaderboard();
      const f = document.getElementById("gameFab");
      if (f) f.classList.remove("open");
      if (_showGuide) { _showGuide = false; renderGuide(); }
    });
  }
}

function openLeaderboard(g) {
  g = g || (_state && _state.game);
  if (!g) return;
  const existing = document.getElementById("leaderboardOverlay");
  if (existing) { existing.remove(); return; }

  const scores = liveScores(g);
  const max = scores[0]?.total || 1;
  const isMe = (me) => (s) => s.id === me;

  const overlay = document.createElement("div");
  overlay.className = "leaderboard-overlay";
  overlay.id = "leaderboardOverlay";
  overlay.onclick = (e) => { if (e.target === overlay) closeLeaderboard(); };

  const modal = document.createElement("div");
  modal.className = "leaderboard-modal";
  modal.innerHTML = `
    <div class="row spread" style="margin-bottom:14px">
      <h3 class="mt0 mb0">🏆 实时排行榜 <span class="muted" style="font-size:13px">（第 ${g.round}/14 轮）</span></h3>
      <button class="btn ghost small" id="lbClose">关闭</button>
    </div>
  `;
  scores.forEach((s) => {
    const row = document.createElement("div");
    row.className = "lb-row" + (_me && s.id === _me.pid ? " is-me" : "");
    const pct = Math.max(0, Math.round((s.total / max) * 100));
    const rankEmoji = s.place === 1 ? "🥇" : s.place === 2 ? "🥈" : s.place === 3 ? "🥉" : `<b style="color:var(--ink-3)">${s.place}</b>`;
    row.innerHTML = `
      <div class="lb-rank">${s.place === 1 ? "🥇" : s.place === 2 ? "🥈" : s.place === 3 ? "🥉" : "#" + s.place}</div>
      <div>
        <div class="row spread" style="align-items:baseline">
          <div class="lb-name">${escapeHtml(s.name)}${_me && s.id === _me.pid ? ' <span class="badge green">你</span>' : ""}</div>
          <div class="lb-score">${s.total}</div>
        </div>
        <div class="lb-bar"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
        <div class="lb-detail">${Object.entries(s.breakdown).filter(([k,v]) => v !== 0).map(([k,v]) => `<div>${escapeHtml(k)}: <b>${v >= 0 ? "+" : ""}${v}</b></div>`).join("") || '<div class="muted">暂无得分项</div>'}</div>
      </div>
    `;
    modal.appendChild(row);
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector("#lbClose").onclick = closeLeaderboard;
}
function closeLeaderboard() {
  const o = document.getElementById("leaderboardOverlay");
  if (o) o.remove();
}

// ============================================================
// 背景时间轮 + 季节主题
// ============================================================
// ============================================================
// 价格 / 规则速查
// ============================================================
/** 与引擎 constants.ts 保持一致的速查数据 */
const RULES_DATA = {
  resources: [
    ["🪵 森林", "每轮 +1 木，取走全部"],
    ["🧱 陶坑", "每轮 +1 陶，取走全部"],
    ["🎋 芦苇滩", "每轮 +1 芦苇，取走全部"],
    ["⛏ 石场", "第 4 轮起，每轮 +1 石"],
    ["🌾 谷堆", "每轮 +1 谷，取走全部"],
    ["🥕 菜地", "第 4 轮起，每轮 +1 菜"],
    ["🐟 钓鱼", "每轮 +1 食物"],
    ["🛠 日工", "+2 食物（无成本，但占用 1 名家人）"],
  ],
  animals: [
    ["🐑 羊市", "第 4 轮开放 · 每轮累积 +1 · 取走全部（免费）", "🏠 每格牧场 2 只 · 羊 8 只 = 4 分"],
    ["🐗 猪市", "第 8 轮开放 · 每轮累积 +1 · 取走全部（免费）", "🏠 每格牧场 2 只 · 猪 7 只 = 4 分"],
    ["🐄 牛市", "第 12 轮开放 · 每轮累积 +1 · 取走全部（免费）", "🏠 每格牧场 2 只 · 牛 6 只 = 4 分"],
  ],
  buildings: [
    ["🏠 建房间", "每间 5 木/陶/石（按房屋材料）+ 2 芦苇", "必须与现有房间正交相邻 · 每间 +1 居住位"],
    ["🪵 建栅栏", "每段 1 木 · 每人最多 15 段", "必须围成完整矩形牧场；栅栏不可拆除"],
    ["🔨 翻修", "整栋一起翻 · 每间 1 陶/石 + 1 芦苇", "木屋 0 分 → 陶屋 1 分/间 → 石屋 2 分/间"],
  ],
  majors: [
    ["壁炉", "2 陶", "1 分", "2 谷/菜/羊/猪 → 1 食物；3 牛 → 1 食物（随时可用）"],
    ["大壁炉", "3 陶", "1 分", "同壁炉（自创可选卡）"],
    ["烹饪灶", "4 陶", "1 分", "1 谷/菜/羊/猪 → 2 食物；3 牛 → 2 食物（随时可用）"],
    ["大烹饪灶", "5 陶", "1 分", "同烹饪灶（自创可选卡）"],
    ["陶土烤炉", "3 陶 + 1 石", "2 分", "烤面包：最多 1 谷 → 5 食物"],
    ["石头烤炉", "3 石 + 1 陶", "3 分", "烤面包：最多 2 谷 → 每谷 4 食物"],
    ["水井", "3 石 + 1 木", "4 分", "未来 5 轮每轮开始 +1 食物"],
    ["木工坊", "2 石 + 2 木", "2 分", "每轮收获可将 1 木 → 2 食物"],
    ["陶器坊", "2 石 + 2 陶", "2 分", "每轮收获可将 1 陶 → 2 食物"],
    ["柳编筐", "2 石 + 2 芦苇", "2 分", "每轮收获可将 1 芦苇 → 3 食物"],
  ],
  roles: [
    ["👨‍👩‍👧 家人（人丁）", "每人每轮 = <b>1 次行动</b>（工放）。收获时每人需 <b>2 食物</b>；食物不够 → 每缺 1 点 = 1 张乞讨卡（-3 分）。每名家人终局 <b>+3 分</b>。"],
    ["👶 添丁", "花 2 食物 + 1 间空房，家人 +1（上限 5 人）。<b>新生儿当轮不能工作</b>，该轮收获只需喂 1 食物；下一轮起正常。"],
    ["🐑 牲畜", "三大作用：① <b>计分</b>（羊 8/猪 7/牛 6 只 = 4 分，各档见计分表）；② <b>繁殖</b>（收获时同类 ≥2 只 → 自动 +1 只，需有容量）；③ <b>烹饪</b>（用壁炉/烹饪灶换成食物救急）。"],
    ["🐣 繁殖与容量", "每格牧场容纳 2 只；一个牧场只能养一种动物。容量不足则不繁殖，多出的动物跑掉。围好栅栏不会自动来动物，需要去动物市场拿。"],
    ["🍞 喂养", "收获顺序：① 每块田产 1 谷/菜 → ② 每人吃 2 食物（可用谷/菜抵 1 食物）→ ③ 繁殖。收获在第 4/7/9/11/13/14 轮后进行。"],
  ],
  /** 回合卡时间表 */
  schedule: [
    ["第 1 轮", "建栅栏（此后永久可用）"],
    ["第 3 轮", "建造重大改进（此后永久可用）"],
    ["第 4 轮", "★ 羊市、石场、菜地开放"],
    ["第 5 轮", "翻修（此后永久可用）"],
    ["第 6 轮", "添丁（此后永久可用）"],
    ["第 8 轮", "★ 猪市开放"],
    ["第 12 轮", "★ 牛市开放"],
    ["第 14 轮", "最后一轮 · 结束后结算"],
  ],
  always: [
    ["🪵 木 / 🧱 陶 / 🎋 芦苇", "每轮累积 +1，取走全部"],
    ["🌾 谷", "每轮累积 +1（建田地前也能拿）"],
    ["🐟 钓鱼", "每轮累积 +1 食物"],
    ["🛠 日工", "固定 +2 食物"],
    ["🌱 犁地", "放一块田（须与现有田相邻）"],
    ["🌾 撒种 / 烤面包", "田里撒谷/菜；或用烤炉烤面包"],
    ["🏠 建房间", "5 木/陶/石 + 2 芦苇，须邻接现有房间"],
    ["🚜 起始玩家", "拿走标记 +1 食物"],
  ],
};

function openRulesSheet(g) {
  if (document.getElementById("rulesOverlay")) { document.getElementById("rulesOverlay").remove(); return; }
  const tbl = (rows, cols) => `
    <div class="rules-table" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">
      ${rows.map((r) => r.map((c, i) => `<div class="rules-cell${i === 0 ? " key" : ""}">${c}</div>`).join("")).join("")}
    </div>`;
  const overlay = document.createElement("div");
  overlay.className = "leaderboard-overlay";
  overlay.id = "rulesOverlay";
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="leaderboard-modal" style="max-width:660px">
      <div class="row spread" style="margin-bottom:12px">
        <h3 class="mt0 mb0">📋 价格 / 规则速查</h3>
        <button class="btn ghost small" id="rulesClose">关闭</button>
      </div>

      <h4 class="rules-h">🪵 永久资源格（第 1 轮起可用）</h4>
      ${tbl(RULES_DATA.resources.map(([k, v]) => [k, v]), 2)}

      <h4 class="rules-h">🌱 常规行动（第 1 轮起永久可用）</h4>
      ${tbl(RULES_DATA.always.map(([k, v]) => [k, v]), 2)}

      <h4 class="rules-h">🎴 回合卡时间表</h4>
      ${tbl(RULES_DATA.schedule.map(([k, v]) => [k, v]), 2)}
      <p class="muted" style="font-size:12px;margin:6px 0 0">
        收获在第 4 / 7 / 9 / 11 / 13 / 14 轮后进行（先田产 → 再喂养 → 最后繁殖）。
      </p>

      <h4 class="rules-h">🐑 动物市场（累积格 · 免费）</h4>
      ${tbl(RULES_DATA.animals.map(([k, v, n]) => [k, v, n]), 3)}
      <p class="muted" style="font-size:12px;margin:6px 0 0">
        取用动物格时拿走该格<b>全部</b>动物；养不下的会跑回供应区。需先围出牧场才能容纳。
      </p>

      <h4 class="rules-h">🏗 建筑与改造</h4>
      ${tbl(RULES_DATA.buildings.map(([k, v, n]) => [k, v, n]), 3)}

      <h4 class="rules-h">🔧 重大改进（10 个固定）</h4>
      ${tbl(RULES_DATA.majors.map(([k, c, vp, e]) => [k, c, vp, e]), 4)}

      <h4 class="rules-h">👨‍👩‍👧 人丁与牲畜的作用</h4>
      ${RULES_DATA.roles.map(([k, v]) => `<div class="rules-note"><b>${k}</b><br>${v}</div>`).join("")}

      <p class="muted" style="font-size:12px;margin-top:12px">
        依据《农场主》家庭变体规则整理。计分阈值见结算页或排行榜。
      </p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#rulesClose").onclick = () => overlay.remove();
  if (!window.__rulesEscBound) {
    window.__rulesEscBound = true;
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { const o = document.getElementById("rulesOverlay"); if (o) o.remove(); }
    });
  }
}

// ============================================================
// 背景时间轮：14 轮分扇区，按四季配色，当前轮高亮 ----
// ============================================================
const SEASONS = [
  { key: "spring", label: "春", from: 1,  to: 4,  color: "#f0aec6", tint: "#fdf0f5", icon: "🌸" },
  { key: "summer", label: "夏", from: 5,  to: 7,  color: "#e8b93c", tint: "#fdf6e0", icon: "☀️" },
  { key: "autumn", label: "秋", from: 8,  to: 10, color: "#d98b4a", tint: "#fbf0e6", icon: "🍂" },
  { key: "winter", label: "冬", from: 11, to: 14, color: "#8fb8d6", tint: "#eef5fa", icon: "❄️" },
];
function polarPt(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function donutSlice(cx, cy, rO, rI, startDeg, endDeg) {
  const [x1, y1] = polarPt(cx, cy, rO, startDeg);
  const [x2, y2] = polarPt(cx, cy, rO, endDeg);
  const [x3, y3] = polarPt(cx, cy, rI, endDeg);
  const [x4, y4] = polarPt(cx, cy, rI, startDeg);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rO} ${rO} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rI} ${rI} 0 ${large} 0 ${x4} ${y4} Z`;
}

function applySeasonTheme(round) {
  const season = seasonOfRound(round);
  document.body.dataset.season = season;

  const old = document.querySelector(".season-wheel");
  if (old) old.remove();

  const cx = 300, cy = 300;
  const rO = 268, rI = 176;   // 外/内半径 → 扇环
  const step = 360 / 14;       // 每轮 25.71°
  let slices = "";
  // 14 个轮次扇区
  for (let r = 1; r <= 14; r++) {
    const s = SEASONS.find((x) => r >= x.from && r <= x.to);
    const a0 = (r - 1) * step - 90 + 0.8;
    const a1 = r * step - 90 - 0.8;
    const isNow = r === round;
    const isPast = r < round;
    const fill = s.color;
    const op = isNow ? 0.95 : isPast ? 0.42 : 0.20;
    slices += `<path d="${donutSlice(cx, cy, rO, rI, a0, a1)}"
                 fill="${fill}" fill-opacity="${op}"
                 stroke="#fffdf6" stroke-width="${isNow ? 2.4 : 1.2}"/>`;
    // 轮次数字
    const [tx, ty] = polarPt(cx, cy, (rO + rI) / 2, (r - 1) * step + step / 2 - 90);
    slices += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central"
                 font-size="${isNow ? 24 : 18}" font-weight="800"
                 font-family="ui-monospace, monospace"
                 fill="${isNow ? "#3d3223" : "#7a684c"}"
                 fill-opacity="${isNow ? 0.95 : isPast ? 0.5 : 0.28}">${r}</text>`;
  }
  // 四季标签（在外圈外侧）
  let seasonLabels = "";
  SEASONS.forEach((s) => {
    const mid = ((s.from - 1 + s.to - 1) / 2) * step + step / 2 - 90;
    const [lx, ly] = polarPt(cx, cy, rO + 24, mid);
    const isNow = s.key === season;
    seasonLabels += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central"
                       font-size="${isNow ? 22 : 18}" font-weight="800"
                       fill="${s.color}" fill-opacity="${isNow ? 0.95 : 0.5}">${s.label}</text>`;
  });
  // 当前轮指针
  const nowAngle = (round - 1) * step + step / 2 - 90;
  const [px, py] = polarPt(cx, cy, rO + 6, nowAngle);
  const [ix, iy] = polarPt(cx, cy, rI - 6, nowAngle);
  const needle = `<line x1="${ix}" y1="${iy}" x2="${px}" y2="${py}"
                    stroke="${SEASONS.find(s => s.key === season).color}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.9"/>`;

  const wheel = document.createElement("div");
  wheel.className = "season-wheel";
  wheel.dataset.round = String(round);
  wheel.title = `第 ${round} 轮 · ${SEASON_LABEL_ZH[season]}季`;
  wheel.innerHTML = `
    <svg viewBox="0 0 600 600" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="${rI - 14}" fill="none" stroke="#b8a977" stroke-width="1" stroke-dasharray="4 6" stroke-opacity="0.5"/>
      ${slices}
      ${seasonLabels}
      ${needle}
      <text x="${cx}" y="${cy - 14}" text-anchor="middle"
            font-size="34" font-weight="900" fill="#43331f" fill-opacity="0.75">第 ${round} 轮</text>
      <text x="${cx}" y="${cy + 30}" text-anchor="middle"
            font-size="26" font-weight="800" fill="#7a684c" fill-opacity="0.6">${SEASON_LABEL_ZH[season]}季 · ${SEASON_ICON[season]}</text>
    </svg>
  `;
  document.body.appendChild(wheel);
}

// ============================================================
// 新手引导
// ============================================================
const GUIDE_STEPS = [
  {
    title: "🚜 欢迎来到《农场主》",
    body: "你是一个 17 世纪的农场主，要在 14 轮内把一片荒地发展成兴旺的农场。轮次多、点在行动板上执行每回合的工作，收获阶段越多越好。<br><br>每轮：揭卡 → 累积资源 → 工人做工 → 回家 → 收获（仅指定轮次）。",
    selector: "#gameRoot",
  },
  {
    title: "🪵 资源格",
    body: "木🪵、陶🧱、芦苇🎋、石⛏ 是建房间用的建材。谷🌾、菜🥕 收获后用于喂家人。食物🍞 是每轮喂家人必需的。",
    selector: "#alwaysGrid",
  },
  {
    title: "🐑 动物市场",
    body: "轮 5 起可买羊、轮 9 起买猪、轮 13 起买牛。要先在棋盘上围出矩形牧场才能容纳动物，每格牧场可养 2 只。围好栅栏不会自动来动物，要自己去市场取。",
    selector: "#animalGrid",
  },
  {
    title: "🎯 回合卡行动",
    body: "每轮会揭示新的行动卡；<b>揭出后就永久留在版图上</b>（同一格每轮仍只能被使用一次）。<br>· <b>起始玩家</b>：拿走标记 +1 食物<br>· <b>建房间/犁地/撒种/建栅栏/添丁/翻修/大改进</b>：点击卡看说明后在棋盘操作<br>· <b>撒种/烤面包</b>：需要选择格或输入烤面包数",
    selector: "#roundGrid",
  },
  {
    title: "👨‍🌾 你的回合（绿框）",
    body: "当前轮到的玩家：资源卡 + 农场卡都加亮绿色边框 + 右上角「👉 该他行动」徽章。其他玩家灰色。",
    selector: ".col-card.is-current-turn",
  },
  {
    title: "🏆 实时排行榜",
    body: "顶栏的「🏆 排行榜」按钮随时查看当前分数。每块田/牧场/动物/家人/房间都按规则加分，乞讨卡扣分。",
    selector: ".leaderboard-btn",
  },
];

function toggleGuide() {
  _showGuide = !_showGuide;
  if (_showGuide) _guideStep = 0;
  renderGuide();
  if (window.__debug) window.__debug = window.__debug; // keep debug accessor
}

function renderGuide() {
  document.querySelectorAll(".guide-overlay").forEach((el) => {
    if (el._cleanupResize) el._cleanupResize();
    el.remove();
  });
  const guideBtn = document.querySelector(".guide-btn");
  if (guideBtn) guideBtn.classList.toggle("active", _showGuide);
  if (!_showGuide || _state.phase !== "playing") return;

  const step = GUIDE_STEPS[_guideStep] || GUIDE_STEPS[0];
  const overlay = document.createElement("div");
  overlay.className = "guide-overlay active";
  overlay.innerHTML = `<div class="guide-spotlight" id="guideSpot"></div><div class="guide-card" id="guideCard"></div>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector("#guideCard");
  const spot = overlay.querySelector("#guideSpot");
  const target = step.selector ? document.querySelector(step.selector) : null;

  const place = (opts = {}) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = vw < 640;
    const M = 12;   // 视口最小边距
    const pad = 8;  // spotlight 外扩

    // 窄屏：给页面底部留出卡片空间（可滚动区域变大，目标能被滚到卡片上方）
    if (narrow && opts.first) {
      document.body.style.paddingBottom = ((card.offsetHeight || 220) + 28) + "px";
    }
    const reservedBottom = narrow ? ((card.offsetHeight || 220) + M + 8) : pad;
    const spotMaxBottom = narrow ? Math.max(60, vh - reservedBottom) : vh;

    // ---- 高亮框：裁剪到视口内（窄屏还要避开底部卡片）----
    if (target) {
      const r = target.getBoundingClientRect();
      const l = Math.max(0, Math.min(r.left - pad, vw - 24));
      const t = Math.max(0, Math.min(r.top - pad, spotMaxBottom - 24));
      const w = Math.max(24, Math.min(vw - l, r.width + pad * 2));
      const h = Math.max(24, Math.min(spotMaxBottom - t, r.height + pad * 2));
      spot.style.display = "";
      spot.style.left = l + "px";
      spot.style.top = t + "px";
      spot.style.width = w + "px";
      spot.style.height = h + "px";
    } else {
      spot.style.display = "none";
    }

    // ---- 卡片：窄屏固定底部（bottom sheet），宽屏跟随目标 ----
    card.style.transform = "none";
    if (narrow || !target) {
      // 窄屏：底部抽屉，限高可滚动，永远可见可点
      card.style.left = M + "px";
      card.style.right = M + "px";
      card.style.top = "auto";
      card.style.bottom = M + "px";
      card.style.maxWidth = "none";
      card.style.maxHeight = Math.round(vh * 0.56) + "px";
      card.style.overflowY = "auto";
      return;
    }

    card.style.right = "auto";
    card.style.bottom = "auto";
    card.style.maxWidth = "";
    // 宽屏限高：超高时内部滚动，避免超出视口
    card.style.maxHeight = Math.round(vh - M * 2) + "px";
    card.style.overflowY = "auto";

    const r = target.getBoundingClientRect();
    const cw = card.offsetWidth || 360;
    const ch = Math.min(card.offsetHeight || 200, vh - M * 2);

    // 竖直：优先目标下方，放不下则上方，再不行居中（结果再夹到视口内）
    let top = r.bottom + 16;
    if (top + ch > vh - M) top = r.top - ch - 16;
    top = Math.max(M, Math.min(top, vh - ch - M));

    // 水平：与目标左对齐，但裁剪在视口内
    let left = r.left;
    left = Math.min(Math.max(M, left), Math.max(M, vw - cw - M));

    card.style.left = left + "px";
    card.style.top = top + "px";
  };

  // ★ 关键：先把内容写进卡片，再定位（否则量到的高度是 0，会算出屏幕外坐标）
  const isLast = _guideStep === GUIDE_STEPS.length - 1;
  card.innerHTML = `
    <h4>${step.title}</h4>
    <p>${step.body}</p>
    <div class="row" style="justify-content:space-between;align-items:center">
      <div class="progress">${_guideStep + 1} / ${GUIDE_STEPS.length}</div>
      <div class="row" style="gap:8px">
        ${_guideStep > 0 ? '<button class="btn ghost small" id="gPrev">上一步</button>' : ""}
        <button class="btn small" id="gNext">${isLast ? "完成 ✅" : "下一步 →"}</button>
      </div>
    </div>
  `;

  place({ first: true });
  // 窄屏：立即滚动，让目标落在「卡片上方可见区」的中间
  if (window.innerWidth < 640 && target) {
    const vh0 = window.innerHeight;
    const ch0 = card.offsetHeight || 220;
    const availH = Math.max(120, vh0 - ch0 - 28);
    const r0 = target.getBoundingClientRect();
    const delta = (r0.top + r0.height / 2) - availH / 2;
    if (Math.abs(delta) > 8) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const next = Math.max(0, Math.min(maxScroll, window.scrollY + delta));
      window.scrollTo(0, next);   // 立即滚动（smooth 会被后续重渲染打断）
    }
  }
  // 字体/布局稳定后再校正一次（防止内容换行导致高度变化）
  requestAnimationFrame(() => place());
  // 窗口尺寸变化时重新定位（含横竖屏切换）
  const onResize = () => place({ first: true });
  window.addEventListener("resize", onResize);
  overlay._cleanupResize = () => {
    window.removeEventListener("resize", onResize);
    document.body.style.paddingBottom = "";
  };

  card.querySelector("#gNext").onclick = () => {
    if (isLast) { _showGuide = false; renderGuide(); }
    else { _guideStep++; renderGuide(); }
  };
  const p = card.querySelector("#gPrev");
  if (p) p.onclick = () => { _guideStep--; renderGuide(); };
}

// 重新渲染后引导位置失效，每次 renderGame 完成后若引导开启则重新挂载
function maybeReattachGuide() {
  if (_showGuide && _state && _state.phase === "playing") renderGuide();
}

// ---- 结算 ----
export function renderFinished(root, s, me) {
  root.innerHTML = "";
  const g = s.game;
  if (!g) return;
  // 服务端未带 scores 时用客户端实时计分兜底；同时清洗 NaN/null（老房间数据）
  const safe = (v) => (typeof v === "number" && Number.isFinite(v)) ? v : 0;
  const sanitize = (br) => {
    const out = {};
    for (const k of Object.keys(br)) out[k] = safe(br[k]);
    return out;
  };
  const scores = (g.scores && g.scores.length)
    ? g.scores.map(s => ({ ...s, total: safe(s.total), breakdown: sanitize(s.breakdown || {}) }))
    : liveScores(g).map(s => ({ ...s, breakdown: sanitize(s.breakdown) }));

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<div class="row spread" style="margin-bottom:14px">
      <h2 class="mt0 mb0">🏁 游戏结束 <span class="muted" style="font-size:14px">（14 轮全部结束）</span></h2>
      <div class="row" style="gap:8px">
        <button class="btn ghost small" id="backHost">🏠 主持台</button>
        <button class="btn small" id="backHome">🏡 首页</button>
      </div>
    </div>`;
  card.querySelector("#backHome").onclick = () => { try { localStorage.removeItem("agri:room:" + (s.code || "")); } catch {} location.href = "/"; };
  card.querySelector("#backHost").onclick = () => { location.href = "/host.html"; };
  const table = document.createElement("div");
  table.style.display = "grid"; table.style.gridTemplateColumns = "1fr"; table.style.gap = "10px";
  scores.forEach((sc, i) => {
    const row = document.createElement("div");
    row.className = "card soft";
    const isMe = me && me.pid === sc.id;
    row.style.borderColor = isMe ? "var(--leaf)" : "var(--line)";
    row.innerHTML = `
      <div class="row spread">
        <div><b>${i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}${escapeHtml(sc.name)}</b>${isMe ? ' <span class="badge green">你</span>' : ""}</div>
        <div style="font-size:24px; font-weight:800">${sc.total} 分</div>
      </div>
      <div class="mt8" style="font-size:12.5px; color:var(--ink-2); display:grid; grid-template-columns:repeat(3,1fr); gap:4px">
        ${Object.entries(sc.breakdown).map(([k,v]) => `<div>${escapeHtml(k)}：<b>${v >= 0 ? "+" : ""}${v}</b></div>`).join("")}
      </div>`;
    table.appendChild(row);
  });
  card.appendChild(table);
  root.appendChild(card);
}