// ============================================================
// 四季动态 Canvas 氛围层与丰收礼花系统 (Ambient Weather & Confetti)
// 原生 Canvas 2D 纯数学实现：0 外部依赖，DPR 限频，节电与移动端优化
// ============================================================

import { reducedMotion } from "/js/anim.js";

let _canvas = null;
let _ctx = null;
let _rafId = null;
let _season = "spring";
let _particles = [];
let _confetti = [];
let _width = 0;
let _height = 0;
let _dpr = 1;
let _isRunning = false;

// 节电与性能限额
function getParticleLimit() {
  const isMobile = window.innerWidth < 768;
  return isMobile ? 14 : 32;
}

/**
 * 随机区间辅助函数
 */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * 创建单颗季节氛围粒子
 */
function createAmbientParticle(isInit = false) {
  const isMobile = window.innerWidth < 768;
  const p = {
    x: rand(0, _width),
    y: isInit ? rand(0, _height) : -20,
    size: rand(isMobile ? 2.5 : 3.5, isMobile ? 5 : 7.5),
    speedX: rand(-0.6, 0.9),
    speedY: rand(0.5, 1.4),
    rot: rand(0, 360),
    rotSpeed: rand(-1.8, 1.8),
    opacity: rand(0.35, 0.75),
    sway: rand(0, Math.PI * 2),
    swaySpeed: rand(0.015, 0.035),
    kind: _season,
  };

  if (_season === "spring") {
    // 春：嫩粉花瓣、浅绿春草
    p.color = Math.random() > 0.4 ? "#f7c5d0" : "#a8d888";
    p.speedX = rand(0.4, 1.2);
    p.speedY = rand(0.4, 0.9);
  } else if (_season === "summer") {
    // 夏：金黄日晕光斑、暖光微尘
    p.color = Math.random() > 0.5 ? "#ffd43b" : "#f59f00";
    p.speedY = rand(-0.3, 0.3); // 微风缓慢悬浮
    p.speedX = rand(-0.4, 0.4);
    p.size = rand(2, 4.5);
    p.opacity = rand(0.2, 0.55);
  } else if (_season === "autumn") {
    // 秋：深金红枫叶、麦芒金粉
    p.color = Math.random() > 0.4 ? "#d9480f" : "#f59f00";
    p.speedX = rand(0.8, 2.0); // 秋风瑟瑟
    p.speedY = rand(0.8, 1.6);
  } else if (_season === "winter") {
    // 冬：轻盈白雪花
    p.color = "#ffffff";
    p.speedX = rand(-0.3, 0.5);
    p.speedY = rand(0.6, 1.5);
    p.size = rand(2, 4);
    p.opacity = rand(0.4, 0.85);
  }

  return p;
}

/**
 * 调整 Canvas 画布尺寸与高分屏 DPR (限制最大 1.5，防 3x 屏幕 GPU 耗电)
 */
function resizeCanvas() {
  if (!_canvas) return;
  _width = window.innerWidth;
  _height = window.innerHeight;
  _dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  _canvas.width = Math.floor(_width * _dpr);
  _canvas.height = Math.floor(_height * _dpr);
  _canvas.style.width = `${_width}px`;
  _canvas.style.height = `${_height}px`;

  if (_ctx) {
    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    _ctx.scale(_dpr, _dpr);
  }

  // 补齐或裁剪粒子池
  const limit = getParticleLimit();
  while (_particles.length < limit) {
    _particles.push(createAmbientParticle(true));
  }
  if (_particles.length > limit) {
    _particles.length = limit;
  }
}

/**
 * 主渲染循环
 */
function renderLoop() {
  if (!_isRunning || !_ctx) return;

  _ctx.clearRect(0, 0, _width, _height);

  // 1. 渲染季节氛围粒子
  const limit = getParticleLimit();
  for (let i = 0; i < _particles.length; i++) {
    const p = _particles[i];
    p.sway += p.swaySpeed;
    const swayOffset = Math.sin(p.sway) * (p.kind === "autumn" ? 1.5 : 0.8);
    p.x += p.speedX + swayOffset;
    p.y += p.speedY;
    p.rot += p.rotSpeed;

    // 出界重置
    if (p.y > _height + 20 || p.x > _width + 30 || p.x < -30) {
      _particles[i] = createAmbientParticle(false);
      continue;
    }

    _ctx.save();
    _ctx.translate(p.x, p.y);
    _ctx.rotate((p.rot * Math.PI) / 180);
    _ctx.globalAlpha = p.opacity;
    _ctx.fillStyle = p.color;

    if (p.kind === "winter") {
      // 雪花圆形光晕
      _ctx.beginPath();
      _ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      _ctx.fill();
    } else if (p.kind === "summer") {
      // 夏日微尘浮光
      _ctx.beginPath();
      _ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      _ctx.fill();
    } else {
      // 树叶 / 花瓣（椭圆带尖尖）
      _ctx.beginPath();
      _ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      _ctx.fill();
    }

    _ctx.restore();
  }

  // 2. 渲染丰收金色麦穗礼花 (Confetti)
  if (_confetti.length > 0) {
    for (let i = _confetti.length - 1; i >= 0; i--) {
      const c = _confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.vx *= 0.985;
      c.rotX += c.rotSpeedX;
      c.rotY += c.rotSpeedY;
      c.life -= 0.012;

      if (c.life <= 0 || c.y > _height + 40) {
        _confetti.splice(i, 1);
        continue;
      }

      _ctx.save();
      _ctx.translate(c.x, c.y);
      _ctx.scale(Math.cos(c.rotX), Math.sin(c.rotY));
      _ctx.globalAlpha = Math.max(0, c.life);
      _ctx.fillStyle = c.color;

      if (c.shape === "circle") {
        _ctx.beginPath();
        _ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
        _ctx.fill();
      } else {
        // 麦穗长条形金屑
        _ctx.fillRect(-c.size / 2, -c.size * 0.3, c.size, c.size * 0.6);
      }

      _ctx.restore();
    }
  }

  _rafId = requestAnimationFrame(renderLoop);
}

/**
 * 启动氛围画布
 */
export function initAmbientCanvas() {
  if (typeof window === "undefined" || reducedMotion()) return;
  if (_canvas && document.body.contains(_canvas)) return;

  _canvas = document.getElementById("ambientCanvas");
  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _canvas.id = "ambientCanvas";
    _canvas.className = "ambient-canvas";
    document.body.prepend(_canvas);
  }

  _ctx = _canvas.getContext("2d", { alpha: true });
  window.addEventListener("resize", resizeCanvas, { passive: true });

  // 页面离开后台时自动暂停 RAF 循环，节省电量
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAmbient();
    } else {
      startAmbient();
    }
  });

  resizeCanvas();
  startAmbient();
}

/**
 * 开始渲染
 */
function startAmbient() {
  if (_isRunning || reducedMotion()) return;
  _isRunning = true;
  _rafId = requestAnimationFrame(renderLoop);
}

/**
 * 暂停渲染
 */
function stopAmbient() {
  _isRunning = false;
  if (_rafId) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
}

/**
 * 切换季节氛围
 * @param {"spring"|"summer"|"autumn"|"winter"} season
 */
export function setAmbientSeason(season) {
  if (_season === season) return;
  _season = season;
  // 渐进更新粒子池属性
  const limit = getParticleLimit();
  _particles = [];
  for (let i = 0; i < limit; i++) {
    _particles.push(createAmbientParticle(true));
  }
}

/**
 * 触发丰收金色麦穗与红蜡火漆礼花爆发 (Harvest Confetti)
 * @param {number} [count=45] - 礼花粒子数
 */
export function triggerHarvestConfetti(count = 45) {
  if (reducedMotion() || !_canvas) return;
  const isMobile = window.innerWidth < 768;
  const actualCount = isMobile ? Math.min(24, count) : count;

  const originX = _width / 2;
  const originY = _height * 0.72;
  const colors = ["#d9a441", "#fab005", "#ffe066", "#c0392b", "#7fae62", "#fdf0cd"];

  for (let i = 0; i < actualCount; i++) {
    const angle = rand(-Math.PI * 0.85, -Math.PI * 0.15); // 向上扇形抛射
    const speed = rand(6, isMobile ? 12 : 16);
    _confetti.push({
      x: originX + rand(-120, 120),
      y: originY + rand(-30, 30),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: rand(0.24, 0.38),
      size: rand(isMobile ? 5 : 7, isMobile ? 9 : 13),
      rotX: rand(0, Math.PI),
      rotY: rand(0, Math.PI),
      rotSpeedX: rand(0.04, 0.14),
      rotSpeedY: rand(0.04, 0.14),
      life: rand(1.1, 1.6),
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.35 ? "rect" : "circle",
    });
  }

  // 保证 RAF 唤醒
  startAmbient();
}
