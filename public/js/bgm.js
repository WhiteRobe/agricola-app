// ============================================================
// 农家乐纯算法田园音乐引擎 (Procedural Pastoral BGM Engine)
// 100% 实时 WebAudio 乐器物理建模合成，零外部音频文件，零网络请求
// 乐器矩阵：
//   1. 古典鲁特琴拨弦 (Lute / Acoustic Pluck)
//   2. 欧洲田园木笛 (Pastoral Wooden Recorder with Breath & Vibrato)
//   3. 原声大提琴拨奏低音 (Pizzicato Acoustic Bass)
//   4. 冰晶风铃与八音盒 (Winter Bell & Glockenspiel)
// 动态四季：
//   春（96 BPM 生机轻盈）· 夏（104 BPM 温暖麦浪）· 秋（88 BPM 沉静收获）· 冬（76 BPM 飘雪静谧）
// ============================================================

const BGM_STORAGE_KEY = "agri:bgm";
let _audioCtx = null;
let _bgmEnabled = readBgmEnabled();
let _currentSeason = "spring";
let _masterGain = null;
let _noiseBuffer = null;
let _schedulerTimer = null;

// 调度器状态 (Look-ahead Scheduler)
let _isPlaying = false;
let _currentStep = 0;       // 16 分音符步进 (0..63，共 4 小节循环)
let _nextStepTime = 0;      // 下一步的绝对硬件时钟 (ctx.currentTime)

// 乐曲调速 (BPM)
const SEASON_CONFIG = {
  spring: { bpm: 96,  fluteGain: 0.28, luteGain: 0.24, bassGain: 0.32, bellGain: 0.08 },
  summer: { bpm: 104, fluteGain: 0.30, luteGain: 0.28, bassGain: 0.35, bellGain: 0.05 },
  autumn: { bpm: 88,  fluteGain: 0.24, luteGain: 0.26, bassGain: 0.34, bellGain: 0.10 },
  winter: { bpm: 76,  fluteGain: 0.16, luteGain: 0.18, bassGain: 0.26, bellGain: 0.26 },
};

function readBgmEnabled() {
  try {
    const v = localStorage.getItem(BGM_STORAGE_KEY);
    return v === null ? true : v !== "off";
  } catch {
    return true;
  }
}

export function isBgmOn() { return _bgmEnabled; }

export function setBgm(on) {
  _bgmEnabled = !!on;
  try { localStorage.setItem(BGM_STORAGE_KEY, _bgmEnabled ? "on" : "off"); } catch {}
  if (_bgmEnabled) {
    startBgm();
  } else {
    stopBgm();
  }
}

export function toggleBgm() {
  setBgm(!_bgmEnabled);
  return _bgmEnabled;
}

export function setBgmSeason(season) {
  if (SEASON_CONFIG[season]) {
    _currentSeason = season;
  }
}

/** 频率与 MIDI 音高对照表 */
const NOTE = {
  // 低音提琴
  C2: 65.41, D2: 73.42, E2: 82.41, G2: 98.00, A2: 110.00,
  // 鲁特琴琶音
  B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185.00, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
  // 木笛主旋律 & 八音盒
  C5: 523.25, D5: 587.33, E5: 659.25, Fs5: 739.99, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, D6: 1174.66,
};

// ============================================================
// 4 小节（共 64 步 16 分音符）中世纪田园曲谱
// ============================================================
// 1. 低音大提琴步进 (每半小节一次根音)
const BASS_TRACK = [
  { step: 0,  note: NOTE.G2 }, { step: 8,  note: NOTE.D2 },
  { step: 16, note: NOTE.E2 }, { step: 24, note: NOTE.C2 },
  { step: 32, note: NOTE.G2 }, { step: 40, note: NOTE.D2 },
  { step: 48, note: NOTE.C2 }, { step: 56, note: NOTE.G2 },
];

// 2. 鲁特琴分解和弦琶音 (Arpeggio pattern)
const LUTE_TRACK = [
  // 小节 1: G -> D
  { step: 0, note: NOTE.G3 }, { step: 2, note: NOTE.B3 }, { step: 4, note: NOTE.D4 }, { step: 6, note: NOTE.G4 },
  { step: 8, note: NOTE.D3 }, { step: 10, note: NOTE.Fs3 }, { step: 12, note: NOTE.A3 }, { step: 14, note: NOTE.D4 },
  // 小节 2: Em -> C
  { step: 16, note: NOTE.E3 }, { step: 18, note: NOTE.G3 }, { step: 20, note: NOTE.B3 }, { step: 22, note: NOTE.E4 },
  { step: 24, note: NOTE.C3 }, { step: 26, note: NOTE.E3 }, { step: 28, note: NOTE.G3 }, { step: 30, note: NOTE.C4 },
  // 小节 3: G -> D
  { step: 32, note: NOTE.G3 }, { step: 34, note: NOTE.B3 }, { step: 36, note: NOTE.D4 }, { step: 38, note: NOTE.B3 },
  { step: 40, note: NOTE.D3 }, { step: 42, note: NOTE.Fs3 }, { step: 44, note: NOTE.A3 }, { step: 46, note: NOTE.Fs3 },
  // 小节 4: C -> G
  { step: 48, note: NOTE.C3 }, { step: 50, note: NOTE.E3 }, { step: 52, note: NOTE.G3 }, { step: 54, note: NOTE.E3 },
  { step: 56, note: NOTE.G3 }, { step: 58, note: NOTE.B3 }, { step: 60, note: NOTE.D4 }, { step: 62, note: NOTE.G3 },
];

// 3. 田园木笛主旋律 (悠扬欧洲民谣句子，带气鸣颤音)
const FLUTE_TRACK = [
  // 乐句 1
  { step: 0,  note: NOTE.D4, dur: 4 },
  { step: 4,  note: NOTE.G4, dur: 4 },
  { step: 8,  note: NOTE.A4, dur: 3 },
  { step: 11, note: NOTE.B4, dur: 5 },
  // 乐句 2
  { step: 16, note: NOTE.G4, dur: 4 },
  { step: 20, note: NOTE.E4, dur: 4 },
  { step: 24, note: NOTE.C4, dur: 3 },
  { step: 27, note: NOTE.D4, dur: 5 },
  // 乐句 3 (高潮跳进)
  { step: 32, note: NOTE.B4, dur: 3 },
  { step: 35, note: NOTE.C5, dur: 2 },
  { step: 37, note: NOTE.D5, dur: 4 },
  { step: 41, note: NOTE.B4, dur: 3 },
  { step: 44, note: NOTE.A4, dur: 4 },
  // 乐句 4 (优雅田园下行收束)
  { step: 48, note: NOTE.G4, dur: 3 },
  { step: 51, note: NOTE.Fs4, dur: 2 },
  { step: 53, note: NOTE.E4, dur: 3 },
  { step: 56, note: NOTE.D4, dur: 4 },
  { step: 60, note: NOTE.G4, dur: 4 },
];

// 4. 冬雪八音盒/晶莹风铃点缀 (清脆高音冰晶)
const BELL_TRACK = [
  { step: 4,  note: NOTE.G5 },
  { step: 12, note: NOTE.D6 },
  { step: 20, note: NOTE.B5 },
  { step: 28, note: NOTE.G5 },
  { step: 36, note: NOTE.D6 },
  { step: 44, note: NOTE.Fs5 },
  { step: 52, note: NOTE.E5 },
  { step: 60, note: NOTE.D5 },
];

/** 初始化合成母带 */
function initAudio() {
  if (_audioCtx) return _audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioCtx = new AC();

    // 软限制母带总线
    const comp = _audioCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-12, _audioCtx.currentTime);
    comp.knee.setValueAtTime(6, _audioCtx.currentTime);
    comp.ratio.setValueAtTime(3.5, _audioCtx.currentTime);
    comp.attack.setValueAtTime(0.005, _audioCtx.currentTime);
    comp.release.setValueAtTime(0.12, _audioCtx.currentTime);
    comp.connect(_audioCtx.destination);

    _masterGain = _audioCtx.createGain();
    _masterGain.gain.setValueAtTime(0.24, _audioCtx.currentTime); // 适中温暖的背景音量
    _masterGain.connect(comp);

    // 准备气流噪声
    const rate = _audioCtx.sampleRate;
    _noiseBuffer = _audioCtx.createBuffer(1, rate, rate);
    const data = _noiseBuffer.getChannelData(0);
    for (let i = 0; i < rate; i++) data[i] = Math.random() * 2 - 1;

    return _audioCtx;
  } catch {
    return null;
  }
}

// ============================================================
// 乐器声音物理合成函数
// ============================================================

/**
 * 鲁特琴拨弦合成 (Lute Acoustic Pluck)
 * 复合锯齿谐波激振 + 快速衰减低通滤波器，模拟羊肠弦在木共鸣箱上的清脆拨奏
 */
function playLuteNote(freq, time, gainLevel = 0.24) {
  if (!_audioCtx || !_masterGain) return;
  const t0 = time;

  const osc = _audioCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, t0);

  const filter = _audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  // 模拟拨弦瞬间丰富高频与快速木质吸收衰减
  filter.frequency.setValueAtTime(freq * 6.5, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 1.2), t0 + 0.28);
  filter.Q.setValueAtTime(3.5, t0);

  const gain = _audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(gainLevel, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);

  osc.connect(filter).connect(gain).connect(_masterGain);
  osc.start(t0);
  osc.stop(t0 + 0.35);
}

/**
 * 原声大提琴拨奏低音 (Pizzicato Bass)
 * 双正弦低频融合，稳重圆润
 */
function playBassNote(freq, time, gainLevel = 0.32) {
  if (!_audioCtx || !_masterGain) return;
  const t0 = time;

  const osc1 = _audioCtx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, t0);

  const osc2 = _audioCtx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 0.5, t0); // 丰富次低频深度

  const filter = _audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(280, t0);

  const gain = _audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(gainLevel, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain).connect(_masterGain);

  osc1.start(t0); osc2.start(t0);
  osc1.stop(t0 + 0.5); osc2.stop(t0 + 0.5);
}

/**
 * 田园木笛合成 (Pastoral Wooden Recorder)
 * 正弦基波 + 微弱纯八度泛音 + 5.2Hz 柔和揉弦颤音 + 气息摩擦声 (Breath Noise)
 */
function playFluteNote(freq, time, durSteps, gainLevel = 0.28) {
  if (!_audioCtx || !_masterGain) return;
  const cfg = SEASON_CONFIG[_currentSeason] || SEASON_CONFIG.spring;
  const stepDur = (60 / cfg.bpm) / 4;
  const durSec = Math.max(0.18, durSteps * stepDur * 0.94);
  const t0 = time;

  // 1. 主笛音（正弦基频）
  const osc = _audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);

  // 2. 柔和揉弦颤音 LFO (5.2Hz)
  const lfo = _audioCtx.createOscillator();
  lfo.frequency.setValueAtTime(5.2, t0);
  const lfoGain = _audioCtx.createGain();
  lfoGain.gain.setValueAtTime(1.4, t0); // ±1.4Hz 温暖微颤
  lfo.connect(lfoGain).connect(osc.frequency);

  // 3. 伴生微弱木管气流杂音 (Breath Noise)
  let noiseGain = null;
  if (_noiseBuffer) {
    const noise = _audioCtx.createBufferSource();
    noise.buffer = _noiseBuffer;
    noise.loop = true;
    const nFilter = _audioCtx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.setValueAtTime(Math.min(3200, freq * 2.2), t0);
    nFilter.Q.setValueAtTime(3.0, t0);
    noiseGain = _audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.linearRampToValueAtTime(gainLevel * 0.08, t0 + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
    noise.connect(nFilter).connect(noiseGain).connect(_masterGain);
    noise.start(t0);
    noise.stop(t0 + durSec + 0.02);
  }

  // 4. 木笛吹奏包络（平缓圆润起奏与悠扬释音）
  const gain = _audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(gainLevel, t0 + 0.045);
  gain.gain.setValueAtTime(gainLevel * 0.88, t0 + durSec - 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);

  osc.connect(gain).connect(_masterGain);
  osc.start(t0);
  lfo.start(t0);
  osc.stop(t0 + durSec + 0.05);
  lfo.stop(t0 + durSec + 0.05);
}

/**
 * 冬雪八音盒 / 冰晶风铃 (Glockenspiel Bell)
 * 非整数倍金属泛音叠加，清脆剔透
 */
function playBellNote(freq, time, gainLevel = 0.2) {
  if (!_audioCtx || !_masterGain) return;
  const t0 = time;

  [1.0, 2.76].forEach((ratio, i) => {
    const osc = _audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, t0);
    const g = _audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainLevel / (i + 1), t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
    osc.connect(g).connect(_masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.7);
  });
}

// ============================================================
// 纯硬件时钟调度核心 (Look-Ahead WebAudio Scheduler)
// ============================================================
function scheduleLoop() {
  if (!_isPlaying || !_audioCtx) return;
  const cfg = SEASON_CONFIG[_currentSeason] || SEASON_CONFIG.spring;
  const stepDur = (60 / cfg.bpm) / 4; // 16 分音符时长 (秒)
  const lookAheadWindow = 0.12;       // 预判 120ms 范围内要响的音符

  while (_nextStepTime < _audioCtx.currentTime + lookAheadWindow) {
    const step = _currentStep;
    const time = _nextStepTime;

    // 1. 低音声部
    const bass = BASS_TRACK.find((b) => b.step === step);
    if (bass) playBassNote(bass.note, time, cfg.bassGain);

    // 2. 鲁特琴声部
    const lute = LUTE_TRACK.find((l) => l.step === step);
    if (lute) playLuteNote(lute.note, time, cfg.luteGain);

    // 3. 木笛主旋律声部
    const flute = FLUTE_TRACK.find((f) => f.step === step);
    if (flute) playFluteNote(flute.note, time, flute.dur, cfg.fluteGain);

    // 4. 八音盒/冰晶风铃声部（冬季尤为清晰）
    const bell = BELL_TRACK.find((bl) => bl.step === step);
    if (bell && (_currentSeason === "winter" || Math.random() > 0.4)) {
      playBellNote(bell.note, time, cfg.bellGain);
    }

    // 步进推进 (0..63)
    _currentStep = (_currentStep + 1) % 64;
    _nextStepTime += stepDur;
  }
}

/** 开启背景音乐 */
export function startBgm() {
  const c = initAudio();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
  }
  if (_isPlaying) return;

  _isPlaying = true;
  _currentStep = 0;
  _nextStepTime = c.currentTime + 0.05;

  if (_masterGain) {
    _masterGain.gain.setValueAtTime(0.0001, c.currentTime);
    _masterGain.gain.linearRampToValueAtTime(0.24, c.currentTime + 0.6); // 柔和淡入
  }

  clearInterval(_schedulerTimer);
  _schedulerTimer = setInterval(scheduleLoop, 25);
}

/** 暂停/停止背景音乐 */
export function stopBgm() {
  _isPlaying = false;
  clearInterval(_schedulerTimer);
  _schedulerTimer = null;
  if (_masterGain && _audioCtx) {
    _masterGain.gain.setValueAtTime(_masterGain.gain.value, _audioCtx.currentTime);
    _masterGain.gain.linearRampToValueAtTime(0.0001, _audioCtx.currentTime + 0.4);
  }
}

/** 页面可见性管理（切后台淡出节电，切回前台恢复） */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (_isPlaying) {
        clearInterval(_schedulerTimer);
        _schedulerTimer = null;
        if (_masterGain && _audioCtx) {
          _masterGain.gain.setValueAtTime(_masterGain.gain.value, _audioCtx.currentTime);
          _masterGain.gain.linearRampToValueAtTime(0.0001, _audioCtx.currentTime + 0.3);
        }
      }
    } else {
      if (_bgmEnabled && _isPlaying) {
        if (_audioCtx && _audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
        _nextStepTime = _audioCtx ? _audioCtx.currentTime + 0.05 : 0;
        if (_masterGain && _audioCtx) {
          _masterGain.gain.setValueAtTime(0.0001, _audioCtx.currentTime);
          _masterGain.gain.linearRampToValueAtTime(0.24, _audioCtx.currentTime + 0.5);
        }
        clearInterval(_schedulerTimer);
        _schedulerTimer = setInterval(scheduleLoop, 25);
      }
    }
  });

  // 用户首次交互唤醒 AudioContext 并启动 BGM（合规 Autoplay 策略）
  const onFirstInteraction = () => {
    if (_bgmEnabled && !_isPlaying) {
      startBgm();
    } else if (_audioCtx && _audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }
    window.removeEventListener("click", onFirstInteraction);
    window.removeEventListener("keydown", onFirstInteraction);
    window.removeEventListener("touchstart", onFirstInteraction);
  };
  window.addEventListener("click", onFirstInteraction, { passive: true });
  window.addEventListener("keydown", onFirstInteraction, { passive: true });
  window.addEventListener("touchstart", onFirstInteraction, { passive: true });
}
