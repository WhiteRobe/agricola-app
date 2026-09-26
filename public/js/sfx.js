// ============================================================
// 农家乐实体桌游物理拟真音效系统 (Procedural Physical Audio Engine v2)
// 100% WebAudio 实时物理声学建模，零外部音频文件依赖，零网络请求
// 核心声学特性：
//   1. 原木庄园空间脉冲响应混响室 (Algorithmic Timber Convolver)
//   2. 微随机频率与力度抖动抗听觉疲劳系统 (Micro-Pitch & Velocity Jitter)
//   3. 绵羊、野猪、黄牛专属木偶声学图腾 (Animeeple Signatures)
//   4. 柴窑燃烧微爆裂火星 (Fire Crackle) 与深耕泥土阻尼声 (Soil Drag)
// ============================================================

const KEY = "agri:sfx";
let _ctx = null;
let _enabled = readEnabled();
let _noiseBuf = null;
let _reverbNode = null;
let _dryGain = null;
let _wetGain = null;

function readEnabled() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function isSfxOn() { return _enabled; }
export function setSfx(on) {
  _enabled = !!on;
  try { localStorage.setItem(KEY, _enabled ? "on" : "off"); } catch {}
  if (_enabled) woodThud(); // 开启时给予一声厚重原木敲击反馈
}
export function toggleSfx() { setSfx(!_enabled); return _enabled; }

/** 微随机抖动辅助函数（避免机械重复感） */
function jitter(base, ratio = 0.04) {
  return base * (1 + (Math.random() * 2 - 1) * ratio);
}

/** 获取并初始化 AudioContext 及原木混响母带总线 */
function ctx() {
  if (!_enabled) return null;
  try {
    if (!_ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
      setupMasterBus(_ctx);
    }
    if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
    return _ctx;
  } catch { return null; }
}

/**
 * 纯算法生成 0.35 秒“17 世纪欧陆原木农庄”混响脉冲响应（零外部音频文件）
 * 模拟原木横梁与木质地板的温暖高频阻尼空气漫反射
 */
function createWoodRoomImpulse(c) {
  const rate = c.sampleRate;
  const length = Math.floor(rate * 0.35);
  const impulse = c.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  const decayRate = 7.5;

  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const env = Math.exp(-t * decayRate);
    // 高频自然阻尼衰减
    const damp = Math.exp(-t * 12.0);
    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;
    left[i] = noiseL * (0.65 + 0.35 * damp);
    right[i] = noiseR * (0.65 + 0.35 * damp);
  }
  return impulse;
}

/** 搭建总线路由：干声支路 + 15% 原木混响湿声支路 + 软阈值防爆音压缩器 */
function setupMasterBus(c) {
  try {
    const masterCompressor = c.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-4, c.currentTime);
    masterCompressor.knee.setValueAtTime(8, c.currentTime);
    masterCompressor.ratio.setValueAtTime(4, c.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, c.currentTime);
    masterCompressor.release.setValueAtTime(0.08, c.currentTime);
    masterCompressor.connect(c.destination);

    _dryGain = c.createGain();
    _dryGain.gain.setValueAtTime(0.85, c.currentTime);
    _dryGain.connect(masterCompressor);

    _reverbNode = c.createConvolver();
    _reverbNode.buffer = createWoodRoomImpulse(c);

    _wetGain = c.createGain();
    _wetGain.gain.setValueAtTime(0.18, c.currentTime); // 18% 空间温润残响
    _reverbNode.connect(_wetGain).connect(masterCompressor);
  } catch (e) {
    console.warn("setupMasterBus fallback:", e);
  }
}

/** 输出连接到主路由系统（带微混响） */
function connectOutput(node) {
  if (_dryGain && _reverbNode) {
    node.connect(_dryGain);
    node.connect(_reverbNode);
  } else {
    node.connect(_ctx.destination);
  }
}

/** 获取/生成 1 秒白噪声循环缓冲区（单例复用，极速高效） */
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
 * 物理原理：带通滤波白噪声 (340-420Hz) + 低频实木共鸣下坠 + 微随机扰动
 */
export function woodThud(intensity = 1.0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const gainScale = Math.min(1.5, Math.max(0.3, intensity)) * jitter(1.0, 0.06);

  // 1. 白噪声敲击瞬态（带微随机中心频率）
  const noiseSource = c.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(jitter(395, 0.05), t0);
  filter.Q.setValueAtTime(jitter(4.4, 0.08), t0);

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.095 * gainScale, t0 + 0.0035);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.046);

  noiseSource.connect(filter).connect(noiseGain);
  connectOutput(noiseGain);
  noiseSource.start(t0);
  noiseSource.stop(t0 + 0.05);

  // 2. 原木实心共鸣（低频快速下落正弦波，带基频随机）
  const osc = c.createOscillator();
  osc.type = "sine";
  const startF = jitter(145, 0.04);
  const endF = jitter(58, 0.04);
  osc.frequency.setValueAtTime(startF, t0);
  osc.frequency.exponentialRampToValueAtTime(endF, t0 + 0.045);

  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.0001, t0);
  oscGain.gain.exponentialRampToValueAtTime(0.075 * gainScale, t0 + 0.0045);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.054);

  osc.connect(oscGain);
  connectOutput(oscGain);
  osc.start(t0);
  osc.stop(t0 + 0.056);
}

/**
 * 石块与烧结红陶清脆撞击声 (Stone / Clay Clink)
 * 物理原理：高 Q 值矿物共振峰 (2600Hz, Q=14) + 双晶体泛音 + 空间残响
 */
export function stoneClink(intensity = 1.0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const gainScale = Math.min(1.5, Math.max(0.3, intensity)) * jitter(1.0, 0.06);

  const noiseSource = c.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(jitter(2650, 0.04), t0);
  filter.Q.setValueAtTime(jitter(13, 0.08), t0);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.068 * gainScale, t0 + 0.0025);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);

  noiseSource.connect(filter).connect(gain);
  connectOutput(gain);
  noiseSource.start(t0);
  noiseSource.stop(t0 + 0.042);

  // 辅助高泛音正弦
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(jitter(2180, 0.03), t0);
  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.0001, t0);
  oscGain.gain.exponentialRampToValueAtTime(0.032 * gainScale, t0 + 0.0035);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.048);
  osc.connect(oscGain);
  connectOutput(oscGain);
  osc.start(t0);
  osc.stop(t0 + 0.05);
}

/**
 * 农田麦浪沙沙与作物收获声 (Crop Rustle & Harvest)
 * 物理原理：高通扫频噪声 (1650Hz -> 720Hz)
 */
export function cropRustle() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  const noise = c.createBufferSource();
  noise.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(jitter(1650, 0.05), t0);
  filter.frequency.exponentialRampToValueAtTime(jitter(720, 0.05), t0 + 0.12);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.048, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);

  noise.connect(filter).connect(gain);
  connectOutput(gain);
  noise.start(t0);
  noise.stop(t0 + 0.14);
}

/**
 * 翻耕犁地生铁破土阻尼声 (Soil Plow Drag)
 * 物理原理：低通扫频粉红噪声阻尼，切开湿润泥垄
 */
export function soilDrag() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  const noise = c.createBufferSource();
  noise.buffer = getNoiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(450, t0);
  filter.frequency.exponentialRampToValueAtTime(180, t0 + 0.18);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.055, t0 + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.19);

  noise.connect(filter).connect(gain);
  connectOutput(gain);
  noise.start(t0);
  noise.stop(t0 + 0.2);
}

/**
 * 柴窑/壁炉木柴燃烧微爆裂火星 (Fire Crackle)
 * 物理原理：短促随机微脉冲噪声，模拟泥炭与松木燃烧时的轻微噼啪
 */
export function fireCrackle() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  for (let i = 0; i < 3; i++) {
    const delay = i * 0.025 + Math.random() * 0.015;
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(jitter(1200 + i * 400, 0.15), t0 + delay);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0 + delay);
    g.gain.exponentialRampToValueAtTime(0.025, t0 + delay + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.015);
    osc.connect(g);
    connectOutput(g);
    osc.start(t0 + delay);
    osc.stop(t0 + delay + 0.02);
  }
}

/**
 * 绵羊木雕声学图腾 (Animeeple Sheep)
 * 双峰正弦滑音，模拟温顺小羊木偶的灵动颠动
 */
export function sheepBleat() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(460, t0);
  osc.frequency.exponentialRampToValueAtTime(620, t0 + 0.04);
  osc.frequency.exponentialRampToValueAtTime(510, t0 + 0.09);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.052, t0 + 0.007);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);

  osc.connect(gain);
  connectOutput(gain);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

/**
 * 野猪木雕声学图腾 (Animeeple Boar)
 * 165Hz 低沉带通锯齿波，厚实结实的原木钝响
 */
export function boarGrunt() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(175, t0);
  osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.08);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, t0);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.065, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);

  osc.connect(filter).connect(gain);
  connectOutput(gain);
  osc.start(t0);
  osc.stop(t0 + 0.09);
}

/**
 * 黄牛木雕声学图腾 (Animeeple Cattle)
 * 双谐波低频共鸣长衰减音，带微弱铜铃回响
 */
export function cattleMoo() {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;

  [196, 392].forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((0.045 / (i + 1)), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(g);
    connectOutput(g);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  });
}

/** 统一动物轻颠分发器（根据动物种类路由） */
export function animalHop(animalType = "sheep") {
  if (animalType === "boar") boarGrunt();
  else if (animalType === "cattle") cattleMoo();
  else sheepBleat();
}

/** 经典音调辅助器（带混响总线） */
function tone(freq, dur = 0.06, type = "triangle", gain = 0.05, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(jitter(freq, 0.015), t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  connectOutput(g);
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
    tone(f, 0.16, "triangle", 0.045, i * 0.075);
    tone(f * 2, 0.13, "sine", 0.016, i * 0.075 + 0.01);
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
      woodThud(1.15);
    } else if (el.classList.contains("cell-field") || el.dataset.action === "PlowField") {
      soilDrag();
    } else if (el.dataset.action === "Sow") {
      cropRustle();
    } else if (el.classList.contains("cell-pasture") || el.closest(".pasture-animal-wrap")) {
      const animalEl = el.querySelector(".agri-animeeple") || el.closest(".pasture-animal-wrap")?.querySelector(".agri-animeeple");
      const aType = animalEl?.classList.contains("meeple-boar") ? "boar"
        : animalEl?.classList.contains("meeple-cattle") ? "cattle" : "sheep";
      animalHop(aType);
    } else if (el.classList.contains("seg") || el.closest(".fence-layer")) {
      woodThud(0.95);
    } else if (el.dataset.i && /fireplace|hearth|oven/i.test(el.dataset.i)) {
      fireCrackle();
    } else if (el.classList.contains("fab-main") || el.classList.contains("m-tab") ||
        el.classList.contains("player-tab") || el.classList.contains("fab-item")) {
      select();
    } else {
      woodThud(0.75);
    }
  }, { passive: true });
}

export const sfx = {
  click, select, back, ok, err, turn, harvest,
  woodThud, stoneClink, cropRustle, soilDrag, fireCrackle,
  animalHop, sheepBleat, boarGrunt, cattleMoo,
};
