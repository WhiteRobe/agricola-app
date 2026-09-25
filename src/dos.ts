// ============================================================
// Durable Objects: Registry (码登记处) + Room (房间)
// ============================================================

// ---------- 工具 ----------
export function randCode(len: number): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

/** 纯数字码（房间码 / 旁观码统一为 4 位数字） */
export function randDigits(len: number): string {
  let s = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += String(buf[i] % 10);
  return s;
}

export function randToken(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- 玩家 ----------
export interface PlayerRec {
  id: string;
  token: string;
  name: string;
  connected: boolean;
  vote: boolean | null; // lobby 投票
  seat: number;
  joinedAt: number;
}

export type Phase = "lobby" | "playing" | "finished";

export interface RoomState {
  code: string; // 玩家匹配码
  specCode: string; // 旁观码
  hostToken: string;
  createdAt: number;
  lastActivity: number;
  phase: Phase;
  players: PlayerRec[];
  game: unknown | null; // 引擎状态（由 game/engine.ts 管理）
  log: { t: number; msg: string }[];
  closed: boolean;
  closedReason?: string;
  /** 主持人创建房间时勾选的 DLC */
  dlc?: { occupations: boolean; minorImprovements: boolean; moor: boolean; seasons: boolean };
}

export const PLAYER_COLORS = ["#e05d44", "#3f9d55", "#3d7ea6", "#d9932f"];
export const MAX_PLAYERS = 4;

function sanitizeGame(game: any): any {
  if (!game || !Array.isArray(game.players)) return game;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v)) ? v : 0;
  for (const p of game.players) {
    p.food = num(p.food);
    p.beggings = num(p.beggings);
    p.family = num(p.family);
    p.babiesThisRound = num(p.babiesThisRound);
    if (p.resources) {
      for (const k of ["wood", "clay", "reed", "stone", "grain", "vegetable"]) p.resources[k] = num(p.resources[k]);
    }
    if (p.animals) for (const k of ["sheep", "boar", "cattle"]) p.animals[k] = num(p.animals[k]);
    p.rooms = num(p.rooms);
    p.stables = num(p.stables);
  }
  if (Array.isArray(game.scores)) {
    for (const s of game.scores) {
      s.total = num(s.total);
      if (s.breakdown) for (const k of Object.keys(s.breakdown)) s.breakdown[k] = num(s.breakdown[k]);
    }
  }
  return game;
}

function snapshot(room: RoomState, extra: Record<string, unknown> = {}) {
  if (room.game) sanitizeGame(room.game);
  return {
    t: "state",
    code: room.code,
    specCode: room.specCode,
    phase: room.phase,
    closed: room.closed,
    closedReason: room.closedReason ?? null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      vote: p.vote,
      seat: p.seat,
      color: PLAYER_COLORS[p.seat % PLAYER_COLORS.length],
    })),
    game: room.game,
    log: room.log.slice(-60),
    ...extra,
  };
}

// ============================================================
// Registry：管理
//  - 房间码 / 旁观码 → 房间码映射
//  - 主持人 token → 房间码集合（最多 10 间）
// ============================================================
const MAX_ROOMS_PER_HOST = 10;

export class Registry {
  state: DurableObjectState;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const body = (await request.json()) as any;
    const { op } = body;

    if (op === "claim") {
      const { player, spec, room } = body as { player: string; spec: string; room: string };
      const pk = `p:${player}`;
      const sk = `s:${spec}`;
      if ((await this.state.storage.get(pk)) || (await this.state.storage.get(sk))) {
        return Response.json({ ok: false, conflict: true });
      }
      await this.state.storage.put(pk, room);
      await this.state.storage.put(sk, room);
      return Response.json({ ok: true });
    }

    if (op === "release") {
      const { player, spec } = body as { player: string; spec: string };
      await this.state.storage.delete(`p:${player}`);
      await this.state.storage.delete(`s:${spec}`);
      return Response.json({ ok: true });
    }

    if (op === "resolve") {
      const { kind, code } = body as { kind: "player" | "spec"; code: string };
      const room = await this.state.storage.get<string>(`${kind === "spec" ? "s" : "p"}:${code}`);
      return Response.json({ ok: true, room: room ?? null });
    }

    // 主持人房间集管理
    if (op === "hostAdd") {
      const { host, room } = body as { host: string; room: string };
      const key = `h:${host}`;
      const list: string[] = (await this.state.storage.get<string[]>(key)) || [];
      // 全局唯一性（保留 max 10）
      const next = list.filter((c) => c !== room);
      if (next.length >= MAX_ROOMS_PER_HOST) {
        return Response.json({ ok: false, reason: "limit", max: MAX_ROOMS_PER_HOST });
      }
      next.push(room);
      await this.state.storage.put(key, next);
      return Response.json({ ok: true, count: next.length });
    }

    if (op === "hostRemove") {
      const { host, room } = body as { host: string; room: string };
      const key = `h:${host}`;
      const list: string[] = (await this.state.storage.get<string[]>(key)) || [];
      const next = list.filter((c) => c !== room);
      await this.state.storage.put(key, next);
      return Response.json({ ok: true, count: next.length });
    }

    if (op === "hostList") {
      const { host } = body as { host: string };
      const key = `h:${host}`;
      const list: string[] = (await this.state.storage.get<string[]>(key)) || [];
      return Response.json({ ok: true, rooms: list, max: MAX_ROOMS_PER_HOST });
    }

    // 全局公共房间池（与每主持人的 h:* 列表并列，单独存放）：
    //   - 创建房间：push 到 global
    //   - 列房间：读 global（任何主持人 / 任何浏览器）
    //   - 解散：hostRemove *，并从 global 移除
    if (op === "globalAdd") {
      const { room } = body as { room: string };
      const key = "g:global";
      const list: string[] = (await this.state.storage.get<string[]>(key)) || [];
      const next = list.filter((c) => c !== room);
      if (next.length >= MAX_ROOMS_PER_HOST) {
        return Response.json({ ok: false, reason: "limit", max: MAX_ROOMS_PER_HOST });
      }
      next.push(room);
      await this.state.storage.put(key, next);
      return Response.json({ ok: true, count: next.length });
    }
    if (op === "globalRemove") {
      const { room } = body as { room: string };
      const key = "g:global";
      const list: string[] = (await this.state.storage.get<string[]>(key)) || [];
      const next = list.filter((c) => c !== room);
      await this.state.storage.put(key, next);
      return Response.json({ ok: true, count: next.length });
    }
    if (op === "globalList") {
      const key = "g:global";
      const list: string[] = (await this.state.storage.get<string[]>(key)) || [];
      return Response.json({ ok: true, rooms: list, max: MAX_ROOMS_PER_HOST });
    }

    return Response.json({ ok: false, reason: "bad op" }, { status: 400 });
  }
}

// ============================================================
// Room：一个房间一个实例，WebSocket 枢纽 + 房间状态 + 游戏状态
// ============================================================
interface WsAttach {
  role: "host" | "spec" | "player" | "guest";
  pid?: string;
}

export class Room {
  state: DurableObjectState;
  env: { REGISTRY: DurableObjectNamespace };

  constructor(state: DurableObjectState, env: { REGISTRY: DurableObjectNamespace }) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/init") {
      const { code, specCode, hostToken, dlc } = (await request.json()) as {
        code: string;
        specCode: string;
        hostToken: string;
        dlc?: { occupations: boolean; minorImprovements: boolean; moor: boolean; seasons: boolean };
      };
      const existing = await this.state.storage.get<RoomState>("room");
      if (!existing) {
        const room: RoomState = {
          code,
          specCode,
          hostToken,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          phase: "lobby",
          players: [],
          game: null,
          log: [{ t: Date.now(), msg: "房间已创建，等待玩家加入…" }],
          closed: false,
          // dlc：可选；不传或非真值时全部关闭
          dlc: { occupations: !!dlc?.occupations, minorImprovements: !!dlc?.minorImprovements, moor: !!dlc?.moor, seasons: !!dlc?.seasons },
        };
        await this.state.storage.put("room", room);
      }
      await this.armAlarm();
      return Response.json({ ok: true });
    }

    if (url.pathname === "/admin-delete") {
      // 全局公共池：任何人都能解散
      const room = await this.load();
      if (!room || room.closed) return Response.json({ ok: false, msg: "房间不存在" });
      await this.selfDelete(room, "主持已解散房间");
      return Response.json({ ok: true });
    }

    // 主持人查看房间状态（不带 WS；用于管理面板）
    if (url.pathname === "/peek") {
      const room = await this.load();
      if (!room) return Response.json({ ok: false, msg: "房间不存在" });
      // 全局公共池：跳过 hostToken 校验
      if (room.closed) return Response.json({ ok: false, closed: true, closedReason: room.closedReason });
      return Response.json({
        ok: true,
        code: room.code,
        specCode: room.specCode,
        phase: room.phase,
        players: room.players.map((p) => ({ name: p.name, connected: p.connected, seat: p.seat })),
        dlc: room.dlc || { occupations: false, minorImprovements: false, moor: false, seasons: false },
      });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1], ["room"]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return Response.json({ ok: false, reason: "not found" }, { status: 404 });
  }

  private async armAlarm() {
    const cur = await this.state.storage.getAlarm();
    if (cur === null) await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000); // 1h 后检查
  }

  private async touch(room: RoomState) {
    room.lastActivity = Date.now();
    await this.state.storage.put("room", room);
  }

  private async load(): Promise<RoomState | null> {
    return (await this.state.storage.get<RoomState>("room")) ?? null;
  }

  private async broadcast(room: RoomState, extra: Record<string, unknown> = {}) {
    const msg = JSON.stringify(snapshot(room, extra));
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(msg);
      } catch {
        /* ignore */
      }
    }
  }

  private async addLog(room: RoomState, msg: string) {
    room.log.push({ t: Date.now(), msg });
    if (room.log.length > 300) room.log.splice(0, room.log.length - 300);
  }

  private async selfDelete(room: RoomState, reason: string) {
    room.closed = true;
    room.closedReason = reason;
    const bye = JSON.stringify({ t: "closed", reason });
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(bye);
        ws.close(1000, reason);
      } catch {
        /* ignore */
      }
    }
    const reg = this.env.REGISTRY.get(this.env.REGISTRY.idFromName("registry"));
    await reg.fetch("https://registry/", {
      method: "POST",
      body: JSON.stringify({ op: "release", player: room.code, spec: room.specCode }),
    });
    // 从主持人的房间集中移除（兼容旧 key）+ 全局公共池也移除
    await reg.fetch("https://registry/", {
      method: "POST",
      body: JSON.stringify({ op: "hostRemove", host: room.hostToken, room: room.code }),
    });
    await reg.fetch("https://registry/", {
      method: "POST",
      body: JSON.stringify({ op: "globalRemove", room: room.code }),
    });
    await this.state.storage.deleteAll();
    await this.state.storage.deleteAlarm();
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const room = await this.load();
    if (!room || room.closed) {
      try {
        ws.send(JSON.stringify({ t: "closed", reason: "房间不存在或已关闭" }));
        ws.close(1000, "closed");
      } catch {
        /* ignore */
      }
      return;
    }
    const attach = ws.deserializeAttachment() as WsAttach | null;
    const t = msg.t;

    // ---- hello：身份建立 ----
    if (t === "hello") {
      const role = msg.role as WsAttach["role"];
      if (role === "host") {
        // 全局公共池：主持身份不再校验 token（任何人可管理）
        ws.serializeAttachment({ role: "host" });
        await this.touch(room);
        ws.send(JSON.stringify({ t: "hello", you: { role: "host" } }));
        ws.send(JSON.stringify(snapshot(room)));
        return;
      }
      if (role === "spec") {
        if (msg.spec !== room.specCode) {
          ws.send(JSON.stringify({ t: "err", msg: "旁观码无效" }));
          ws.close(1008, "bad spec code");
          return;
        }
        ws.serializeAttachment({ role: "spec" });
        await this.touch(room);
        ws.send(JSON.stringify({ t: "hello", you: { role: "spec" } }));
        ws.send(JSON.stringify(snapshot(room)));
        return;
      }
      if (role === "guest") {
        ws.serializeAttachment({ role: "guest" });
        await this.touch(room);
        ws.send(JSON.stringify({ t: "hello", you: { role: "guest" } }));
        ws.send(JSON.stringify(snapshot(room)));
        return;
      }
      if (role === "player") {
        // 重新连接
        if (msg.token) {
          const p = room.players.find((x) => x.token === msg.token);
          if (!p) {
            ws.send(JSON.stringify({ t: "err", msg: "身份失效，请重新加入", code: "BAD_TOKEN" }));
            ws.close(1008, "bad token");
            return;
          }
          p.connected = true;
          ws.serializeAttachment({ role: "player", pid: p.id });
          await this.addLog(room, `「${p.name}」重新连接`);
          await this.touch(room);
          ws.send(JSON.stringify({ t: "hello", you: { role: "player", pid: p.id, token: p.token, name: p.name, seat: p.seat } }));
          await this.broadcast(room);
          return;
        }
        // 新加入
        if (room.phase !== "lobby") {
          // 开局后加入：转为只读旁观（guest）
          ws.serializeAttachment({ role: "guest" });
          await this.touch(room);
          ws.send(JSON.stringify({ t: "hello", you: { role: "guest" }, joinedAsSpectator: true }));
          ws.send(JSON.stringify(snapshot(room)));
          return;
        }
        if (room.players.length >= MAX_PLAYERS) {
          ws.send(JSON.stringify({ t: "err", msg: "房间已满（最多 4 名玩家）", code: "ROOM_FULL" }));
          ws.close(1008, "room full");
          return;
        }
        const name = String(msg.name ?? "").trim().slice(0, 12) || `玩家${room.players.length + 1}`;
        const p: PlayerRec = {
          id: randToken().slice(0, 8),
          token: randToken(),
          name,
          connected: true,
          vote: null,
          seat: room.players.length,
          joinedAt: Date.now(),
        };
        room.players.push(p);
        ws.serializeAttachment({ role: "player", pid: p.id });
        await this.addLog(room, `「${p.name}」加入了房间（${room.players.length}/4）`);
        await this.touch(room);
        ws.send(JSON.stringify({ t: "hello", you: { role: "player", pid: p.id, token: p.token, name: p.name, seat: p.seat } }));
        await this.broadcast(room);
        return;
      }
      ws.send(JSON.stringify({ t: "err", msg: "未知的身份类型" }));
      ws.close(1008, "bad role");
      return;
    }

    if (!attach) {
      ws.send(JSON.stringify({ t: "err", msg: "请先发送 hello" }));
      return;
    }
    await this.touch(room);

    // ---- 玩家操作 ----
    if (t === "rename" && attach.role === "player" && attach.pid) {
      const p = room.players.find((x) => x.id === attach.pid);
      if (p) {
        const old = p.name;
        p.name = String(msg.name ?? "").trim().slice(0, 12) || p.name;
        if (old !== p.name && room.phase === "lobby") await this.addLog(room, `「${old}」改名为「${p.name}」`);
        await this.state.storage.put("room", room);
        await this.broadcast(room);
      }
      return;
    }

    if (t === "vote" && attach.role === "player" && attach.pid && room.phase === "lobby") {
      const p = room.players.find((x) => x.id === attach.pid);
      if (p) {
        p.vote = !!msg.yes;
        await this.addLog(room, `「${p.name}」${p.vote ? "同意" : "取消"}开始游戏`);
        await this.state.storage.put("room", room);
        // 所有人都投 yes → 立即开局
        const allYes = room.players.length > 0 && room.players.every((x) => x.vote === true);
        if (allYes) {
          await this.startGame(room);
        } else {
          await this.broadcast(room);
        }
      }
      return;
    }

    if (t === "leave" && attach.role === "player" && attach.pid && room.phase === "lobby") {
      const p = room.players.find((x) => x.id === attach.pid);
      if (p) {
        room.players = room.players.filter((x) => x.id !== p.id);
        room.players.forEach((x, i) => (x.seat = i));
        await this.addLog(room, `「${p.name}」离开了房间`);
        await this.state.storage.put("room", room);
        await this.broadcast(room);
      }
      return;
    }

    // ---- 主持操作 ----
    if (t === "hostDelete" && attach.role === "host") {
      await this.selfDelete(room, "主持已解散房间");
      return;
    }

    if (t === "hostKick" && attach.role === "host" && room.phase === "lobby") {
      const p = room.players.find((x) => x.id === msg.pid);
      if (p) {
        room.players = room.players.filter((x) => x.id !== p.id);
        room.players.forEach((x, i) => (x.seat = i));
        await this.addLog(room, `「${p.name}」被主持移出房间`);
        await this.state.storage.put("room", room);
        await this.broadcast(room, { kicked: p.id });
      }
      return;
    }

    // ---- 游戏动作 ----
    if (t === "act" && attach.role === "player" && attach.pid) {
      const { handleAction } = await import("./game/engine");
      const result = handleAction(room, attach.pid, msg.action);
      if (result.ok) {
        // 引擎判定游戏结束 → 同步房间阶段（客户端据此切到结算页）
        const game = room.game as { finished?: boolean } | null;
        if (game && game.finished && room.phase !== "finished") {
          room.phase = "finished";
          await this.addLog(room, "🏁 14 轮结束，游戏结算完成");
        }
        await this.state.storage.put("room", room);
        await this.broadcast(room);
      } else {
        ws.send(JSON.stringify({ t: "err", msg: result.msg }));
      }
      return;
    }

    if (t === "ping") {
      ws.send(JSON.stringify({ t: "pong" }));
      return;
    }
  }

  private async startGame(room: RoomState) {
    const { createGame } = await import("./game/engine");
    const { DEFAULT_DLC } = await import("./game/dlc");
    room.phase = "playing";
    room.game = createGame(
      room.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat })),
      { dlc: room.dlc || DEFAULT_DLC }
    );
    await this.addLog(room, "全员同意，游戏开始！祝大家 farming 愉快～");
    await this.state.storage.put("room", room);
    await this.broadcast(room);
  }

  async webSocketClose(ws: WebSocket) {
    const attach = ws.deserializeAttachment() as WsAttach | null;
    if (!attach || attach.role !== "player" || !attach.pid) return;
    const room = await this.load();
    if (!room || room.closed) return;
    const p = room.players.find((x) => x.id === attach.pid);
    if (p) {
      p.connected = false;
      await this.addLog(room, `「${p.name}」暂时离线`);
      await this.state.storage.put("room", room);
      await this.broadcast(room);
    }
  }

  async alarm() {
    const room = await this.load();
    if (!room) {
      await this.state.storage.deleteAlarm();
      return;
    }
    const idleMs = Date.now() - room.lastActivity;
    if (idleMs > 12 * 60 * 60 * 1000) {
      await this.selfDelete(room, "房间长期无活动，已自动清理");
      return;
    }
    await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }
}
