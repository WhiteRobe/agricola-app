// ============================================================
// 按钮 loading 态工具 —— 防重复点击 + 网络未响应时给出反馈
//   - lock(btn, text?): 标记 loading，显示旋转 spinner
//   - unlock(btn): 清除 loading（成功或失败都应调用）
//   - run(btn, text, fn): 自动包装 async 函数，错误时也自动解锁
//   - debounce(key, ms): 按 key 防抖（用于游戏内 action 按钮）
// ============================================================

const _lockState = new WeakMap();
const _debounceTimers = new Map();

export function lock(btn, text) {
  if (!btn) return;
  if (btn.classList.contains("is-loading")) return; // 已锁
  _lockState.set(btn, {
    text: btn.textContent,
    loadingText: text != null ? text : btn.textContent,
    wasDisabled: btn.hasAttribute("disabled"),
  });
  btn.setAttribute("disabled", "true");
  btn.setAttribute("aria-busy", "true");
  btn.classList.add("is-loading");
  if (text != null) btn.textContent = text;
}

export function unlock(btn) {
  if (!btn) return;
  const st = _lockState.get(btn);
  btn.removeAttribute("aria-busy");
  btn.classList.remove("is-loading");
  // 仅当按钮仍停留在 loading 文案时才还原文字 ——
  // 若期间应用已重新渲染过它（例如刷新成「已达上限（10/10）」），别覆盖掉新内容
  if (st && btn.textContent === st.loadingText) btn.textContent = st.text;
  // 恢复可点（调用方若要保持禁用，会在 run 之后按最新状态重新渲染一次）
  if (st && !st.wasDisabled) btn.removeAttribute("disabled");
  _lockState.delete(btn);
}

/**
 * 自动包装：传入按钮 + 处理中文案 + async 函数
 *   - 调用前 lock(btn, text)
 *   - 函数正常完成 → unlock + 返回结果
 *   - 函数抛错 → unlock + 重新抛出（让上层 toast 显示）
 */
export async function run(btn, text, fn) {
  lock(btn, text);
  try {
    const r = await fn();
    unlock(btn);
    return r;
  } catch (e) {
    unlock(btn);
    throw e;
  }
}

/**
 * 防抖锁：防止同一 action 在指定时间内重复发送
 *   const ok = debounce("take-Sheep", 500); if (ok) conn.send(...)
 */
export function debounce(key, ms = 500) {
  if (_debounceTimers.has(key)) return false;
  _debounceTimers.set(key, setTimeout(() => _debounceTimers.delete(key), ms));
  return true;
}

/** 清理某个 key 的防抖（例如 action 成功后主动释放） */
export function clearDebounce(key) {
  const t = _debounceTimers.get(key);
  if (t) { clearTimeout(t); _debounceTimers.delete(key); }
}

/** 批量解锁（在 SPA 切页时清理） */
export function unlockAll(root = document) {
  root.querySelectorAll(".btn.is-loading").forEach((b) => unlock(b));
}