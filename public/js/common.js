// ============================================================
// 前端公共工具：WebSocket 房间连接 + 存储 + Toast
// ============================================================

export function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function lsDel(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function toast(msg, isErr = false, ms = 2600) {
  let box = document.querySelector(".toast-box");
  if (!box) {
    box = document.createElement("div");
    box.className = "toast-box";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  box.appendChild(el);
  // 错误提示配低音（音效模块可能尚未加载，静默忽略）
  if (isErr) import("/js/sfx.js").then((m) => m.err()).catch(() => {});
  setTimeout(() => {
    // 淡出动画
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 220);
  }, ms);
}

/**
 * 连接房间 WebSocket，自动重连 + 重发 hello。
 * opts: { code, hello, onState, onHello, onClosed, onErr, onDown, onUp }
 * 返回 { send(obj), close() }
 */
export function connectRoom(opts) {
  let ws = null;
  let closedByUs = false;
  let retryTimer = null;
  let pingTimer = null;

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/api/ws?code=${encodeURIComponent(opts.code)}`);
    ws.onopen = () => {
      ws.send(JSON.stringify(opts.hello));
      if (opts.onUp) opts.onUp();
      pingTimer = setInterval(() => {
        try { ws.send(JSON.stringify({ t: "ping" })); } catch {}
      }, 25000);
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === "state") { if (opts.onState) opts.onState(msg); return; }
      if (msg.t === "hello") { if (opts.onHello) opts.onHello(msg); return; }
      if (msg.t === "err") {
        if (opts.onErr) opts.onErr(msg);
        else toast(msg.msg || "发生错误", true);
        if (msg.code === "BAD_TOKEN" || msg.code === "ROOM_FULL") closedByUs = true;
        return;
      }
      if (msg.t === "closed") {
        if (opts.onClosed) opts.onClosed(msg);
        return;
      }
    };
    ws.onclose = () => {
      clearInterval(pingTimer);
      if (opts.onDown) opts.onDown();
      if (closedByUs) { if (opts.onClosed) opts.onClosed({ reason: " disconnected" }); return; }
      retryTimer = setTimeout(open, 2000);
    };
    ws.onerror = () => {};
  }

  open();
  return {
    send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); return ws && ws.readyState === 1; },
    /** WebSocket 是否已就绪（0=连接中 1=已连接 2=关闭中 3=已关闭） */
    isOpen() { return !!ws && ws.readyState === 1; },
    /** 兼容原生 WebSocket.readyState 语义（未连接时返回 3） */
    get readyState() { return ws ? ws.readyState : 3; },
    close() {
      closedByUs = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      if (ws) try { ws.close(); } catch {}
      ws = null;
    },
  };
}

export function copyText(text, tip = "已复制") {
  const done = () => toast(tip);
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch {}
  ta.remove();
}

export function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export const PLAYER_ICONS = ["🧑‍🌾", "👩‍🌾", "🧑‍🍳", "👴"];
export const PLAYER_COLORS = ["#e05d44", "#3f9d55", "#3d7ea6", "#d9932f"];
