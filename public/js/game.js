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
import { isBgmOn, toggleBgm, setBgmSeason, startBgm } from "/js/bgm.js";
import { OCCUPATIONS, MINOR_IMPROVEMENTS } from "/js/dlc-data.js";
import {
  tokenSvg,
  animalSvg,
  meepleSvg,
  runnerSvg,
  roomTileSvg,
  roomModelSvg,
  fieldContentSvg,
  actionWoodcutSvg,
  stableSvg,
  emptySoilSvg,
  majorImprovementSvg,
  categorySealSvg,
  fenceRailSvg,
  cradleSvg,
} from "/js/svg-icons.js";
import { flyMeepleToSpace, flyTokenToStock, flyCropHarvest } from "/js/fx.js";
import { initAmbientCanvas, setAmbientSeason, triggerHarvestConfetti } from "/js/ambient.js";

const ICONS = ["🧑‍🌾", "👩‍🌾", "🧑‍🍳", "👴"];
const PLAYER_COLORS = ["#e05d44", "#3f9d55", "#3d7ea6", "#d9932f"];
const HARVEST_ROUNDS_ALL = [4, 7, 9, 11, 13, 14];

/** 客户端本地副本：DLC 卡牌 lookup（用于 DOM 渲染，权威数据由引擎持有） */
const OCC_LOOKUP = Object.fromEntries(OCCUPATIONS.map((o) => [o.id, o]));
const MINOR_LOOKUP = Object.fromEntries(MINOR_IMPROVEMENTS.map((m) => [m.id, m]));
function minorNameById(id) { return MINOR_LOOKUP[id] ? MINOR_LOOKUP[id].icon + " " + MINOR_LOOKUP[id].name : id; }
function minorEffectById(id) { return MINOR_LOOKUP[id] ? MINOR_LOOKUP[id].effect : ""; }

// 资源/行动图标 + 中文标签
const SPACES = [
  // 永远可用（累积型）
  { id: "Wood",      name: "木材",     icon: "🪵", desc: "每轮累积 +3 木材，取走全部", pool: "wood", always: true },
  { id: "Clay",      name: "陶土",     icon: "🧱", desc: "每轮累积 +1 陶土，取走全部", pool: "clay", always: true },
  { id: "Reed",      name: "芦苇",     icon: "🎋", desc: "每轮累积 +1 芦苇，取走全部", pool: "reed", always: true },
  { id: "Stone",     name: "石材",     icon: "⛏", desc: "第 4 轮起每轮累积 +1 石材，取走全部", pool: "stone", fromRound: 4 },
  { id: "Grain",     name: "谷物",     icon: "🌾", desc: "固定拿取 1 谷物", pool: "grain", always: true },
  { id: "Vegetable", name: "蔬菜",     icon: "🥕", desc: "第 4 轮起固定拿取 1 蔬菜", pool: "vegetable", fromRound: 4 },
  { id: "Fishing",   name: "钓鱼",     icon: "🐟", desc: "每轮累积 +1 食物，取走全部", pool: "food", always: true },
  { id: "DayLaborer",name: "日工",     icon: "🛠", desc: "打零工立即获得 2 食物（占用 1 名工人）", pool: "special", always: true },
  // 动物市场
  { id: "Sheep",     name: "羊市",     icon: "🐑", desc: "第 4 轮开放 · 免费牵走格内全部绵羊", pool: "sheep",  fromRound: 4 },
  { id: "Boar",      name: "猪市",     icon: "🐗", desc: "第 8 轮开放 · 免费牵走格内全部野猪", pool: "boar",   fromRound: 8 },
  { id: "Cattle",    name: "牛市",     icon: "🐄", desc: "第 12 轮开放 · 免费牵走格内全部黄牛", pool: "cattle", fromRound: 12 },
  // ---- 常规行动：第 1 轮起永久可用 ----
  { id: "PlowField",     name: "犁地",       icon: "🌱", desc: "开垦一块新农田（须与现有农田相邻）", alwaysAction: true },
  { id: "SowOrBake",     name: "播种/烤面包", icon: "🌾", desc: "在农田批量播种谷物/蔬菜，或用烤炉将谷物烤成面包", alwaysAction: true },
  { id: "BuildRoom",     name: "建房/马厩",   icon: "🏠", desc: "扩建房间（5建材+2芦苇）及/或建造马厩（每座2木材）", alwaysAction: true },
  { id: "StartPlayer",   name: "起始玩家",   icon: "🚜", desc: "拿走起始玩家标记，下轮先动并立即 +1 食物", alwaysAction: true },
  // ---- 回合卡行动：按轮次揭示 ----
  { id: "Fences",        name: "建栅栏",     icon: "🪵", desc: "围出封闭牧场（每段栅栏消耗 1 木材）", roundCard: true },
  { id: "FamilyGrowth",  name: "添丁",       icon: "👶", desc: "家庭添丁增添 1 名成员（需有空房间，0食物消耗）", roundCard: true },
  { id: "Renovate",      name: "翻修",       icon: "🔨", desc: "整栋房屋升级（每间消耗 1 陶土/石材 + 全屋共 1 芦苇）", roundCard: true },
  { id: "BuildMajor",    name: "大改进",     icon: "🔧", desc: "建造重大改进设施（壁炉、烤炉、水井等）", roundCard: true },
  { id: "EasternQuarry", name: "东采石场",   icon: "⛏", desc: "每轮累积 +1 石材，取走全部", roundCard: true },
  { id: "PlowAndSow",    name: "犁田及/或撒种", icon: "🚜", desc: "开垦一块农田，并可立即对空田撒种", roundCard: true },
  { id: "UrgentGrowth",  name: "急迫添丁",   icon: "👶", desc: "急迫添丁扩充家庭（即使没有空房也可添丁）", roundCard: true },
  { id: "RenovateFences",name: "翻修及/或栅栏", icon: "🏰", desc: "翻修农舍，并可立即建造栅栏", roundCard: true },
  // ---- 3人 / 4人 动态行动格 ----
  { id: "Copse3P",       name: "灌木林 (3人)", icon: "🪵", desc: "每轮累积 +2 木材", pool: "wood", scaling: 3 },
  { id: "ClayDeposit3P", name: "陶土矿 (3人)", icon: "🧱", desc: "每轮累积 +2 陶土", pool: "clay", scaling: 3 },
  { id: "ResourceMarket3P", name: "资源市场 (3人)", icon: "⚖️", desc: "固定拿 1 食物 + 1 芦苇 + 1 石头", pool: "special", scaling: 3 },
  { id: "Lessons3P",     name: "职业 (3人)", icon: "🎓", desc: "打出 1 张职业卡（第1张免费，第2张起1食物）", pool: "special", scaling: 3 },
  { id: "Grove4P",       name: "小树林 (4人)", icon: "🪵", desc: "每轮累积 +1 木材", pool: "wood", scaling: 4 },
  { id: "Copse4P",       name: "灌木林 (4人)", icon: "🪵", desc: "每轮累积 +2 木材", pool: "wood", scaling: 4 },
  { id: "ClayDeposit4P", name: "陶土矿 (4人)", icon: "🧱", desc: "每轮累积 +2 陶土", pool: "clay", scaling: 4 },
  { id: "ReedBank4P",    name: "芦苇滩 (4人)", icon: "🎋", desc: "每轮累积 +1 芦苇", pool: "reed", scaling: 4 },
  { id: "ResourceMarket4P", name: "资源市场 (4人)", icon: "⚖️", desc: "固定拿 1 食物 + 1 芦苇 + 1 石头", pool: "special", scaling: 4 },
  { id: "Lessons4P",     name: "课程 (4人)", icon: "🎓", desc: "打出 1 张职业卡（第1张免费，第2张起1食物）", pool: "special", scaling: 4 },
];

// id → 中文名；用于把服务端揭示的英文 token 渲染成中文
const SPACE_NAME_ZH = Object.fromEntries(SPACES.map((s) => [s.id, s.name]));
const SPACE_NAME_FALLBACK = {
  Ore: "采矿",
  GatherFuel: "收集燃料",
  CutMeadow: "割草甸",
  ReclaimMoor: "沼泽拓荒",
  SowMoor: "沼泽播种",
};
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
// 修订版上界 breaks（与引擎 constants.ts 一致）
const ANIMAL_BREAKS = { sheep: [0, 1, 4, 6, 8], boar: [0, 1, 3, 5, 7], cattle: [0, 1, 2, 4, 6] };
const MAJOR_VP_MAP = {
  fireplace: 1, fireplaceBig: 1, cookingHearth: 1, cookingHearthBig: 1,
  clayOven: 2, stoneOven: 3, well: 4, joinery: 2, pottery: 2, basket: 2,
  heatingStove: 2, peatKiln: 2, moorCook: 3, tileOven: 3, firewood: 2,
};
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
  const fields = p.grid.flat().filter(c => c.kind === "field").length + ((p.moorFields && p.moorFields.length) || 0);
  const pastures = p.pastures.length;
  let grain = p.resources.grain;
  let veg = p.resources.vegetable;
  p.grid.flat().forEach(c => {
    if (c.kind === "field" && c.crop && c.markers) {
      if (c.crop === "grain") grain += c.markers;
      else if (c.crop === "vegetable") veg += c.markers;
    }
  });

  // 统计牧场格子集合，防重计算未利用空地
  const pastureCells = new Set();
  let fencedStables = 0;
  p.pastures.forEach(pst => {
    pst.cells.forEach(c => {
      pastureCells.add(c);
      const [x, y] = c.split(",").map(Number);
      if (p.grid[y]?.[x]?.stable) fencedStables += 1;
    });
  });

  let used = 0;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const cell = p.grid[y][x];
      if (cell.kind === "field" || cell.kind === "room" || pastureCells.has(`${x},${y}`) || cell.stable) {
        used += 1;
      }
    }
  }
  const unusedSpaces = Math.max(0, 15 - used);

  const breakdown = {
    "田块": SCORE_T.fields[Math.min(5, fields)],
    "牧场": SCORE_T.pastures[Math.min(4, pastures)],
    "谷物": SCORE_T.grain[scoreIdxT(grain, [0, 1, 4, 6, 8])],
    "蔬菜": SCORE_T.vegetables[scoreIdxT(veg, [0, 1, 2, 3, 4])],
    "羊": animalScoreT("sheep", p.animals.sheep),
    "猪": animalScoreT("boar", p.animals.boar),
    "牛": animalScoreT("cattle", p.animals.cattle),
    "圈地马厩": fencedStables * SCORE_T.fencedStable,
    "陶屋": (p.roomType === "clay" ? p.rooms : 0) * SCORE_T.clayRoom,
    "石屋": (p.roomType === "stone" ? p.rooms : 0) * SCORE_T.stoneRoom,
    "木屋": (p.roomType === "wood" ? p.rooms : 0) * SCORE_T.woodRoom,
    "家人": p.family * SCORE_T.familyMember,
    "空地": unusedSpaces * SCORE_T.unusedYard,
    "乞讨": (p.beggings || 0) * SCORE_T.begging,
    "改进": (p.improvements || []).reduce((s, k) => s + (MAJOR_VP_MAP[k] || 0), 0),
  };
  // 职业终局加成
  let occBonus = 0;
  if (p.occupation?.id === "tutor") {
    if (((p.improvements || []).length + (p.minorImprovements?.length || 0)) >= 3) occBonus += 3;
  } else if (p.occupation?.id === "villageElder") {
    if (p.beggings === 0) occBonus += 3;
  } else if (p.occupation?.id === "architect") {
    occBonus += (p.roomType === "clay" || p.roomType === "stone" ? p.rooms : 0);
  } else if (p.occupation?.id === "estateAgent") {
    if (p.family >= 5) occBonus += 3;
  } else if (p.occupation?.id === "agronomist") {
    if (fields >= 4) occBonus += 3;
  } else if (p.occupation?.id === "pastureCount") {
    if (pastures >= 3) occBonus += 3;
  } else if (p.occupation?.id === "masterBreeder") {
    if (p.animals.sheep >= 1 && p.animals.boar >= 1 && p.animals.cattle >= 1) occBonus += 4;
  } else if (p.occupation?.id === "philanthropist") {
    if (p.food >= 5 && p.beggings === 0) occBonus += 3;
  }
  if (occBonus > 0) breakdown["职业"] = occBonus;

  // 「柴火棚」大改进（沼泽农夫扩展）
  if ((p.improvements || []).includes("firewood") && (p.fuel || 0) > 0) {
    breakdown["柴火"] = p.fuel * 1;
  }
  // 节气轮转：度假等季节行动累积的额外分
  if ((p.seasonVP || 0) > 0) {
    breakdown["节气"] = p.seasonVP;
  }

  const stats = {
    fields, pastures, grain, veg,
    sheep: p.animals.sheep, boar: p.animals.boar, cattle: p.animals.cattle,
    roomType: p.roomType, rooms: p.rooms, family: p.family,
    unusedSpaces, beggings: p.beggings, improvements: p.improvements, occBonus
  };
  return { id: p.id, name: p.name, total: Object.values(breakdown).reduce((a, b) => a + b, 0), breakdown, stats };
}
function liveScores(g) {
  const arr = g.players.map(p => liveScorePlayer(p));
  arr.sort((a, b) => b.total - a.total);
  arr.forEach((s, i) => (s.place = i + 1));
  return arr;
}

// 季节：14 轮 → 春夏秋冬（1-4 春，5-7 夏，8-10 秋，11-14 冬）
// 节气轮转 DLC：每轮一季，从随机起始季节开始循环（引擎 g.seasonStart）
const TTS_ORDER = ["spring", "summer", "autumn", "winter"];
/** 各季节「节气行动」格的说明（行动板展示用） */
const TTS_SEASON_ACTION_DESC = {
  spring: "春耕：立即繁殖一次（成对即 +1 幼崽），可顺带撒种",
  summer: "度假：本轮已放置的每名家人（含本次）+1 节气分",
  autumn: "秋收：立即田间阶段（每块作物田 +1），可再拿 1 菜",
  winter: "家庭扩建：无需空房添 1 人（2 木 + 3 食物）",
};
/** 各季节效果摘要（头部徽章悬浮提示用） */
const TTS_SEASON_HINT = {
  spring: "节气·春：木材堆−1、石场+1；建栅栏最多 2 段免费（须付费≥1段）；节气行动=春耕（繁殖+可选撒种）",
  summer: "节气·夏：陶坑+1、石场−1、钓鱼+1；建房附赠 1 马厩；日工额外 +1 谷；节气行动=度假（按本轮已放置家人数得分）",
  autumn: "节气·秋：木材堆+1、芦苇滩+1；建大改进减 1 建材；节气行动=秋收（立即田间阶段+可选拿 1 菜）",
  winter: "节气·冬：陶坑−1、芦苇滩−1；犁地需付 1 食物；鱼塘封冻（第 11 轮起解冻）；节气行动=家庭扩建（无需空房，2木+3食物）",
};
function ttsSeasonOf(g, r) {
  if (!g || !g.dlc?.seasons) return null;
  const start = typeof g.seasonStart === "number" ? g.seasonStart : 0;
  return TTS_ORDER[(((start + r - 1) % 4) + 4) % 4];
}
function seasonOfRound(r) {
  const g = typeof _state !== "undefined" && _state && _state.game;
  const tts = ttsSeasonOf(g, r);
  if (tts) return tts;
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
/** 行动板内部分页：'resources' (资源&市场) | 'actions' (行动&回合卡) | 'moor' (沼泽农夫) */
let _actionSubTab = "resources";
/** 2.5D Isometric 透视视角开关（默认桌面端开启，移动端窄屏默认2D，用户随时可切换） */
let _isoMode = (() => {
  try {
    const v = localStorage.getItem("agri:isoMode");
    if (v !== null) return v === "on";
    return typeof window !== "undefined" && window.innerWidth >= 1024;
  } catch {
    return false;
  }
})();

function toggleIsoMode() {
  _isoMode = !_isoMode;
  try { localStorage.setItem("agri:isoMode", _isoMode ? "on" : "off"); } catch {}
  document.querySelectorAll(".farm-board-wrap").forEach((el) => {
    el.classList.toggle("mode-iso", _isoMode);
  });
  document.querySelectorAll(".iso-toggle-btn").forEach((btn) => {
    btn.innerHTML = _isoMode ? "📐 2.5D" : "📋 2D";
    btn.classList.toggle("active", _isoMode);
  });
  sfx.select();
}

function switchActionSubTab(tab) {
  _actionSubTab = tab;
  document.querySelectorAll(".action-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.actTab === tab);
  });
  document.querySelectorAll(".action-sub-panel").forEach((p) => {
    p.classList.toggle("active", p.dataset.panel === tab);
  });
}

// ---- 全局智能视口浮窗（防超屏、防裁剪截断、自适应视口贴靠） ----
let _globalTip = null;
let _tipActiveEl = null;

function initSmartTooltip() {
  if (typeof document === "undefined" || document.getElementById("appTooltip")) return;
  _globalTip = document.createElement("div");
  _globalTip.id = "appTooltip";
  _globalTip.className = "app-tooltip";
  document.body.appendChild(_globalTip);

  function hideTip() {
    if (!_globalTip) return;
    _tipActiveEl = null;
    _globalTip.className = "app-tooltip";
    _globalTip.style.display = "none";
  }

  function showTip(target) {
    if (!target) return;
    const el = target.closest("[data-tip], .stk[data-name], .res[data-name]");
    if (!el) { hideTip(); return; }
    const tipText = el.getAttribute("data-tip") || el.getAttribute("data-name");
    if (!tipText) { hideTip(); return; }

    _tipActiveEl = el;
    _globalTip.textContent = tipText;
    _globalTip.className = "app-tooltip measuring";
    _globalTip.style.left = "-9999px";
    _globalTip.style.top = "-9999px";
    _globalTip.style.display = "block";

    const rect = el.getBoundingClientRect();
    const tipRect = _globalTip.getBoundingClientRect();

    const pad = 10;
    // 水平居中并安全贴靠视口边界，杜绝任何超屏
    let left = rect.left + (rect.width - tipRect.width) / 2;
    const maxLeft = window.innerWidth - tipRect.width - pad;
    left = Math.max(pad, Math.min(maxLeft, left));

    // 垂直定位：优先放在上方，若上方空间不足则翻转至下方
    let top = rect.top - tipRect.height - 8;
    if (top < pad) {
      top = rect.bottom + 8;
      if (top + tipRect.height > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - tipRect.height - pad);
      }
    }

    _globalTip.style.left = `${Math.round(left)}px`;
    _globalTip.style.top = `${Math.round(top)}px`;
    _globalTip.className = "app-tooltip visible";
  }

  document.addEventListener("mouseover", (e) => showTip(e.target), { passive: true });
  document.addEventListener("mouseout", (e) => {
    if (_tipActiveEl && !_tipActiveEl.contains(e.relatedTarget)) hideTip();
  }, { passive: true });

  // 移动端轻触与点按支持
  document.addEventListener("touchstart", (e) => {
    const el = e.target.closest("[data-tip], .stk[data-name]");
    if (el) {
      if (_tipActiveEl === el) {
        hideTip();
      } else {
        showTip(el);
      }
    } else {
      hideTip();
    }
  }, { passive: true });

  window.addEventListener("scroll", hideTip, { passive: true });
}

export function renderGame(root, s, me, conn) {
  _state = s; _me = me; _conn = conn;
  const prev = _prev;
  _prev = JSON.parse(JSON.stringify(s.game || {}));
  bindSfx(root);

  // 判断是否是新场景（决定要不要播入场动画）
  const gKey = s.game && s.game.players ? `${s.code}:${s.game.players.length}:${_activeTab}` : "none";
  if (_animKey !== gKey) { _intro = true; _animKey = gKey; } else { _intro = false; }

  // 音效与礼花：新回合 / 收获阶段
  const gNow = s.game;
  if (gNow && prev && gNow.round !== prev.round) sfx.turn();
  const lastMsg = gNow && gNow.log && gNow.log.length ? gNow.log[gNow.log.length - 1].msg : "";
  const prevMsg = prev && prev.log && prev.log.length ? prev.log[prev.log.length - 1].msg : "";
  if (/收获阶段开始/.test(lastMsg) && !/收获阶段开始/.test(prevMsg)) {
    sfx.harvest();
    triggerHarvestConfetti(45);
  }

  // 保存当前滚动位置并锁定最小高度，杜绝重渲染时高度坍塌导致页面强制滚动跳顶
  const savedScrollY = typeof window !== "undefined" ? window.scrollY : 0;
  const prevH = root.offsetHeight;
  if (prevH > 100) {
    root.style.minHeight = `${prevH}px`;
  }

  root.innerHTML = "";

  const g = s.game;
  if (!g || !g.players) {
    root.innerHTML = `<div class="card"><h3 class="mt0">正在加载游戏…</h3></div>`;
    return;
  }

  const myPlayer = me.role === "player" ? g.players.find((p) => p.id === me.pid) : null;
  const myTurn = g.waitingFor[0] === me.pid;

  // 顶栏（轮次 + 阶段 + 季节 + 揭示 + 油量表）
  const season = seasonOfRound(g.round);
  initAmbientCanvas();
  setAmbientSeason(season);
  setBgmSeason(season);
  if (isBgmOn()) startBgm();
  const seasonInfo = SEASONS.find((s) => s.key === season);
  const top = document.createElement("div");
  top.id = "gameHeaderCard";
  const isCurHarvest = HARVEST_ROUNDS_ALL.includes(g.round);
  const nextHarvestRound = HARVEST_ROUNDS_ALL.find((r) => r >= g.round);
  const roundsToHarvest = nextHarvestRound != null ? nextHarvestRound - g.round : 0;
  const harvestTip = isCurHarvest
    ? `🌾 【本轮结束触发收获阶段】\n当本轮所有玩家放完工人后，系统将自动依次结算三大步骤：\n① 农田收割：每块已播种农田收 1 份作物（谷物或蔬菜）进库存\n② 喂养家人与房屋取暖：成年人需 2 食物（本轮婴儿需 1 食物）；缺少食物每缺 1 点被迫拿 1 张乞讨卡（-3分）！若开启沼泽农夫扩展，每人还需 1 燃料，每头黄牛需 1 干草\n③ 牲畜繁殖：每种动物持有 ≥2 只且牧场有空位时，自动繁殖 1 只幼崽`
    : `🌾 【下一次收获阶段倒计时】\n距第 ${nextHarvestRound} 轮结束的收获阶段还剩 ${roundsToHarvest} 轮。\n全剧共有 6 次收获（第 4、7、9、11、13、14 轮结束时）。\n收获阶段由系统自动结算：①农田收割 ②喂饱家人与房屋取暖 ③牲畜繁殖。\n请提前备足口粮与燃料，缺少资源将受到乞讨卡（每张-3分）的严厉惩罚！`;
  const harvestBadge = isCurHarvest
    ? `<span class="badge red anim-pulse" data-tip="${escapeHtml(harvestTip)}">🌾 本轮结束结算收获</span>`
    : `<span class="badge harvest-countdown" data-tip="${escapeHtml(harvestTip)}">🌾 距收获 ${roundsToHarvest} 轮</span>`;

  top.className = "card game-status mb16";
  top.innerHTML = `
    <div class="game-status-main">
      <div class="game-status-round">
        <span class="game-status-kicker">当前回合</span>
        <strong>第 ${g.round} <small>/ 14 轮</small></strong>
        <span class="badge" style="background:${seasonInfo.tint};border-color:${seasonInfo.color};color:#5c4a2e" ${g.dlc?.seasons ? `data-tip="${escapeHtml(TTS_SEASON_HINT[ttsSeasonOf(g, g.round)] || "")}"` : ""}>
          ${seasonInfo.icon} ${seasonInfo.label}季${g.dlc?.seasons ? " · 节气轮转" : ""}
        </span>
      </div>
      <div class="game-status-turn">
        ${myTurn && !me.spectator ? `<span class="badge green anim-my-turn turn-badge" style="display:inline-flex;align-items:center;gap:5px">${runnerSvg("#ffffff", 16)}该你行动</span>` : me.spectator ? '<span class="badge">👀 旁观模式</span>' : '<span class="badge">等待中…</span>'}
        ${myPlayer ? buildActionsLeft(g, myPlayer) : ""}
      </div>
    </div>
    <div class="game-status-detail">
      ${harvestBadge}
      <span class="badge gold">阶段 ${g.stage}</span>
      ${g.revealed.length ? `<span class="game-status-revealed">本轮已开放：${g.revealed.map(spaceName).join(" · ")}</span>` : ""}
      ${buildGauge(g.round)}
    </div>
  `;
  root.appendChild(top);

  // 顶栏「🎴 DLC 规则」按钮更新（开任意 DLC 时展示，位于顶部 title 教程与连接状态中间）
  const topDlcBtn = document.getElementById("topDlcBtn");
  const hasDlc = !!(g.dlc && (g.dlc.occupations || g.dlc.minorImprovements || g.dlc.moor || g.dlc.seasons));
  if (topDlcBtn) {
    if (hasDlc) {
      topDlcBtn.classList.remove("hidden");
      topDlcBtn.onclick = () => {
        import("/js/tutorial.js").then((m) => m.openDlcDrawer(g.dlc));
      };
    } else {
      topDlcBtn.classList.add("hidden");
    }
  }

  // 季节主题 + 背景时间轮
  applySeasonTheme(g.round);

  // 右下角悬浮球（排行榜 / 新手引导 / 教程）
  ensureFab(g);

  // 全局视口防超屏浮窗初始化
  initSmartTooltip();

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
      commonBtn.innerHTML = `🎯 行动${turnP ? ` · ${escapeHtml(turnP.name)}` : ""}`;
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

  if (!g.dlc?.moor && _actionSubTab === "moor") _actionSubTab = "resources";

  // 主体布局（日志已独立成页，不再占用网格）
  const layout = document.createElement("div");
  layout.className = "game-layout";
  layout.innerHTML = `
    <div class="pairs" id="pairsGrid"></div>
    <div class="action-board" id="actionBoard">
      <h3><span class="ab-title">📋 行动板</span> <span class="head-info">轮到 <b id="turnName">●</b></span>${g.dlc && (g.dlc.occupations || g.dlc.minorImprovements) ? ' <span class="dlc-banner">🎴 DLC</span>' : ""}${g.dlc?.moor ? ' <span class="dlc-banner moor-banner">🌲 沼泽农夫</span>' : ""}</h3>
      <p class="action-guide">${myTurn && !me.spectator ? "选择下方亮色行动格放置一名家人。灰色格会标明开放或占用状态。" : me.spectator ? "旁观中：可查看所有行动和占用状态。" : "等待当前玩家行动；行动格会显示开放和占用状态。"}</p>
      
      <!-- 行动板内部分页 -->
      <div class="action-tabs">
        <button class="action-tab-btn ${_actionSubTab === "resources" ? "active" : ""}" data-act-tab="resources" type="button">🌾 资源与市场 <span class="action-tab-count" data-count="resources"></span></button>
        <button class="action-tab-btn ${_actionSubTab === "actions" ? "active" : ""}" data-act-tab="actions" type="button">🎯 农事与建造 <span class="action-tab-count" data-count="actions"></span></button>
        ${g.dlc?.moor ? `<button class="action-tab-btn ${_actionSubTab === "moor" ? "active" : ""}" data-act-tab="moor" type="button">🌲 沼泽 <span class="action-tab-count" data-count="moor"></span></button>` : ""}
      </div>

      <!-- 分页 1: 永久资源 + 动物市场 -->
      <div class="action-sub-panel ${_actionSubTab === "resources" ? "active" : ""}" data-panel="resources">
        <div class="section-sub">🪵 永久资源格（每轮累积）</div>
        <div id="alwaysGrid" class="spaces-grid"></div>
        <div class="section-sub">🐑 动物市场（每轮 +1）</div>
        <div id="animalGrid" class="spaces-grid"></div>
      </div>

      <!-- 分页 2: 常规行动 + 回合卡 + 小发展卡 -->
      <div class="action-sub-panel ${_actionSubTab === "actions" ? "active" : ""}" data-panel="actions">
        <div class="section-sub">🌱 常规行动（第 1 轮起永久可用）</div>
        <div id="actionGrid" class="spaces-grid"></div>
        <div class="section-sub">🎴 回合卡行动（揭示后永久可用 · 每轮每格一次）</div>
        <div id="roundGrid" class="spaces-grid"></div>
        ${g.dlc && g.dlc.minorImprovements ? `
        <div class="section-sub">🎴 小发展卡（抢一次入个人持有）</div>
        <div id="minorGrid" class="spaces-grid"></div>` : ""}
      </div>

      <!-- 分页 3: 沼泽农夫扩展（燃料/干草 + 沼泽板） -->
      ${g.dlc?.moor ? `
      <div class="action-sub-panel ${_actionSubTab === "moor" ? "active" : ""}" data-panel="moor">
        <div class="section-sub">🌲 沼泽农夫（燃料 / 干草 · 每轮累积）</div>
        <div id="moorPileGrid" class="spaces-grid"></div>
        <div class="section-sub">🌱 沼泽板（公有 · 4×4 · 拓荒后播种 / 收获）</div>
        <div class="moor-board-wrap">
          <div id="moorBoard" class="moor-board"></div>
          <div class="moor-actions">
            <button class="btn small" id="moorReclaimBtn" type="button" disabled>🌱 拓荒 (-1 木材 -1 芦苇 +1 燃料)</button>
            <div class="moor-actions-row">
              <button class="btn small" id="moorSowGBtn" type="button" disabled>🌾 播种谷物</button>
              <button class="btn small" id="moorSowVBtn" type="button" disabled>🥕 播种蔬菜</button>
            </div>
            <p class="muted moor-hint">先点沼泽格，再点拓荒或播种按钮</p>
          </div>
        </div>
      </div>` : ""}
    </div>
  `;
  root.appendChild(layout);

  bindRipples(root);

  // 绑定行动板 Tab 切换
  layout.querySelectorAll(".action-tab-btn").forEach((btn) => {
    btn.onclick = () => {
      switchActionSubTab(btn.dataset.actTab);
    };
  });

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
  layout.querySelectorAll(".action-tab-count").forEach((count) => {
    const panel = layout.querySelector(`.action-sub-panel[data-panel="${count.dataset.count}"]`);
    const n = panel?.querySelectorAll(".actable").length || 0;
    count.textContent = myTurn && n ? `${n} 可选` : "";
  });

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

  // 恢复滚动条位置，彻底解决每次点击后画面跳顶问题
  if (savedScrollY > 0) {
    window.scrollTo({ top: savedScrollY, behavior: "instant" });
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY, behavior: "instant" });
      setTimeout(() => { if (root) root.style.minHeight = ""; }, 120);
    });
  } else {
    requestAnimationFrame(() => {
      if (root) root.style.minHeight = "";
    });
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

    // 计算预计收获阶段口粮消耗（成年人 2 食物/人，当轮出生的婴儿 1 食物/人，保姆免食，厨娘总减免 1）
    const adults = Math.max(0, (p.family || 0) - (p.babiesThisRound || 0));
    const babies = p.babiesThisRound || 0;
    const hasWetNurse = p.occupation?.id === "wetNurse";
    const hasCook = p.occupation?.id === "cook";
    const babyFoodRate = hasWetNurse ? 0 : 1;
    const cookDiscount = hasCook ? 1 : 0;
    const estFoodNeed = Math.max(0, adults * 2 + babies * babyFoodRate - cookDiscount);

    let foodFormula = `预计收获阶段口粮消耗: ${adults}名成年家人×2`;
    if (babies > 0) {
      foodFormula += ` + ${babies}名婴儿×${babyFoodRate}${hasWetNurse ? "(保姆免食)" : ""}`;
    }
    if (cookDiscount > 0) {
      foodFormula += ` - 厨娘减免1`;
    }
    foodFormula += ` = ${estFoodNeed}食物\n【收获阶段说明】游戏共14轮，在第 4、7、9、11、13、14 轮结束时系统自动结算收获。按序执行：①农田收割 ②喂养家人与取暖 ③牲畜繁殖。若食物不足每缺少1点将被迫领取1张乞讨卡（终局每张倒扣3分）！`;

    // 计算预计收获阶段柴火消耗（取暖炉保底 1 燃料，否则每名家人 1 燃料）
    const hasHeatingStove = (p.improvements || []).includes("heatingStove");
    const estFuelNeed = hasHeatingStove ? (p.family > 0 ? 1 : 0) : ((p.family || 0) * 1);

    let fuelFormula = `预计收获阶段取暖消耗: `;
    if (hasHeatingStove) {
      fuelFormula += `取暖炉加成(全家保底仅需1燃料) = ${estFuelNeed}燃料`;
    } else {
      fuelFormula += `${p.family || 0}名家人×1 = ${estFuelNeed}燃料`;
    }
    fuelFormula += `\n【沼泽农夫扩展】每逢第 4、7、9、11、13、14 轮结束的收获阶段，除喂食外还必须为房屋取暖，若缺少燃料每缺少1点也将强制获得1张乞讨卡（终局每张倒扣3分）。`;

    const estHayNeed = (p.animals.cattle || 0) * 1;
    let hayFormula = `预计收获阶段饲料消耗: ${p.animals.cattle || 0}头黄牛×1 = ${estHayNeed}干草\n【沼泽农夫扩展】收获阶段必须为每头黄牛提供1干草，若干草不足将导致黄牛饿死（损失黄牛）。`;

    const stk = (key, ic, val, name, isNum = true, costHint = null, formulaTip = null, buffHtml = "", incomeHtml = "") => {
      let tipText = name;
      if (formulaTip) {
        if (formulaTip.startsWith(name)) {
          tipText = formulaTip;
        } else {
          tipText = `${name} · ${formulaTip}`;
        }
      }
      return `<div class="stk" data-key="${key}" data-name="${name}" data-tip="${escapeHtml(tipText)}">
         <span class="stk-ic">${ic}</span>
         <div class="stk-val-wrap">
           <b class="stk-v${isNum ? " resource-num" : ""}" data-key="${key}">${val}</b>
           ${costHint !== null ? `<span class="stk-cost-hint">(-${costHint})</span>` : ""}
           ${incomeHtml}
         </div>
         ${buffHtml}
       </div>`;
    };
    // Buff 标注：取用对应行动格时职业加成（灰字 +1，悬浮注明来源）
    const resBuff = (key) => buffChipHtml(p, RES_TO_SPACE[key]);
    // 预计自动收入：下回合开始 / 下次收获会自动到账的资源（虚线框 +N）
    const inc = autoIncomeFor(p, _state.game);
    const resInc = (key) => incomeChipHtml(inc, key);
    const pScore = liveScorePlayer(p);
    card.innerHTML = `
      ${isTurn ? `<div class="card-turn-pill">${runnerSvg("#ffffff", 14)} 该他行动</div>` : ""}
      <div class="col-card-head">
        <div class="col-head-main">
          <span class="avatar" style="width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${meepleSvg(PLAYER_COLORS[p.seat] || "#8e2316", 24)}</span>
          <span class="nm">${escapeHtml(p.name)}</span>
          ${isMe ? '<span class="badge green" style="padding:1px 6px;font-size:10.5px">你</span>' : ""}
          <button type="button" class="stock-score-badge" data-score-pid="${p.id}" data-tip="点击查看得分计算面板\n当前实时得分: ${pScore.total} 分">
            <span class="score-crown">👑</span>
            <span class="score-num">${pScore.total}</span>
          </button>
        </div>
        ${(p.id === _state.game?.startPlayerId || p.startingPlayer) ? `
        <div class="col-head-status">
          <span class="badge starter-badge" style="background:#b45309;color:#ffffff;font-weight:700;padding:2px 7px;border-radius:10px;font-size:10.5px" title="起始玩家标记：在每轮首先行动">🚜 起始玩家</span>
        </div>` : ""}
      </div>
      <div class="stock">
        <div class="stock-row stock-key">
          ${stk("food", tokenSvg("food", 20), p.food, "食物", true, estFoodNeed, foodFormula, resBuff("food"), resInc("food"))}
          ${stk("family", meepleSvg(PLAYER_COLORS[p.seat], 20), p.family, "家人", false, null, "你的家庭成员。每名家人代表每轮可执行 1 次行动的工人。终局时每名家人直接提供 +3 分！")}
          ${stk("beggings", "🃏", p.beggings, "乞讨卡", false, null, "当收获阶段食物或燃料不足时被迫获得，每张乞讨卡在终局结算时惩罚性倒扣 3 分！")}
        </div>
        ${_state.game.dlc?.moor ? `<div class="stock-label">沼泽物资</div>
        <div class="stock-row stock-moor">
          ${stk("fuel", tokenSvg("fuel", 20), p.fuel || 0, "燃料", true, estFuelNeed, fuelFormula, "", resInc("fuel"))}
          ${stk("hay", tokenSvg("hay", 20), p.hay || 0, "干草", true, estHayNeed, hayFormula)}
        </div>` : ""}
        <div class="stock-label">建材</div>
        <div class="stock-row stock-mat">
          ${stk("wood", tokenSvg("wood", 20), p.resources.wood, "木材", true, null, null, resBuff("wood"), resInc("wood"))}
          ${stk("clay", tokenSvg("clay", 20), p.resources.clay, "陶土", true, null, null, resBuff("clay"), resInc("clay"))}
          ${stk("reed", tokenSvg("reed", 20), p.resources.reed, "芦苇", true, null, null, resBuff("reed"), resInc("reed"))}
          ${stk("stone", tokenSvg("stone", 20), p.resources.stone, "石材", true, null, null, resBuff("stone"), resInc("stone"))}
        </div>
        <div class="stock-label">农产品</div>
        <div class="stock-row stock-crop">
          ${stk("grain", tokenSvg("grain", 20), p.resources.grain, "谷物", true, null, null, resBuff("grain"), resInc("grain"))}
          ${stk("vegetable", tokenSvg("vegetable", 20), p.resources.vegetable, "蔬菜", true, null, null, resBuff("vegetable"), resInc("vegetable"))}
        </div>
        <div class="stock-label">牲畜</div>
        <div class="stock-row stock-animal">
          ${stk("sheep", animalSvg("sheep", 24), p.animals.sheep, "绵羊", false, null, null, resBuff("sheep"), resInc("sheep"))}
          ${stk("boar", animalSvg("boar", 24), p.animals.boar, "野猪", false, null, null, resBuff("boar"), resInc("boar"))}
          ${stk("cattle", animalSvg("cattle", 24), p.animals.cattle, "黄牛", false, null, null, resBuff("cattle"), resInc("cattle"))}
        </div>
      </div>
      ${(() => {
        // 改进 / 职业 / 小发展卡统一放进一个 flex-wrap 容器：能放就往后排，放不下才换行
        const tags = [];
        if (p.id === _state.game?.startPlayerId || p.startingPlayer) {
          tags.push(`<span class="imp-tag starter-tag" style="background:#fef3c7;border-color:#f59e0b;color:#92400e;font-weight:700" data-tip="起始玩家标记：在每轮首先放置工人行动">🚜 起始玩家</span>`);
        }
        tags.push(...p.improvements.map(impTagHTML));
        if (p.occupation) tags.push(`<span class="imp-tag occ-tag" data-tip="${escapeHtml(p.occupation.effect)}">${categorySealSvg(p.occupation.category, 16)} ${escapeHtml(p.occupation.name)}</span>`);
        if (p.minorImprovements && p.minorImprovements.length) {
          tags.push(...p.minorImprovements.map((id) => `<span class="imp-tag" data-tip="${escapeHtml(minorEffectById(id) || minorNameById(id))}">${escapeHtml(minorNameById(id))}</span>`));
        }
        return tags.length ? `<div class="imp-tags">${tags.join("")}</div>` : "";
      })()}
    `;
    host.appendChild(card);
    // 点击 stock 右上角皇冠得分徽章 → 打开该玩家详细得分计算面板
    card.querySelectorAll(".stock-score-badge").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openScoreBreakdownModal(btn.dataset.scorePid, _state && _state.game);
      };
    });
    // 自己卡上的「可烹饪」改进标签 → 点击打开烹饪模态
    if (isMe) {
      card.querySelectorAll(".imp-tag-cook").forEach((el) => {
        el.onclick = () => openCookModal(el.dataset.imp);
      });
    }

    // 计算人丁在农庄前庭的闲逛状态
    const totalWorkers = Math.max(0, (p.family || 0) - (p.babiesThisRound || 0));
    const usedWorkers = (_state.game?.placedThisRound || []).filter((id) => id === p.id).length;
    const idleCount = Math.max(0, totalWorkers - usedWorkers);
    const babyCount = p.babiesThisRound || 0;
    const pColor = PLAYER_COLORS[p.seat] || "#8e2316";

    // 生成闲逛米普 HTML
    let yardHtml = "";
    if (idleCount > 0 || babyCount > 0) {
      const meeplesHtml = Array.from({ length: idleCount }, (_, mIdx) => `
        <div class="farm-idle-meeple" data-idx="${mIdx}" data-pid="${p.id}" data-tip="待命家人 #${mIdx + 1} · 随时等候派工">
          <div class="meeple-shadow"></div>
          ${meepleSvg(pColor, 28)}
        </div>
      `).join("");
      const babiesHtml = babyCount > 0 ? `
        <div class="farm-baby-cradle" data-tip="新生儿 · 正在婴儿摇篮中休息（下轮长大成为可用劳动力）">
          ${cradleSvg(pColor, 28)}
        </div>
      ` : "";
      yardHtml = `
        <div class="farm-idle-yard" data-pid="${p.id}" data-tip="农庄前庭 · 现有 ${idleCount} 名待命家人闲逛中">
          <div class="yard-tag">🏡 待命家人 (${idleCount})</div>
          <div class="yard-meeples-row">
            ${meeplesHtml}
            ${babiesHtml}
          </div>
        </div>
      `;
    } else {
      yardHtml = `
        <div class="farm-idle-yard empty-yard" data-pid="${p.id}" data-tip="农庄前庭 · 全体家人本轮皆已外出做工">
          <div class="yard-tag dim">🏡 全员出工中 (0)</div>
        </div>
      `;
    }

    // ★ 紧接着输出该玩家的农场卡（同一行右侧，等高等宽自适应）
    const farmCard = document.createElement("div");
    farmCard.className = "farm-card" + (_intro ? " anim-pop-in" : "") + (p.id === currentTurnId ? " is-current-turn" : "");
    farmCard.dataset.pid = p.id;
    farmCard.dataset.panel = `p${i}`;
    const isMyFarm = p.id === myPlayer?.id;
    farmCard.innerHTML = `
      ${p.id === currentTurnId ? `<div class="card-turn-pill">${runnerSvg("#ffffff", 14)} 该他行动</div>` : ""}
      <div class="farm-head">
        <h3>${p.id === currentTurnId ? "👉 " : ""}🚜 ${escapeHtml(p.name)} 的农场${isMyFarm ? ' <span class="badge green">你</span>' : ""}</h3>
        <div class="row" style="gap:6px;align-items:center">
          <span class="muted" style="font-size:11px">${p.rooms} 间${houseLabel(p.roomType)}屋 · 剩余 ${Math.max(0, p.rooms - p.family)} 空房 · 乞讨 ${p.beggings} 张</span>
          <button class="btn ghost small iso-toggle-btn${_isoMode ? " active" : ""}" type="button" title="切换 2D 平铺 / 2.5D 透视视角">${_isoMode ? "📐 2.5D" : "📋 2D"}</button>
        </div>
      </div>
      <div class="farm-board-wrap${_isoMode ? " mode-iso" : ""}"></div>
      ${yardHtml}
    `;
    farmCard.querySelectorAll(".iso-toggle-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        toggleIsoMode();
      };
    });
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
  const isWinter = seasonOfRound(_state?.game?.round || 1) === "winter";

  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    const cell = p.grid[y][x];
    const pasture = (p.pastures || []).find(ps => ps.cells.includes(`${x},${y}`));
    const el = document.createElement("div");
    el.className = "cell hoverable";
    let html = "";
    if (cell.kind === "room") {
      el.classList.add("cell-room");
      // roomTileSvg 返回的是 CSS background-image 值（url("data:...")），必须内联到样式而不是 innerHTML
      el.style.backgroundImage = roomTileSvg(p.roomType);
      html = `
        <div class="room-model-wrap">${roomModelSvg(p.roomType, isWinter, Math.round(cellSize * 1.05))}</div>
        <div class="room-plate"><span class="room-plate-tag">${houseLabel(p.roomType)}</span></div>
      `;
    } else if (cell.kind === "field") {
      el.classList.add("cell-field");
      html = fieldContentSvg(cell.crop, cell.markers ?? 0);
    } else {
      if (pasture) {
        el.classList.add("cell-pasture");
        if (cell.stable) el.classList.add("has-stable");
        if (pasture.animal) {
          html = `<div class="pasture-animal-wrap">${animalSvg(pasture.animal, Math.round(cellSize * 0.58))}${cell.stable ? `<div class="pasture-stable-sub">${stableSvg(true, isWinter, Math.round(cellSize * 0.42))}</div>` : ""}</div>`;
        } else if (cell.stable) {
          html = `<div class="pasture-animal-wrap">${stableSvg(true, isWinter, Math.round(cellSize * 0.65))}<span class="pasture-empty">马厩(2×)</span></div>`;
        } else {
          html = `<span class="pasture-empty">牧场</span>`;
        }
      } else if (cell.stable) {
        el.classList.add("cell-stable-solo");
        html = `<div class="solo-stable-wrap">${stableSvg(false, isWinter, Math.round(cellSize * 0.68))}<span class="stable-plate-tag">圈舍</span></div>`;
      } else {
        el.classList.add("cell-empty");
        html = emptySoilSvg();
      }
    }
    el.innerHTML = html;
    const kindNames = { empty: "荒地", room: `${houseLabel(p.roomType)}房屋`, field: "耕地" };
    const cropNames = { grain: "谷物", vegetable: "蔬菜" };
    let tip = `坐标 (${x}, ${y}) · ${kindNames[cell.kind] || cell.kind}`;
    if (cell.stable) {
      tip += pasture
        ? " · 封闭马厩（容纳上限翻倍）"
        : " · 独栋圈舍（可单独放牧 1 只宠物）";
    }
    if (cell.kind === "field") {
      if (cell.crop) tip += ` · 已播种${cropNames[cell.crop] || cell.crop}（剩余收割次数：${cell.markers ?? 0} 次）`;
      else tip += " · 闲置田（可播种）";
    }
    if (pasture) {
      const anNames = { sheep: "绵羊", boar: "野猪", cattle: "黄牛" };
      tip += ` · 牧场${pasture.animal ? `（放牧 ${anNames[pasture.animal] || pasture.animal}）` : "（空闲）"}`;
    }
    el.title = tip;
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
    if (nowH) {
      h.classList.add("built");
      h.innerHTML = fenceRailSvg("h", cellSize);
    }
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
    if (nowV) {
      v.classList.add("built");
      v.innerHTML = fenceRailSvg("v", cellSize);
    }
    if (_selFences.has(`v${x},${y}`)) v.classList.add("sel");
    v.style.left = (x * step - 7) + "px";
    v.style.top = (y * step) + "px";
    v.dataset.edge = `v${x},${y}`;
    v.title = `纵向栅栏 v${x},${y}`;
    // 已建好的栅栏不能再选（规则：栅栏不可拆除）
    if (editable && !nowV) v.onclick = (e) => { e.stopPropagation(); toggleFence("v", x, y); };
    fence.appendChild(v);
  }

  // 栅栏地桩立柱 (Fence Posts) 在网格交汇顶点（4x6 = 24 处）
  for (let vy = 0; vy <= 5; vy++) {
    for (let vx = 0; vx <= 3; vx++) {
      const isConnectedBuilt = (
        (vx < 3 && vy < 5 && p.edges.h[vy] && p.edges.h[vy][vx]) ||
        (vx > 0 && vy < 5 && p.edges.h[vy] && p.edges.h[vy][vx - 1]) ||
        (vy < 5 && vx < 3 && p.edges.v[vy] && p.edges.v[vy][vx]) ||
        (vy > 0 && vx < 3 && p.edges.v[vy - 1] && p.edges.v[vy - 1][vx])
      );
      if (isConnectedBuilt) {
        const post = document.createElement("div");
        post.className = "fence-post built";
        post.style.left = (vx * step - 5) + "px";
        post.style.top = (vy * step - 5) + "px";
        post.innerHTML = `<div class="post-cap"></div>`;
        fence.appendChild(post);
      }
    }
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
  if (w < 380) return 46;
  if (w < 480) return 52;
  if (w < 768) return 58;
  // 桌面/平板：每个玩家独占一行，农场卡宽度 ≈ 视口 - 左栏 - 行动板 - 间距
  const avail = w - 220 - 340 - 60;
  if (avail >= 620) return 84;
  if (avail >= 500) return 76;
  if (avail >= 400) return 68;
  if (avail >= 320) return 62;
  return 54;
}

// ---- 行动板渲染 ----
/**
 * 渲染行动格（整张卡可点）
 * kind: "resource"（累积资源格）| "action"（永久常规行动）| "animal"（动物市场）| "round"（回合卡）
 */
function renderSpaces(container, g, p, myTurn, kind) {
  container.innerHTML = "";
  SPACES.forEach((sp) => {
    // 多人局动态伸缩行动格校验
    if (sp.scaling && sp.scaling !== g.numPlayers) return;

    const isAnimal = ["Sheep", "Boar", "Cattle"].includes(sp.id);
    if (kind === "animal") { if (!isAnimal) return; }
    else if (kind === "action") { if (!sp.alwaysAction && !sp.scaling) return; }
    else if (kind === "round") { if (!sp.roundCard) return; if (!g.revealed.includes(sp.id)) return; }
    else { if (sp.roundCard || sp.alwaysAction || sp.scaling || isAnimal) return; }

    let desc = sp.desc;
    let badge = "";
    let open = true;
    let stock = 1;
    // ★ 行动格每轮只能被使用一次
    const used = (g.usedSpaces || []).includes(sp.id);

    if (kind === "resource" && (PILE_KEY[sp.id] || sp.id === "EasternQuarry" || (sp.scaling && sp.pool))) {
      const n = (g.piles && g.piles[sp.id]) || 0;
      open = sp.fromRound ? g.round >= sp.fromRound : true;
      stock = n;
      desc = open
        ? (n > 0 ? `取走全部 ${n} 个` : "空着 · 每轮累积")
        : `第 ${sp.fromRound} 轮开放`;
      if (open && n > 0) badge = `<span class="stock-badge">${n}</span>`;
    } else if (sp.id === "Grain" || sp.id === "Vegetable") {
      open = sp.fromRound ? g.round >= sp.fromRound : true;
      desc = open ? `固定拿取 1 ${sp.name}` : `第 ${sp.fromRound} 轮开放`;
      stock = 1;
    } else if (sp.id === "DayLaborer") {
      desc = "打日工 +2 食物";
      stock = 1;
    } else if (sp.id === "StartPlayer") {
      const isStarter = p && (g.startPlayerId === p.id || p.startingPlayer);
      const holder = g.players.find(pl => pl.id === g.startPlayerId || pl.startingPlayer);
      desc = isStarter
        ? "🚜 已持有标记（不可重复拿取）"
        : holder
          ? `拿走标记下轮先动（当前：${escapeHtml(holder.name)}）+1 食物`
          : "拿走起始玩家标记，下轮先动并立即 +1 食物";
      stock = 1;
    } else if (isAnimal) {
      const t = sp.id === "Sheep" ? "sheep" : sp.id === "Boar" ? "boar" : "cattle";
      const openRound = ANIMAL_OPEN_ROUND[t];
      open = g.round >= openRound || (g.revealed && g.revealed.includes(sp.id));
      stock = (g.piles && g.piles[sp.id]) || 0;
      desc = open
        ? (stock > 0 ? `取走全部 ${stock} 只` : "空着 · 每轮 +1")
        : `第 ${openRound} 轮开放`;
      if (open && stock > 0) badge = `<span class="stock-badge">${stock}</span>`;
    } else {
      desc = sp.desc;
    }

    // 节气轮转：冬季鱼塘封冻（第 11 轮解冻）—— 置灰 + 冰面特效 + 原因说明
    const frozen = sp.id === "Fishing" && g.dlc?.seasons
      && ttsSeasonOf(g, g.round) === "winter" && g.round < 11;
    if (frozen) {
      stock = 0;
      badge = "";
      desc = "❄️ 冬季封冻 · 第 11 轮起解冻";
    }

    const occupantId = g.spaceOccupants ? g.spaceOccupants[sp.id] : null;
    const occupant = occupantId ? g.players.find(pl => pl.id === occupantId) : null;
    const occupantColor = occupant ? (PLAYER_COLORS[occupant.seat] || "#8e2316") : "#8e2316";
    const occupantName = occupant ? occupant.name : "";
    const isMeOccupant = occupantId && p && (occupantId === p.id);

    // 本轮已被占用：优先展示占用状态
    if (used && open) {
      desc = occupantName ? `已被 ${occupantName} 占用` : "本轮已被占用 · 下轮再用";
      stock = 0;
      badge = "";
    }

    const workerSlotHtml = used
      ? `<div class="worker-slot occupied" title="已由 ${escapeHtml(occupantName || "玩家")} 占用">${meepleSvg(occupantColor, 20)}</div>`
      : (open ? `<div class="worker-slot" title="空闲工人槽"></div>` : "");

    const isStarterHolding = sp.id === "StartPlayer" && p && (g.startPlayerId === p.id || p.startingPlayer);
    const canAct = myTurn && open && stock > 0 && !used && !frozen && !isStarterHolding;
    const card = document.createElement("div");
    card.className = "space" + (canAct ? " actable" : " disabled") + (used ? " is-used" : "") + (!open ? " is-locked" : "") + (frozen ? " frozen" : "");
    // Buff 标注：当前视角玩家在该格取用时有职业加成 → 灰字 +1（悬浮注明来源）
    const buffChip = p && !used && open && !frozen ? buffChipHtml(p, sp.id) : "";
    card.innerHTML = `
      ${workerSlotHtml}
      <div class="action-woodcut">${actionWoodcutSvg(sp.id, 28)}</div>
      <div class="name">${sp.name}</div>
      <div class="meta">${desc}${buffChip}</div>
      ${badge}
      ${isMeOccupant ? '<div class="mine">我的</div>' : ""}
    `;
    if (canAct) card.onclick = () => onSpaceClick(sp, p);
    else if (frozen) card.onclick = () => toast("❄️ 冬季鱼塘封冻，无法钓鱼（第 11 轮起解冻）", true);
    else if (isStarterHolding && !used) card.onclick = () => toast("你当前已持有起始玩家标记，无需重复拿取", true);
    container.appendChild(card);
  });

  // DLC（节气轮转）：回合卡区末尾追加「节气行动」格（每轮一次，按当前季节变化）
  if (kind === "round" && g.dlc?.seasons) {
    const season = ttsSeasonOf(g, g.round) || "spring";
    const info = SEASONS.find((x) => x.key === season) || SEASONS[0];
    const seasonUsed = (g.usedSpaces || []).includes("Season");
    const occId = g.spaceOccupants ? g.spaceOccupants["Season"] : null;
    const occupant = occId ? g.players.find((pl) => pl.id === occId) : null;
    const occupantName = occupant ? occupant.name : "";
    const occColor = occupant ? (PLAYER_COLORS[occupant.seat] || "#8e2316") : "#8e2316";
    const desc = TTS_SEASON_ACTION_DESC[season] || "";
    let cardDesc = desc;
    if (seasonUsed) cardDesc = occupantName ? `已被 ${occupantName} 占用` : "本轮已被占用 · 下轮再用";
    const slotHtml = seasonUsed
      ? `<div class="worker-slot occupied" title="已由 ${escapeHtml(occupantName || "玩家")} 占用">${meepleSvg(occColor, 20)}</div>`
      : `<div class="worker-slot" title="空闲工人槽"></div>`;
    const canAct = myTurn && !seasonUsed;
    const card = document.createElement("div");
    card.className = "space space-season" + (canAct ? " actable" : " disabled") + (seasonUsed ? " is-used" : "");
    card.style.borderColor = info.color;
    card.innerHTML = `
      ${slotHtml}
      <div class="action-woodcut">${info.icon}</div>
      <div class="name">节气 · ${info.label}季</div>
      <div class="meta">${cardDesc}</div>
      ${occId && occupant && p && occId === p.id ? '<div class="mine">我的</div>' : ""}
    `;
    if (canAct) card.onclick = () => openSeasonModal(g, p);
    container.appendChild(card);
  }
}

/**
 * DLC（沼泽农夫 · 荒野之地）：渲染燃料 / 干草累积堆
 *  - 燃料堆 (GatherFuel): 每轮 +1
 *  - 干草堆 (CutMeadow): 每轮 +1
 * 两者都在 round card 揭示后占用 1 名工人，取走时拿全部。
 */
function renderMoorPile(container, g, p, myTurn) {
  if (!container) return;
  container.innerHTML = "";
  const fuelOpen = (g.revealed || []).includes("GatherFuel");
  const hayOpen = (g.revealed || []).includes("CutMeadow");

  const mk = (kind, iconSvg, name, pile, used, open, openRound, onclick, occId) => {
    const card = document.createElement("div");
    const canAct = myTurn && pile > 0 && !used && open;
    card.className = "minor-card" + (canAct ? " actable" : " disabled");
    const occupant = occId ? g.players.find(pl => pl.id === occId) : null;
    const occupantColor = occupant ? (PLAYER_COLORS[occupant.seat] || "#8e2316") : "#8e2316";
    const occupantName = occupant ? occupant.name : "";
    let eff = "";
    if (!open) eff = `第 ${openRound} 轮揭示开放`;
    else if (used) eff = occupantName ? `已被 ${occupantName} 占用` : "本轮已被占用 · 下轮再用";
    else eff = `累积 ${pile} · 可取全部${pile > 0 ? `（${pile}）` : "（空）"}`;
    const slotHtml = used
      ? `<div class="worker-slot occupied" style="position:absolute;top:4px;right:4px">${meepleSvg(occupantColor, 18)}</div>`
      : "";
    card.style.position = "relative";
    card.innerHTML = `
      ${slotHtml}
      <div class="occ-ic">${iconSvg}</div>
      <div class="minor-name">${name}</div>
      <div class="minor-eff">${eff}</div>
    `;
    if (canAct) card.onclick = onclick;
    container.appendChild(card);
  };
  const fuelOcc = g.spaceOccupants ? g.spaceOccupants["GatherFuel"] : null;
  const hayOcc = g.spaceOccupants ? g.spaceOccupants["CutMeadow"] : null;
  mk("fuel", tokenSvg("fuel", 24), "燃料堆", g.moorFuelPile || 0, (g.usedSpaces || []).includes("GatherFuel"), fuelOpen, 2, () => sendAction({ type: "GatherFuel" }), fuelOcc);
  mk("hay",  tokenSvg("hay", 24),  "干草堆", g.moorHayPile  || 0, (g.usedSpaces || []).includes("CutMeadow"),  hayOpen, 7, () => sendAction({ type: "CutMeadow" }), hayOcc);
}

/** 当前选中的沼泽格（私存在 _moorSel） */
let _moorSel = null;

/**
 * DLC（沼泽农夫 · 荒野之地）：渲染 4×4 公有沼泽板
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
        const ownerPlayer = (g.players || []).find((pl) => pl.id === data.sownBy);
        const ownerName = ownerPlayer ? ownerPlayer.name : (data.sownBy || "未知");
        if (data.crop) {
          cell.classList.add("is-sown");
          const cropIcon = data.crop === "grain" ? "🌾" : "🥕";
          const cropZh = data.crop === "grain" ? "谷物" : "蔬菜";
          cell.innerHTML = `<span class="moor-crop">${cropIcon}</span><span class="moor-marker">×${data.markers || 0}</span><span class="moor-owner" title="播种者：${escapeHtml(ownerName)}">${escapeHtml(ownerName.slice(0, 3))}</span>`;
          cell.title = `已拓荒农田 (${x}, ${y}) · ${cropZh}（剩余收割次数：${data.markers || 0} 次）· 播种者：${ownerName}`;
        } else {
          cell.innerHTML = `<span class="moor-empty">▢</span>`;
          cell.title = `已拓荒农田 (${x}, ${y}) · 闲置（可播种谷物或蔬菜）`;
        }
      } else {
        cell.innerHTML = `<span class="moor-locked">#</span>`;
        cell.title = `沼泽荒地 (${x}, ${y}) · 未拓荒（需消耗 1 木材 + 1 芦苇拓荒，奖励 1 燃料）`;
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

/** 打开手牌抽屉查看职业卡与小发展卡 */
function openHandDrawer(tab = "occupation") {
  const me = _state.game?.players?.find(p => p.id === _myId);
  if (!me) return;
  const occs = me.occupationHand || [];
  const minors = me.minorHand || [];

  const occHtml = occs.length > 0 ? occs.map((o) => `
    <div class="card p8 mb8" style="background:var(--panel-2);border:1px solid var(--line);border-radius:8px">
      <div class="row items-center justify-between">
        <b>${o.icon} ${escapeHtml(o.name)}</b>
        <button class="btn small" onclick="doWithLoading('play-occ-${o.id}','打出…',() => { sendAction({ type: 'PlayOccupation', id: '${o.id}' }); closeModal(); })">打出职业</button>
      </div>
      <div class="muted mt4" style="font-size:12px">${escapeHtml(o.effect)}</div>
    </div>
  `).join("") : '<div class="muted p12">手里没有职业卡了</div>';

  const minorHtml = minors.length > 0 ? minors.map((m) => `
    <div class="card p8 mb8" style="background:var(--panel-2);border:1px solid var(--line);border-radius:8px">
      <div class="row items-center justify-between">
        <b>${m.icon} ${escapeHtml(m.name)}</b>
        <button class="btn small" onclick="doWithLoading('play-minor-${m.id}','建造…',() => { sendAction({ type: 'PlayMinor', id: '${m.id}' }); closeModal(); })">建造小发展</button>
      </div>
      <div class="muted mt4" style="font-size:12px">${escapeHtml(m.effect)}</div>
    </div>
  `).join("") : '<div class="muted p12">手里没有小发展卡了</div>';

  openModal("🎴 玩家私密手牌", `
    <div class="row gap8 mb12">
      <button class="btn small ${tab === "occupation" ? "" : "ghost"}" id="tabOcc">职业手牌 (${occs.length})</button>
      <button class="btn small ${tab === "minor" ? "" : "ghost"}" id="tabMinor">小发展卡 (${minors.length})</button>
    </div>
    <div id="drawerContent">
      ${tab === "occupation" ? occHtml : minorHtml}
    </div>
  `, (root) => {
    root.querySelector("#tabOcc").onclick = () => { closeModal(); openHandDrawer("occupation"); };
    root.querySelector("#tabMinor").onclick = () => { closeModal(); openHandDrawer("minor"); };
  });
}
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
  // 犁地 / 建房间 / 建马厩 是常规行动，随时可以点棋盘操作
  if (cell.kind === "empty") {
    const bRoom = busy("BuildRoom", "建房/马厩");
    const bPlow = busy("PlowField", "犁地");
    if (bRoom) {
      opts.push({ label: "建房间（已占用）", disabled: true, hint: bRoom });
      opts.push({ label: "造马厩（已占用）", disabled: true, hint: bRoom });
    } else {
      const { cost: roomCost, notes: roomNotes } = roomBuildCost(p);
      const roomCostTxt = costLine(roomCost);
      const roomLabel = roomNotes.length
        ? `建房间 (${roomCostTxt} <span class="buff-chip neg" data-tip="${escapeHtml(roomNotes.join('；'))}">减免</span>)`
        : `建房间 (${roomCostTxt})`;
      opts.push({
        label: roomLabel,
        action: () => doWithLoading(`buildRoom-${x}-${y}`, "建房间", () => {
          triggerCellActionFlyEffects(x, y, p);
          sendAction({ type: "BuildRoom", x, y });
        }),
      });

      if (!cell.stable && (p.stables || 0) < 4) {
        const hasArch = p.occupation?.id === "stableArchitect";
        const stableLabel = hasArch
          ? `造马厩 (2木 <span class="buff-chip" data-tip="「圈舍建造师」职业：建造后返还 1 木材">返1木</span>)`
          : `造马厩 (2木)`;
        opts.push({
          label: stableLabel,
          action: () => doWithLoading(`buildStable-${x}-${y}`, "造马厩", () => {
            triggerCellActionFlyEffects(x, y, p);
            sendAction({ type: "BuildRoom", stables: [{ x, y }] });
          }),
        });
      }
    }
    if (bPlow) opts.push({ label: "犁地（已占用）", disabled: true, hint: bPlow });
    else opts.push({
      label: "犁地",
      action: () => doWithLoading(`plow-${x}-${y}`, "犁地", () => {
        triggerCellActionFlyEffects(x, y, p);
        sendAction({ type: "PlowField", x, y });
      }),
    });
  }
  if (cell.kind === "field" && !cell.crop) {
    const bSow = busy("SowOrBake", "撒种/烤面包");
    if (bSow) opts.push({ label: "撒种（已占用）", disabled: true, hint: bSow });
    else {
      opts.push({
        label: "撒谷",
        action: () => doWithLoading(`sow-g-${x}-${y}`, "撒谷种", () => {
          triggerCellActionFlyEffects(x, y, p);
          sendAction({ type: "Sow", x, y, crop: "grain" });
        }),
      });
      opts.push({
        label: "撒菜",
        action: () => doWithLoading(`sow-v-${x}-${y}`, "撒菜种", () => {
          triggerCellActionFlyEffects(x, y, p);
          sendAction({ type: "Sow", x, y, crop: "vegetable" });
        }),
      });
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

function triggerActionFlyEffects(sp, p) {
  try {
    const farmCard = document.querySelector(`.farm-card[data-pid="${p.id}"]`);
    const idleMeeples = farmCard?.querySelectorAll(".farm-idle-meeple");
    const spaceBtn = document.querySelector(`.space[data-space="${sp.id}"]`);
    const playerIdx = _state.game?.players?.findIndex((x) => x.id === p.id) ?? 0;
    const pColor = PLAYER_COLORS[playerIdx] || "#c0392b";

    let fromEl = null;
    if (idleMeeples && idleMeeples.length > 0) {
      fromEl = idleMeeples[idleMeeples.length - 1];
      fromEl.classList.add("departing");
    } else {
      fromEl = document.querySelector(`.col-card[data-pid="${p.id}"] .stk[data-kind="family"]`) ||
               document.querySelector(".col-card.me");
    }

    if (fromEl && spaceBtn) {
      flyMeepleToSpace(fromEl, spaceBtn, pColor);
      sfx.woodThud(1.1);
    }
    const resMap = {
      Wood: "wood", Clay: "clay", Reed: "reed", Stone: "stone",
      Grain: "grain", Vegetable: "vegetable", Fishing: "food",
    };
    if (resMap[sp.id]) {
      const stockEl = document.querySelector(`.col-card.me .res[data-kind="${resMap[sp.id]}"]`);
      if (spaceBtn && stockEl) {
        setTimeout(() => flyTokenToStock(spaceBtn, stockEl, resMap[sp.id]), 150);
      }
    }
  } catch {}
}

function triggerCellActionFlyEffects(x, y, p) {
  try {
    const farmCard = document.querySelector(`.farm-card[data-pid="${p.id}"]`);
    const targetCell = farmCard?.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    const idleMeeples = farmCard?.querySelectorAll(".farm-idle-meeple");
    const playerIdx = _state.game?.players?.findIndex((x) => x.id === p.id) ?? 0;
    const pColor = PLAYER_COLORS[playerIdx] || "#c0392b";

    let fromEl = null;
    if (idleMeeples && idleMeeples.length > 0) {
      fromEl = idleMeeples[idleMeeples.length - 1];
      fromEl.classList.add("departing");
    } else {
      fromEl = document.querySelector(`.col-card[data-pid="${p.id}"] .stk[data-kind="family"]`);
    }

    if (fromEl && targetCell) {
      flyMeepleToSpace(fromEl, targetCell, pColor);
      sfx.woodThud(1.0);
    }
  } catch {}
}

function onSpaceClick(sp, p) {
  if (!debounce(`space-${sp.id}`, 300)) return;
  triggerActionFlyEffects(sp, p);
  if (sp.id === "StartPlayer") {
    const isStarter = p && (_state.game?.startPlayerId === p.id || p.startingPlayer);
    if (isStarter) {
      toast("你当前已持有起始玩家标记，无需重复拿取", true);
      return;
    }
    doWithLoading(`take-${sp.id}`, `⏳ ${sp.name}…`, () => sendAction({ type: "Take", space: sp.id }));
    return;
  }
  // 简单 take action
  if (["Wood", "Clay", "Reed", "Stone", "Grain", "Vegetable", "Fishing", "DayLaborer",
       "Sheep", "Boar", "Cattle"].includes(sp.id)) {
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
    let fenceTip = "点击棋盘上的虚线格边来围牧场，选好后点「确认建造」";
    if (p.occupation?.id === "hedgeKeeper") fenceTip += "\n「栅栏工」职业：建成后返还 2 木";
    if (p.occupation?.id === "stableArchitect") fenceTip += "\n「圈舍建造师」职业：建成后返还 1 木";
    toast(fenceTip);
    return;
  }
  if (sp.id === "BuildRoom") {
    const rooms = p.rooms;
    const baseCost = ROOM_COST_BY_TYPE[p.roomType];
    const { cost: effCost, notes } = roomBuildCost(p);
    const hasDiscount = JSON.stringify(baseCost) !== JSON.stringify(effCost);
    const okCost = canAfford(p, effCost);
    openModal("🏠 建房间", `
      <p class="muted" style="margin-top:0">点击棋盘上 <b>紧邻现有房间</b> 的空格来建造。</p>
      <div class="kb-card" style="background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px;line-height:1.9">
        <div><b>每建 1 间${houseLabel(p.roomType)}房</b>：${annotatedCostLine(baseCost, effCost, notes)}</div>
        ${hasDiscount ? `<div class="muted" style="font-size:12px">实付 ${costLine(effCost)}（职业减免）</div>` : ""}
        <div class="muted">你现在 ${rooms} 间房 · ${p.family} 名家人 · ${Math.max(0, rooms - p.family)} 间空房</div>
        <div style="color:${okCost ? "var(--leaf-dark)" : "var(--barn)"}">
          ${okCost ? "✅ 资源充足，可以建" : `❌ 资源不足（缺 ${shortfall(p, effCost)}）`}
        </div>
        ${notes.length ? `<div class="muted" style="font-size:11.5px">💡 ${notes.map(escapeHtml).join("；")}</div>` : ""}
        ${(p.occupation?.id === "masterBuilder") ? `<div class="muted" style="font-size:11.5px">💡 「建筑工长」职业：每建 1 间房返还 1 木</div>` : ""}
        ${(p.occupation?.id === "surveyor") ? `<div class="muted" style="font-size:11.5px">💡 「宅地测量员」职业：房间数 ≥3 后每建 1 间房 +2 食物</div>` : ""}
        ${(p.occupation?.id === "stableArchitect") ? `<div class="muted" style="font-size:11.5px">💡 「圈舍建造师」职业：建造马厩时返还 1 木材</div>` : ""}
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
  if (sp.id === "EasternQuarry") {
    doWithLoading("take-east-quarry", "⛏ 取石材…", () => sendAction({ type: "Take", space: "EasternQuarry" }));
    return;
  }
  if (sp.id.startsWith("Copse") || sp.id.startsWith("ClayDeposit") || sp.id.startsWith("Grove") || sp.id.startsWith("ReedBank") || sp.id.startsWith("ResourceMarket")) {
    doWithLoading(`take-${sp.id}`, `⏳ ${sp.name}…`, () => sendAction({ type: "Take", space: sp.id }));
    return;
  }
  if (sp.id.startsWith("Lessons")) {
    openHandDrawer("occupation");
    toast("请在手牌面板中选择要打出的职业卡");
    return;
  }
  if (sp.id === "UrgentGrowth") {
    openModal("👶 急迫添丁", `<p class="muted">官方规则：即使当前没有空房，亦可为家庭增添新成员（上限 5 人）。0 食物消耗。</p>
      <button class="btn big" id="mUG">确定急迫添丁</button>`,
      (root) => root.querySelector("#mUG").onclick = () => {
        doWithLoading("urgent-growth", "急迫添丁…", () => sendAction({ type: "UrgentGrowth" }));
        closeModal();
      });
    return;
  }
  if (sp.id === "PlowAndSow") {
    openModal("🚜 犁田及/或撒种", `<p class="muted">先犁地（点击棋盘空格），随后可对领地内任意空田撒种。</p>`);
    return;
  }
  if (sp.id === "RenovateFences") {
    openModal("🏰 翻修及/或建栅栏", `<p class="muted">可同时翻修房屋材质并拉取栅栏圈地。</p>
      <div class="row mt8">
        <button class="btn" id="mRF_Reno">翻修房屋</button>
        <button class="btn" id="mRF_Fence">拉取栅栏</button>
      </div>`, (root) => {
        root.querySelector("#mRF_Reno").onclick = () => { closeModal(); onSpaceClick({ id: "Renovate", name: "翻修" }, p); };
        root.querySelector("#mRF_Fence").onclick = () => { closeModal(); onSpaceClick({ id: "Fences", name: "建栅栏" }, p); };
      });
    return;
  }
  if (sp.id === "FamilyGrowth") {
    openModal("👶 添丁", `<p class="muted">官方规则：<b>0 食物消耗</b>。只需有空房间，且家人 < 5 人。<br>新成员本轮不工作，收获阶段仅需 1 食物。</p>
      <p class="muted">你有 ${Math.max(0, p.rooms - p.family)} 间空房。</p>
      <button class="btn big" id="mFG">确定</button>`,
      (root) => root.querySelector("#mFG").onclick = () => {
        doWithLoading("family-growth", "添丁…", () => sendAction({ type: "FamilyGrowth" }));
        closeModal();
      });
    return;
  }
  if (sp.id === "Renovate") {
    const rooms = p.rooms;
    // 规则：翻修按每间房计费；职业减免与引擎同步
  const r1 = renovateCost(p, "woodToClay");
  const r2 = renovateCost(p, "clayToStone");
  const base1 = { clay: rooms, reed: 1 };
  const base2 = { stone: rooms, reed: 1 };
    const can = (cost) => Object.entries(cost).every(([k, v]) => (p.resources[k] || 0) >= v);
    const ok1 = p.roomType === "wood" && can(r1.cost);
    const ok2 = p.roomType === "clay" && can(r2.cost);
    const notesAll = [...r1.notes, ...r2.notes];
    openModal("🔨 翻修", `
      <p class="muted" style="margin-top:0">
        翻修是 <b>整栋一起翻</b>，按房间数量计费（你现在 <b>${rooms} 间</b>房）。
      </p>
      <div class="kb-card" style="background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0">
        <div style="font-size:13px;line-height:1.9">
          <div><b>木屋 → 陶屋</b>：${annotatedCostLine(base1, r1.cost, r1.notes)}
            <span style="color:${ok1 ? "var(--leaf-dark)" : "var(--barn)"}">
              ${p.roomType !== "wood" ? "（当前不是木屋）" : can(r1.cost) ? "✅ 可以翻" : `❌ 资源不足（缺 ${shortfall(p, r1.cost)}）`}
            </span>
            <span class="muted"> · 翻后每间 +1 分</span>
          </div>
          <div><b>陶屋 → 石屋</b>：${annotatedCostLine(base2, r2.cost, r2.notes)}
            <span style="color:${ok2 ? "var(--leaf-dark)" : "var(--barn)"}">
              ${p.roomType !== "clay" ? "（当前不是陶屋）" : can(r2.cost) ? "✅ 可以翻" : `❌ 资源不足（缺 ${shortfall(p, r2.cost)}）`}
            </span>
            <span class="muted"> · 翻后每间 +2 分</span>
          </div>
        </div>
      </div>
      ${notesAll.length ? `<div class="muted" style="font-size:11.5px;margin-top:6px">💡 ${notesAll.map(escapeHtml).join("；")}</div>` : ""}
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
      <p class="muted" style="margin-top:0">重大改进先到先得（每种只能建一个）${_state.game.dlc?.moor ? "；含「沼泽农夫」专属 5 张" : ""}。</p>
      <div class="imp-list" id="mImpGrid"></div>
      <p class="muted" style="margin-top:10px;font-size:12px">
        🍳 壁炉/烹饪灶：<b>随时</b>可把谷物/蔬菜/牲畜换成食物（不占行动，点玩家卡上的改进标签即可烹饪）。<br>
        🍞 陶炉/石炉/瓷砖烤炉：在「撒种/烤面包」行动中烤面包。
      </p>
    `, (root) => {
      const grid = root.querySelector("#mImpGrid");
      const list = [
        ["fireplace",     "壁炉",       "2 陶",        "1 分", "2 谷/菜/羊/猪 → 1 食物；3 牛 → 1 食物（随时）"],
        ["fireplaceBig",  "大壁炉",     "3 陶",        "1 分", "与壁炉完全相同（适合陶多 / 想多占 1 分时建）"],
        ["cookingHearth", "烹饪灶",     "4 陶",        "1 分", "1 谷/菜/羊/猪 → 2 食物；3 牛 → 2 食物（随时）"],
        ["cookingHearthBig","大烹饪灶",  "5 陶",        "1 分", "与烹饪灶完全相同（适合陶多 / 想多占 1 分时建）"],
        ["clayOven",      "陶土烤炉",   "3 陶 + 1 石", "2 分", "烤面包：1 谷 → 5 食物"],
        ["stoneOven",     "石头烤炉",   "3 石 + 1 陶", "3 分", "烤面包：2 谷 → 每谷 4 食物"],
        ["well",          "水井",       "3 石 + 1 木", "4 分", "建成后 5 轮，每轮开始 +1 食物"],
        ["joinery",       "木工坊",     "2 石 + 2 木", "2 分", "随时 1 木 → 2 食物（点标签使用）"],
        ["pottery",       "陶器坊",     "2 石 + 2 陶", "2 分", "随时 1 陶 → 2 食物（点标签使用）"],
        ["basket",        "编筐坊",     "2 石 + 2 芦苇","2 分", "随时 1 芦苇 → 3 食物（点标签使用）"],
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
        const baseObj = MAJOR_COST[k] || {};
        // 职业减免：箍桶匠 −1 木 / 铁匠 −1 石 / 窑炉大师 −1 陶（与引擎同步）
        const { cost: costObj, notes } = majorBuildCost(p, baseObj);
        const hasDiscount = notes.length > 0;
        const ok = canAfford(p, costObj);
        const disabled = built || !ok;
        const costHtml = hasDiscount ? annotatedCostLine(baseObj, costObj, notes) : cost;
        const artKey = {
          fireplace: "Fireplace_2",
          fireplaceBig: "Fireplace_3",
          cookingHearth: "CookingHearth_4",
          cookingHearthBig: "CookingHearth_5",
          clayOven: "ClayOven",
          stoneOven: "StoneOven",
          well: "Well",
          joinery: "Joinery",
          pottery: "Pottery",
          basket: "BasketmakersWorkshop",
        }[k] || k;
        const artHtml = majorImprovementSvg(artKey, 38);
        return `<button class="imp-item${built ? " built" : ""}${!built && !ok ? " poor" : ""}" data-i="${k}" ${disabled ? "disabled" : ""}>
          <div class="imp-item-inner">
            <div class="imp-art-wrap">${artHtml}</div>
            <div class="imp-content">
              <div class="imp-line1"><b>${built ? "✓ " : ""}${name}</b><span class="vp-seal">${vp}</span></div>
              <div class="imp-line2">${costHtml}${!built && !ok ? ` <span style="color:var(--barn)">（缺 ${shortfall(p, costObj)}）</span>` : ""}</div>
              <div class="imp-line3">${eff}</div>
            </div>
          </div>
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
function openModal(title, bodyHTML, onMount, options = {}) {
  const { closable = true, hideCancel = false } = options;
  window.__modalClosable = closable;
  const mask = document.getElementById("modalRoot");
  const box = document.getElementById("modalBox");
  mask.classList.remove("hiding");
  box.innerHTML = `
    <div class="act-modal entering${!closable ? " modal-unclosable" : ""}">
      <div class="act-modal-head">
        <h3>${title}</h3>
        ${closable ? `<button class="act-modal-x" type="button" data-modal-close aria-label="关闭">×</button>` : ""}
      </div>
      <div class="act-modal-body">${bodyHTML}</div>
      ${closable && !hideCancel ? `
      <div class="act-modal-foot">
        <button class="btn ghost" type="button" data-modal-close>取消</button>
      </div>` : ""}
    </div>`;
  mask.classList.remove("hidden");
  bindRipples(box);
  // 所有 data-modal-close（右上角 × 与底部「取消」）统一关闭
  box.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.onclick = () => closeModal();
  });
  // ESC 关闭（仅本模态，且仅在 closable 时允许）
  if (!window.__modalEscBound) {
    window.__modalEscBound = true;
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (window.__modalClosable === false) return; // 必选模态禁止按 ESC 退出
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
  openModal("🎴 选职业（7 选 1 · 必选）", `
    <div class="tip-box" style="margin-top:0;margin-bottom:12px;font-size:12.5px;line-height:1.6">
      <b>💡 卡池说明：</b>本作已收录官方全部 <b>88 张经典职业卡</b>（涵盖基础资源、农耕、畜牧、建造、烹饪、运营、声望 7 大流派）。开局系统随机<b>盲抽 7 张候选手牌</b>供您 7 选 1，选定后整局生效，<b>职业为必选项，不可取消，一旦选定无法更换</b>。
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <span class="muted" style="font-size:13px;font-weight:600">本局候选手牌（请任选一张）：</span>
      <button type="button" class="btn btn-outline small" id="btnOpenOccGalleryFromPicker" style="display:inline-flex;align-items:center;gap:4px">
        <span>📖</span><span>浏览全量职业图鉴 (88 张)</span>
      </button>
    </div>
    <div class="occ-hand">${cards}</div>
  `, (root) => {
    const galBtn = root.querySelector("#btnOpenOccGalleryFromPicker");
    if (galBtn) {
      galBtn.onclick = () => {
        import("/js/tutorial.js").then((m) => m.openOccupationGalleryDrawer());
      };
    }
    root.querySelectorAll(".occ-card").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.occ;
        doWithLoading(`choose-occ-${id}`, "选职业…", () => sendAction({ type: "ChooseOccupation", id }));
        closeModal(true);
      };
    });
  }, { closable: false });
}
function closeModal(force = false) {
  if (!force && window.__modalClosable === false) return;
  window.__modalClosable = true;
  const mask = document.getElementById("modalRoot");
  if (!mask) return;
  if (reducedMotion()) { mask.classList.add("hidden"); return; }
  mask.classList.add("hiding");
  setTimeout(() => {
    mask.classList.add("hidden");
    mask.classList.remove("hiding");
  }, 160);
}

/** 打开玩家得分详细计算面板（实时依据 2016 正统规则核算细分项） */
function openScoreBreakdownModal(pid, g) {
  g = g || (_state && _state.game);
  if (!g) return;
  const p = g.players.find(x => x.id === pid) || g.players[0];
  if (!p) return;
  const s = liveScorePlayer(p);
  const st = s.stats;

  const playerTabs = g.players.length > 1 ? `
    <div class="score-modal-tabs">
      ${g.players.map(pl => {
        const plScore = liveScorePlayer(pl);
        return `<button type="button" class="btn small ${pl.id === p.id ? 'primary' : 'ghost'} score-tab-btn" data-score-tab="${pl.id}">${escapeHtml(pl.name)} (👑 ${plScore.total})</button>`;
      }).join("")}
    </div>
  ` : "";

  const breakdownRows = [
    { name: "🌾 耕地", count: `${st.fields} 块（含沼泽田）`, score: s.breakdown["田块"], rule: "0-1块:-1分, 2块:1分, 3块:2分, 4块:3分, ≥5块:4分" },
    { name: "🏡 牧场", count: `${st.pastures} 处封闭牧场`, score: s.breakdown["牧场"], rule: "0处:-1分, 1处:1分, 2处:2分, 3处:3分, ≥4处:4分" },
    { name: "🌾 谷物", count: `${st.grain} 份（存货+田地）`, score: s.breakdown["谷物"], rule: "0份:-1分, 1-3份:1分, 4-5份:2分, 6-7份:3分, ≥8份:4分" },
    { name: "🥕 蔬菜", count: `${st.veg} 份（存货+田地）`, score: s.breakdown["蔬菜"], rule: "0份:-1分, 1份:1分, 2份:2分, 3份:3分, ≥4份:4分" },
    { name: "🐑 羊", count: `${st.sheep} 只`, score: s.breakdown["羊"], rule: "0只:-1分, 1-3只:1分, 4-5只:2分, 6-7只:3分, ≥8只:4分" },
    { name: "🐗 猪", count: `${st.boar} 只`, score: s.breakdown["猪"], rule: "0只:-1分, 1-2只:1分, 3-4只:2分, 5-6只:3分, ≥7只:4分" },
    { name: "🐄 牛", count: `${st.cattle} 只`, score: s.breakdown["牛"], rule: "0只:-1分, 1只:1分, 2-3只:2分, 4-5只:3分, ≥6只:4分" },
    { name: "🏠 房间", count: `${st.rooms} 间${houseLabel(st.roomType)}`, score: s.breakdown["陶屋"] || s.breakdown["石屋"] || s.breakdown["木屋"] || 0, rule: "木屋0分/间, 陶屋1分/间, 石屋2分/间" },
    { name: "👨‍👩‍👧 家人", count: `${st.family} 名成员`, score: s.breakdown["家人"], rule: "每名已出生家庭成员 +3 分" },
    { name: "🟩 空地", count: `${st.unusedSpaces} 格未利用`, score: s.breakdown["空地"], rule: "农庄15格中未利用的每格 -1 分" },
    { name: "🃏 乞讨卡", count: `${st.beggings} 张`, score: s.breakdown["乞讨"], rule: "每张乞讨卡惩罚 -3 分" },
    { name: "🔧 改进设施", count: `${(st.improvements || []).length} 项`, score: s.breakdown["改进"], rule: "主要/次要发展卡卡面胜利点" },
    ...(s.breakdown["职业"] ? [{ name: "🎴 职业加成", count: p.occupation ? p.occupation.name : "职业", score: s.breakdown["职业"], rule: "职业终局达成条件加成" }] : []),
    ...(s.breakdown["柴火"] ? [{ name: "🪵 柴火得分", count: `${p.fuel || 0} 份燃料`, score: s.breakdown["柴火"], rule: "柴火棚大改进终局燃料折算分" }] : []),
    ...(s.breakdown["节气"] ? [{ name: "📅 节气加分", count: `${p.seasonVP} 分`, score: s.breakdown["节气"], rule: "节气轮转：度假等季节行动累积的额外分" }] : []),
  ];

  const html = `
    ${playerTabs}
    <div class="score-summary-card">
      <div class="score-summary-head">
        <span class="avatar" style="width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${meepleSvg(PLAYER_COLORS[p.seat] || "#8e2316", 28)}</span>
        <div>
          <b style="font-size:15px">${escapeHtml(p.name)}</b>
          <div class="muted" style="font-size:11.5px">第 ${g.round} / 14 轮实时核算 · 依据正统 2016 计分规则</div>
        </div>
        <div class="score-badge-large">
          <span class="score-crown">👑</span>
          <span class="score-num">${s.total}</span>
          <span class="score-unit">分</span>
        </div>
      </div>
    </div>
    <div class="score-grid-table">
      ${breakdownRows.map(row => `
        <div class="score-grid-row">
          <div class="score-col-item">
            <span class="score-row-name">${escapeHtml(row.name)}</span>
            <span class="score-row-detail">${escapeHtml(row.count)}</span>
          </div>
          <div class="score-col-rule">${escapeHtml(row.rule)}</div>
          <div class="score-col-val ${row.score > 0 ? 'pos' : row.score < 0 ? 'neg' : 'zero'}">
            ${row.score > 0 ? '+' : ''}${row.score}
          </div>
        </div>
      `).join("")}
    </div>
    <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <button type="button" class="btn ghost small" id="btnOpenFullLeaderboard">🏆 查看全员实时排行榜</button>
      <div class="muted" style="font-size:11px">点击右上角 × 或按 ESC 可关闭本面板</div>
    </div>
  `;

  openModal("📊 得分计算面板", html, (root) => {
    root.querySelectorAll(".score-tab-btn").forEach(btn => {
      btn.onclick = () => {
        openScoreBreakdownModal(btn.dataset.scoreTab, g);
      };
    });
    const lbBtn = root.querySelector("#btnOpenFullLeaderboard");
    if (lbBtn) {
      lbBtn.onclick = () => {
        closeModal();
        openLeaderboard(g);
      };
    }
  });
}

/**
 * DLC（节气轮转）：打开当前季节的「节气行动」模态。
 * 春耕（繁殖+可选撒种）/ 度假（得分）/ 秋收（田间阶段+可选拿菜）/ 家庭扩建（无需空房）。
 */
function openSeasonModal(g, p) {
  if (!g || !p) return;
  const season = ttsSeasonOf(g, g.round) || "spring";
  const info = SEASONS.find((x) => x.key === season) || SEASONS[0];
  const title = `📅 节气行动 · ${info.label}季 ${info.icon}`;

  if (season === "spring") {
    const pairs = (["sheep", "boar", "cattle"]).filter((t) => p.animals[t] >= 2)
      .map((t) => `${({ sheep: "绵羊", boar: "野猪", cattle: "黄牛" })[t]}×${p.animals[t]}`).join("、");
    const emptyFields = [];
    p.grid.forEach((row, y) => row.forEach((c, x) => {
      if (c.kind === "field" && !c.crop) emptyFields.push({ x, y });
    }));
    const canSow = emptyFields.length > 0 && (p.resources.grain > 0 || p.resources.vegetable > 0);
    const fieldBtns = canSow ? emptyFields.map((f) => `
      <div class="row" style="gap:6px;align-items:center;margin-bottom:6px">
        <span class="muted" style="min-width:56px">农田 (${f.x},${f.y})</span>
        ${p.resources.grain > 0 ? `<button class="btn small" data-season-sow="grain" data-x="${f.x}" data-y="${f.y}">🌾 播种谷物</button>` : ""}
        ${p.resources.vegetable > 0 ? `<button class="btn small" data-season-sow="vegetable" data-x="${f.x}" data-y="${f.y}">🥕 播种蔬菜</button>` : ""}
      </div>`).join("") : `<p class="muted">没有空农田或种子，本次只繁殖。</p>`;
    openModal(title, `
      <div class="tip-box" style="margin-top:0;margin-bottom:12px">
        立即执行一次<b>繁殖阶段</b>：同类动物成对（≥2 只）即 +1 只幼崽（需牧场有容量）。
        ${pairs ? `<br>当前成对：${escapeHtml(pairs)}` : `<br>当前没有成对的动物，繁殖不会产出。`}
      </div>
      <h4 style="margin:10px 0 6px">可选：顺带为一块农田播种</h4>
      ${fieldBtns}
      <div class="row mt8">
        <button class="btn big" id="mSeasonSpringBreed">🌸 只繁殖</button>
      </div>
    `, (root) => {
      root.querySelector("#mSeasonSpringBreed").onclick = () => {
        doWithLoading("season-spring", "春耕…", () => sendAction({ type: "SeasonSpring" }));
        closeModal(true);
      };
      root.querySelectorAll("[data-season-sow]").forEach((b) => {
        b.onclick = () => {
          doWithLoading("season-spring", "春耕…", () => sendAction({ type: "SeasonSpring", crop: b.dataset.seasonSow, x: +b.dataset.x, y: +b.dataset.y }));
          closeModal(true);
        };
      });
    });
    return;
  }

  if (season === "summer") {
    const placed = (g.placedThisRound || []).filter((x) => x === p.id).length + 1;
    openModal(title, `
      <div class="tip-box" style="margin-top:0;margin-bottom:12px">
        带全家<b>度假</b>：本轮<b>已放置的每名家人</b>（含本次放置这名工人）各 +1 <b>节气分</b>（终局计入总分）。<br>
        你本轮已放置 <b>${(g.placedThisRound || []).filter((x) => x === p.id).length}</b> 名家人，本次行动将获得 <b>+${placed} 分</b>。
      </div>
      <p class="muted">提示：越晚度假越划算 —— 先把家里人都派出去干活再度假。</p>
      <button class="btn big" id="mSeasonSummerGo">☀️ 度假（+${placed} 节气分）</button>
    `, (root) => {
      root.querySelector("#mSeasonSummerGo").onclick = () => {
        doWithLoading("season-summer", "度假…", () => sendAction({ type: "SeasonSummer" }));
        closeModal(true);
      };
    });
    return;
  }

  if (season === "autumn") {
    const sown = [];
    p.grid.forEach((row, y) => row.forEach((c, x) => {
      if (c.kind === "field" && c.crop && c.markers) sown.push({ x, y, crop: c.crop, markers: c.markers });
    }));
    openModal(title, `
      <div class="tip-box" style="margin-top:0;margin-bottom:12px">
        立即执行一次<b>田间阶段</b>：每块有作物的农田收割 1 份谷物或蔬菜（marker −1）。当前有 <b>${sown.length}</b> 块作物田。
      </div>
      <div class="row mt8" style="flex-wrap:wrap">
        <button class="btn" id="mSeasonAutumnGo">🍂 秋收${sown.length ? `（预计 +${sown.length} 作物）` : ""}</button>
        <button class="btn" id="mSeasonAutumnVeg">🍂 秋收 + 🥕 额外拿 1 蔬菜</button>
      </div>
    `, (root) => {
      root.querySelector("#mSeasonAutumnGo").onclick = () => {
        doWithLoading("season-autumn", "秋收…", () => sendAction({ type: "SeasonAutumn" }));
        closeModal(true);
      };
      root.querySelector("#mSeasonAutumnVeg").onclick = () => {
        doWithLoading("season-autumn", "秋收…", () => sendAction({ type: "SeasonAutumn", takeVeg: true }));
        closeModal(true);
      };
    });
    return;
  }

  // winter
  openModal(title, `
    <div class="tip-box" style="margin-top:0;margin-bottom:12px">
      <b>家庭扩建</b>：寒冬室内施工 —— <b>无需空房</b>直接添 1 名家人（本轮出生不干活，下次收获阶段起正常吃饭）。<br>
      成本：<b>2 木材 + 3 食物</b>（你现有 ${p.resources.wood} 木材 · ${p.food} 食物 · ${p.family} 名家人）。
    </div>
    <button class="btn big" id="mSeasonWinterGo" ${p.resources.wood >= 2 && p.food >= 3 && p.family < 5 ? "" : "disabled"}>❄️ 扩建添丁（−2 木材 −3 食物）</button>
    ${(p.resources.wood < 2 || p.food < 3) ? '<p class="muted" style="color:var(--barn)">资源不足，无法扩建。</p>' : ""}
  `, (root) => {
    const btn = root.querySelector("#mSeasonWinterGo");
    if (btn) btn.onclick = () => {
      doWithLoading("season-winter", "扩建…", () => sendAction({ type: "SeasonWinter" }));
      closeModal(true);
    };
  });
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
  joinery: "木工坊", pottery: "陶器坊", basket: "编筐坊",
  heatingStove: "取暖炉", peatKiln: "泥炭窑", moorCook: "沼泽灶", tileOven: "瓷砖烤炉", firewood: "柴火棚",
};
/** 改进悬浮说明（费用 / 得分 / 效果）—— 修订版数值 */
const MAJOR_TIP = {
  fireplace:        "壁炉 · 2 陶土 · +1 分\n随时烹饪：2 谷物/蔬菜/绵羊/野猪 → 1 食物；3 黄牛 → 1 食物\n👉 点此标签烹饪",
  fireplaceBig:     "大壁炉 · 3 陶土 · +1 分\n随时烹饪，效果与壁炉完全相同\n👉 点此标签烹饪",
  cookingHearth:    "烹饪灶 · 4 陶土 · +1 分\n随时烹饪：1 谷物/蔬菜/绵羊/野猪 → 2 食物；3 黄牛 → 2 食物\n👉 点此标签烹饪",
  cookingHearthBig: "大烹饪灶 · 5 陶土 · +1 分\n随时烹饪，效果与烹饪灶完全相同\n👉 点此标签烹饪",
  clayOven:         "陶土烤炉 · 3 陶土 + 1 石材 · +2 分\n烤面包：每次最多 1 谷物 → 5 食物",
  stoneOven:        "石头烤炉 · 3 石材 + 1 陶土 · +3 分\n烤面包：每次最多 2 谷物 → 每份谷物 4 食物",
  well:             "水井 · 3 石材 + 1 木材 · +4 分\n建成后 5 轮，每轮开始 +1 食物（自动结算）",
  joinery:          "木工坊 · 2 石材 + 2 木材 · +2 分\n收获阶段 1 木材 → 2 食物（不占行动）\n👉 点此标签转换",
  pottery:          "陶器坊 · 2 石材 + 2 陶土 · +2 分\n收获阶段 1 陶土 → 2 食物（不占行动）\n👉 点此标签转换",
  basket:           "编筐坊 · 2 石材 + 2 芦苇 · +2 分\n收获阶段 1 芦苇 → 3 食物（不占行动）\n👉 点此标签转换",
  heatingStove:     "取暖炉 · 3 石材 + 2 木材 · +2 分\n收获阶段全家仅消耗 1 燃料取暖（不论家人数）",
  peatKiln:         "泥炭窑 · 2 陶土 + 1 木材 · +2 分\n每次收获阶段自动 +1 燃料",
  moorCook:         "沼泽灶 · 2 石材 + 1 木材 · +3 分\n随时烹饪：1 谷物/蔬菜/绵羊/野猪 → 2 食物；3 黄牛 → 2 食物\n👉 点此标签烹饪",
  tileOven:         "瓷砖烤炉 · 3 石材 + 2 陶土 · +3 分\n烤面包：每次最多 2 谷物 → 每份谷物 4 食物",
  firewood:         "柴火棚 · 2 石材 + 2 芦苇 · +2 分\n终局时每份剩余燃料直接折算 1 分胜利点",
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
  return `<span class="imp-tag${cookable ? " imp-tag-cook" : ""}" data-imp="${escapeHtml(k)}" data-tip="${escapeHtml(tip)}">${escapeHtml(name)}${cookable ? " 🍳" : ""}</span>`;
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
  const ANIMAL_ZH_C = { sheep: "绵羊", boar: "野猪", cattle: "黄牛" };
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

function houseLabel(t) { return t === "wood" ? "木屋" : t === "clay" ? "陶屋" : "石屋"; }
function houseEmoji(t) { return t === "wood" ? "🏚" : t === "clay" ? "🛖" : "🏛"; }
function houseCostLabel(t) {
  return t === "wood" ? "5 木材 + 2 芦苇" : t === "clay" ? "5 陶土 + 2 芦苇" : "5 石材 + 2 芦苇";
}

/** 房间建造费用（与引擎 ROOM_COST 一致） */
const ROOM_COST_BY_TYPE = {
  wood:  { wood: 5,  reed: 2 },
  clay:  { clay: 5,  reed: 2 },
  stone: { stone: 5, reed: 2 },
};
/** 资源 key → 中文 */
function resZh(k) {
  return ({ wood: "木材", clay: "陶土", reed: "芦苇", stone: "石材", grain: "谷物", vegetable: "蔬菜", food: "食物", fuel: "燃料", hay: "干草" })[k] || k;
}
/** 费用行文本，如 "5 木材 + 2 芦苇" */
function costLine(cost) {
  return Object.entries(cost).map(([k, v]) => `${v} ${resZh(k)}`).join(" + ");
}
/** 是否付得起 */
function canAfford(p, cost) {
  return Object.entries(cost).every(([k, v]) => (p.resources[k] || 0) >= v);
}
/** 缺什么，如 "3 木材、1 芦苇" */
function shortfall(p, cost) {
  const lack = Object.entries(cost)
    .filter(([k, v]) => (p.resources[k] || 0) < v)
    .map(([k, v]) => `${v - (p.resources[k] || 0)} ${resZh(k)}`);
  return lack.length ? lack.join("、") : "无";
}

// ============================================================
// Buff 标注系统：职业 / 小发展卡对「资源多拿」与「成本减免」的统一标注
// 灰字小徽章 (+1 / −1)，悬浮 data-tip 注明效果来源（哪张职业卡）
// ============================================================
/** 取用行动格 → 职业额外收益表（与引擎 handleTake 钩子一一对应） */
const TAKE_BUFF_TABLE = {
  Wood: [
    { occ: "lumberjack", label: "柴夫", extra: "额外 +1 木材" },
    { occ: "forestCustodian", label: "护林员", extra: "额外 +1 芦苇" },
    { occ: "mushroomCollector", label: "蘑菇采摘人", extra: "额外 +1 食物" },
    { occ: "hunter", label: "猎人", extra: "额外 +1 食物" },
    { occ: "trapper", label: "野味设阱师", extra: "额外 +1 食物" },
    { occ: "silviculturist", label: "林农", extra: "取走 ≥3 木材时额外 +1 食物" },
    { occ: "charcoalBurner", label: "炭烧工", extra: "额外 +1 燃料（无沼泽扩展时 +1 食物）" },
  ],
  Clay: [
    { occ: "clayCarrier", label: "运泥工", extra: "额外 +1 陶土" },
    { occ: "miner", label: "矿工", extra: "额外 +1 陶土" },
    { occ: "gravelCarrier", label: "砾石搬运工", extra: "额外 +1 石材" },
    { occ: "peatCutter", label: "泥炭割工", extra: "额外 +1 燃料（无沼泽扩展时 +1 食物）" },
  ],
  Reed: [
    { occ: "reedCollector", label: "割苇人", extra: "额外 +1 芦苇" },
  ],
  Stone: [
    { occ: "quarryman", label: "采石工", extra: "额外 +1 石材" },
    { occ: "miner", label: "矿工", extra: "额外 +1 石材" },
  ],
  Grain: [
    { occ: "seedMerchant", label: "种子商人", extra: "额外 +1 谷物" },
    { occ: "grainInspector", label: "谷物检验员", extra: "额外 +1 谷物" },
  ],
  Vegetable: [
    { occ: "seedMerchant", label: "种子商人", extra: "额外 +1 蔬菜" },
  ],
  Fishing: [
    { occ: "fisher", label: "渔夫", extra: "额外 +1 食物" },
    { occ: "hunter", label: "猎人", extra: "额外 +1 食物" },
    { occ: "fishBuyer", label: "鱼贩", extra: "额外 +1 食物" },
  ],
  DayLaborer: [
    { occ: "dayLaborer", label: "打工达人", extra: "额外 +1 食物（共 3 食物）" },
    { occ: "oddJobMan", label: "杂务工", extra: "额外 +1 木材" },
    { occ: "laborBroker", label: "劳工经纪", extra: "额外 +1 陶土" },
  ],
  Sheep: [{ occ: "shepherd", label: "牧羊人", extra: "额外 +1 只绵羊" }],
  Boar: [{ occ: "swineherd", label: "养猪人", extra: "额外 +1 只野猪" }],
  Cattle: [{ occ: "cattleFarmer", label: "牧牛人", extra: "额外 +1 只黄牛" }],
  BuildRoom: [
    { occ: "carpenter", label: "木匠", tag: "减免", extra: "建木屋每间房 −1 木材" },
    { occ: "bricklayer", label: "砌砖工", tag: "减免", extra: "建陶屋每间房 −1 陶土" },
    { occ: "wainwright", label: "车匠", tag: "减免", extra: "建房每间房 −1 芦苇" },
    { occ: "thatcher", label: "盖顶工", tag: "减免", extra: "建房每间房 −1 芦苇" },
    { occ: "masterBuilder", label: "建筑工长", tag: "返木", extra: "每建 1 间房返还 1 木材" },
    { occ: "surveyor", label: "宅地测量员", tag: "奖食", extra: "房间数 ≥3 后每建 1 间房 +2 食物" },
    { occ: "stableArchitect", label: "圈舍建造师", tag: "返木", extra: "建造马厩时返还 1 木材" },
  ],
  PlowField: [
    { occ: "plowman", label: "犁地手", tag: "多犁", extra: "额外免费多犁 1 块田" },
    { occ: "plowwright", label: "犁匠", tag: "返木", extra: "犁地额外获得 1 木材" },
  ],
  SowOrBake: [
    { occ: "sower", label: "播种者", tag: "双播", extra: "可同时为 2 块农田播种" },
    { occ: "cornShepherd", label: "麦田看守", tag: "奖食", extra: "播种后立即获得 1 食物" },
    { occ: "baker", label: "面包师", tag: "加食", extra: "每次烤面包额外 +1 食物" },
    { occ: "miller", label: "磨坊主", tag: "加食", extra: "烤面包每份谷物多得 1 食物" },
    { occ: "breadBakerApprentice", label: "面包学徒", tag: "加食", extra: "烤面包额外 +1 食物" },
  ],
  Fences: [
    { occ: "hedgeKeeper", label: "栅栏工", tag: "返木", extra: "建栅栏行动返还 2 木材" },
    { occ: "stableArchitect", label: "圈舍建造师", tag: "返木", extra: "建造圈舍时返还 1 木材" },
  ],
  FamilyGrowth: [
    { occ: "wetNurse", label: "保姆", tag: "免食", extra: "婴儿当轮不产生喂食负担" },
    { occ: "midwife", label: "助产士", tag: "奖食", extra: "添丁完成后立即获得 2 食物" },
    { occ: "governess", label: "家庭教师", tag: "得谷", extra: "婴儿当轮额外获得 1 谷物" },
  ],
  Renovate: [
    { occ: "renovator", label: "翻修工", tag: "免苇", extra: "翻修省去全部芦苇消耗" },
    { occ: "thatcher", label: "盖顶工", tag: "减免", extra: "翻修减免 1 芦苇消耗" },
    { occ: "bricklayer", label: "砌砖工", tag: "减免", extra: "翻修陶屋减免 1 陶土" },
    { occ: "masterMason", label: "石工大师", tag: "减免", extra: "翻修石屋减免 1 石材" },
    { occ: "plasterer", label: "抹灰工", tag: "奖食", extra: "翻修完成后立即获得 1 食物" },
  ],
  BuildMajor: [
    { occ: "cooper", label: "箍桶匠", tag: "减免", extra: "建造大改进减免 1 木材" },
    { occ: "blacksmith", label: "铁匠", tag: "减免", extra: "建造大改进减免 1 石材" },
    { occ: "kilnMaster", label: "窑炉大师", tag: "减免", extra: "建造大改进减免 1 陶土" },
  ],
};
const RES_TO_SPACE = { wood: "Wood", clay: "Clay", reed: "Reed", stone: "Stone", grain: "Grain", vegetable: "Vegetable", food: "Fishing", sheep: "Sheep", boar: "Boar", cattle: "Cattle" };
/** 该玩家在某个行动格取用时的职业加成列表 */
function takeBuffsFor(p, spaceId) {
  if (!p) return [];
  return (TAKE_BUFF_TABLE[spaceId] || []).filter((r) => r.occ === p.occupation?.id);
}
/** 灰字加成徽章（悬浮注明来源职业） */
function buffChipHtml(p, spaceId) {
  const buffs = takeBuffsFor(p, spaceId);
  if (!buffs.length) return "";
  const tip = buffs.map((b) => `「${b.label}」职业：${b.extra}`).join("\n");
  const tag = buffs[0].tag || "+1";
  return `<span class="buff-chip" data-tip="${escapeHtml(tip)}">${tag}</span>`;
}
/** 建房间实付费用（与引擎 buildRoom 折扣规则一致） */
function roomBuildCost(p) {
  const cost = { ...ROOM_COST_BY_TYPE[p.roomType] };
  const notes = [];
  if (p.occupation?.id === "carpenter" && p.roomType === "wood" && cost.wood) {
    cost.wood -= 1; notes.push("「木匠」职业：建木屋 −1 木材");
  }
  if (p.occupation?.id === "bricklayer" && p.roomType === "clay" && cost.clay) {
    cost.clay -= 1; notes.push("「砌砖工」职业：建陶屋 −1 陶土");
  }
  if ((p.occupation?.id === "wainwright" || p.occupation?.id === "thatcher") && cost.reed) {
    cost.reed -= 1; notes.push(`「${p.occupation.id === "wainwright" ? "车匠" : "盖顶工"}」职业：建房 −1 芦苇`);
  }
  return { cost, notes };
}
/** 翻修实付费用（与引擎 renovate 折扣规则一致） */
function renovateCost(p, direction) {
  const rooms = p.rooms || 0;
  const mat = direction === "woodToClay" ? "clay" : "stone";
  const cost = { [mat]: rooms, reed: 1 };
  const notes = [];
  if (p.occupation?.id === "renovator" && cost.reed) { cost.reed = 0; notes.push("「翻修工」职业：翻修免芦苇"); }
  if (p.occupation?.id === "thatcher" && cost.reed) { cost.reed = Math.max(0, cost.reed - 1); notes.push("「盖顶工」职业：翻修 −1 芦苇"); }
  if (p.occupation?.id === "bricklayer" && cost.clay) { cost.clay = Math.max(0, cost.clay - 1); notes.push("「砌砖工」职业：翻修 −1 陶土"); }
  if (p.occupation?.id === "masterMason" && direction === "clayToStone" && cost.stone) { cost.stone = Math.max(1, cost.stone - 1); notes.push("「石工大师」职业：翻修石屋 −1 石材"); }
  return { cost, notes };
}
/** 大改进实付费用（与引擎 buildMajor 折扣规则一致） */
function majorBuildCost(p, costObj) {
  const cost = { ...(costObj || {}) };
  const notes = [];
  if (p.occupation?.id === "cooper" && cost.wood) { cost.wood -= 1; notes.push("「箍桶匠」职业：建改进 −1 木材"); }
  if (p.occupation?.id === "blacksmith" && cost.stone) { cost.stone -= 1; notes.push("「铁匠」职业：建改进 −1 石材"); }
  if (p.occupation?.id === "kilnMaster" && cost.clay) { cost.clay -= 1; notes.push("「窑炉大师」职业：建改进 −1 陶土"); }
  return { cost, notes };
}
/** 带减免徽章的费用行：如 "5 木材 −1木材 + 2 芦苇"，悬浮注明来源职业 */
function annotatedCostLine(base, disc, notes) {
  return Object.entries(base).map(([k, v]) => {
    const d = disc[k] ?? v;
    const diff = d - v;
    const chip = diff < 0
      ? `<span class="buff-chip neg" data-tip="${escapeHtml((notes || []).join("\n") || "职业减免")}">−${-diff} ${resZh(k)}</span>`
      : "";
    return `${v} ${resZh(k)}${chip}`;
  }).join(" + ");
}

// ============================================================
// 预计自动收入提示：下回合开始 / 下次收获会自动结算到账的资源
// （水井、永久小发展卡、被动职业、田地阶段、蜂箱、繁殖等）
// Stock 上显示虚线框 (+N)，悬浮注明每笔来源与结算时机
// ============================================================
function autoIncomeFor(p, g) {
  const inc = {}; // resKey -> { amount, lines[] }
  const add = (key, n, line) => {
    if (!n) return;
    (inc[key] = inc[key] || { amount: 0, lines: [] });
    inc[key].amount += n;
    if (line) inc[key].lines.push(line);
  };
  const nextRound = g.round + 1;
  const nextHarvest = HARVEST_ROUNDS_ALL.find((r) => r > g.round);

  // —— 下回合开始（每轮被动结算，按当前状态预估）——
  if (nextRound >= 1 && nextRound <= 14) {
    if (p.wellRounds > 0) add("food", 1, `下回合开始 · 水井（剩余 ${p.wellRounds} 轮）`);
    const MI_INC = {
      "mi.firewood": ["wood", "小发展卡·柴堆"],
      "mi.spinning": ["reed", "小发展卡·纺车"],
      "mi.brick": ["clay", "小发展卡·砖块"],
      "mi.stoneHeap": ["stone", "小发展卡·石堆"],
    };
    for (const [card, [k, src]] of Object.entries(MI_INC)) {
      if ((p.minorImprovements || []).includes(card)) add(k, 1, `下回合开始 · ${src}`);
    }
    const OCC_INC = {
      woodcutter: ["wood", "伐木工"], clayworker: ["clay", "泥瓦工"],
      reedcutter: ["reed", "芦苇工"], stonemason: ["stone", "石匠"],
      grainMerchant: ["grain", "粮商"], fieldHand: ["grain", "田间工"],
      innkeeper: ["food", "旅店老板"],
    };
    const occ = OCC_INC[p.occupation?.id];
    if (occ) add(occ[0], 1, `下回合开始 · 职业「${occ[1]}」`);
    if (p.occupation?.id === "seasonalWorker" && [1, 5, 8, 10, 12, 14].includes(nextRound)) {
      add("grain", 1, `下回合开始 · 职业「季节工」（第 ${nextRound} 轮）`);
      add("food", 1, `下回合开始 · 职业「季节工」（第 ${nextRound} 轮）`);
    }
    // 保底 / 条件类：按当前状态预估
    if (p.occupation?.id === "woodMerchant" && p.resources.wood === 0) add("wood", 1, "下回合开始 · 职业「木柴商」（木材为 0 时保底）");
    if (p.occupation?.id === "storehouseClerk" && p.food === 0) add("food", 1, "下回合开始 · 职业「仓库管理员」（食物为 0 时保底）");
    if (p.occupation?.id === "greengrocer" && p.resources.vegetable >= 1) add("food", 1, "下回合开始 · 职业「菜贩」（有蔬菜时）");
    if (p.occupation?.id === "pastureManager" && p.pastures.length >= 2) add("food", 1, "下回合开始 · 职业「牧场领班」（≥2 处牧场）");
    if (p.occupation?.id === "fieldWatchman" && p.grid.some((row) => row.some((c) => c.kind === "field" && (c.markers || 0) > 0))) {
      add("food", 1, "下回合开始 · 职业「守望者」（田里有作物）");
    }
  }

  // —— 下次收获（自动结算：田地 / 蜂箱 / 繁殖等）——
  if (nextHarvest) {
    const when = `第 ${nextHarvest} 轮收获阶段`;
    let gf = 0, vf = 0;
    p.grid.forEach((row) => row.forEach((c) => {
      if (c.kind === "field" && c.crop && (c.markers || 0) > 0) {
        if (c.crop === "grain") gf++; else vf++;
      }
    }));
    if (gf) add("grain", gf, `${when} · ${gf} 块谷物田各收割 1 谷物`);
    if (vf) add("vegetable", vf, `${when} · ${vf} 块蔬菜田各收割 1 蔬菜`);
    if ((p.minorImprovements || []).includes("mi.beehive")) add("food", 1, `${when} · 蜂箱`);
    if ((p.improvements || []).includes("peatKiln")) add("fuel", 1, `${when} · 泥炭窑`);
    const oid = p.occupation?.id;
    if (oid === "ratcatcher") add("grain", 1, `${when} · 职业「捕鼠人」`);
    if (oid === "gardener") add("vegetable", 1, `${when} · 职业「园丁」`);
    if (oid === "beekeeper") add("food", 2, `${when} · 职业「养蜂人」`);
    if (oid === "milker" && (p.animals.sheep >= 1 || p.animals.cattle >= 1)) add("food", 1, `${when} · 职业「挤奶工」`);
    if (oid === "woolWeaver" && p.animals.sheep >= 1) add("food", 1, `${when} · 职业「羊毛织工」`);
    const fieldCnt = p.grid.flat().filter((c) => c.kind === "field").length;
    if (oid === "smallholder" && fieldCnt <= 2) add("grain", 1, `${when} · 职业「小农」（田 ≤2 块）`);
    // 繁殖：同类成对自动 +1（需牧场有空位）
    (["sheep", "boar", "cattle"]).forEach((t) => {
      if (p.animals[t] >= 2) {
        add(t, 1, `${when} · 繁殖（${({ sheep: "绵羊", boar: "野猪", cattle: "黄牛" })[t]}成对，需牧场有空位）`);
      }
    });
  }
  for (const k of Object.keys(inc)) if (inc[k].amount <= 0) delete inc[k];
  return inc;
}
/** Stock 上的自动收入虚线徽章 */
function incomeChipHtml(inc, key) {
  const e = inc && inc[key];
  if (!e || e.amount <= 0) return "";
  const tip = "预计自动收入（无需派人行动）：\n" + (e.lines.filter(Boolean).map((l) => "· " + l).join("\n"));
  return `<span class="stk-income-chip" data-tip="${escapeHtml(tip)}">+${e.amount}</span>`;
}

// 调试挂载：开发期从 console 调
if (typeof window !== "undefined") {
  window.__gameDebug = {
    openLeaderboard, closeLeaderboard, toggleGuide, renderGuide, liveScores, applySeasonTheme,
    openModal, closeModal, onSpaceClick, sendAction,
    setFenceMode, toggleFence, refreshFenceUI,
    autoIncomeFor, incomeChipHtml,
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
    well:"水井", basket:"编筐坊", joinery:"木工坊", pottery:"陶器坊" })[name] || name;
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
  const dlcOn = !!(g.dlc && (g.dlc.occupations || g.dlc.minorImprovements || g.dlc.moor || g.dlc.seasons));
  fab.innerHTML = `
    <div class="fab-menu">
      <button class="fab-item" data-fab="leaderboard">
        <span class="fab-ic">🏆</span>
        <span class="fab-txt">排行榜</span>
        <span class="fab-score">${leader ? leader.total : 0}</span>
      </button>
      <button class="fab-item" data-fab="strategy">
        <span class="fab-ic">💡</span>
        <span class="fab-txt">流派玩法</span>
      </button>
      <button class="fab-item" data-fab="gallery">
        <span class="fab-ic">🎴</span>
        <span class="fab-txt">职业图鉴(88)</span>
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
      <button class="fab-item" data-fab="bgm">
        <span class="fab-ic">${isBgmOn() ? "🎵" : "🔇"}</span>
        <span class="fab-txt">音乐${isBgmOn() ? "开" : "关"}</span>
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
  const stratBtn = fab.querySelector('[data-fab="strategy"]');
  if (stratBtn) stratBtn.onclick = () => {
    import("/js/tutorial.js").then((m) => m.openStrategyDrawer());
    fab.classList.remove("open");
  };
  const gallBtn = fab.querySelector('[data-fab="gallery"]');
  if (gallBtn) gallBtn.onclick = () => {
    import("/js/tutorial.js").then((m) => m.openOccupationGalleryDrawer());
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
  fab.querySelector('[data-fab="bgm"]').onclick = (e) => {
    e.stopPropagation();
    const on = toggleBgm();
    const btn = fab.querySelector('[data-fab="bgm"]');
    btn.querySelector(".fab-ic").textContent = on ? "🎵" : "🔇";
    btn.querySelector(".fab-txt").textContent = `音乐${on ? "开" : "关"}`;
    toast(on ? "田园背景音乐已开启" : "田园背景音乐已关闭");
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
    ["🪵 木材堆", "每轮累积 +1 木材，取走格内全部"],
    ["🧱 陶土坑", "每轮累积 +1 陶土，取走格内全部"],
    ["🎋 芦苇滩", "每轮累积 +1 芦苇，取走格内全部"],
    ["⛏ 采石场", "第 4 轮起开放，每轮累积 +1 石材，取走全部"],
    ["🌾 谷物堆", "每轮累积 +1 谷物，取走格内全部"],
    ["🥕 蔬菜地", "第 4 轮起开放，每轮累积 +1 蔬菜，取走全部"],
    ["🐟 鱼塘", "每轮累积 +1 食物，取走格内全部"],
    ["🛠 日工", "立即获得 2 食物（无建材成本，但占用 1 名工人）"],
  ],
  animals: [
    ["🐑 羊市", "第 4 轮开放 · 每轮累积 +1 只绵羊 · 取走全部（免费）", "🏠 每格牧场容纳 2 只 · 绵羊 8 只 = 4 分"],
    ["🐗 猪市", "第 8 轮开放 · 每轮累积 +1 只野猪 · 取走全部（免费）", "🏠 每格牧场容纳 2 只 · 野猪 7 只 = 4 分"],
    ["🐄 牛市", "第 12 轮开放 · 每轮累积 +1 只黄牛 · 取走全部（免费）", "🏠 每格牧场容纳 2 只 · 黄牛 6 只 = 4 分"],
  ],
  buildings: [
    ["🏠 建房间", "每间消耗 5 木材/陶土/石材（按现有房屋材质）+ 2 芦苇", "必须与现有房间正交相邻 · 每间增加 1 个工人居住位"],
    ["🪵 建栅栏", "每段消耗 1 木材 · 每人最多建造 15 段栅栏", "必须围成封闭的完整矩形牧场；栅栏不可拆除"],
    ["🔨 翻修", "整栋房屋全部翻新 · 每间消耗 1 陶土/石材 + 1 芦苇", "木屋 0 分 → 陶屋 1 分/间 → 石屋 2 分/间"],
  ],
  majors: [
    ["壁炉", "2 陶土", "1 分", "随时烹饪：2 谷物/蔬菜/绵羊/野猪 → 1 食物；3 黄牛 → 1 食物"],
    ["大壁炉", "3 陶土", "1 分", "随时烹饪，功能与壁炉完全相同（陶土充足时可建来抢分）"],
    ["烹饪灶", "4 陶土", "1 分", "随时烹饪：1 谷物/蔬菜/绵羊/野猪 → 2 食物；3 黄牛 → 2 食物"],
    ["大烹饪灶", "5 陶土", "1 分", "随时烹饪，功能与烹饪灶完全相同（陶土充足时可建来抢分）"],
    ["陶土烤炉", "3 陶土 + 1 石材", "2 分", "烤面包行动：每次最多 1 谷物 → 5 食物"],
    ["石头烤炉", "3 石材 + 1 陶土", "3 分", "烤面包行动：每次最多 2 谷物 → 每份谷物 4 食物"],
    ["水井", "3 石材 + 1 木材", "4 分", "建成后未来 5 轮，每轮开始时自动获得 1 食物"],
    ["木工坊", "2 石材 + 2 木材", "2 分", "收获阶段可将 1 木材 → 2 食物"],
    ["陶器坊", "2 石材 + 2 陶土", "2 分", "收获阶段可将 1 陶土 → 2 食物"],
    ["编筐坊", "2 石材 + 2 芦苇", "2 分", "收获阶段可将 1 芦苇 → 3 食物"],
  ],
  harvest: [
    ["🌾 步骤一：农田收割", "每块已播种农田自动收割 1 份作物（谷物或蔬菜）进入库存。收割后农田变空可再次播种。不消耗工人。"],
    ["🍞 步骤二：喂养家人与取暖", "每位成年家人消耗 2 食物（本轮新生儿只需 1 食物）。食物不足自动用库存谷物/蔬菜 1:1 折抵。若仍不足，每缺 1 点被迫拿 1 张乞讨卡（终局每张 -3 分）！若开启沼泽农夫扩展，每人还需 1 燃料，每头牛需 1 干草。"],
    ["🐣 步骤三：牲畜繁殖", "同种动物持有 ≥2 只（至少 2 只绵羊、2 只野猪或 2 只黄牛）时，自动繁殖 1 只该种幼崽！前提是农场有空余牧场容量能容纳它。"],
  ],
  roles: [
    ["👨‍👩‍👧 家人（工人）", "每名家人每轮 = <b>1 次工人行动机会</b>。收获阶段每人需 <b>2 食物</b>；食物不够 → 每缺 1 点被迫拿 <b>1 张乞讨卡</b>（终局 -3 分）。每名家人终局自带 <b>+3 分</b>。"],
    ["👶 添丁", "消耗 <b>2 食物</b> + 需要 <b>1 间空房间</b>，家庭成员 +1（上限 5 人）。<b>新生儿当轮不能工作</b>，当轮收获只需吃 1 食物；下一轮起成为正式工人。"],
    ["🐑 牲畜", "三大作用：① <b>终局计分</b>（绵羊 8只/野猪 7只/黄牛 6只 = 满分 4 分，无对应牲畜扣 1 分）；② <b>成对繁殖</b>（收获阶段同类 ≥2 只自动繁殖 1 只幼崽，需有空余容量）；③ <b>烹饪换粮</b>（建造壁炉/烹饪灶随时将牲畜宰杀换为大量食物）。"],
    ["🐣 牧场容量规则", "每格牧场能容纳 2 只牲畜；一个封闭牧场只能饲养同一种牲畜。容量不足则多出的幼崽逃跑。围好栅栏不会凭空出现动物，需要去动物市场牵取或等待成对繁殖。"],
  ],
  /** 回合卡时间表 */
  schedule: [
    ["第 1 轮", "建栅栏（揭示后永久可用）"],
    ["第 3 轮", "大改进（抢建壁炉、烤炉、水井等，永久可用）"],
    ["第 4 轮", "★ 羊市、采石场、蔬菜地开放 · 轮末结算第 1 次【收获阶段】"],
    ["第 5 轮", "翻修（升级木屋为陶屋/石屋，永久可用）"],
    ["第 6 轮", "添丁（有空房时扩充人口，永久可用）"],
    ["第 7 轮", "轮末结算第 2 次【收获阶段】"],
    ["第 8 轮", "★ 猪市开放"],
    ["第 9 轮", "轮末结算第 3 次【收获阶段】"],
    ["第 11 轮", "轮末结算第 4 次【收获阶段】"],
    ["第 12 轮", "★ 牛市开放"],
    ["第 13 轮", "轮末结算第 5 次【收获阶段】"],
    ["第 14 轮", "最后一轮 · 轮末结算第 6 次【收获阶段】· 随后游戏终局计分"],
  ],
  always: [
    ["🪵 木材 / 🧱 陶土 / 🎋 芦苇", "每轮累积 +1，取走格内全部资源"],
    ["🌾 谷物", "每轮累积 +1 谷物（未开垦农田前也能拿取备用）"],
    ["🐟 钓鱼", "每轮累积 +1 食物，取走格内全部"],
    ["🛠 日工", "固定获得 2 食物（无资源成本，但占用 1 名工人）"],
    ["🌱 犁地", "在农场开垦 1 块新农田（须与现有农田相邻）"],
    ["🌾 播种 / 烤面包", "在空农田上播种谷物/蔬菜；或使用烤炉烘烤谷物换取海量食物"],
    ["🏠 建房间", "每间 5 木材/陶土/石材 + 2 芦苇，须邻接现有房间"],
    ["🚜 起始玩家", "成为下轮起始玩家，并立即拿走 1 食物"],
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

      <h4 class="rules-h">🌾 收获阶段详解（第 4/7/9/11/13/14 轮末自动结算）</h4>
      ${RULES_DATA.harvest.map(([k, v]) => `<div class="rules-note"><b>${k}</b><br>${v}</div>`).join("")}

      <h4 class="rules-h">🪵 永久资源格（第 1 轮起可用）</h4>
      ${tbl(RULES_DATA.resources.map(([k, v]) => [k, v]), 2)}

      <h4 class="rules-h">🌱 常规行动（第 1 轮起永久可用）</h4>
      ${tbl(RULES_DATA.always.map(([k, v]) => [k, v]), 2)}

      <h4 class="rules-h">🎴 回合卡时间表</h4>
      ${tbl(RULES_DATA.schedule.map(([k, v]) => [k, v]), 2)}
      <p class="muted" style="font-size:12px;margin:6px 0 0">
        收获阶段在第 4 / 7 / 9 / 11 / 13 / 14 轮后自动进行（先田产收割 → 再喂养取暖 → 最后牲畜繁殖）。
      </p>

      <h4 class="rules-h">🐑 动物市场（累积格 · 免费）</h4>
      ${tbl(RULES_DATA.animals.map(([k, v, n]) => [k, v, n]), 3)}
      <p class="muted" style="font-size:12px;margin:6px 0 0">
        取用动物格时拿走该格<b>全部</b>动物；养不下的会跑回供应区。需先围出封闭牧场才能容纳。
      </p>

      <h4 class="rules-h">🏗 建筑与改造</h4>
      ${tbl(RULES_DATA.buildings.map(([k, v, n]) => [k, v, n]), 3)}

      <h4 class="rules-h">🔧 重大改进（10 个固定）</h4>
      ${tbl(RULES_DATA.majors.map(([k, c, vp, e]) => [k, c, vp, e]), 4)}

      <h4 class="rules-h">👨‍👩‍👧 人丁与牲畜的作用</h4>
      ${RULES_DATA.roles.map(([k, v]) => `<div class="rules-note"><b>${k}</b><br>${v}</div>`).join("")}

      <p class="muted" style="font-size:12px;margin-top:12px">
        依据《农家乐》2016 正统规则整理。计分阈值见结算页或排行榜。
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

let _lastAppliedRound = null;
let _lastAppliedSeason = null;

function applySeasonTheme(round) {
  const g = _state && _state.game;
  const isTts = !!(g && g.dlc?.seasons);
  const season = seasonOfRound(round);
  document.body.dataset.season = season;

  let wheel = document.querySelector(".season-wheel");
  if (_lastAppliedRound === round && _lastAppliedSeason === season && wheel) {
    return;
  }
  _lastAppliedRound = round;
  _lastAppliedSeason = season;

  const cx = 300, cy = 300;
  const rO = 264, rI = 172;   // 外/内半径 → 扇环
  const step = 360 / 14;       // 每轮 25.71°
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
  const HARVEST_ROUNDS = [4, 7, 9, 11, 13, 14];

  let slices = "";
  let harvestBadges = "";

  // 14 个轮次扇区（节气轮转 DLC：每轮按轮转季节着色）
  for (let r = 1; r <= 14; r++) {
    const s = isTts
      ? SEASONS.find((x) => x.key === ttsSeasonOf(g, r)) || SEASONS[0]
      : SEASONS.find((x) => r >= x.from && r <= x.to);
    // 节气轮转：在扇区内叠加季节小图标
    const seasonIconSvg = isTts
      ? (() => {
          const [ix2, iy2] = polarPt(cx, cy, rI + 22, (r - 1) * step + step / 2 - 90);
          return `<text x="${ix2}" y="${iy2}" text-anchor="middle" dominant-baseline="central" font-size="13" opacity="${r === round ? 1 : 0.5}">${s.icon}</text>`;
        })()
      : "";
    const a0 = (r - 1) * step - 90 + 0.6;
    const a1 = r * step - 90 - 0.6;
    const isNow = r === round;
    const isPast = r < round;
    const fill = s.color;
    const op = isNow ? 0.95 : isPast ? 0.38 : 0.18;
    slices += `<path d="${donutSlice(cx, cy, rO, rI, a0, a1)}"
                 fill="${fill}" fill-opacity="${op}"
                 stroke="${isNow ? '#d4af37' : '#e6d8b8'}" stroke-width="${isNow ? 2.5 : 1}"/>`;
    slices += seasonIconSvg;

    // 轮次罗马数字与阿拉伯数字结合
    const [tx, ty] = polarPt(cx, cy, (rO + rI) / 2, (r - 1) * step + step / 2 - 90);
    const romanNum = ROMAN[r - 1];
    slices += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central"
                 font-size="${isNow ? 19 : 15}" font-weight="900"
                 font-family="Cinzel, Georgia, serif"
                 fill="${isNow ? "#2b1c0c" : "#5d4b35"}"
                 fill-opacity="${isNow ? 0.98 : isPast ? 0.6 : 0.32}">${romanNum}</text>`;

    // 丰收轮高亮外圈金麦印记
    if (HARVEST_ROUNDS.includes(r)) {
      const [hx, hy] = polarPt(cx, cy, rO + 13, (r - 1) * step + step / 2 - 90);
      harvestBadges += `
        <circle cx="${hx}" cy="${hy}" r="9" fill="#f8e4a0" stroke="#b3841a" stroke-width="1.2" opacity="0.9"/>
        <text x="${hx}" y="${hy + 1}" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="900" fill="#6a4405">🌾</text>
      `;
    }
  }

  // 四季标签（在外圈外侧）；节气轮转 DLC 下季节随轮转循环，改用扇区图标，不画固定标签
  let seasonLabels = "";
  if (!isTts) {
    SEASONS.forEach((s) => {
      const mid = ((s.from - 1 + s.to - 1) / 2) * step + step / 2 - 90;
      const [lx, ly] = polarPt(cx, cy, rO + 30, mid);
      const isNow = s.key === season;
      seasonLabels += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central"
                         font-size="${isNow ? 20 : 16}" font-weight="800"
                         fill="${s.color}" fill-opacity="${isNow ? 0.95 : 0.45}">${s.label}季</text>`;
    });
  }

  // 浑天仪黄铜刻度细圈与刻度线
  let astrolabeTicks = "";
  for (let i = 0; i < 28; i++) {
    const tickDeg = i * (360 / 28) - 90;
    const isMajor = i % 2 === 0;
    const [t1x, t1y] = polarPt(cx, cy, rO, tickDeg);
    const [t2x, t2y] = polarPt(cx, cy, rO + (isMajor ? 6 : 3), tickDeg);
    astrolabeTicks += `<line x1="${t1x}" y1="${t1y}" x2="${t2x}" y2="${t2y}" stroke="#9c7b3c" stroke-width="${isMajor ? 1.5 : 0.8}" stroke-opacity="0.45"/>`;
  }

  // 当前轮日晕指针
  const nowAngle = (round - 1) * step + step / 2 - 90;
  const [px, py] = polarPt(cx, cy, rO + 8, nowAngle);
  const [ix, iy] = polarPt(cx, cy, rI - 8, nowAngle);
  const [tipX, tipY] = polarPt(cx, cy, rO + 16, nowAngle);
  const needle = `
    <line x1="${ix}" y1="${iy}" x2="${px}" y2="${py}"
          stroke="#932815" stroke-width="3" stroke-linecap="round" stroke-opacity="0.85"/>
    <polygon points="${tipX},${tipY} ${polarPt(cx, cy, rO + 6, nowAngle - 3).join(',')} ${polarPt(cx, cy, rO + 6, nowAngle + 3).join(',')}" fill="#932815"/>
  `;

  if (!wheel) {
    wheel = document.createElement("div");
    wheel.className = "season-wheel";
    document.body.appendChild(wheel);
  }
  wheel.dataset.round = String(round);
  wheel.title = `第 ${round} 轮 · ${SEASON_LABEL_ZH[season]}季 · 17世纪农事历法星盘`;
  wheel.innerHTML = `
    <svg viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <radialGradient id="astrolabeSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff8db" stop-opacity="0.75"/>
          <stop offset="60%" stop-color="#faecc0" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#e2c884" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- 双圈黄铜刻度环 -->
      <circle cx="${cx}" cy="${cy}" r="${rO + 4}" fill="none" stroke="#9c7b3c" stroke-width="1.2" stroke-opacity="0.5"/>
      <circle cx="${cx}" cy="${cy}" r="${rO + 20}" fill="none" stroke="#9c7b3c" stroke-width="0.8" stroke-dasharray="2 3" stroke-opacity="0.35"/>
      <circle cx="${cx}" cy="${cy}" r="${rI - 12}" fill="none" stroke="#9c7b3c" stroke-width="1.2" stroke-dasharray="3 4" stroke-opacity="0.45"/>
      <circle cx="${cx}" cy="${cy}" r="${rI - 20}" fill="url(#astrolabeSun)"/>
      ${astrolabeTicks}
      ${slices}
      ${harvestBadges}
      ${seasonLabels}
      ${needle}
      <!-- 中心浑天罗盘核心 -->
      <circle cx="${cx}" cy="${cy}" r="28" fill="#fdfaf1" stroke="#9c7b3c" stroke-width="2" opacity="0.95"/>
      <circle cx="${cx}" cy="${cy}" r="12" fill="#d4af37" stroke="#684a14" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="5" fill="#5c2612"/>
      <text x="${cx}" y="${cy - 52}" text-anchor="middle"
            font-size="28" font-weight="900" font-family="Cinzel, Georgia, serif" fill="#382613" fill-opacity="0.85">ROUND ${ROMAN[round - 1]}</text>
      <text x="${cx}" y="${cy - 34}" text-anchor="middle"
            font-size="12" font-weight="700" fill="#7a6240" fill-opacity="0.7">第 ${round} 轮 / 14</text>
      <text x="${cx}" y="${cy + 52}" text-anchor="middle"
            font-size="16" font-weight="800" fill="#634522" fill-opacity="0.75">${SEASON_LABEL_ZH[season]}季 · ${SEASON_ICON[season]}</text>
    </svg>
  `;
}

// ============================================================
// 新手引导
// ============================================================
const GUIDE_STEPS = [
  {
    title: "🚜 欢迎来到《农家乐》",
    body: "你是一个 17 世纪的农场主，要在 14 轮内把一片荒地发展成兴旺的农庄。顶部显示当前轮次、阶段、季节以及下一次收获阶段倒计时。<br><br>每轮核心循环：揭开新行动 → 资源自动累积 → 派遣家人做工 → 工人回家 → 关键轮次自动结算收获阶段。",
    selector: "#gameHeaderCard",
    tab: "home",
  },
  {
    title: "🪵 基础资源格",
    body: "木材🪵、陶土🧱、芦苇🎋、石材⛏ 是建房与造栅栏的建材。谷物🌾、蔬菜🥕 可播种或烹饪，食物🍞 是收获阶段喂饱家人的必需品。点击即可派遣工人取走格内累积的全部资源。",
    selector: "#alwaysGrid",
    tab: "common",
    subTab: "resources",
  },
  {
    title: "🐑 动物市场",
    body: "第 4 轮起开放羊市、第 8 轮起开放猪市、第 12 轮起开放牛市。每轮免费自动累积 1 只，取用时牵走全部。注意：必须在棋盘上先用栅栏围出封闭矩形牧场才能容纳动物（每格牧场容纳 2 只，单牧场仅能饲养同一种动物）。",
    selector: "#animalGrid",
    tab: "common",
    subTab: "resources",
  },
  {
    title: "🎯 常规与回合卡行动",
    body: "每轮揭示新的行动回合卡（翻开后整局永久可用，每轮每格限 1 人）。<br>· <b>起始玩家</b>：夺得下轮先手并立即 +1 食物<br>· <b>建房间/犁地/播种/建栅栏/添丁/翻修</b>：点击卡牌查看要求后在棋盘上操作<br>· <b>播种/烤面包</b>：点击后选择农田播种或选择烤面包数量",
    selector: "#roundGrid",
    tab: "common",
    subTab: "actions",
  },
  {
    title: "🌾 【重要】关键结算：收获阶段",
    body: "全剧在 <b>第 4、7、9、11、13、14 轮结束时</b> 自动触发收获阶段！由系统按序自动结算三件事：<br>① <b>农田收割</b>：每块已播种农田收 1 份作物（谷物或蔬菜）进库存；<br>② <b>喂饱家人与取暖</b>：每名成年家人吃 2 食物（本轮新生儿 1 食物），食物不足将被迫领取惩罚性的<b>乞讨卡（终局每张 -3 分）</b>！若开启沼泽农夫扩展，每人还需 1 燃料取暖，每头牛需 1 干草；<br>③ <b>牲畜繁殖</b>：同种动物持有 ≥2 只且牧场有空位时，自动繁殖 1 只幼崽。请务必提前备足口粮！",
    selector: "#gameHeaderCard",
    tab: "home",
  },
  {
    title: "👨‍🌾 你的家园与当前回合",
    body: "轮到行动的玩家：资源卡 + 农场卡都加亮绿色边框 + 顶部徽章提示「👉 该你行动」。<br>在个人面板可清晰查看你的工人剩余数、仓库物资储备与已就任的职业/小发展卡。",
    selector: ".col-card.is-current-turn",
    tab: "current_player",
  },
  {
    title: "🧰 工具箱与实时排行榜",
    body: "点击右下角 🧰 悬浮球，即可随时查看实时排行榜（得分细则）、流派玩法攻略、价格与规则速查表、完整游玩教程，或随时再次开启本引导。",
    selector: "#gameFab",
    tab: null,
  },
];

export function closeGuide() {
  _showGuide = false;
  cleanupGuideOverlay();
  const guideBtn = document.querySelector(".guide-btn");
  if (guideBtn) guideBtn.classList.remove("active");
  const fabGuide = document.querySelector('[data-fab="guide"]');
  if (fabGuide) fabGuide.classList.remove("on");
  document.body.style.paddingBottom = "";
}

function cleanupGuideOverlay() {
  document.querySelectorAll(".guide-overlay").forEach((el) => {
    if (el._cleanup) el._cleanup();
    el.remove();
  });
}

function toggleGuide() {
  if (_showGuide) {
    closeGuide();
    toast("已关闭新手引导");
  } else {
    _showGuide = true;
    _guideStep = 0;
    renderGuide();
  }
  if (window.__debug) window.__debug = window.__debug;
}

function renderGuide() {
  cleanupGuideOverlay();

  const guideBtn = document.querySelector(".guide-btn");
  if (guideBtn) guideBtn.classList.toggle("active", _showGuide);
  const fabGuide = document.querySelector('[data-fab="guide"]');
  if (fabGuide) fabGuide.classList.toggle("on", _showGuide);
  if (!_showGuide || !_state || _state.phase !== "playing") return;

  const step = GUIDE_STEPS[_guideStep] || GUIDE_STEPS[0];
  const isLast = _guideStep === GUIDE_STEPS.length - 1;

  // 1. 移动端 tab / 内部 subTab 响应式联动切换
  if (step.tab === "common") {
    if (isNarrowLayout()) switchMobileTab("common");
    if (step.subTab) switchActionSubTab(step.subTab);
  } else if (step.subTab) {
    switchActionSubTab(step.subTab);
  } else if (step.tab === "current_player") {
    if (isNarrowLayout() && _state.game) {
      const g = _state.game;
      const turnPid = g.waitingFor && g.waitingFor[0];
      const curIdx = g.players.findIndex((p) => p.id === turnPid);
      switchMobileTab(`p${curIdx >= 0 ? curIdx : 0}`);
    }
  }

  // 2. 创建 overlay DOM
  const overlay = document.createElement("div");
  overlay.className = "guide-overlay active";
  overlay.id = "guideOverlay";
  overlay.innerHTML = `
    <div class="guide-spotlight" id="guideSpot" style="display:none"></div>
    <div class="guide-card" id="guideCard" role="dialog" aria-modal="true">
      <div class="guide-card-header">
        <div class="guide-card-title-group">
          <span class="guide-card-icon">💡</span>
          <h4 class="guide-card-title">${step.title}</h4>
        </div>
        <div class="guide-card-actions">
          <span class="guide-step-badge">${_guideStep + 1} / ${GUIDE_STEPS.length}</span>
          <button class="guide-close-btn" id="gClose" title="退出引导" aria-label="退出引导">✕</button>
        </div>
      </div>
      <div class="guide-card-body">
        <p>${step.body}</p>
      </div>
      <div class="guide-card-footer">
        <button class="btn ghost small" id="gSkip" type="button">退出引导</button>
        <div class="guide-nav-btns">
          ${_guideStep > 0 ? '<button class="btn ghost small" id="gPrev" type="button">← 上一步</button>' : ""}
          <button class="btn small" id="gNext" type="button">${isLast ? "完成 ✅" : "下一步 →"}</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const card = overlay.querySelector("#guideCard");
  const spot = overlay.querySelector("#guideSpot");

  // 3. 事件绑定
  const exitGuide = () => {
    closeGuide();
    toast("已退出新手引导");
  };

  overlay.onclick = (e) => {
    // 点击卡片外且非高亮框区域退出
    if (!card.contains(e.target) && (!spot || !spot.contains(e.target))) {
      exitGuide();
    }
  };

  overlay.querySelector("#gClose").onclick = (e) => {
    e.stopPropagation();
    exitGuide();
  };

  overlay.querySelector("#gSkip").onclick = (e) => {
    e.stopPropagation();
    exitGuide();
  };

  overlay.querySelector("#gNext").onclick = (e) => {
    e.stopPropagation();
    if (isLast) {
      closeGuide();
      toast("新手引导完成！祝你游玩愉快 🌾");
    } else {
      _guideStep++;
      renderGuide();
    }
  };

  const prevBtn = overlay.querySelector("#gPrev");
  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      _guideStep--;
      renderGuide();
    };
  }

  // 4. 定位与高亮计算
  const updateLayout = () => {
    if (!document.body.contains(overlay)) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = isNarrowLayout() || vw < 640;
    const pad = 6;
    const M = 12;

    const target = step.selector ? document.querySelector(step.selector) : null;

    if (narrow) {
      // 窄屏：卡片通过 CSS 已经固定在底部，设置底部 padding 确保页面可滚到底
      const cardH = card.offsetHeight || 200;
      document.body.style.paddingBottom = (cardH + 24) + "px";

      if (target) {
        const r = target.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const l = Math.max(4, r.left - pad);
          const t = Math.max(4, r.top - pad);
          const w = Math.min(vw - l - 4, r.width + pad * 2);
          const maxH = Math.max(20, vh - (cardH + 16) - t);
          const h = Math.min(maxH, r.height + pad * 2);
          spot.style.display = "block";
          spot.style.left = l + "px";
          spot.style.top = t + "px";
          spot.style.width = w + "px";
          spot.style.height = h + "px";
        } else {
          spot.style.display = "none";
        }
      } else {
        spot.style.display = "none";
      }
    } else {
      // 桌面端：卡片优先跟在目标附近
      document.body.style.paddingBottom = "";
      if (target) {
        const r = target.getBoundingClientRect();
        spot.style.display = "block";
        spot.style.left = (r.left - pad) + "px";
        spot.style.top = (r.top - pad) + "px";
        spot.style.width = (r.width + pad * 2) + "px";
        spot.style.height = (r.height + pad * 2) + "px";

        const cw = card.offsetWidth || 380;
        const ch = card.offsetHeight || 200;
        let top = r.bottom + 14;
        if (top + ch > vh - M) top = r.top - ch - 14;
        top = Math.max(M, Math.min(top, vh - ch - M));
        let left = Math.min(Math.max(M, r.left), Math.max(M, vw - cw - M));
        card.style.left = left + "px";
        card.style.top = top + "px";
        card.style.bottom = "auto";
        card.style.right = "auto";
        card.style.transform = "none";
      } else {
        spot.style.display = "none";
        card.style.left = "50%";
        card.style.top = "50%";
        card.style.transform = "translate(-50%, -50%)";
        card.style.bottom = "auto";
        card.style.right = "auto";
      }
    }
  };

  // 5. 自动滚动居中（窄屏）
  const scrollToTarget = () => {
    const target = step.selector ? document.querySelector(step.selector) : null;
    if (!target || !isNarrowLayout()) return;
    const topBarH = document.getElementById("mobileTabs")?.offsetHeight || 46;
    const cardH = card.offsetHeight || 200;
    const vh = window.innerHeight;
    const availTop = topBarH + 8;
    const availBottom = Math.max(availTop + 80, vh - cardH - 12);
    const availCenter = (availTop + availBottom) / 2;

    const r = target.getBoundingClientRect();
    const curCenter = r.top + r.height / 2;
    const delta = curCenter - availCenter;
    if (Math.abs(delta) > 12) {
      window.scrollBy({ top: delta, behavior: "smooth" });
    }
  };

  // 延迟一帧等待 Tab 切换重绘完成
  requestAnimationFrame(() => {
    updateLayout();
    scrollToTarget();
    setTimeout(updateLayout, 80);
  });

  // 6. 滚动与尺寸变化监听
  let scrollTicking = false;
  const onScroll = () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateLayout();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  };
  const onResize = () => {
    updateLayout();
    scrollToTarget();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  overlay._cleanup = () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.body.style.paddingBottom = "";
  };
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
  initAmbientCanvas();
  triggerHarvestConfetti(65);
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
