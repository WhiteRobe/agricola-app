// ============================================================
// 房间系统 WS 冒烟测试：创建→加入→投票→开局→旁观→解散
// 用法: node test/ws-smoke.mjs [baseUrl]
// ============================================================
const BASE = process.argv[2] || "http://127.0.0.1:8787";
let failures = 0;

function ok(cond, name) {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures++;
    console.log(`  ❌ ${name}`);
  }
}

function connect(code) {
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + `/api/ws?code=${code}`);
  const queue = [];
  const waiters = [];
  let open = false;
  const pendingSends = [];
  ws.onopen = () => {
    open = true;
    while (pendingSends.length) ws.send(JSON.stringify(pendingSends.shift()));
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const w = waiters.shift();
    if (w) w(msg);
    else queue.push(msg);
  };
  ws.onclose = () => { open = false; };
  return {
    ws,
    send(obj) {
      if (open) ws.send(JSON.stringify(obj));
      else pendingSends.push(obj);
    },
    async next(timeoutMs = 3000) {
      if (queue.length) return queue.shift();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout waiting message")), timeoutMs);
        waiters.push((m) => { clearTimeout(timer); resolve(m); });
      });
    },
    async expect(pred, name, timeoutMs = 3000) {
      const deadline = Date.now() + timeoutMs;
      let last = null;
      while (Date.now() < deadline) {
        last = await this.next(deadline - Date.now());
        if (pred(last)) { ok(true, name); return last; }
      }
      ok(false, `${name} (last=${JSON.stringify(last).slice(0, 120)})`);
      return last;
    },
    close() { try { ws.close(); } catch {} },
  };
}

async function main() {
  console.log(`▶ 冒烟测试 → ${BASE}`);

  // 1. 创建房间
  const createRes = await fetch(`${BASE}/api/host/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).then((r) => r.json());
  ok(createRes.ok && /^[0-9A-Z]{4}$/.test(createRes.roomCode), `创建房间 (code=${createRes.roomCode}, spec=${createRes.specCode})`);
  const { roomCode, specCode, hostToken } = createRes;

  // 2. 主持连接
  const host = connect(roomCode);
  host.send({ t: "hello", role: "host", token: hostToken });
  const hostHello = await host.expect((m) => m.t === "hello", "主持 hello");
  ok(hostHello.you?.role === "host", "主持身份确认");
  await host.expect((m) => m.t === "state" && m.phase === "lobby", "主持收到大厅状态");

  // 3. 玩家加入
  const p1 = connect(roomCode);
  p1.send({ t: "hello", role: "player", name: "小明" });
  const p1hello = await p1.expect((m) => m.t === "hello" && m.you?.role === "player", "玩家1加入");
  ok(!!p1hello.you.token, "玩家1获得 token");
  const p1state = await p1.expect((m) => m.t === "state", "玩家1收到状态");
  ok(p1state.players.length === 1, "玩家列表 1 人");

  const p2 = connect(roomCode);
  p2.send({ t: "hello", role: "player", name: "小红" });
  await p2.expect((m) => m.t === "hello" && m.you?.role === "player", "玩家2加入");
  await p2.expect((m) => m.t === "state" && m.players.length === 2, "玩家列表 2 人");

  // 4. 重命名 + 投票
  p1.send({ t: "rename", name: "小明同学" });
  await p1.expect((m) => m.t === "state" && m.players.some((p) => p.name === "小明同学"), "改名成功");

  p1.send({ t: "vote", yes: true });
  await host.expect((m) => m.t === "state" && m.players.every((p) => p.vote !== true) === false, "投票可见");
  ok(true, "玩家1投票 yes");

  // 玩家2投票后全员 yes → 开局
  p2.send({ t: "vote", yes: true });
  const started = await host.expect((m) => m.t === "state" && m.phase === "playing", "全员同意 → 自动开局");
  ok(started.game && started.game.engine === "agricola", "游戏已创建（占位引擎）");

  // 5. 旁观者加入（用旁观码对应的房间码 + spec 校验）
  const lookup = await fetch(`${BASE}/api/lookup?code=${specCode}&kind=spec`).then((r) => r.json());
  ok(lookup.ok && lookup.roomCode === roomCode, "旁观码解析到房间");
  const spec = connect(roomCode);
  spec.send({ t: "hello", role: "spec", spec: specCode });
  await spec.expect((m) => m.t === "hello" && m.you?.role === "spec", "旁观者加入成功");

  // 6. 开局后新玩家加入 → 转为 guest
  const late = connect(roomCode);
  late.send({ t: "hello", role: "player", name: "迟到者" });
  const lateHello = await late.expect((m) => m.t === "hello", "迟到加入");
  ok(lateHello.joinedAsSpectator === true, "开局后加入自动转旁观");

  // 7. 断线重连（玩家1 token 重连）
  p1.close();
  await new Promise((r) => setTimeout(r, 300));
  const p1b = connect(roomCode);
  p1b.send({ t: "hello", role: "player", token: p1hello.you.token });
  const re = await p1b.expect((m) => m.t === "hello" && m.you?.name === "小明同学", "断线重连恢复身份");

  // 8. 主持解散
  host.send({ t: "hostDelete" });
  await p1b.expect((m) => m.t === "closed", "玩家收到解散通知");
  ok(true, "房间解散广播");

  // 9. 解散后码应失效
  await new Promise((r) => setTimeout(r, 400));
  const gone = await fetch(`${BASE}/api/lookup?code=${roomCode}`).then((r) => r.json());
  ok(!gone.ok, "解散后房间码失效");

  [host, p1b, p2, spec, late].forEach((c) => c.close());
  console.log(failures === 0 ? "\n🎉 全部通过" : `\n💥 ${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("测试异常:", e);
  process.exit(1);
});
