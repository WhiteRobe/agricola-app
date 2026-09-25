// ============================================================
// Worker 入口：静态资源 + API 路由
// ============================================================
import { Room, Registry, randCode } from "./dos";

export { Room, Registry };

interface Env {
  ROOM: DurableObjectNamespace;
  REGISTRY: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** 宽容地读 JSON body：无 body / 非法 JSON 都返回 {}，避免 500 */
async function readJson<T extends object>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function doFetch<T>(ns: DurableObjectNamespace, name: string, path: string, body: unknown): Promise<T> {
  const stub = ns.get(ns.idFromName(name));
  const res = await stub.fetch(`https://do${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      // ---- 主持：创建房间（全局公共池，最多 10 间）----
      if (url.pathname === "/api/host/create" && request.method === "POST") {
        const body = await readJson<{ dlc?: { occupations?: boolean; minorImprovements?: boolean; moor?: boolean } }>(request);
        const dlc = (body && typeof body === "object" && "dlc" in body && body.dlc && typeof body.dlc === "object")
          ? (body.dlc as any)
          : undefined;

        // 全局池：先看是否已达 10 上限
        const cur = await doFetch<{ ok: boolean; rooms: string[]; max: number }>(
          env.REGISTRY, "registry", "/globalList", { op: "globalList" }
        );
        if (!cur.ok || cur.rooms.length >= cur.max) {
          return Response.json({ ok: false, reason: "limit", max: cur.max, msg: `已达全局上限 ${cur.max} 间，请先解散闲置房间` }, { status: 400 });
        }

        for (let i = 0; i < 10; i++) {
          const roomCode = randCode(4);
          const specCode = "S" + randCode(3);
          const claim = await doFetch<{ ok: boolean; conflict?: boolean }>(env.REGISTRY, "registry", "/claim", {
            op: "claim",
            player: roomCode,
            spec: specCode,
            room: roomCode,
          });
          if (!claim.ok) continue;
          await doFetch(env.ROOM, `room:${roomCode}`, "/init", { code: roomCode, specCode, hostToken: "global", dlc });
          const add = await doFetch<{ ok: boolean; reason?: string; count?: number }>(
            env.REGISTRY, "registry", "/globalAdd",
            { op: "globalAdd", room: roomCode }
          );
          if (!add.ok) {
            return Response.json({ ok: false, reason: add.reason ?? "limit", max: 10 }, { status: 400 });
          }
          return Response.json({ ok: true, roomCode, specCode, hostToken: "global", count: add.count });
        }
        return Response.json({ ok: false, msg: "创建失败，请重试" }, { status: 500 });
      }

      // ---- 列出全局公共房间池 ----
      if (url.pathname === "/api/host/list" && request.method === "POST") {
        const list = await doFetch<{ ok: boolean; rooms: string[]; max: number }>(
          env.REGISTRY, "registry", "/globalList", { op: "globalList" }
        );
        if (!list.ok) return Response.json({ ok: false, msg: "查询失败" }, { status: 500 });
        const rooms = await Promise.all(list.rooms.map(async (roomCode) => {
          try {
            const stub = env.ROOM.get(env.ROOM.idFromName(`room:${roomCode}`));
            const r = await stub.fetch("https://do/peek", { method: "POST", body: JSON.stringify({}) });
            const data = await r.json() as { ok: boolean; closed?: boolean; closedReason?: string; specCode?: string; phase?: string; players?: { name: string; connected: boolean }[]; dlc?: { occupations: boolean; minorImprovements: boolean; moor: boolean } };
            if (!data.ok) return null;
            return {
              roomCode,
              specCode: data.specCode,
              phase: data.phase ?? "lobby",
              closed: data.closed ?? false,
              closedReason: data.closedReason,
              players: (data.players ?? []).map((p) => p.name),
              onlineCount: (data.players ?? []).filter((p) => p.connected).length,
              dlc: data.dlc || { occupations: false, minorImprovements: false, moor: false },
            };
          } catch { return null; }
        }));
        return Response.json({ ok: true, rooms: rooms.filter(Boolean), max: list.max });
      }

      // ---- 查询房间是否存在 ----
      if (url.pathname === "/api/lookup") {
        const code = (url.searchParams.get("code") ?? "").toUpperCase().trim();
        const kind = url.searchParams.get("kind") === "spec" ? "spec" : "player";
        if (!code) return Response.json({ ok: false, msg: "缺少房间码" }, { status: 400 });
        const r = await doFetch<{ ok: boolean; room: string | null }>(env.REGISTRY, "registry", "/resolve", {
          op: "resolve",
          kind,
          code,
        });
        return Response.json({ ok: !!r.room, roomCode: r.room });
      }

      // ---- 主持：解散房间（HTTP 备用通道）----
      if (url.pathname === "/api/host/delete" && request.method === "POST") {
        const { code } = await readJson<{ code?: string }>(request);
        if (!code) return Response.json({ ok: false, msg: "缺少房间码" }, { status: 400 });
        const stub = env.ROOM.get(env.ROOM.idFromName(`room:${code}`));
        const res = await stub.fetch("https://do/admin-delete", {
          method: "POST",
          body: JSON.stringify({}),
        });
        return Response.json(await res.json());
      }

      // ---- WebSocket 升级 ----
      if (url.pathname === "/api/ws") {
        const code = (url.searchParams.get("code") ?? "").toUpperCase().trim();
        if (!code) return new Response("missing code", { status: 400 });
        const id = env.ROOM.idFromName(`room:${code}`);
        return await env.ROOM.get(id).fetch(request);
      }

      return Response.json({ ok: false, msg: "unknown api" }, { status: 404 });
    } catch (e: any) {
      return Response.json({ ok: false, msg: e?.message ?? "server error" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;