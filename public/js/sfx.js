// ============================================================
// 点击音效（WebAudio 实时合成，无需加载音频文件）
//   - 首次用户交互时才创建 AudioContext（浏览器策略要求）
//   - 可通过 FAB 菜单开关，状态存 localStorage
// ============================================================

const KEY = "agri:sfx";
let _ctx = null;
let _enabled = readEnabled();

function readEnabled() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function isSfxOn() { return _enabled; }
export function setSfx(on) {
  _enabled = !!on;
  try { localStorage.setItem(KEY, _enabled ? "on" : "off"); } catch {}
  if (_enabled) click();   // 开启时给一声反馈
}
export function toggleSfx() { setSfx(!_enabled); return _enabled; }

function ctx() {
  if (!_enabled) return null;
  try {
    if (!_ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
    return _ctx;
  } catch { return null; }
}

/** 单个音符：freq 频率、dur 时长(秒)、type 波形、gain 音量 */
function tone(freq, dur = 0.06, type = "triangle", gain = 0.05, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  // 快速衰减包络，避免爆音
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** 普通点击：短促「嗒」 */
export function click() { tone(880, 0.045, "triangle", 0.045); }
/** 切换/选中：略高 */
export function select() { tone(1180, 0.05, "triangle", 0.05); tone(1560, 0.05, "sine", 0.03, 0.03); }
/** 取消/退回：下行 */
export function back() { tone(620, 0.06, "triangle", 0.04); tone(460, 0.06, "sine", 0.03, 0.04); }
/** 成功：两音上行 */
export function ok() { tone(880, 0.07, "triangle", 0.05); tone(1320, 0.09, "sine", 0.04, 0.06); }
/** 失败/警告：低音 */
export function err() { tone(240, 0.14, "sawtooth", 0.035); }
/** 回合开始：三音 */
export function turn() { tone(660, 0.07, "sine", 0.045); tone(880, 0.07, "sine", 0.045, 0.07); tone(1100, 0.1, "sine", 0.04, 0.14); }
/** 收成：轻快琶音 */
export function harvest() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "sine", 0.04, i * 0.07)); }

/**
 * 全局委托绑定：点这些元素自动发声
 *   .btn / .space / .m-tab / .fab-main / .fab-item / .player-tab / .cell / .stk / .act-modal-x
 */
export function bindSfx(root = document) {
  if (root.__sfxBound) return;
  root.__sfxBound = true;
  root.addEventListener("click", (e) => {
    if (!_enabled) return;
    const el = e.target.closest(
      ".btn, .space, .m-tab, .fab-main, .fab-item, .player-tab, .cell, .stk, .act-modal-x, .seg"
    );
    if (!el) return;
    if (el.classList.contains("disabled")) { err(); return; }
    if (el.classList.contains("fab-main") || el.classList.contains("m-tab") ||
        el.classList.contains("player-tab") || el.classList.contains("fab-item")) select();
    else click();
  }, { passive: true });
}

/** 给关键事件发声（由 game.js 调用） */
export const sfx = { click, select, back, ok, err, turn, harvest };
