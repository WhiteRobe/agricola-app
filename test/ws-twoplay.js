// ============================================================
// 真实两玩家端到端：2 玩家 WS + 1 房主 WS，验证全 14 轮对局推进与结算
// 用法: node test/ws-twoplay.js [baseUrl]
// ============================================================
const BASE = process.argv[2] || "http://127.0.0.1:8787";
let failures = 0;
function ok(c, n) { c ? (console.log(`  ✅ ${n}`), 0) : (console.log(`  ❌ ${n}`), failures++); }

const http = (path, opts) => fetch(BASE + path, opts).then((r) => r.json());

function createClient(role, code) {
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + `/api/ws?code=${code}`);
  let latestState = null;
  let latestHello = null;
  const stateWaiters = [];
  const helloWaiters = [];

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello") {
      latestHello = m;
      while (helloWaiters.length) helloWaiters.shift()(m);
    } else if (m.t === "state") {
      latestState = m;
      const list = [...stateWaiters];
      stateWaiters.length = 0;
      for (const cb of list) cb({ ok: true, state: m });
    } else if (m.t === "err") {
      const list = [...stateWaiters];
      stateWaiters.length = 0;
      for (const cb of list) cb({ ok: false, err: m });
    }
  };
  ws.onerror = (e) => console.error(`[${role}] WS 异常:`, e.message);

  const send = (o) => ws.send(JSON.stringify(o));

  const waitOpen = () => new Promise((res) => ws.addEventListener("open", res));

  const waitHello = (timeoutMs = 5000) => {
    if (latestHello) return Promise.resolve(latestHello);
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`[${role}] waitHello 超时`)), timeoutMs);
      helloWaiters.push((m) => { clearTimeout(t); res(m); });
    });
  };

  const waitFor = (pred, timeoutMs = 6000) => {
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`[${role}] waitFor 超时`)), timeoutMs);
      const listener = (resp) => {
        if (!resp.ok) {
          clearTimeout(t);
          res(resp);
        } else if (pred(resp.state)) {
          clearTimeout(t);
          res(resp);
        } else {
          stateWaiters.push(listener);
        }
      };
      stateWaiters.push(listener);
    });
  };

  const waitNextMessage = (timeoutMs = 6000) => {
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`[${role}] waitNextMessage 超时`)), timeoutMs);
      stateWaiters.push((resp) => {
        clearTimeout(t);
        res(resp);
      });
    });
  };

  const close = () => { try { ws.close(); } catch {} };

  return { ws, send, waitOpen, waitHello, waitFor, waitNextMessage, getState: () => latestState, close };
}

// 围出右侧整列 5 格矩形牧场所用的 6 段栅栏
const FENCES_RIGHT_COL = ["h2,0", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"];

function choosePlayerAction(p, g) {
  const used = g.usedSpaces || [];
  const open = (id) => !used.includes(id);
  const rev = (id) => (g.revealed || []).includes(id);
  const pile = (k) => (g.piles && g.piles[k] > 0 ? g.piles[k] : 0);

  // 1. 如果有 ≥6 木头，且还没建过牧场，且建栅栏卡已揭示 → 建牧场（容量 10，能养羊/猪/牛）
  if (p.resources.wood >= 6 && (!p.pastures || p.pastures.length === 0) && rev("Fences") && open("Fences")) {
    return { type: "BuildFences", edges: FENCES_RIGHT_COL };
  }

  // 2. 如果已有牧场，且动物市场开放且有动物 → 抢动物
  const hasPastureRoom = (p.pastures || []).some((pst) => {
    const placed = (p.pastureAnimalCells && p.pastureAnimalCells[pst.id]) || [];
    return placed.length < pst.cells.length * 2;
  });

  if (hasPastureRoom) {
    if (g.round >= 4 && pile("Sheep") > 0 && open("Sheep")) return { type: "Take", space: "Sheep" };
    if (g.round >= 8 && pile("Boar") > 0 && open("Boar")) return { type: "Take", space: "Boar" };
    if (g.round >= 12 && pile("Cattle") > 0 && open("Cattle")) return { type: "Take", space: "Cattle" };
  }

  // 3. Moor 动作（若开启）
  if (g.dlc?.moor) {
    // 拓荒：需要 1 木 + 1 芦苇
    if (g.round >= 4 && rev("ReclaimMoor") && open("ReclaimMoor") &&
        p.resources.wood >= 1 && p.resources.reed >= 1 && (g.moorBoard || []).length < 16) {
      const taken = new Set((g.moorBoard || []).map((c) => `${c.x},${c.y}`));
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (!taken.has(`${x},${y}`)) return { type: "ReclaimMoor", x, y };
        }
      }
    }
    // 沼泽撒种
    if (rev("SowMoor") && open("SowMoor") && p.resources.grain >= 1 && (g.moorBoard || []).some((c) => !c.crop)) {
      const cell = (g.moorBoard || []).find((c) => !c.crop);
      if (cell) return { type: "SowMoor", x: cell.x, y: cell.y, crop: "grain" };
    }
    // 收集燃料
    if (rev("GatherFuel") && open("GatherFuel") && (g.moorFuelPile || 0) > 0) {
      return { type: "GatherFuel" };
    }
    // 割草甸
    if (rev("CutMeadow") && open("CutMeadow") && (g.moorHayPile || 0) > 0) {
      return { type: "CutMeadow" };
    }
  }

  // 4. 木材积累（建栅栏需要木）
  if (open("Wood") && pile("Wood") >= 2) return { type: "Take", space: "Wood" };

  // 5. 芦苇（拓荒/翻修需要）
  if (open("Reed") && pile("Reed") >= 1) return { type: "Take", space: "Reed" };

  // 6. 陶坑/石场
  if (open("Clay") && pile("Clay") >= 2) return { type: "Take", space: "Clay" };
  if (g.round >= 4 && open("Stone") && pile("Stone") >= 1) return { type: "Take", space: "Stone" };

  // 7. 谷物
  if (open("Grain") && pile("Grain") >= 1) return { type: "Take", space: "Grain" };

  // 8. 钓鱼（保命食物）
  if (open("Fishing") && pile("Fishing") >= 1) return { type: "Take", space: "Fishing" };

  // 9. 木材底保
  if (open("Wood") && pile("Wood") > 0) return { type: "Take", space: "Wood" };

  // 10. 日工（固定 +2 食物）
  if (open("DayLaborer")) return { type: "Take", space: "DayLaborer" };

  // 11. 起始玩家（抢先手 + 1 食物）
  if (open("StartPlayer")) return { type: "Take", space: "StartPlayer" };

  // 12. 犁地
  if (open("PlowField")) return { type: "PlowField", x: 2, y: 4 };

  return null;
}

async function main() {
  console.log(`▶ 双真实玩家端到端完整对局测试（房主 + 玩家一 + 玩家二）→ ${BASE}`);

  // 1. 创建房间（开启「沼泽农夫」扩展）
  const room = await http("/api/host/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dlc: { occupations: false, minorImprovements: false, moor: true } }),
  });
  ok(room.ok, `创建房间 ${room.roomCode}（Moor DLC 激活）`);
  const { roomCode } = room;

  // 2. 房主连接 WS
  const host = createClient("host", roomCode);
  await host.waitOpen();
  host.send({ t: "hello", role: "host" });
  const hostHello = await host.waitHello();
  ok(hostHello.t === "hello" && hostHello.you.role === "host", "房主 WS 连接成功");

  // 3. 玩家 1 连接 WS
  const p1 = createClient("p1", roomCode);
  await p1.waitOpen();
  p1.send({ t: "hello", role: "player", name: "张三" });
  const p1Hello = await p1.waitHello();
  ok(p1Hello.you.role === "player" && p1Hello.you.name === "张三", `玩家 1「张三」加入（pid=${p1Hello.you.pid.slice(0, 6)}）`);

  // 4. 玩家 2 连接 WS
  const p2 = createClient("p2", roomCode);
  await p2.waitOpen();
  p2.send({ t: "hello", role: "player", name: "李四" });
  const p2Hello = await p2.waitHello();
  ok(p2Hello.you.role === "player" && p2Hello.you.name === "李四", `玩家 2「李四」加入（pid=${p2Hello.you.pid.slice(0, 6)}）`);

  // 5. 两人投票开局
  p1.send({ t: "vote", yes: true });
  p2.send({ t: "vote", yes: true });

  const startRes = await host.waitFor((m) => m.phase === "playing");
  ok(startRes.ok && startRes.state.game.players.length === 2, `游戏成功开启，玩家数 = ${startRes.state?.game?.players?.length}`);
  ok(startRes.state.game.players[0].name === "张三" && startRes.state.game.players[1].name === "李四", "两名玩家就位");

  // 6. 循环轮转行动推进 14 轮
  let totalActions = 0;
  const maxSteps = 400;
  let currentState = startRes.state;

  while (totalActions < maxSteps) {
    const g = currentState?.game;
    if (!g || g.finished || currentState.phase === "finished") break;

    if (!g.waitingFor || g.waitingFor.length === 0) {
      ok(false, `第 ${g.round} 轮 waitingFor 为空但未结束`);
      break;
    }

    const curPid = g.waitingFor[0];
    const curPlayer = g.players.find((p) => p.id === curPid);
    if (!curPlayer) {
      ok(false, `找不到玩家 pid=${curPid}`);
      break;
    }

    const action = choosePlayerAction(curPlayer, g);
    if (!action) {
      ok(false, `第 ${g.round} 轮「${curPlayer.name}」无合法行动（used=[${(g.usedSpaces || []).join(",")}]）`);
      break;
    }

    const activeClient = curPid === p1Hello.you.pid ? p1 : p2;
    const prevLogLen = g.log ? g.log.length : 0;
    const prevRound = g.round;

    const hostPromise = host.waitFor((st) => {
      const ng = st.game;
      if (!ng) return false;
      return ng.round > prevRound || (ng.log && ng.log.length > prevLogLen);
    });

    const errPromise = activeClient.waitFor(() => false);

    activeClient.send({ t: "act", action });

    const actResult = await Promise.race([hostPromise, errPromise]);

    if (!actResult.ok) {
      ok(false, `第 ${g.round} 轮「${curPlayer.name}」执行 ${JSON.stringify(action)} 失败: ${actResult.err?.msg || "未知错误"}`);
      break;
    }

    currentState = actResult.state;
    totalActions++;
  }

  const finalState = host.getState();
  const finalGame = finalState?.game;
  ok(finalGame && finalGame.finished, `对局正常推进完成（第 ${finalGame?.round} 轮，finished=${finalGame?.finished}）`);
  ok(finalGame?.scores && finalGame.scores.length === 2, `生成两名玩家终局计分（${finalGame?.scores?.length} 人）`);

  for (const score of finalGame?.scores || []) {
    ok(typeof score.total === "number" && Number.isFinite(score.total), `玩家「${score.name}」终局得分: ${score.total}`);
    console.log(`     📊 ${score.name} 计分详情:`, JSON.stringify(score.breakdown));
  }

  ok(totalActions >= 50, `双人对局总执行行动数 = ${totalActions}（无中途卡死）`);
  ok(host.ws.readyState === 1, "主持 WS 在整个对局期间保持稳定在线");

  // 7. 清理房间
  host.close();
  p1.close();
  p2.close();

  const del = await http("/api/host/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: roomCode }),
  });
  ok(del.ok, `清理销毁房间 ${roomCode}`);

  console.log(failures === 0 ? "\n🎉 双玩家完整端到端全部通过！" : `\n💥 ${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("测试异常:", e);
  process.exit(1);
});
