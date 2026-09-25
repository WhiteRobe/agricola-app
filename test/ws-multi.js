// 4 人局：串行 join，每完成一个等一会儿
const BASE = process.argv[2] || "http://127.0.0.1:8787";

async function main() {
  console.log("🎬 创建房间");
  const r = await fetch(BASE + "/api/host/create", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  }).then(r => r.json());
  console.log("Room:", r.roomCode, r.specCode);

  const players = ["小红", "小明", "小蓝", "小绿"];
  for (const name of players) {
    const ws = new WebSocket(BASE.replace(/^http/, "ws") + `/api/ws?code=${r.roomCode}`);
    await new Promise((res) => ws.addEventListener("open", res));
    const helloP = new Promise((res) => {
      const handler = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === "hello") { ws.removeEventListener("message", handler); res(m); }
      };
      ws.addEventListener("message", handler);
    });
    ws.send(JSON.stringify({ t: "hello", role: "player", name }));
    const h = await helloP;
    console.log("✓", name, "joined pid=", h.you?.pid);
    const stateP = new Promise((res) => {
      const handler = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === "state") { ws.removeEventListener("message", handler); res(m); }
      };
      ws.addEventListener("message", handler);
    });
    ws.send(JSON.stringify({ t: "vote", yes: true }));
    const s = await stateP;
    console.log("  voted, players in room:", s.players.length);
    await new Promise(r => setTimeout(r, 600));
    ws.close();
  }
  console.log("RESULT:", JSON.stringify({ roomCode: r.roomCode, specCode: r.specCode }));
}
main().catch(e => { console.error(e); process.exit(1); });