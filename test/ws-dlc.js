// ============================================================
// 端到端：全 DLC 开启（职业 + 小发展卡 + 荒野之地）真实 WS 对局
// 验证：选职业 → 抢小发展卡 → 燃料/干草 → 拓荒 → 撒种 → 收获扣燃料
// 用法: node test/ws-dlc.js [baseUrl]
// ============================================================
const BASE = process.argv[2] || "http://127.0.0.1:8787";
let failures = 0;
function ok(c, n) { c ? (console.log(`  ✅ ${n}`), 0) : (console.log(`  ❌ ${n}`), failures++); }

const http = (path, opts) => fetch(BASE + path, opts).then((r) => r.json());

async function main() {
  console.log(`▶ 全 DLC 端到端测试 → ${BASE}`);

  // 1. 创建全 DLC 房间
  const room = await http("/api/host/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dlc: { occupations: true, minorImprovements: true, moor: true } }),
  });
  ok(room.ok, `创建全 DLC 房间 ${room.roomCode}`);
  const { roomCode } = room;

  // 2. 加入 + 开局
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + `/api/ws?code=${roomCode}`);
  const queue = [];
  const waiters = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    const w = waiters.shift();
    if (w) w(m); else queue.push(m);
  };
  const next = () => queue.length ? Promise.resolve(queue.shift())
    : new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), 5000); waiters.push((m) => { clearTimeout(t); res(m); }); });
  const send = (o) => ws.send(JSON.stringify(o));
  const waitState = async (pred, name, tries = 10) => {
    for (let i = 0; i < tries; i++) {
      const m = await next();
      if (m.t === "state" && pred(m)) return m;
    }
    ok(false, name);
    return null;
  };

  await new Promise((r) => ws.addEventListener("open", r));
  send({ t: "hello", role: "player", name: "DLC机器人" });
  const hello = await (async () => {
    for (let i = 0; i < 5; i++) { const m = await next(); if (m.t === "hello") return m; }
  })();
  ok(!!hello?.you?.pid, "玩家加入成功");
  const pid = hello.you.pid;

  send({ t: "vote", yes: true });
  const started = await waitState((m) => m.phase === "playing", "开局成功");
  ok(!!started, "全员同意 → 进入游戏");

  const g0 = started.game;
  ok(g0.dlc?.occupations === true && g0.dlc?.minorImprovements === true && g0.dlc?.moor === true, "房间 DLC 配置齐全（职业/小发展卡/Moor）");
  ok((g0.players[0].occupationHand || []).length === 7, `职业手牌 7 张（实际 ${(g0.players[0].occupationHand || []).length}）`);
  ok((g0.minorImprovementCards || []).length >= 1, `场上小发展卡 ≥1（实际 ${(g0.minorImprovementCards || []).length}）`);
  ok(typeof g0.moorFuelPile === "number" && g0.moorFuelPile >= 1, `燃料堆已累积（${g0.moorFuelPile}）`);
  ok(typeof g0.moorHayPile === "number" && g0.moorHayPile >= 1, `干草堆已累积（${g0.moorHayPile}）`);

  const act = async (action, name) => {
    send({ t: "act", action });
    for (let i = 0; i < 6; i++) {
      const m = await next();
      if (m.t === "err") { ok(false, `${name} 被拒: ${m.msg}`); return null; }
      if (m.t === "state") return m;
    }
    ok(false, `${name} 超时`);
    return null;
  };

  // 3. 选职业（不消耗工人）
  const hand0 = g0.players[0].occupationHand;
  const afterOcc = await act({ type: "ChooseOccupation", id: hand0[0].id }, "选职业");
  ok(!!afterOcc && afterOcc.game.players[0].occupation?.id === hand0[0].id, `选职业成功（${afterOcc?.game?.players[0]?.occupation?.name}）`);

  // 4. 抢小发展卡（消耗 1 工人；第 1 轮即可抢，小发展卡开局就在场）
  const minorId = g0.minorImprovementCards[0].id;
  const afterMinor = await act({ type: "TakeMinorImprovement", id: minorId }, "抢小发展卡");
  ok(!!afterMinor && afterMinor.game.players[0].minorImprovements.includes(minorId), `小发展卡已入手（${minorId}）`);

  // 5. 主循环：Moor 回合卡揭示后按优先级行动（收燃料 → 割草 → 拓荒 → 沼泽撒种），否则补建材 / 打日工
  //    注意：GatherFuel 第 2 轮揭示、ReclaimMoor 第 4 轮、CutMeadow 第 7 轮 —— 第 1 轮只能做常规行动

  // 6. 主循环：Moor 回合卡揭示后按优先级行动（收燃料 → 割草 → 拓荒 → 沼泽撒种），否则补建材 / 打日工
  const FALLBACK = ["DayLaborer", "Fishing", "StartPlayer", "Wood", "Reed"];
  let sawFuel = false, sawHay = false, reclaimed = false, sown = false;
  let cur = afterMinor;
  let steps = 0;
  while (cur && !cur.game.finished && cur.game.round < 8 && steps < 160) {
    steps++;
    const g = cur.game;
    const p = g.players[0];
    if (!g.waitingFor || g.waitingFor[0] !== pid) break;
    const used = g.usedSpaces || [];
    const revealed = g.revealed || [];
    let action = null;
    if (revealed.includes("GatherFuel") && !used.includes("GatherFuel") && g.moorFuelPile > 0) { action = { type: "GatherFuel" }; sawFuel = true; }
    else if (revealed.includes("CutMeadow") && !used.includes("CutMeadow") && g.moorHayPile > 0) { action = { type: "CutMeadow" }; sawHay = true; }
    else if (revealed.includes("ReclaimMoor") && !used.includes("ReclaimMoor") && !reclaimed && p.resources.wood >= 1 && p.resources.reed >= 1) {
      const taken = new Set((g.moorBoard || []).map((c) => `${c.x},${c.y}`));
      outer: for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        if (!taken.has(`${x},${y}`)) { action = { type: "ReclaimMoor", x, y }; reclaimed = true; break outer; }
      }
    }
    else if (reclaimed && !sown && !used.includes("SowMoor") && p.resources.grain >= 1) {
      const cell = (g.moorBoard || []).find((c) => !c.crop);
      if (cell) { action = { type: "SowMoor", x: cell.x, y: cell.y, crop: "grain" }; sown = true; }
    }
    else if (!reclaimed && p.resources.wood < 1 && !used.includes("Wood") && g.piles.Wood > 0) action = { type: "Take", space: "Wood" };
    else if (!reclaimed && p.resources.reed < 1 && !used.includes("Reed") && g.piles.Reed > 0) action = { type: "Take", space: "Reed" };
    else if (reclaimed && !sown && p.resources.grain < 1 && !used.includes("Grain") && g.piles.Grain > 0) action = { type: "Take", space: "Grain" };
    else {
      const fb = FALLBACK.find((s) => !used.includes(s) && (s === "DayLaborer" || s === "Fishing" || s === "StartPlayer" ||
        (s === "Wood" && g.piles.Wood > 0) || (s === "Reed" && g.piles.Reed > 0)));
      action = fb ? { type: "Take", space: fb } : null;
    }
    if (!action) break;
    cur = await act(action, `第 ${g.round} 轮 ${action.type}${action.space || ""}`);
  }
  ok(sawFuel, "过程中收到过燃料");
  ok(sawHay, "过程中拿到过干草");
  ok(reclaimed, "成功拓荒沼泽");
  ok(sown, "成功在沼泽撒种");

  // 7. 跑过第 4 轮收获（round >= 5），验证 Moor 收获阶段执行过
  ok(!!cur && cur.game.round >= 5, `推进过第 4 轮收获（round=${cur?.game?.round}）`);
  if (cur && cur.game.round >= 5) {
    const p = cur.game.players[0];
    ok(Number.isFinite(p.fuel) && Number.isFinite(p.hay), `收获后 fuel/hay 为有限数（fuel=${p.fuel}, hay=${p.hay}）`);
    ok(Number.isFinite(p.food) && Number.isFinite(p.beggings), `食物/乞讨卡为有限数（food=${p.food}, beggings=${p.beggings}）`);
    const logText = (cur.game.log || []).map((e) => e.msg).join("\n");
    ok(/燃烧|乞讨/.test(logText), "收获日志含燃料燃烧或乞讨记录");
  }

  // 8. 沼泽板状态完整
  const board = cur?.game?.moorBoard || [];
  ok(board.length >= 1, `沼泽板开垦数 ≥1（实际 ${board.length}）`);
  const sownCell = board.find((c) => c.crop);
  ok(!!sownCell || steps > 100, "沼泽田有作物或流程完整跑完");

  try { ws.close(); } catch {}
  console.log(failures === 0 ? "\n🎉 全 DLC 端到端通过" : `\n💥 ${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("测试异常:", e); process.exit(1); });
