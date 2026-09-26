import { connectRoom, fmtTime, lsDel, lsGet, lsSet, qs, toast } from "/js/common.js";
import { lock, unlock, run, debounce } from "/js/loading.js";

const $ = (id) => document.getElementById(id);
const me = { role: null, pid: null, token: null, name: null, spectator: false };
let conn = null;
let code = null;
/** 最新房间状态（用于窗口尺寸变化时重渲染） */
let _latestState = null;
/** 当前布局模式（决定是否显示移动端 tab 栏） */
let _layoutMode = null;

async function resolveTarget() {
  const playerCode = (qs("code") || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const specCode = (qs("spec") || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const watchCode = (qs("watch") || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (specCode) {
    const r = await (await fetch(`/api/lookup?code=${specCode}&kind=spec`)).json();
    if (!r.ok) throw new Error("旁观码无效或房间已关闭");
    return { roomCode: r.roomCode, hello: { t: "hello", role: "spec", spec: specCode } };
  }
  if (watchCode) {
    return { roomCode: watchCode, hello: { t: "hello", role: "guest" } };
  }
  if (playerCode) {
    const saved = lsGet(`agri:room:${playerCode}`, null);
    if (saved && saved.token) {
      return { roomCode: playerCode, hello: { t: "hello", role: "player", token: saved.token } };
    }
    return { roomCode: playerCode, hello: null }; // 需要昵称后加入
  }
  throw new Error("缺少房间码");
}

async function start() {
  let target;
  try {
    target = await resolveTarget();
  } catch (e) {
    toast(e.message || "无法进入房间", true);
    setTimeout(() => (location.href = "/"), 1600);
    return;
  }
  code = target.roomCode;
  $("roomTag").textContent = code;

  if (!target.hello) {
    // 新玩家：要昵称
    $("joinMask").classList.remove("hidden");
    const savedName = lsGet("agri:name", "");
    $("nameInput").value = savedName || "";
    $("nameInput").focus();
    const enter = () => {
      const name = ($("nameInput").value || "").trim() || "无名农夫";
      lsSet("agri:name", name);
      $("joinMask").classList.add("hidden");
      const btn = $("btnEnter");
      lock(btn, "⏳ 连接中…");
      openConn({ t: "hello", role: "player", name });
      setTimeout(() => unlock(btn), 1500);
    };
    $("btnEnter").onclick = enter;
    $("nameInput").onkeydown = (e) => { if (e.key === "Enter") enter(); };
  } else {
    openConn(target.hello);
  }
}

function openConn(hello) {
  $("connState").classList.remove("hidden");
  conn = connectRoom({
    code,
    hello,
    onHello(msg) {
      const you = msg.you || {};
      me.role = you.role;
      me.pid = you.pid || null;
      me.token = you.token || null;
      me.name = you.name || null;
      me.spectator = you.role !== "player" || !!msg.joinedAsSpectator;
      if (you.role === "player" && you.token) {
        lsSet(`agri:room:${code}`, { pid: you.pid, token: you.token, name: you.name });
      }
      if (msg.joinedAsSpectator) toast("游戏已开始，你以旁观者身份进入", false);
    },
    onErr(msg) {
      if (msg.code === "BAD_TOKEN") {
        lsDel(`agri:room:${code}`);
        conn.close();
        toast("身份失效，请重新进入", true);
        setTimeout(() => location.replace(`/play.html?code=${code}`), 1200);
      } else if (msg.code === "ROOM_FULL") {
        toast("房间已满（4 人）", true);
        conn.close();
      } else {
        toast(msg.msg || "发生错误", true);
      }
    },
    onState(s) { render(s); },
    onClosed(m) {
      toast("房间已关闭" + (m && m.reason ? `：${m.reason}` : ""), true);
      conn.close();
      setTimeout(() => (location.href = "/"), 1800);
    },
    onDown() { $("connState").innerHTML = '<span class="dot"></span>重连中…'; },
    onUp() { $("connState").innerHTML = '<span class="dot on"></span>已连接'; },
  });
}

function render(s) {
  if (s.closed) {
    toast("房间已解散", true);
    conn.close();
    setTimeout(() => (location.href = "/"), 1200);
    return;
  }
  if (s.kicked && me.pid === s.kicked) {
    toast("你被主持移出了房间", true);
    lsDel(`agri:room:${code}`);
    conn.close();
    setTimeout(() => (location.href = "/"), 1200);
    return;
  }

  _latestState = s;

  // 顶栏「🎴 DLC 规则」按钮更新（开任意 DLC 时展示，位于教程与连接状态之间）
  const topDlcBtn = document.getElementById("topDlcBtn");
  const dlcConfig = s.game?.dlc || s.dlc;
  const hasDlc = !!(dlcConfig && (dlcConfig.occupations || dlcConfig.minorImprovements || dlcConfig.moor || dlcConfig.seasons));
  if (topDlcBtn) {
    if (hasDlc) {
      topDlcBtn.classList.remove("hidden");
      topDlcBtn.onclick = () => {
        import("/js/tutorial.js").then((m) => m.openDlcDrawer(dlcConfig));
      };
    } else {
      topDlcBtn.classList.add("hidden");
    }
  }

  // 结束判定：房间阶段为 finished，或引擎已标记 finished
  const isFinished = s.phase === "finished" || (s.game && s.game.finished);

  if (s.phase === "lobby") {
    removeFab();
    $("lobby").classList.remove("hidden");
    $("gameRoot").classList.add("hidden");
    $("finishedRoot").classList.add("hidden");
    renderLobby(s);
  } else if (isFinished) {
    removeFab();
    $("lobby").classList.add("hidden");
    $("gameRoot").classList.add("hidden");
    $("finishedRoot").classList.remove("hidden");
    renderFinished(s);
  } else {
    $("lobby").classList.add("hidden");
    $("finishedRoot").classList.add("hidden");
    $("gameRoot").classList.remove("hidden");
    renderGame(s);
  }
}

function currentLayoutMode() {
  return window.innerWidth < 768 ? "narrow" : "wide";
}

/** 窗口尺寸变化：跨过断点时重渲染布局（手机 tab ↔ 桌面多列） */
function onResize() {
  const now = currentLayoutMode();
  if (document.body) document.body.dataset.layout = now;
  if (now !== _layoutMode) {
    _layoutMode = now;
    if (_latestState && _latestState.phase === "playing") {
      renderGame(_latestState);
    }
  }
}
window.addEventListener("resize", onResize);
if (document.body) document.body.dataset.layout = currentLayoutMode();
_layoutMode = currentLayoutMode();

/** 离开游戏时移除悬浮球 */
function removeFab() {
  const f = document.getElementById("gameFab");
  if (f) f.remove();
}

function renderLobby(s) {
  $("lobbyCount").textContent = `(${s.players.length}/4)`;
  $("specNotice").classList.toggle("hidden", !me.spectator);
  $("lobbyBtns").style.display = me.spectator ? "none" : "";

  const isVoted = !me.spectator && s.players.find((p) => p.id === me.pid)?.vote === true;
  $("btnVoteYes").style.display = isVoted ? "none" : "";
  $("btnVoteNo").style.display = isVoted ? "" : "none";

  const grid = $("lobbyPlayers");
  grid.innerHTML = "";
  const ICONS = ["🧑‍🌾", "👩‍🌾", "🧑‍🍳", "👴"];
  s.players.forEach((p) => {
    const isMe = p.id === me.pid;
    const el = document.createElement("div");
    el.className = "player-chip";
    el.innerHTML = `
      <div class="avatar" style="background:${p.color}">${ICONS[p.seat] || "🙂"}</div>
      <div class="who">
        <div class="nm">${escapeHtml(p.name)}${isMe ? ' <span class="badge green">你</span>' : ""}</div>
        <div class="st">${p.connected ? "🟢 在线" : "⚪ 离线"} · ${p.vote === true ? "✅ 同意开局" : "⏳ 未投票"}</div>
      </div>`;
    grid.appendChild(el);
  });

  const logBox = $("logBox");
  logBox.innerHTML = s.log.map((l) => `<div class="li"><time>${fmtTime(l.t)}</time>${escapeHtml(l.msg)}</div>`).join("");
  logBox.scrollTop = logBox.scrollHeight;
}

async function renderGame(s) {
  try {
    const mod = await import("/js/game.js");
    mod.renderGame($("gameRoot"), s, me, conn);
  } catch (e) {
    console.error("renderGame failed:", e, "state=", s);
    $("gameRoot").innerHTML = `<div class="card" style="border-color:#c0392b"><h3 style="color:#c0392b">渲染出错</h3><pre style="font-size:11px;color:#7a684c;white-space:pre-wrap">${String(e.stack || e.message || e).slice(0, 800)}</pre></div>`;
  }
}

function renderFinished(s) {
  const box = $("finishedRoot");
  box.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<h2 class="mt0">🏁 游戏结束</h2><p class="muted">结算界面加载中…</p>`;
  box.appendChild(card);
  import("/js/game.js").then((mod) => mod.renderFinished(box, s, me));
}

function escapeHtml(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function voteYes() {
  const btn = $("btnVoteYes");
  if (!debounce("vote-yes", 500)) return;
  run(btn, "⏳", () => {
    conn.send({ t: "vote", yes: true });
  });
}
function voteNo() {
  const btn = $("btnVoteNo");
  if (!debounce("vote-no", 500)) return;
  run(btn, "⏳", () => {
    conn.send({ t: "vote", yes: false });
  });
}
$("btnVoteYes").onclick = voteYes;
$("btnVoteNo").onclick = voteNo;
$("btnLeave").onclick = () => {
  if (!debounce("leave", 500)) return;
  if (!confirm("确定离开房间？")) return;
  conn.send({ t: "leave" });
  if (me.pid) lsDel(`agri:room:${code}`);
  conn.close();
  location.href = "/";
};

start();
import("/js/tutorial.js").then((m) => m.bindTutorialTriggers());
import("/js/sfx.js").then((m) => m.bindSfx());
import("/js/bgm.js");
