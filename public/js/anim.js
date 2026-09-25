// ============================================================
// 动效工具（轻量级，所有动画用 CSS 完成；JS 只挂类与时机）
// ============================================================

const REDUCED = typeof window !== "undefined"
  && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const reducedMotion = () => REDUCED;

/**
 * 给容器内匹配 selector 的子元素应用 stagger 入场动画。
 * 通过设置 `animation-delay` 实现 30ms 间隔（可调）。
 * 仅一次，再次调用同一容器会被忽略。
 */
export function staggerIn(container, selector = ":scope > *", baseDelay = 30, maxItems = 60) {
  if (!container) return;
  const kids = container.querySelectorAll(selector);
  const limit = Math.min(kids.length, maxItems);
  for (let i = 0; i < limit; i++) {
    const k = kids[i];
    k.style.animationDelay = (i * baseDelay) + "ms";
    k.classList.add("anim-pop-in");
  }
}

/**
 * 给单个资源数字挂脉冲。同一元素短时间重复调用会被去抖。
 */
const _pulseCache = new WeakMap();
export function pulseCount(el) {
  if (!el) return;
  const now = Date.now();
  const last = _pulseCache.get(el) || 0;
  if (now - last < 60) return;
  _pulseCache.set(el, now);
  el.classList.remove("pulse");
  // 重置以允许再次触发动画
  void el.offsetWidth;
  el.classList.add("pulse");
  setTimeout(() => el.classList.remove("pulse"), 600);
}

/**
 * 给农场格挂 pop 动画。
 */
export function cellPop(el) {
  if (!el) return;
  el.classList.remove("cell-pop");
  void el.offsetWidth;
  el.classList.add("cell-pop");
  setTimeout(() => el.classList.remove("cell-pop"), 360);
}

/**
 * 给农场格挂 shine（撒种/收获瞬间闪光）。
 */
export function cellShine(el) {
  if (!el) return;
  el.classList.remove("cell-shine");
  void el.offsetWidth;
  el.classList.add("cell-shine");
  setTimeout(() => el.classList.remove("cell-shine"), 650);
}

/**
 * 栅栏段画线动画：0.22s scale 0→1
 */
export function fenceDraw(el) {
  if (!el) return;
  el.classList.add("drawing");
  setTimeout(() => el.classList.remove("drawing"), 260);
}

/**
 * 按钮涟漪（移动端友好）。
 *   e — 事件或 {x, y}，x/y 是相对按钮内部的 px。
 */
export function ripple(btn, e) {
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  let x = rect.width / 2, y = rect.height / 2;
  if (e && typeof e.clientX === "number") {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  } else if (e && typeof e.x === "number") {
    x = e.x; y = e.y;
  }
  btn.style.setProperty("--ripple-x", x + "px");
  btn.style.setProperty("--ripple-y", y + "px");
  btn.classList.remove("rippling");
  void btn.offsetWidth;
  btn.classList.add("rippling");
  setTimeout(() => btn.classList.remove("rippling"), 600);
}

/**
 * 给所有 .btn 自动绑定 ripple（一次性，事件代理）。
 */
export function bindRipples(root = document) {
  root.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".btn");
    if (!btn) return;
    ripple(btn, e);
  }, { passive: true });
}

/**
 * 给容器中匹配 selector 的元素挂"卡牌翻入"动画，并 stagger。
 */
export function revealFlipIn(container, selector = ".space", baseDelay = 40) {
  if (!container) return;
  const kids = container.querySelectorAll(selector);
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    k.style.animationDelay = (i * baseDelay) + "ms";
    k.classList.add("anim-reveal-flip");
  }
}

/**
 * 日志行 stagger（用在 mini-log / logBox 内容插入后）。
 * 仅给新增行（标记 .new）加 stagger。
 */
export function logStagger(container) {
  if (!container) return;
  const newLines = container.querySelectorAll(":scope > .new");
  for (let i = 0; i < newLines.length; i++) {
    newLines[i].style.animationDelay = (i * 25) + "ms";
  }
}

/**
 * 把日志文本按内容分类，便于左侧加色条。
 */
export function classifyLog(text) {
  if (/收获/.test(text)) return "harvest";
  if (/建造|建栅栏|建了|翻修|建房|犁地/.test(text)) return "build";
  if (/羊|猪|牛|繁殖/.test(text)) return "breed";
  if (/木|陶|芦苇|石|谷|菜|钓鱼|日工/.test(text)) return "resource";
  if (/缺|无法|失败|食物不足/.test(text)) return "warning";
  return "";
}

/**
 * 显示一次性的"🌾 收获"金色横幅（自动 1.6s 后消失）
 */
export function showHarvestBanner(text = "收获阶段") {
  let bar = document.querySelector(".harvest-banner");
  if (bar) bar.remove();
  bar = document.createElement("div");
  bar.className = "harvest-banner";
  bar.textContent = text;
  bar.style.position = "fixed";
  bar.style.top = "20px";
  bar.style.right = "20px";
  bar.style.left = "auto";
  bar.style.zIndex = "95";
  document.body.appendChild(bar);
  setTimeout(() => {
    bar.style.transition = "opacity 0.4s ease";
    bar.style.opacity = "0";
    setTimeout(() => bar.remove(), 420);
  }, 1400);
}

/**
 * 视窗尺寸断点（与 CSS 同步）
 */
export function viewportKind() {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < 480) return "phone-sm";
  if (w < 768) return "phone-lg";
  if (w >= 1024 && w / h > 1.25) return "tablet-land";
  if (w < 1024) return "tablet-port";
  return "desktop";
}