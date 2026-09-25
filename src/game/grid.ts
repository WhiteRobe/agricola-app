// ============================================================
// 农场地块几何：栅栏、牧场（围合区域）、容量、邻接校验
// 坐标系：grid[y][x]，y=0 在最上排，x=0 在最左列
// ============================================================

export interface FenceEdges {
  // H[y][x] = 单元格 (x,y) 上边的栅栏段；y 取值 0..H（y=H 表示最下边界）
  h: boolean[][];
  // V[y][x] = 单元格 (x,y) 左边的栅栏段；x 取值 0..W（x=W 表示最右边界）
  v: boolean[][];
}

export type AnimalType = "sheep" | "boar" | "cattle";

export interface Cell {
  kind: "empty" | "room" | "field";
  crop?: "grain" | "vegetable";
  markers?: number; // 已播种子标记数
  stable?: boolean;
  fenced?: boolean; // 该格被围栏包围（推导后写入，便于渲染）
  animal?: AnimalType | null; // 推导：本格所属牧场动物类型（渲染用）
}

export function makeEdges(W: number, H: number): FenceEdges {
  return {
    h: Array.from({ length: H + 1 }, () => Array(W).fill(false)),
    v: Array.from({ length: H }, () => Array(W + 1).fill(false)),
  };
}

export function cloneEdges(e: FenceEdges): FenceEdges {
  return { h: e.h.map((r) => [...r]), v: e.v.map((r) => [...r]) };
}

/** 栅栏段总数（1 段 = 1 木头） */
export function countEdges(e: FenceEdges): number {
  // 我们的栅栏分水平 h[y][x] 与垂直 v[y][x] 两个独立栅栏位：
  //   每个被玩家画的段位（h 或 v 各计 1）= 1 段，1 段 = 1 木头
  //   「角」（同一 (x,y) 上 h 与 v 都设）由 2 段围成，按各 1 段算
  // 因为 buildFences 的 cost = added.length * 1，这里必须严格等于 added.length
  // 否则 cost 与 FENCE_MAX 校验会错位。验证：U 形 6 段（h[0][2] + v[0..4][2]）
  //   → h 数 1 + v 数 5 = 6 ✓
  let n = 0;
  for (const row of e.h) for (const b of row) if (b) n++;
  for (const row of e.v) for (const b of row) if (b) n++;
  return n;
}

/** 由既有栅栏 + 新增栅栏合成 */
export function addEdges(base: FenceEdges, added: FenceEdges): FenceEdges {
  const out = cloneEdges(base);
  for (let y = 0; y < out.h.length; y++)
    for (let x = 0; x < out.h[y].length; x++) out.h[y][x] = base.h[y][x] || added.h[y][x] || false;
  for (let y = 0; y < out.v.length; y++)
    for (let x = 0; x < out.v[y].length; x++) out.v[y][x] = base.v[y][x] || added.v[y][x] || false;
  return out;
}

export function edgeId(kind: "h" | "v", x: number, y: number): string {
  return `${kind}${x},${y}`;
}
export function parseEdgeId(id: string): { kind: "h" | "v"; x: number; y: number } | null {
  const m = /^([hv])(-?\d+),(-?\d+)$/.exec(id);
  if (!m) return null;
  return { kind: m[1] as "h" | "v", x: +m[2], y: +m[3] };
}

function hasEdge(e: FenceEdges, kind: "h" | "v", x: number, y: number): boolean {
  if (kind === "h") return e.h[y]?.[x] === true;
  return e.v[y]?.[x] === true;
}

/**
 * 计算被完全围住（无法从农场外不跨栅栏到达）的空格子集合，
 * 并把它们按连通性分成若干牧场（连通 = 两格间没有栅栏段）。
 * 注意：房间/田地格（blocked）不进入牧场，但洪泛可以穿过它们 ——
 * 因为“封闭”的定义是每一条边界边都有栅栏，与隔壁是不是房间无关。
 */
export function computePastures(W: number, H: number, edges: FenceEdges, blocked: Set<string>): { cells: string[]; rects: boolean }[] {
  const reachable = new Set<string>();
  const queue: [number, number][] = [];
  const tryEnter = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (reachable.has(key)) return;
    reachable.add(key);
    queue.push([x, y]);
  };

// 农场边界外的方向不可跨越（农场地块的边界是天然边界）
  const isOutsideBlocked = (kind: "h" | "v", x: number, y: number) => {
    if (kind === "h") return y < 0 || y >= H;
    return x < 0 || x >= W;
  };

  // 从所有未设栅栏的边界边进入
  for (let x = 0; x < W; x++) {
    if (!isOutsideBlocked("h", x, 0) && !hasEdge(edges, "h", x, 0)) tryEnter(x, 0);
    if (!isOutsideBlocked("h", x, H) && !hasEdge(edges, "h", x, H)) tryEnter(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    if (!isOutsideBlocked("v", 0, y) && !hasEdge(edges, "v", 0, y)) tryEnter(0, y);
    if (!isOutsideBlocked("v", W, y) && !hasEdge(edges, "v", W, y)) tryEnter(W - 1, y);
  }
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const neigh: [number, number, "h" | "v", number, number][] = [
      [x, y - 1, "h", x, y],
      [x, y + 1, "h", x, y + 1],
      [x - 1, y, "v", x, y],
      [x + 1, y, "v", x + 1, y],
    ];
    for (const [nx, ny, via, ex, ey] of neigh) {
      if (isOutsideBlocked(via, ex, ey)) continue; // 出农场 → 不可达
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (reachable.has(`${nx},${ny}`)) continue;
      if (hasEdge(edges, via, ex, ey)) continue;
      tryEnter(nx, ny);
    }
  }

  const enclosedEmpty: string[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const key = `${x},${y}`;
      if (!blocked.has(key) && !reachable.has(key)) enclosedEmpty.push(key);
    }

  // 空格连通分量（blocked 格把区域切开）
  const seen = new Set<string>();
  const pastures: { cells: string[]; rects: boolean }[] = [];
  for (const key of enclosedEmpty) {
    if (seen.has(key)) continue;
    const cells: string[] = [];
    const q = [key];
    seen.add(key);
    while (q.length) {
      const cur = q.shift()!;
      cells.push(cur);
      const [cx, cy] = cur.split(",").map(Number);
      const neigh: [number, number, "h" | "v", number, number][] = [
        [cx, cy - 1, "h", cx, cy],
        [cx, cy + 1, "h", cx, cy + 1],
        [cx - 1, cy, "v", cx, cy],
        [cx + 1, cy, "v", cx + 1, cy],
      ];
      for (const [nx, ny, via, ex, ey] of neigh) {
        const nkey = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!enclosedEmpty.includes(nkey) || seen.has(nkey)) continue;
        if (hasEdge(edges, via, ex, ey)) continue;
        seen.add(nkey);
        q.push(nkey);
      }
    }
    pastures.push({ cells, rects: isSingleRectangle(cells) });
  }
  return pastures;
}

/** 格子集合是否构成一个实心矩形 */
export function isSingleRectangle(cells: string[]): boolean {
  if (cells.length === 0) return false;
  const pts = cells.map((c) => c.split(",").map(Number));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return (maxX - minX + 1) * (maxY - minY + 1) === cells.length;
}

/** 栅栏合法性校验：
 *  1. 每一段新增栅栏必须贴着某个围合区域的边界（不许有悬空的栅栏段）；
 *  2. 官方规则：牧场只要由栅栏（及农场地界）完全围闭，可以是任意形状（矩形、L型、T型、多边形等）。 */
export function validateEnclosure(W: number, H: number, edges: FenceEdges, addedIds: string[]): { ok: boolean; reason?: string } {
  const pastures = computePastures(W, H, edges, new Set());

  // 围合区域边界上的所有栅栏段 id
  const boundary = new Set<string>();
  for (const p of pastures) {
    for (const cell of p.cells) {
      const [x, y] = cell.split(",").map(Number);
      // 该格四条边中，凡是与“区域外”相邻的边都是边界
      const edgeDefs: [string, "h" | "v", number, number][] = [
        [edgeId("h", x, y), "h", x, y], // 上
        [edgeId("h", x, y + 1), "h", x, y + 1], // 下
        [edgeId("v", x, y), "v", x, y], // 左
        [edgeId("v", x + 1, y), "v", x + 1, y], // 右
      ];
      for (const [id, kind, ex, ey] of edgeDefs) if (hasEdge(edges, kind, ex, ey)) boundary.add(id);
    }
  }

  for (const id of addedIds) {
    if (!boundary.has(id)) return { ok: false, reason: "栅栏必须围成完整的牧场，不能有悬空段" };
  }
  return { ok: true };
}

/** 与已有房间正交相邻（建房间用；首个房间视为满足） */
export function adjacentTo(x: number, y: number, cells: Set<string>): boolean {
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    if (cells.has(`${x + dx},${y + dy}`)) return true;
  }
  return false;
}
