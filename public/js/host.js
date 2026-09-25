// ============================================================
// 主持台 v4：全局公共房间池（任何浏览器、任何身份都共享同一房间）
//   - 创建房间：任何人都能建，最多 10 间
//   - 列出房间：任何人都能看
//   - 解散房间：任何人都能解散
// ============================================================
import { connectRoom, copyText, fmtTime, lsDel, toast } from "/js/common.js";
import { bindRipples, revealFlipIn, viewportKind } from "/js/anim.js";
import { lock, unlock, run } from "/js/loading.js";

let _rooms = []; // [{roomCode, specCode, phase, players:[name], onlineCount, closed}]
let _activeConn = null;
let _activeCode = null;
let _activeState = null;
let _activeMeta = null;

const PHASE_ZH = { lobby: "⏳ 等待开局", playing: "🎮 进行中", finished: "🏁 已结束" };

const $ = (id) => document.getElementById(id);

async function refresh() {
  try {
    const res = await fetch("/api/host/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!data.ok) {
      toast(data.msg || "加载失败", true);
      return;
    }
    _rooms = data.rooms || [];
    $("capMax").textContent = data.max;
    $("capMax2").textContent = data.max;
    $("usedCount").textContent = _rooms.length;
    renderList();
  } catch (e) {
    toast("网络错误：" + (e.message || e), true);
  }
}

function renderEmpty() {
  $("roomList").innerHTML = `
    <div class="card soft anim-pop-in" style="text-align:center; padding:32px 20px;">
      <div style="font-size:44px">🚜</div>
      <h3 class="mt8">当前暂无活跃房间</h3>
      <p class="muted">点上方「＋ 新建房间」即可开启新的农场对局。</p>
    </div>`;
}

function renderList() {
  const max = parseInt($("capMax").textContent, 10);
  const list = $("roomList");
  if (_rooms.length === 0) return renderEmpty();

  const cards = _rooms.map((r, i) => roomCardHTML(r, i));
  list.innerHTML = cards.join("");
  // 入场动画
  if (window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealFlipIn(list, ":scope > .room-card", 50);
  }
  // 绑定点击进入管理
  list.querySelectorAll(".room-card").forEach((el) => {
    el.addEventListener("click", (e) => {
      // 避免点击内嵌按钮穿透
      const btn = e.target.closest("button");
      if (btn) return;
      const code = el.dataset.code;
      openManage(code);
    });
  });
  // 操作按钮
  list.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.dataset.code;
      const act = btn.dataset.act;
      if (act === "watch") location.href = `/play.html?spec=${_rooms.find((r) => r.roomCode === code)?.specCode || ""}`;
      else if (act === "delete") askDelete(code);
    });
  });

  // 创建按钮的启用/禁用
  const btnCreate = $("btnCreate");
  if (_rooms.length >= max) {
    btnCreate.setAttribute("disabled", "true");
    btnCreate.textContent = `已达上限（${_rooms.length}/${max}）· 先解散闲置房间`;
  } else {
    btnCreate.removeAttribute("disabled");
    btnCreate.textContent = `＋ 新建房间（${_rooms.length}/${max}）`;
  }
}

function roomCardHTML(r, i) {
  const phase = PHASE_ZH[r.phase] || r.phase;
  const closed = r.closed ? `<span class="badge red">已解散</span>` : "";
  const players = r.players && r.players.length ? r.players.map(escapeHtml).join("、") : "（暂无）";
  const status = r.closed
    ? `<span class="badge red">已关闭${r.closedReason ? " · " + escapeHtml(r.closedReason) : ""}</span>`
    : `<span class="badge">${phase}</span> <span class="badge ${r.onlineCount > 0 ? "green" : ""}">${r.onlineCount}/${(r.players||[]).length} 在线</span>`;
  const dlcBadge = (r.dlc && (r.dlc.occupations || r.dlc.minorImprovements || r.dlc.moor))
    ? `<span class="badge gold">🎴 含 DLC</span>`
    : "";
  return `
    <div class="card room-card anim-pop-in" data-code="${escapeHtml(r.roomCode)}" style="cursor:pointer; transition: box-shadow .15s, transform .15s;">
      <div class="row spread">
        <div>
          <h3 class="mt0 mb8" style="font-size:17px">🚜 房间 <span class="mono" style="font-size:20px; letter-spacing:4px; color:var(--leaf-dark)">${escapeHtml(r.roomCode)}</span></h3>
          <p class="muted mb0">旁观码 <span class="mono">${escapeHtml(r.specCode || "")}</span> · 玩家：${players}</p>
        </div>
        <div class="row" style="gap:8px; flex-wrap:wrap">
          ${status}
          ${dlcBadge}
          ${r.closed ? "" : `<button class="btn blue small" data-act="watch" data-code="${escapeHtml(r.roomCode)}">👀 观战</button>`}
          <button class="btn danger-ghost small" data-act="delete" data-code="${escapeHtml(r.roomCode)}">🗑 解散</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(t) {
  return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- 房间配置弹窗：每个房间独立选 DLC ----
let _dlcModalEl = null;
let _dlcModalMask = null;
let _dlcPendingConfig = null; // { dlc: {...}, resolve, reject }
let _dlcModalEscBound = false;

function openRoomConfigModal() {
  if (_dlcModalEl) return; // 已开
  const escFn = (e) => { if (e.key === "Escape") cancelRoomConfig(); };
  if (!_dlcModalEscBound) {
    _dlcModalEscBound = true;
    document.addEventListener("keydown", escFn);
    _dlcModalEscKeyFn = escFn;
  }

  _dlcModalMask = document.createElement("div");
  _dlcModalMask.id = "roomCfgMask";
  _dlcModalMask.className = "modal-mask";
  _dlcModalMask.style.cssText = "position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(40,28,12,0.5);backdrop-filter:blur(2px)";
  _dlcModalMask.innerHTML = `
    <div class="modal anim-pop-in" style="max-width:520px;width:100%">
      <div class="row spread" style="align-items:center;margin-bottom:6px">
        <h3 class="mt0 mb0">🚜 新建房间配置</h3>
        <button class="btn ghost small" id="roomCfgClose" type="button">取消</button>
      </div>
      <p class="muted" style="margin-top:0">每间房间可启用不同的 DLC。本房间启用后，<b>玩家端</b>会出现 DLC 规则入口。</p>
      <div class="dlc-grid mt8">
        <label class="dlc-opt">
          <input type="checkbox" id="roomCfgOcc">
          <div>
            <div class="dlc-title">🎴 88 种经典职业 + 小发展卡</div>
            <div class="muted" style="font-size:12px">开局每位玩家从 7 张随机职业中精选 1 张就任（全套 88 张官方经典职业涵盖 7 大流派）；场上抽 1 张「小发展卡」供争抢。极大丰富策略深度，强烈推荐！</div>
          </div>
        </label>
        <label class="dlc-opt">
          <input type="checkbox" id="roomCfgMoor">
          <div>
            <div class="dlc-title">🌲 沼泽农夫（荒野之地扩展）</div>
            <div class="muted" style="font-size:12px">新增燃料/干草资源 + 公有沼泽板（拓荒/撒种/收获）+ 4 张新大发展卡。收获阶段新增燃料取暖与喂干草，带来更拟真的农耕开拓体验。可与职业扩展自由叠加。</div>
          </div>
        </label>
        <label class="dlc-opt">
          <input type="checkbox" id="roomCfgSeasons">
          <div>
            <div class="dlc-title">📅 节气轮转（Through the Seasons 扩展）</div>
            <div class="muted" style="font-size:12px">每一轮代表一个季节（春→夏→秋→冬循环轮转）：季节改变资源产量与部分行动（冬季犁地要 1 食物、鱼塘封冻；春季栅栏免费段；夏季建房送马厩、度假得分；秋季大改进减建材），并新增一个「节气行动」格。与其他 DLC 自由叠加。</div>
          </div>
        </label>
      </div>
      <div class="row spread mt16" style="align-items:center">
        <span class="muted" style="font-size:12px">所有浏览器共享同一房间池</span>
        <div class="row" style="gap:8px">
          <button class="btn ghost" id="roomCfgCancel" type="button">取消</button>
          <button class="btn big gold" id="roomCfgConfirm" type="button">✓ 创建房间</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(_dlcModalMask);
  _dlcModalEl = _dlcModalMask;

  _dlcModalMask.querySelector("#roomCfgClose").onclick = cancelRoomConfig;
  _dlcModalMask.querySelector("#roomCfgCancel").onclick = cancelRoomConfig;
  _dlcModalMask.querySelector("#roomCfgConfirm").onclick = confirmRoomConfig;
  // 点弹窗外的暗色区域关闭 —— 弹窗内部会阻止冒泡
  _dlcModalMask.addEventListener("click", (e) => {
    if (e.target === _dlcModalMask) cancelRoomConfig();
  });
  const modalCard = _dlcModalMask.querySelector(".modal");
  if (modalCard) modalCard.addEventListener("click", (e) => e.stopPropagation());

  requestAnimationFrame(() => {
    _dlcModalMask.classList.add("show");
  });
}

function cancelRoomConfig() {
  if (_dlcModalMask) {
    _dlcModalMask.classList.add("hidden");
    setTimeout(() => { _dlcModalMask?.remove(); _dlcModalMask = null; _dlcModalEl = null; }, 180);
  }
  _dlcPendingConfig = null;
}

async function confirmRoomConfig() {
  const occ = !!_dlcModalMask?.querySelector("#roomCfgOcc")?.checked;
  const moor = !!_dlcModalMask?.querySelector("#roomCfgMoor")?.checked;
  const seasons = !!_dlcModalMask?.querySelector("#roomCfgSeasons")?.checked;
  const dlc = {
    occupations: occ,
    minorImprovements: occ, // 与职业同开关（同一分组）
    moor,
    seasons,
  };
  // 关弹窗 + 异步建房间
  cancelRoomConfig();
  await createRoom({ dlc });
}

let _dlcModalEscKeyFn = null;

// ---- 创建房间 ----
// createRoom 只接受显式参数（由配置弹窗传入）；不再有"上次配置"记忆，弹窗自带默认值
async function createRoom(opts) {
  const btn = $("btnCreate");
  const dlc = opts?.dlc || { occupations: false, minorImprovements: false, moor: false, seasons: false };

  try {
    await run(btn, "⏳ 创建中…", async () => {
      const res = await fetch("/api/host/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dlc }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.msg || "创建失败", true);
        throw new Error("create_failed");
      }
      const tag = dlc.occupations || dlc.moor || dlc.seasons
        ? `（${dlc.occupations ? "职业 DLC " : ""}${dlc.moor ? "沼泽农夫 " : ""}${dlc.seasons ? "节气轮转" : ""}）`
        : "";
      toast(`已创建房间 ${data.roomCode}${tag}`.replace(/\s+/g, " "));
      await refresh();
      openManage(data.roomCode);
    });
  } finally {
    renderList();
  }
}

// ---- 解散确认 ----
function askDelete(code) {
  const meta = _rooms.find((r) => r.roomCode === code);
  if (!meta) return;
  openManageModal(`
    <h3 class="mt0">解散房间 <span class="mono">${escapeHtml(code)}</span>？</h3>
    <p class="muted">所有玩家将被请出，且无法恢复。</p>
    <div class="row mt16">
      <button class="btn danger-ghost" id="cancelDel">取消</button>
      <button class="btn red" id="confirmDel">确认解散</button>
    </div>
  `, (root) => {
    const cancel = root.querySelector("#cancelDel");
    const confirm = root.querySelector("#confirmDel");
    cancel.onclick = () => closeManageModal();
    confirm.onclick = async () => {
      await run(confirm, "⏳ 解散中…", async () => {
        try {
          const r = await fetch("/api/host/delete", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          const data = await r.json();
          if (data.ok) {
            toast("房间已解散");
            closeManageModal();
            await refresh();
          } else {
            toast(data.msg || "解散失败", true);
            throw new Error("delete_failed");
          }
        } catch (e) {
          toast("网络错误，请重试", true);
          throw e;
        }
      });
    };
  });
}

/** 关闭当前管理模态（并断开 WS） */
function closeManageModal() {
  if (_activeConn) { try { _activeConn.close(); } catch {} _activeConn = null; }
  _activeCode = null; _activeState = null; _activeMeta = null;
  const m = $("manageModal");
  if (m) m.classList.add("hidden");
}

// ---- 单房间管理模态 ----
function openManage(code) {
  const meta = _rooms.find((r) => r.roomCode === code);
  if (!meta) return;
  _activeMeta = meta;
  _activeCode = code;
  openManageModal(renderManageContent(meta), (root) => {
    root.querySelector("#closeManage").onclick = closeManage;
    root.querySelector("#copyRoomBtn").onclick = (e) => {
      copyText(code, "房间码已复制");
      flashCopied(e.currentTarget);
    };
    root.querySelector("#copySpecBtn").onclick = (e) => {
      copyText(meta.specCode, "旁观码已复制");
      flashCopied(e.currentTarget);
    };
    root.querySelector("#copyLinkBtn").onclick = (e) => {
      copyText(`${location.origin}/?code=${code}`, "玩家加入链接已复制");
      flashCopied(e.currentTarget);
    };
    root.querySelector("#copySpecLinkBtn").onclick = (e) => {
      copyText(`${location.origin}/?spec=${meta.specCode}`, "旁观链接已复制");
      flashCopied(e.currentTarget);
    };
    root.querySelector("#btnDelete").onclick = () => askDelete(code);
    bindRipples(root);
  });
  // 打开 WS 实时监听
  if (_activeConn) { try { _activeConn.close(); } catch {} }
  const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws?code=${code}`;
  const conn = connectRoom({
    code,
    hello: { t: "hello", role: "host" },
    onState(s) { _activeState = s; renderManageState(s); },
    onClosed(m) { closeManage(); toast("房间已关闭", true); refresh(); },
    onErr(m) { toast(m.msg || "错误", true); },
  });
  _activeConn = conn;
}

function flashCopied(el) {
  if (!el) return;
  el.classList.add("is-copied");
  setTimeout(() => el.classList.remove("is-copied"), 700);
}

function renderManageContent(meta) {
  const closed = meta.closed ? `<span class="badge red">已关闭</span>` : "";
  return `
    <h3 class="mt0">🚜 房间 <span class="mono">${escapeHtml(meta.roomCode)}</span> ${closed}</h3>
    <div class="row" style="gap:10px; margin-top:8px;">
      <div class="code-display copyable" id="copyRoomBtn" title="点击复制房间码" style="flex:1; min-width:0; padding:12px; position:relative;">
        <div style="text-align:center"><div class="lbl">房间码</div><div class="digits" style="font-size:30px">${escapeHtml(meta.roomCode)}</div></div>
        <div class="copy-ico" aria-hidden="true">📋</div>
      </div>
      <div class="code-display copyable" id="copySpecBtn" title="点击复制旁观码" style="flex:1; min-width:0; padding:12px; position:relative; background:linear-gradient(160deg,#4d7fa3,#39607e);">
        <div style="text-align:center"><div class="lbl">旁观码</div><div class="digits" style="font-size:30px">${escapeHtml(meta.specCode)}</div></div>
        <div class="copy-ico" aria-hidden="true">📋</div>
      </div>
    </div>
    <p class="muted" style="text-align:center;font-size:12px;margin:8px 0 0">↑ 点击房间码或旁观码即可复制</p>
    <div class="row mt16" style="gap:8px; flex-wrap:wrap">
      <button id="copyLinkBtn" class="btn ghost small">🔗 复制玩家加入链接</button>
      <button id="copySpecLinkBtn" class="btn ghost small">🔗 复制旁观链接</button>
    </div>
    <hr class="sep">
    <h4 class="mt0">👥 玩家 <span id="liveCount" class="muted">(0/4)</span> · <span id="livePhase" class="badge">${PHASE_ZH[meta.phase] || meta.phase}</span></h4>
    <div id="livePlayers" class="players-grid"></div>
    <hr class="sep">
    <h4 class="mt0">📜 动态日志</h4>
    <div id="liveLog" class="log"></div>
    <div class="row mt16" style="gap:8px; justify-content:flex-end">
      <button id="btnDelete" class="btn red small">🗑 解散</button>
      <button id="closeManage" class="btn ghost">关闭</button>
    </div>
  `;
}

function renderManageState(s) {
  if (!_activeMeta || _activeMeta.roomCode !== s.code) return;
  const phase = PHASE_ZH[s.phase] || s.phase;
  const livePhase = $("livePhase"); if (livePhase) livePhase.textContent = phase;
  const liveCount = $("liveCount"); if (liveCount) liveCount.textContent = `(${s.players.length}/4)`;
  const grid = $("livePlayers"); if (grid) {
    grid.innerHTML = s.players.length === 0
      ? `<p class="muted">还没有玩家加入</p>`
      : s.players.map((p) => `
        <div class="player-chip">
          <div class="avatar" style="background:${p.color}">👤</div>
          <div class="who">
            <div class="nm">${escapeHtml(p.name)}</div>
            <div class="st">${p.connected ? "🟢 在线" : "⚪ 离线"} · ${p.vote === true ? "✅ 同意" : p.vote === false ? "⏳ 未投" : "—"}</div>
          </div>
        </div>`).join("");
  }
  const liveLog = $("liveLog"); if (liveLog) {
    liveLog.innerHTML = (s.log || []).slice(-30).map((l) => `<div class="li"><time>${fmtTime(l.t)}</time>${escapeHtml(l.msg)}</div>`).join("");
    liveLog.scrollTop = liveLog.scrollHeight;
  }
}

function openManageModal(html, onMount) {
  const mask = $("manageModal");
  const box = $("manageBox");
  box.innerHTML = `<div class="act-modal entering">${html}</div>`;
  mask.classList.remove("hidden");
  if (onMount) onMount(box);
}

function closeManage() {
  if (_activeConn) { try { _activeConn.close(); } catch {} _activeConn = null; }
  $("manageModal").classList.add("hidden");
  _activeCode = null; _activeState = null; _activeMeta = null;
}

// 点击背景关闭
$("manageModal")?.addEventListener("click", (e) => { if (e.target.id === "manageModal") closeManage(); });

// ---- 初始化 ----
// 点新建：弹「房间配置」对话框 → 选 DLC → 用户点确认才创建
$("btnCreate").onclick = () => openRoomConfigModal();
bindRipples(document);

// 首次进入：直接拉全局房间池
(async () => {
  bindRipples(document);
  await refresh();
  // 旧版遗留：清掉老 storage key（一次性）
  lsDel("agri:host");
  lsDel("agri:host:token");
})();