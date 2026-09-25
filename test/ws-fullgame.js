// ============================================================
// 端到端：通过 WebSocket 真实跑完 14 轮，验证能结算且无 null
// 用法: node test/ws-fullgame.js [baseUrl]
// ============================================================
const BASE = process.argv[2] || "http://127.0.0.1:8787";
let failures = 0;
function ok(c, n) { c ? (console.log(`  ✅ ${n}`), 0) : (console.log(`  ❌ ${n}`), failures++); }

const http = (path, opts) => fetch(BASE + path, opts).then((r) => r.json());

async function main() {
  console.log(`▶ 端到端对局测试 → ${BASE}`);

  // 1. 创建房间
  const room = await http("/api/host/create", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  ok(room.ok, `创建房间 ${room.roomCode}`);
  const { roomCode } = room;

  // 2. 玩家加入 + 开局
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
  const waitState = async (pred, name, tries = 8) => {
    for (let i = 0; i < tries; i++) {
      const m = await next();
      if (m.t === "state" && pred(m)) return m;
    }
    ok(false, name);
    return null;
  };

  await new Promise((r) => ws.addEventListener("open", r));
  send({ t: "hello", role: "player", name: "机器人" });
  const hello = await (async () => {
    for (let i = 0; i < 5; i++) { const m = await next(); if (m.t === "hello") return m; }
  })();
  ok(!!hello?.you?.pid, "玩家加入成功");
  const pid = hello.you.pid;

  send({ t: "vote", yes: true });
  const started = await waitState((m) => m.phase === "playing", "开局成功");
  ok(!!started, "全员同意 → 进入游戏");

  // 3. 自动对局：每轮轮换不同的免费行动格（行动格每轮只能被占用一次）
  const FREE = ["DayLaborer", "Fishing", "StartPlayer", "PlowField"];
  let steps = 0;
  let lastState = started;
  let sawRound14 = false;
  let pick = 0;
  let lastRound = started.game?.round ?? 1;
  while (steps < 300) {
    steps++;
    const g = lastState.game;
    if (!g || g.finished || lastState.phase === "finished") break;
    const cur = g.waitingFor[0];
    if (!cur) { ok(false, `第 ${g.round} 轮等待队列为空`); break; }
    if (g.round >= 14) sawRound14 = true;
    if (g.round !== lastRound) { lastRound = g.round; pick = 0; }
    // 每轮最多 4 个格子（2 名家庭成员 × 2 玩家），够用
    const space = FREE[pick % FREE.length];
    pick++;
    send({ t: "act", action: { type: "Take", space } });
    // 等新状态或错误
    let advanced = false;
    for (let i = 0; i < 6; i++) {
      const m = await next();
      if (m.t === "err") { ok(false, `行动被拒(${space}): ${m.msg}`); break; }
      if (m.t === "state") { lastState = m; advanced = true; break; }
    }
    if (!advanced) break;
  }

  ok(sawRound14, "对局推进到第 14 轮");
  ok(lastState.phase === "finished" || lastState.game?.finished, `游戏已结算 (phase=${lastState.phase}, finished=${lastState.game?.finished})`);
  const scores = lastState.game?.scores;
  ok(!!scores && scores.length > 0, `结算分数存在 (${(scores || []).map((s) => `${s.name}=${s.total}`).join(", ")})`);

  // 4. 数值完整性检查（无 null/NaN）
  const p0 = lastState.game?.players?.[0];
  const nums = [p0?.food, p0?.beggings, p0?.family, p0?.resources?.wood, p0?.resources?.grain, p0?.resources?.vegetable];
  ok(nums.every((n) => typeof n === "number" && Number.isFinite(n)), `玩家数值无 null（food=${p0?.food}, 乞讨=${p0?.beggings}）`);

  try { ws.close(); } catch {}
  console.log(failures === 0 ? "\n🎉 端到端全部通过" : `\n💥 ${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("测试异常:", e); process.exit(1); });
