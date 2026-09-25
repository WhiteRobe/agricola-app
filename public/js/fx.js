// ============================================================
// 实体感抛物线飞行动效引擎 (Flying Token & Meeple FX Engine)
// 原生现代 Web 标准编写：0 第三方依赖，GPU 硬件加速，移动端友好
// ============================================================

import { reducedMotion, pulseCount, cellPop } from "/js/anim.js";
import { tokenSvg, meepleSvg, animalSvg } from "/js/svg-icons.js";

let _overlay = null;
let _activeCount = 0;
const MAX_CONCURRENT = 8;

/**
 * 确保页面上有且仅有一个置顶的无交互飞行覆盖层
 */
function getOverlay() {
  if (_overlay && document.body.contains(_overlay)) return _overlay;
  _overlay = document.getElementById("fxFlyOverlay");
  if (!_overlay) {
    _overlay = document.createElement("div");
    _overlay.id = "fxFlyOverlay";
    _overlay.className = "fx-fly-overlay";
    document.body.appendChild(_overlay);
  }
  return _overlay;
}

/**
 * 获取元素或坐标的绝对视口中心点 (Viewport Coordinates)
 * @param {HTMLElement|{x: number, y: number}} target
 * @returns {{x: number, y: number}|null}
 */
function getCenterCoords(target) {
  if (!target) return null;
  if (typeof target.x === "number" && typeof target.y === "number") {
    return { x: target.x, y: target.y };
  }
  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return null;
}

/**
 * 发射实体抛物线飞行动画
 * @param {Object} opts
 * @param {HTMLElement|{x: number, y: number}} opts.from - 起始元素或坐标
 * @param {HTMLElement|{x: number, y: number}} opts.to - 终点目标元素或坐标
 * @param {string} opts.html - 飞行的 SVG / HTML 内容
 * @param {number} [opts.duration=480] - 飞行时长 (ms)
 * @param {number} [opts.arc=-50] - 抛物线垂直最高隆起高度 (px, 负数表示向上拱起)
 * @param {string} [opts.className=""] - 额外样式类名
 * @param {Function} [opts.onComplete] - 落地回调
 */
export function flyElement({
  from,
  to,
  html,
  duration = 480,
  arc = -50,
  className = "",
  onComplete = null,
}) {
  if (reducedMotion()) {
    if (onComplete) onComplete();
    return;
  }

  const p0 = getCenterCoords(from);
  const p1 = getCenterCoords(to);
  if (!p0 || !p1) {
    if (onComplete) onComplete();
    return;
  }

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.hypot(dx, dy);

  // 距离太小或屏幕外直接静默完成，节省算力
  if (dist < 15 || p0.x < -100 || p0.x > window.innerWidth + 100) {
    if (onComplete) onComplete();
    return;
  }

  // 并发保护：超过上限直接调用回调
  if (_activeCount >= MAX_CONCURRENT) {
    if (onComplete) onComplete();
    return;
  }

  _activeCount++;
  const overlay = getOverlay();
  const flyer = document.createElement("div");
  flyer.className = `fx-flyer ${className}`.trim();
  flyer.innerHTML = html;

  // 初始固定在起点
  flyer.style.position = "fixed";
  flyer.style.left = `${p0.x}px`;
  flyer.style.top = `${p0.y}px`;
  flyer.style.transform = "translate(-50%, -50%)";
  flyer.style.pointerEvents = "none";
  flyer.style.zIndex = "99999";
  flyer.style.willChange = "transform, opacity";
  overlay.appendChild(flyer);

  // 抛物线垂直拱高根据距离动态微调
  const dynamicArc = Math.min(-30, Math.max(-120, arc - dist * 0.08));

  // 采用 Web Animations API 进行 5 阶段贝塞尔抛物线插值
  const keyframes = [
    {
      transform: "translate(-50%, -50%) scale(0.65) rotate(0deg)",
      opacity: 0,
      offset: 0,
    },
    {
      transform: `translate(calc(-50% + ${dx * 0.18}px), calc(-50% + ${dy * 0.18 + dynamicArc * 0.8}px)) scale(1.22) rotate(-8deg)`,
      opacity: 1,
      offset: 0.2,
    },
    {
      transform: `translate(calc(-50% + ${dx * 0.52}px), calc(-50% + ${dy * 0.52 + dynamicArc}px)) scale(1.28) rotate(4deg)`,
      opacity: 1,
      offset: 0.52,
    },
    {
      transform: `translate(calc(-50% + ${dx * 0.84}px), calc(-50% + ${dy * 0.84 + dynamicArc * 0.4}px)) scale(1.08) rotate(-2deg)`,
      opacity: 0.98,
      offset: 0.84,
    },
    {
      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.92) rotate(0deg)`,
      opacity: 0.85,
      offset: 1,
    },
  ];

  const anim = flyer.animate(keyframes, {
    duration: Math.min(650, Math.max(380, duration)),
    easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    fill: "forwards",
  });

  anim.onfinish = () => {
    flyer.remove();
    _activeCount = Math.max(0, _activeCount - 1);
    // 目标若是 DOM 节点，触发落地物理脉冲
    if (to instanceof HTMLElement) {
      if (to.classList.contains("res") || to.classList.contains("v") || to.dataset.kind) {
        pulseCount(to);
      } else {
        cellPop(to);
      }
    }
    if (onComplete) onComplete();
  };
}

/**
 * 工人米普放置飞行动效（从玩家底栏飞入行动板）
 * @param {HTMLElement} fromEl
 * @param {HTMLElement} toSpaceEl
 * @param {string} colorHex
 */
export function flyMeepleToSpace(fromEl, toSpaceEl, colorHex = "#c0392b") {
  if (!fromEl || !toSpaceEl) return;
  const svg = meepleSvg(colorHex, 34);
  flyElement({
    from: fromEl,
    to: toSpaceEl,
    html: svg,
    duration: 440,
    arc: -70,
    className: "fly-meeple",
  });
}

/**
 * 资源 Token 拾取飞行动效（从累积格飞入玩家资源栏）
 * @param {HTMLElement} fromSpaceEl
 * @param {HTMLElement} toStockEl
 * @param {string} tokenKind
 */
export function flyTokenToStock(fromSpaceEl, toStockEl, tokenKind) {
  if (!fromSpaceEl || !toStockEl) return;
  const svg = tokenSvg(tokenKind, 28);
  flyElement({
    from: fromSpaceEl,
    to: toStockEl,
    html: svg,
    duration: 460,
    arc: -55,
    className: "fly-token",
  });
}

/**
 * 作物收割飞入粮仓动效（从农田飞入玩家谷物/蔬菜库存）
 * @param {HTMLElement} fromCellEl
 * @param {HTMLElement} toStockEl
 * @param {"grain"|"vegetable"} cropKind
 */
export function flyCropHarvest(fromCellEl, toStockEl, cropKind) {
  if (!fromCellEl || !toStockEl) return;
  const svg = tokenSvg(cropKind, 26);
  flyElement({
    from: fromCellEl,
    to: toStockEl,
    html: svg,
    duration: 500,
    arc: -65,
    className: "fly-crop",
  });
}
