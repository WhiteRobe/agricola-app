// ============================================================
// 农家乐实体桌游物理拟真音效系统 (Procedural Physical Audio Engine)
// 100% WebAudio 实时物理合成，零外部音频文件依赖，零网络请求
// 支持：木块敲击、石陶清脆撞击、麦浪沙沙、木雕动物轻颠、田园大三和弦
// ============================================================

const KEY = "agri:sfx";
let _ctx = null;
let _enabled = readEnabled();
let _noiseBuf = null;

function readEnabled() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function isSfxOn() { return _enabled; }
export function setSfx(on) {
  _enabled = !!on;
  try { localStorage.setItem(KEY, _enabled ? "on" : "off"); } catch {}
  if (_enabled) woodThud(); // 开启时给一声厚重原木敲击反馈
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

/** 获取/生成 1 秒白噪声循环缓冲区（零内存浪费，单例复用） */
function getNoiseBuffer(c) {
  if (_noiseBuf) return _noiseBuf;
  const sampleRate = c.sampleRate;
  const buf = c.createBuffer(1, sampleRate, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < sampleRate; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  _noiseBuf = buf;
  return _noiseBuf;
}

/**
 * 实体德式木块敲击声 (Wood Block Thud / Clack)
 * 物理原理：带通滤波白噪声 (320-450Hz) + 低频正弦谐波下坠 (120Hz->60Hz) + 极速指数衰减
 * 适合场景：工人米普落子、建房、建栅栏、造马厩、主按钮点击
 */
export function woodThud(intensity = 1.0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const gainScale = Math.min(1.5, Math.max(0.3, intensity));

  // 1. 白噪声打击瞬间（带通滤波 380Hz，Q=4）
  const noiseSource = c.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(390, t0);
  filter.Q.setValueAtTime(4.2, t0);

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.09 * gainScale, t0 + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.048);

  noiseSource.connect(filter).connect(noiseGain).connect(c.destination);
  noiseSource.start(t0);
  noiseSource.stop(t0 + 0.05);

  // 2. 原木实心共鸣（低频快速下落正弦波）
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(58, t0 + 0.045);

  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.0001, t0);
  oscGain.gain.exponentialRampToValueAtTime(0.07 * gainScale, t0 + 0.005);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.052);

  osc.connect(oscGain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.055);
}

/**
 * 石块与烧结红陶清脆撞击声 (Stone / Clay Clink)
 * 物理原理：高 Q 值带通共振峰 (2600Hz, Q=14) + 金属/矿物泛音
 * 适合场景：采石、拿陶土、翻修石屋、建造大发展设施
 */
export function stoneClink(intensity = 1.0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const gainScale = Math.min(1.5, Math.max(0.3, intensity));

  // 高频矿石共振
  const noiseSource = c.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2600, t0);
  filter.Q.setValueAtTime(12, t0);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.065 * gainScale, t0 + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);

  noiseSource.connect(filter).connect(gain).connect(c.destination);
  noiseSource.start(t0);
  noiseSource.stop(t0 + 0.04);

  // 辅助高泛音正弦
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(2150, t0);
  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.0001, t0);
  oscGain.gain.exponentialRampToValueAtTime(0.03 * gainScale, t0 + 0.004);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
  osc.connect(oscGain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.05);
}

/**
 * 农田麦浪沙沙与破土声 (Crop Rustle & Harvest)
 * 物理原理：高通扫频噪声 (1600Hz -> 750Hz)
 * 适合场景：犁地、撒谷种、播种蔬菜、收获田间作物
 */
export function cropRustle() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  const noise = c.createBufferSource();
  noise.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1600, t0);
  filter.frequency.exponentialRampToValueAtTime(700, t0 + 0.12);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.045, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start(t0);
  noise.stop(t0 + 0.13);
}

/**
 * 木雕小动物轻颠滑音 (Animeeple Hop & Wobble)
 * 物理原理：柔和调频正弦波 (420Hz 升至 660Hz)
 * 适合场景：选动物市场、动物繁殖出幼崽、点击牧场小羊小猪小牛
 */
export function animalHop() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, t0);
  osc.frequency.exponentialRampToValueAtTime(680, t0 + 0.05);
  osc.frequency.exponentialRampToValueAtTime(540, t0 + 0.09);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);

  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

/**
 * 经典基准音调（用于保留 API 兼容性）
 */
function tone(freq, dur = 0.06, type = "triangle", gain = 0.05, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** 普通轻触点击：质朴清脆短木音 */
export function click() { woodThud(0.75); }

/** 切换/选中：双段木质清响 */
export function select() {
  woodThud(0.85);
  tone(1320, 0.04, "sine", 0.025, 0.025);
}

/** 取消/退回：沉闷木音 */
export function back() {
  tone(380, 0.055, "triangle", 0.035);
  tone(280, 0.065, "sine", 0.03, 0.03);
}

/** 成功确认：原木双和弦 */
export function ok() {
  woodThud(0.9);
  tone(1046, 0.08, "triangle", 0.035, 0.02);
}

/** 失败/警告：温和低音提示 */
export function err() {
  tone(220, 0.12, "sawtooth", 0.03);
}

/** 新回合推进：明朗田园小三度 */
export function turn() {
  [587.33, 739.99, 880.00].forEach((f, i) => {
    tone(f, 0.08, "sine", 0.038, i * 0.065);
  });
}

/**
 * 收获阶段：欧洲古典田园大三和弦慢琶音 (Pastoral Fanfare)
 * C4 (261.63) -> E4 (329.63) -> G4 (392.00) -> C5 (523.25)
 */
export function harvest() {
  const notes = [261.63, 329.63, 392.00, 523.25];
  notes.forEach((f, i) => {
    tone(f, 0.15, "triangle", 0.04, i * 0.075);
    tone(f * 2, 0.12, "sine", 0.015, i * 0.075 + 0.01);
  });
}

/**
 * 全局委托绑定：点击各类卡片和棋盘元素自动触发物理音效
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

    // 根据点击的目标材质赋予不同物理质感
    if (el.classList.contains("cell-room") || el.dataset.action === "BuildRoom") {
      woodThud(1.1);
    } else if (el.classList.contains("cell-field") || el.dataset.action === "PlowField" || el.dataset.action === "Sow") {
      cropRustle();
    } else if (el.classList.contains("cell-pasture") || el.closest(".pasture-animal-wrap")) {
      animalHop();
    } else if (el.classList.contains("seg") || el.closest(".fence-layer")) {
      woodThud(0.9);
    } else if (el.classList.contains("fab-main") || el.classList.contains("m-tab") ||
        el.classList.contains("player-tab") || el.classList.contains("fab-item")) {
      select();
    } else {
      woodThud(0.7);
    }
  }, { passive: true });
}

export const sfx = {
  click, select, back, ok, err, turn, harvest,
  woodThud, stoneClink, cropRustle, animalHop,
};
