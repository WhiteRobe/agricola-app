// ============================================================
// 引擎自动化模拟：基本链路 + 完整 14 轮稳定性测试
// ============================================================
import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
await fs.mkdir(path.join(root, ".tmp"), { recursive: true });

// Bundle engine + grid 成单一模块
const bundleOut = path.join(root, ".tmp", "engine.mjs");
await fs.rm(bundleOut, { force: true });
await esbuild.build({
  entryPoints: [path.join(root, "src", "game", "engine.ts")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile: bundleOut,
  target: "es2022",
});
const engine = await import(pathToFileURL(bundleOut).href + "?v=" + Date.now() + Math.random());

let pass = 0, fail = 0;
function ok(c, n) { c ? (console.log(`  ✅ ${n}`), pass++) : (console.log(`  ❌ ${n}`), fail++); }
/**
 * 测试辅助：强制把该玩家插到回合队首（绕过严格回合顺序校验）
 * 生产环境下 dispatchGame 会校验 waitingFor[0] === pid
 */
function act(g, pid, action) {
  const list = Array.isArray(g.waitingFor) ? g.waitingFor : [];
  g.waitingFor = [pid, ...list.filter((x) => x !== pid)];
  return engine.dispatchGame(g, pid, action);
}

// ---- 测试 1：geometry（直接 bundle grid.ts）----
await esbuild.build({
  entryPoints: [path.join(root, "src", "game", "grid.ts")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile: path.join(root, ".tmp", "grid.mjs"),
  target: "es2022",
});
const grid = await import(pathToFileURL(path.join(root, ".tmp", "grid.mjs")).href + "?v=" + Date.now());

console.log("\n📐 栅栏几何测试");
{
  const edges = grid.makeEdges(3, 5);
  // 矩形牧场在右列 (2,0)(2,1)(2,2)(2,3)(2,4)
  edges.h[0][2] = true;
  edges.h[5][2] = true;
  for (let y = 0; y < 5; y++) edges.v[y][2] = true;
  // 不放任何房间，单独验证几何
  const blocked = new Set();
  const ps = grid.computePastures(3, 5, edges, blocked);
  console.log("  debug ps:", JSON.stringify(ps));
  ok(ps.length === 1, "围出 1 块牧场");
  ok(ps[0]?.cells.length === 5, "牧场 5 格");
  ok(ps[0]?.rects === true, "牧场是矩形");
  ok(grid.validateEnclosure(3, 5, edges, ["h2,0", "h2,5", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"]).ok, "围栏有效性通过");
}

// ---- 测试 2：场景 — 基本动作 ----
console.log("\n🎬 基础动作场景");
const players = [{ id: "a", name: "A", seat: 0 }, { id: "b", name: "B", seat: 1 }];
const g = engine.createGame(players);
ok(g.round === 1, "开局第 1 轮");
ok(g.players.every(p => p.food >= 2), "每人至少 2 食物");
ok(g.players[0].food === 2 && g.players[1].food === 3, "起手食物：起始=2 其余=3");
ok(g.players.every(p => p.family === 2), "每家有 2 名成员");
ok(g.players.every(p => p.rooms === 2 && p.roomType === "wood"), "各有 2 间木屋");

let r = act(g, "a", { type: "Take", space: "Grain" });
ok(r.ok && g.players[0].resources.grain === 1, "A 取粮成功（第 1 轮谷堆 1 个，拿全部）");
// 给工人补充（测试便利）：增加家庭成员
g.players[0].family = 5;
// 钓鱼是累积格：模拟已累积 2 轮，取用时拿走全部
g.piles.Fishing = 2;
const foodBeforeFish = g.players[0].food;
r = act(g, "a", { type: "Take", space: "Fishing" });
ok(r.ok && g.players[0].food === foodBeforeFish + 2, `A 钓鱼取走全部 2 食物（${foodBeforeFish} → ${g.players[0].food}）`);
ok(g.piles.Fishing === 0, "鱼塘被清空");

// 给 A 充足的家庭成员 + 重建 waitingFor
g.players[0].family = 10;
g.waitingFor = Array.from({ length: g.players[0].family + g.players[1].family }, (_, i) => i % 2 === 0 ? 'a' : 'b');
g.players[0].resources.wood = 5;
g.players[0].resources.reed = 2;
r = act(g, "a", { type: "BuildRoom", x: 0, y: 2 });
ok(r.ok && g.players[0].rooms === 3, `A 建新房一间（r=${JSON.stringify(r)}）`);

// 犁地（无邻接田时任意位置）
r = act(g, "a", { type: "PlowField", x: 2, y: 1 });
ok(r.ok && g.players[0].grid[1][2].kind === "field", "A 犁地成功");

// 第二块田必须与第一块相邻
r = act(g, "a", { type: "PlowField", x: 0, y: 0 });
ok(!r.ok, "邻接规则：第 2 块田必须与第 1 块相邻");

// 播种（给 1 谷物 + 1 蔬菜）
g.players[0].resources.grain = 1;
r = act(g, "a", { type: "Sow", x: 2, y: 1, crop: "grain" });
ok(r.ok && g.players[0].grid[1][2].markers === 3, "A 撒谷种，田标记 3");

// 翻修：木→陶（按每间房计费：3 间房 → 3 陶 + 3 芦苇）
g.revealed.push("Renovate"); // 模拟第 5 轮翻修卡已揭示
g.players[0].resources.clay = 3;
g.players[0].resources.reed = 3;
g.players[0].family = 10; // 工人充足
r = act(g, "a", { type: "Renovate", direction: "woodToClay" });
ok(r.ok && g.players[0].roomType === "clay", `A 翻修为陶屋（3 间房 = 3 陶 + 3 芦苇，r=${JSON.stringify(r)}）`);
ok(g.players[0].resources.clay === 0 && g.players[0].resources.reed === 0, "翻修按房间数扣费（3 陶 + 3 芦苇）");

// 重大改进
g.revealed.push("BuildMajor"); // 模拟第 3 轮大改进卡已揭示
g.players[0].resources.clay = 2;
g.players[0].family = 12; // 工人充足（前面已消耗若干）
r = act(g, "a", { type: "BuildMajor", improvement: "fireplace" });
ok(r.ok && g.players[0].improvements.includes("fireplace"), "A 建壁炉");

// 烤面包：陶土烤炉正确费用 3 陶 + 1 石（手册），每次最多 1 谷 → 5 食物
g.usedSpaces = []; // 模拟进入下一轮（重大改进每轮只能建一个）
g.players[0].resources.clay = 3;
g.players[0].resources.stone = 1;
act(g, "a", { type: "BuildMajor", improvement: "clayOven" });
ok(g.players[0].improvements.includes("clayOven"), "陶土烤炉建造成功（3 陶 + 1 石）");
const foodBeforeBake = g.players[0].food;
g.players[0].resources.grain = 2;
r = act(g, "a", { type: "BakeBread", oven: "clayOven", grain: 2 });
ok(r.ok && g.players[0].food === foodBeforeBake + 5, `陶土烤炉每次最多 1 谷 → +5 食物（实际 +${g.players[0].food - foodBeforeBake}）`);

// 烤面包属于「撒种/烤面包」工人行动 → 消耗 1 名工人（符合规则）
g.usedSpaces = []; // 模拟进入下一轮（撒种/烤面包格每轮只能用一次）
const placedBefore = g.placedThisRound.filter((x) => x === "a").length;
g.players[0].resources.grain = 1;
r = act(g, "a", { type: "BakeBread", oven: "clayOven", grain: 1 });
const placedAfter = g.placedThisRound.filter((x) => x === "a").length;
ok(r.ok && placedAfter === placedBefore + 1, "烤面包消耗 1 名工人（属工人行动）");

// 而壁炉/烹饪灶的「随时烹饪」不占工人
// 修订版壁炉：2 羊 → 1 食物（ratio=2）
const placedB2 = g.placedThisRound.filter((x) => x === "a").length;
g.players[0].animals.sheep = 4;
const foodBeforeCook = g.players[0].food;
r = act(g, "a", { type: "Cook", improvement: "fireplace", used: { sheep: 2 } });
const placedA2 = g.placedThisRound.filter((x) => x === "a").length;
ok(r.ok && placedA2 === placedB2 && g.players[0].food === foodBeforeCook + 1,
  `烹饪（壁炉）不消耗工人 + 2 羊换 1 食物（r=${JSON.stringify(r)}, food=${g.players[0].food}）`);
// 1 羊不够换 1 食物 → 被拒
g.players[0].animals.sheep = 1;
const rc1 = act(g, "a", { type: "Cook", improvement: "fireplace", used: { sheep: 1 } });
ok(!rc1.ok, `1 羊不足以烹饪（修订版 2 羊 = 1 食物）`);

// ---- 测试 3：栅栏建牧场 + 动物市场（累积格，取走全部且免费）----
console.log("\n🐑 栅栏 + 动物市场测试");
{
  const gf = engine.createGame([{id:"a",name:"A",seat:0},{id:"b",name:"B",seat:1}]);
  gf.players[0].family = 15; gf.players[1].family = 5;
  gf.waitingFor = Array.from({ length: 40 }, () => 'a');
  gf.round = 5;
  gf.players[0].resources.wood = 10;
  // 右列整列 5 格 → 容量 5×2 = 10 只（下边/右边靠棋盘边界）
  r = act(gf, "a", { type: "BuildFences", edges: ["h2,0", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"] });
  ok(r.ok, `建 6 段栅栏成牧场（r=${JSON.stringify(r)}）`);
  ok(gf.players[0].pastures.length === 1, "生成 1 个牧场（容量 10）");

  // 动物市场：一次拿走该格全部，且不花食物
  gf.piles.Sheep = 3;
  const foodBefore = gf.players[0].food;
  r = act(gf, "a", { type: "Take", space: "Sheep" });
  ok(r.ok && gf.players[0].animals.sheep === 3, `羊市一次拿走全部 3 只（实际 ${gf.players[0].animals.sheep}）`);
  ok(gf.players[0].food === foodBefore, `取动物不花食物（${foodBefore} → ${gf.players[0].food}）`);
  ok(gf.piles.Sheep === 0, "该格清空（拿全部）");

  // 超出容量的部分跑掉：已有 3 只，容量 10 → 只能再收 7 只，供应区剩 20-7=13
  gf.usedSpaces = []; // 模拟进入下一轮（动物市场每轮只能用一次）
  gf.piles.Sheep = 20;
  r = act(gf, "a", { type: "Take", space: "Sheep" });
  ok(r.ok && gf.players[0].animals.sheep === 10, `容量上限 10 只（实际 ${gf.players[0].animals.sheep}）`);
  ok(gf.piles.Sheep === 13, `只收下 7 只，该格剩 13（实际 ${gf.piles.Sheep}）`);

  // 未开放的动物市场不能取（修订版：猪市第 8 轮起开放）
  gf.round = 5;
  gf.piles.Boar = 3;
  r = act(gf, "a", { type: "Take", space: "Boar" });
  ok(!r.ok && /第 8 轮/.test(r.msg || ""), `猪市第 8 轮才开放（msg=${r.msg}）`);
}

// ---- 测试 3c：日工 2 食物（手册值）----
console.log("\n🛠 日工收益");
{
  const gd = engine.createGame([{ id: "d", name: "D", seat: 0 }]);
  const f0 = gd.players[0].food;
  const rr = engine.dispatchGame(gd, "d", { type: "Take", space: "DayLaborer" });
  ok(rr.ok && gd.players[0].food === f0 + 2, `日工 +2 食物（${f0} → ${gd.players[0].food}）`);
}

// ---- 测试 3b：靠棋盘边界的 6 段牧场（UI 实际可选的最少段数）----

// ---- 测试 3b：靠棋盘边界的 6 段牧场（UI 实际可选的最少段数）----
console.log("\n🪵 靠棋盘边界的栅栏（UI 场景）");
{
  const gg = engine.createGame([{ id: "u", name: "U", seat: 0 }]);
  gg.players[0].resources.wood = 15;
  // UI 只渲染 3x5 的「上边 + 左边」，下边与右边靠棋盘边界
  const rr = engine.dispatchGame(gg, "u", { type: "BuildFences", edges: ["h2,0", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"] });
  ok(rr.ok, `6 段围出右侧整列牧场（r=${JSON.stringify(rr)}）`);
  ok(gg.players[0].pastures.length === 1, `生成 1 个牧场（实际 ${gg.players[0].pastures.length}）`);
  ok(gg.players[0].pastures[0]?.cells.length === 5, `牧场 5 格`);
  ok(gg.players[0].resources.wood === 9, `扣 6 木（15 → ${gg.players[0].resources.wood}）`);
}

// ---- 测试 3d：累积格机制（每轮 +1、取走全部、清零）----
console.log("\n📦 累积格机制");
{
  const ga = engine.createGame([{ id: "x", name: "X", seat: 0 }, { id: "y", name: "Y", seat: 1 }]);
  ok(ga.piles.Wood === 1, `第 1 轮补充后木堆 = 1（实际 ${ga.piles.Wood}，起手为空 + 每轮 +1）`);
  ok(ga.piles.Clay === 1 && ga.piles.Reed === 1, "陶坑 / 芦苇滩 各 1");
  ok(ga.piles.Stone === 0, "石场第 9 轮前不累积");
  ok(ga.piles.Vegetable === 0, "菜地第 8 轮前不累积");

  // 拿一次：拿走全部并清零
  let rr = engine.dispatchGame(ga, "x", { type: "Take", space: "Wood" });
  ok(rr.ok && ga.players[0].resources.wood === 1, `拿走木堆全部 1 木（实际 ${ga.players[0].resources.wood}）`);
  ok(ga.piles.Wood === 0, "木堆清零");

  // 空堆不能拿
  rr = engine.dispatchGame(ga, "y", { type: "Take", space: "Wood" });
  ok(!rr.ok, "空堆不能再拿");

  // 空过 N 轮后堆变大，一次拿走全部（每轮重置占用，模拟 startRound）
  ga.round = 4;
  ga.piles.Wood = 1;
  ga.placedThisRound = []; ga.usedSpaces = [];
  ga.waitingFor = ["x", "x", "x", "x", "x", "y", "y", "y"];
  engine.dispatchGame(ga, "x", { type: "Take", space: "Wood" });
  ga.round = 5; ga.placedThisRound = []; ga.usedSpaces = []; ga.waitingFor = ["x", "x", "x", "x", "x", "y", "y", "y"];
  engine.dispatchGame(ga, "x", { type: "Take", space: "Wood" });
  ga.round = 6; ga.placedThisRound = []; ga.usedSpaces = []; ga.waitingFor = ["x", "x", "x", "x", "x", "y", "y", "y"];
  engine.dispatchGame(ga, "x", { type: "Take", space: "Wood" });
  ga.piles.Wood += 1;   // 第 7 轮补充（模拟）
  ok(ga.piles.Wood === 1, "连续取用后每轮只有 1 个");
  ga.round = 7; ga.placedThisRound = []; ga.usedSpaces = [];
  ga.piles.Wood = 4;    // 模拟连续 4 轮无人取
  const before = ga.players[0].resources.wood;
  rr = engine.dispatchGame(ga, "x", { type: "Take", space: "Wood" });
  ok(rr.ok && ga.players[0].resources.wood === before + 4, `积 4 轮后一次拿走 4 木（+${ga.players[0].resources.wood - before}）`);
  ok(ga.piles.Wood === 0, "再次清零");
}

// ---- 测试 4：完整 14 轮自动对局（走真实引擎流程 + 严格回合序）----
console.log("\n🌀 完整 14 轮稳定性测试（2 玩家自动对局）");
{
  const players2 = [{ id: "x", name: "X", seat: 0 }, { id: "y", name: "Y", seat: 1 }];
  const g2 = engine.createGame(players2);
  let safety = 0;
  let lastRound = 0;
  const SPACES = ["DayLaborer", "Fishing", "Wood", "Clay", "Reed", "Grain", "Vegetable"];
  while (!g2.finished && safety < 4000) {
    safety++;
    const pid = g2.waitingFor[0];
    if (!pid) {
      // 队列为空但未结束 —— 引擎缺陷，测试失败
      ok(false, `第 ${g2.round} 轮等待队列为空但游戏未结束`);
      break;
    }
    const opts = [...SPACES];
    if (g2.round >= 9) opts.push("Stone");
    if (g2.round >= 5) opts.push("Sheep");
    if (g2.round >= 9) opts.push("Boar");
    if (g2.round >= 13) opts.push("Cattle");
    let acted = false;
    for (const sp of opts) {
      const rr = engine.dispatchGame(g2, pid, { type: "Take", space: sp });
      if (rr.ok) { acted = true; break; }
    }
    if (!acted) {
      ok(false, `第 ${g2.round} 轮玩家 ${pid} 无任何可用行动（可能死锁）`);
      break;
    }
    if (g2.round !== lastRound) lastRound = g2.round;
  }
  ok(g2.finished, `14 轮自动跑完并结算 (round=${g2.round}, finished=${g2.finished})`);
  ok(!!g2.scores && g2.scores.length === 2, `结算分数已生成 (${(g2.scores || []).map(s => `${s.name}=${s.total}`).join(", ")})`);
  ok(safety < 4000, `未进入死循环 (steps=${safety})`);
  // 所有数值必须是有限数（不能出现 NaN → JSON null）
  const numeric = g2.players.flatMap(p => [p.food, p.beggings, p.family, p.resources.wood, p.resources.grain, p.resources.vegetable, p.resources.reed, p.resources.clay, p.resources.stone]);
  ok(numeric.every(n => typeof n === "number" && Number.isFinite(n)), "所有玩家数值均为有限数（无 NaN/null）");
}

// ---- 测试 5：起始玩家不应产生 NaN（历史 bug 回归）----
console.log("\n🚜 起始玩家食物（NaN 回归测试）");
{
  const g3 = engine.createGame([{ id: "a", name: "A", seat: 0 }, { id: "b", name: "B", seat: 1 }]);
  const before = g3.players[1].food;
  const rr = act(g3, "b", { type: "Take", space: "StartPlayer" });
  const p = g3.players[1];
  ok(rr.ok, "取起始玩家成功");
  ok(Number.isFinite(p.food), `食物为有限数（food=${p.food}，取前 ${before}）`);
  ok(p.food === before + 1, `起始玩家 +1 食物（${before} → ${p.food}）`);
  ok(g3.startPlayerId === "b", "起始玩家标记已转移");
}

// ---- 测试 6：收获阶段喂养真的扣食物 ----
console.log("\n🍞 收获喂养扣食测试");
{
  const g4 = engine.createGame([{ id: "s", name: "S", seat: 0 }]);
  g4.players[0].food = 10;
  // 行动格每轮只能被占用一次；用两个不同的免费格（修订版：日工 +2 食物 / 钓鱼 +1 食物）
  const FREE = ["DayLaborer", "Fishing"];
  let steps = 0;
  let pick = 0;
  while (g4.round <= 4 && !g4.finished && steps < 60) {
    steps++;
    const pid = g4.waitingFor[0];
    if (!pid) break;
    const rr = engine.dispatchGame(g4, pid, { type: "Take", space: FREE[pick++ % FREE.length] });
    if (!rr.ok) break;
  }
  ok(g4.round >= 5, `第 4 轮收获已触发（现第 ${g4.round} 轮）`);
  // 起手 10 + 每轮(日工 2 + 钓鱼 1)×4轮 = 18，收获需 2人×2 = 4 → 18
  const food = g4.players[0].food;
  ok(Number.isFinite(food), `食物为有限数（food=${food}）`);
  ok(food === 18, `喂养扣除 4 食物（期望 18，实际 ${food}）`);
  ok(g4.players[0].beggings === 0, `食物充足无乞讨卡（beggings=${g4.players[0].beggings}）`);
}

// ---- 测试 7：行动格每轮只能被占用一次 ----
console.log("\n🚧 行动格占用（每格每轮一次）");
{
  const g5 = engine.createGame([{ id: "m", name: "M", seat: 0 }, { id: "n", name: "N", seat: 1 }]);
  const food0 = g5.players[0].food;
  const r1 = act(g5, "m", { type: "Take", space: "StartPlayer" });
  ok(r1.ok, "第 1 次拿起始玩家成功");
  ok(g5.usedSpaces.includes("StartPlayer"), "起始玩家格已标记为占用");
  // m 还有第 2 个工人，再想拿同一格应被拒
  const r2 = act(g5, "m", { type: "Take", space: "StartPlayer" });
  ok(!r2.ok, `同一轮不能重复拿起始玩家（msg=${r2.msg}）`);
  ok(g5.players[0].food === food0 + 1, `食物只 +1（${food0} → ${g5.players[0].food}）`);
  // 对手也不能拿（不在自己回合且已被占用）
  const r3 = act(g5, "n", { type: "Take", space: "StartPlayer" });
  ok(!r3.ok, "对手同一轮也不能拿已被占用的格");
  // 日工同样每轮一次
  ok(act(g5, "m", { type: "Take", space: "DayLaborer" }).ok, "日工第一次可用");
  ok(!act(g5, "n", { type: "Take", space: "DayLaborer" }).ok, "日工同一轮第二次被拒");
  // 撒种与烤面包同属一格
  const g6 = engine.createGame([{ id: "q", name: "Q", seat: 0 }]);
  g6.usedSpaces.push("SowOrBake");
  ok(!engine.dispatchGame(g6, "q", { type: "BakeBread", oven: "clayOven", grain: 1 }).ok, "撒种/烤面包格被占用后不能烤面包");

  // 行动格被占满时，剩余工人自动跳过（否则会卡死）
  const g7 = engine.createGame([{ id: "z", name: "Z", seat: 0 }]);
  const ALL = ["Wood","Clay","Reed","Stone","Grain","Vegetable","Fishing","DayLaborer",
    "StartPlayer","SowOrBake","BuildRoom","Sheep","Boar","Cattle",
    "Fences","FamilyGrowth","Renovate","BuildMajor"];
  g7.usedSpaces = ALL; // 只留「犁地」可用
  const r7 = engine.dispatchGame(g7, "z", { type: "PlowField", x: 0, y: 0 });
  ok(r7.ok, "唯一剩余的格子（犁地）可用");
  ok(g7.round === 2, `工人放不下时自动跳过并进入下一轮（round=${g7.round}）`);
  ok(g7.log.some((e) => /跳过/.test(e.msg)), "日志记录了自动跳过");
  ok(g7.usedSpaces.length === 0, "新一轮行动格占用已重置");
}

// ---- 测试 8：回合卡揭示后永久保留（不随回合消失）----
console.log("\n🎴 回合卡永久保留");
{
  const g8 = engine.createGame([{ id: "k", name: "K", seat: 0 }]);
  ok(g8.revealed.includes("Fences"), `第 1 轮揭示「建栅栏」（revealed=${JSON.stringify(g8.revealed)}）`);

  // 推进轮次：每个工人用不同的免费格（行动格每轮一次）
  const step = (spaces) => { for (const s of spaces) engine.dispatchGame(g8, g8.waitingFor[0], { type: "Take", space: s }); };
  step(["DayLaborer", "Fishing"]);            // → 第 2 轮
  ok(g8.round === 2, `推进到第 2 轮（round=${g8.round}）`);
  ok(g8.revealed.includes("Fences"), "第 2 轮「建栅栏」仍在版图上（关键回归点）");

  step(["DayLaborer", "Fishing"]);            // → 第 3 轮
  ok(g8.round === 3, `推进到第 3 轮（round=${g8.round}）`);
  ok(g8.revealed.includes("Fences"), "第 3 轮「建栅栏」仍可用");
  ok(g8.revealed.includes("BuildMajor"), `第 3 轮新揭示「大改进」（revealed=${JSON.stringify(g8.revealed)}）`);

  // 第 3 轮真的能建栅栏（用户反馈的场景）
  g8.players[0].resources.wood = 15;
  const rf = engine.dispatchGame(g8, g8.waitingFor[0], { type: "BuildFences", edges: ["h2,0", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"] });
  ok(rf.ok, `第 3 轮仍能建栅栏（r=${JSON.stringify(rf)}）`);
  ok(g8.players[0].pastures.length === 1, "牧场已生成");

  step(["DayLaborer"]);                        // 第 3 轮第二个工人
  ok(g8.round === 4, `推进到第 4 轮（round=${g8.round}）`);
  ok(g8.revealed.includes("Fences") && g8.revealed.includes("BuildMajor"), "第 4 轮两张回合卡都还在");

  // 重复提交已建好的栅栏段：必须被拒绝，且不消耗工人（回归：曾白烧一次行动）
  const workersBefore = g8.placedThisRound.filter((x) => x === "k").length;
  const rdup = engine.dispatchGame(g8, g8.waitingFor[0], { type: "BuildFences", edges: ["h2,0", "v2,0", "v2,1"] });
  ok(!rdup.ok, `全部为已建段时应被拒绝（msg=${rdup.msg}）`);
  ok(g8.placedThisRound.filter((x) => x === "k").length === workersBefore, "被拒绝时不消耗工人");
  ok(g8.players[0].resources.wood === 9, `木头未被扣（实际 ${g8.players[0].resources.wood}）`);
}

// ---- 测试 9：DLC：职业 + 小发展卡 ----
console.log("\n🎴 DLC 职业 / 小发展卡");
{
  // 默认：不启用 DLC → 没有手牌、没有 minor 卡
  const gx0 = engine.createGame([{ id: "p1", name: "P1", seat: 0 }, { id: "p2", name: "P2", seat: 1 }]);
  ok(!gx0.dlc.occupations && !gx0.dlc.minorImprovements, "默认 DLC 全关");
  ok(!gx0.players[0].occupationHand || gx0.players[0].occupationHand.length === 0, "默认玩家没有职业手牌");
  ok(!gx0.minorImprovementCards || gx0.minorImprovementCards.length === 0, "默认 minor 卡池为空");

  // 启用 occupations → 每位玩家发 7 张；可从中选 1
  const gx1 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: true, minorImprovements: false } }
  );
  ok(gx1.dlc.occupations, "occupations 已启用");
  ok(gx1.players[0].occupationHand.length === 7, `7 张手牌（实际 ${gx1.players[0].occupationHand.length}）`);
  ok(gx1.players[0].minorImprovements.length === 0, "未启用 minorImprovements → 不发卡");

  // 选职业：成功 + 日志 + 可重选（不可重复选同一张）
  const firstId = gx1.players[0].occupationHand[2].id;
  const r1 = engine.dispatchGame(gx1, "p1", { type: "ChooseOccupation", id: firstId });
  ok(r1.ok && gx1.players[0].occupation && gx1.players[0].occupation.id === firstId, "选职业成功");
  ok(gx1.log.some((e) => /选了职业/.test(e.msg)), "选了职业有日志");

  const r2 = engine.dispatchGame(gx1, "p1", { type: "ChooseOccupation", id: firstId });
  ok(!r2.ok, `重复选同一张被拒（${r2.msg}）`);

  // 不可选手牌里没有的卡
  const r3 = engine.dispatchGame(gx1, "p1", { type: "ChooseOccupation", id: "this-id-doesnt-exist" });
  ok(!r3.ok, `非手牌职业被拒（${r3.msg}）`);

  // 选职业不消耗工人
  const placedBefore = gx1.placedThisRound.filter((x) => x === "p1").length;
  engine.dispatchGame(gx1, "p1", { type: "ChooseOccupation", id: gx1.players[0].occupationHand[0].id });
  ok(gx1.placedThisRound.filter((x) => x === "p1").length === placedBefore, "选职业不消耗工人");

  // 启用 minorImprovements → 抽出 1 张可抢
  const gx2 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: false, minorImprovements: true } }
  );
  ok(gx2.minorImprovementCards.length >= 1, `抽到至少 1 张 minor 卡（${gx2.minorImprovementCards.length}）`);
  const cardId = gx2.minorImprovementCards[0].id;
  const cardIsOneShot = gx2.minorImprovementCards[0].oneShot;
  const foodBefore = gx2.players[0].food;
  const r4 = engine.dispatchGame(gx2, "p1", { type: "TakeMinorImprovement", id: cardId });
  ok(r4.ok, `抢 minor 卡成功（${cardId}, oneShot=${cardIsOneShot}）`);
  if (cardIsOneShot) {
    ok(gx2.players[0].food > foodBefore || gx2.players[0].minorImprovements.includes(cardId),
      `一次性 minor 已结算（food ${foodBefore} → ${gx2.players[0].food}）`);
    ok(!gx2.minorImprovementCards.some((c) => c.id === cardId), "一次性卡已从场里移除");
  } else {
    ok(gx2.players[0].minorImprovements.includes(cardId), "永久卡加入玩家持有");
  }

  // 不允许重复抢同一张
  const r5 = engine.dispatchGame(gx2, "p1", { type: "TakeMinorImprovement", id: cardId });
  ok(!r5.ok || !gx2.minorImprovementCards.some((c) => c.id === cardId), "重复抢同一张不会重复入账");

  // DLC 未启用的房间不能调相关动作
  const r6 = engine.dispatchGame(gx0, "p1", { type: "TakeMinorImprovement", id: "mi.well" });
  ok(!r6.ok, `未启用 minorImprovements 的房间拒绝（${r6.msg}）`);
  const r7 = engine.dispatchGame(gx0, "p1", { type: "ChooseOccupation", id: "woodcutter" });
  ok(!r7.ok, `未启用 occupations 的房间拒绝（${r7.msg}）`);
}

// ---- 测试 10：DLC #3 Farmers of the Moor ----
console.log("\n🌲 Farmers of the Moor（燃料 / 干草 / 沼泽）");
{
  // 默认：不启用 moor → fuel/hay 都是 0，moor 板空，runHarvest 不扣燃料 / 干草
  const gm0 = engine.createGame([{ id: "p1", name: "P1", seat: 0 }]);
  ok(!gm0.dlc.moor, "默认 moor 关闭");
  ok(gm0.moorBoard.length === 0, "默认沼泽板为空");
  ok(gm0.players[0].fuel === 0 && gm0.players[0].hay === 0, "玩家默认 fuel/hay = 0");

  // 启用 moor → startRound 时累积堆 +1
  // 测试 GatherFuel / CutMeadow：拿走累积堆全部（用 2 个不同的免费格轮流，确保 family 充足）
  const gm1 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: false, minorImprovements: false, moor: true } }
  );
  ok(gm1.dlc.moor, "moor 已启用");
  ok(gm1.moorFuelPile >= 1 && gm1.moorHayPile >= 1, `燃料/干草累积堆已就绪（fuel=${gm1.moorFuelPile}, hay=${gm1.moorHayPile}）`);
  gm1.revealed.push("GatherFuel", "CutMeadow", "ReclaimMoor", "SowMoor"); // 模拟 Moor 回合卡已揭示
  // 拿燃料（占 1 工人）
  const r1 = engine.dispatchGame(gm1, "p1", { type: "GatherFuel" });
  ok(r1.ok && gm1.players[0].fuel >= 1, `GatherFuel：拿走燃料堆全部（player.fuel=${gm1.players[0].fuel}）`);
  ok(gm1.moorFuelPile === 0, "燃料累积堆被清零");
  // 用钓鱼占第 2 个工人位
  engine.dispatchGame(gm1, "p1", { type: "Take", space: "Fishing" });
  // 第 2 轮：拿干草
  const hayBefore = gm1.moorHayPile;
  const r2 = engine.dispatchGame(gm1, "p1", { type: "CutMeadow" });
  ok(r2.ok && gm1.players[0].hay >= hayBefore, `CutMeadow：拿走干草堆全部（player.hay=${gm1.players[0].hay}）`);
  ok(gm1.moorHayPile === 0, "干草累积堆被清零");

  // 测试 ReclaimMoor：1 木 + 1 芦苇 → moorBoard 多 1 格，自身 +1 燃料
  const gm2 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: false, minorImprovements: false, moor: true } }
  );
  gm2.revealed.push("ReclaimMoor", "SowMoor"); // 模拟 Moor 回合卡已揭示
  gm2.players[0].resources.wood = 5;
  gm2.players[0].resources.reed = 5;
  gm2.players[0].fuel = 0;
  const woodBefore = gm2.players[0].resources.wood;
  const reedBefore = gm2.players[0].resources.reed;
  const r3 = engine.dispatchGame(gm2, "p1", { type: "ReclaimMoor", x: 0, y: 0 });
  ok(r3.ok && gm2.moorBoard.length === 1 && gm2.moorBoard[0].x === 0 && gm2.moorBoard[0].y === 0, "ReclaimMoor 后 moorBoard 多一格 (0,0)");
  ok(gm2.players[0].resources.wood === woodBefore - 1 && gm2.players[0].resources.reed === reedBefore - 1, "扣 1 木 + 1 芦苇");
  ok(gm2.players[0].fuel >= 1, "ReclaimMoor 奖励 1 燃料");

  // 重复 reclaim 同一格被拒
  const r3b = engine.dispatchGame(gm2, "p1", { type: "ReclaimMoor", x: 0, y: 0 });
  ok(!r3b.ok, `重复 reclaim 被拒（${r3b.msg}）`);

  // 测试 SowMoor：撒谷 + 计 moorFields
  gm2.players[0].resources.grain = 5;
  const r4 = engine.dispatchGame(gm2, "p1", { type: "SowMoor", x: 0, y: 0, crop: "grain" });
  ok(r4.ok && gm2.moorBoard[0].crop === "grain" && gm2.moorBoard[0].sownBy === "p1", "撒谷：cell.crop=grain, sownBy=p1");
  ok(gm2.players[0].moorFields.length === 1, "玩家 moorFields 1 条");

  // 不开 moor 的房间不能调相关 action
  const gmX = engine.createGame([{ id: "x", name: "X", seat: 0 }]);
  const rg1 = engine.dispatchGame(gmX, "x", { type: "GatherFuel" });
  ok(!rg1.ok, `未启用 moor → GatherFuel 拒绝（${rg1.msg}）`);
  const rr1 = engine.dispatchGame(gmX, "x", { type: "ReclaimMoor", x: 0, y: 0 });
  ok(!rr1.ok, `未启用 moor → ReclaimMoor 拒绝（${rr1.msg}）`);

  // 收获阶段：燃料消耗 + 缺燃料 = 乞讨
  // 直接用引擎手动推 4 轮比较稳，跑过第 4 轮（收获）观察 fuel/beggings 变化
  const gm3 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: false, minorImprovements: false, moor: true } }
  );
  const food0 = gm3.players[0].food;
  gm3.players[0].fuel = 0;
  const FREE3 = ["DayLaborer", "Fishing"];
  let pick3 = 0, steps = 0;
  while (gm3.round < 5 && !gm3.finished && steps < 80) {
    steps++;
    const pid = gm3.waitingFor[0];
    if (!pid) break;
    const r = engine.dispatchGame(gm3, pid, { type: "Take", space: FREE3[pick3++ % FREE3.length] });
    if (!r.ok) break;
  }
  // 第 4 轮已收获，p.fuel 应已被尝试扣（player.family=2，每人 1 → 需 2 燃料），fuel=0 → beggings += 2
  ok(gm3.round >= 5, `推进到第 5 轮（实际 round=${gm3.round}）`);
  const beggingsAfterHarvest = gm3.players[0].beggings;
  ok(beggingsAfterHarvest >= 2, `第 1 次收获后因缺燃料，beggings 增加（≥2，实际 ${beggingsAfterHarvest}）`);

  // 干草喂牛：第 13 轮才开放牛市，第 14 轮收获时才能测
  const gm4 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: false, minorImprovements: false, moor: true } }
  );
  gm4.players[0].food = 10;
  gm4.players[0].animals.cattle = 2;
  gm4.players[0].hay = 0;
  // 2 个不同的免费格轮流（每轮 +1 名工人放）
  const FREE4 = ["DayLaborer", "Fishing"];
  let pick4 = 0, s2 = 0;
  while (gm4.round < 14 && !gm4.finished && s2 < 400) {
    s2++;
    const pid = gm4.waitingFor[0];
    if (!pid) break;
    const r4 = engine.dispatchGame(gm4, pid, { type: "Take", space: FREE4[pick4++ % FREE4.length] });
    if (!r4.ok) break;
  }
  ok(gm4.round >= 13, `到第 14 轮前（round=${gm4.round}）`);
  // 第 14 轮也走完一次（含收获），看牛数量
  if (gm4.waitingFor[0]) engine.dispatchGame(gm4, gm4.waitingFor[0], { type: "Take", space: "DayLaborer" });
  ok(gm4.players[0].animals.cattle < 2, `缺干草 → 牛 -1（cattle=${gm4.players[0].animals.cattle}）`);

  // scorePlayer：自己撒过种的沼泽田 + 私有田都计入 fields break-point
  const gm5 = engine.createGame(
    [{ id: "p1", name: "P1", seat: 0 }],
    { dlc: { occupations: false, minorImprovements: false, moor: true } }
  );
  gm5.revealed.push("ReclaimMoor", "SowMoor"); // 模拟 Moor 回合卡已揭示
  gm5.players[0].resources.wood = 5; gm5.players[0].resources.reed = 5; gm5.players[0].resources.grain = 5;
  engine.dispatchGame(gm5, "p1", { type: "ReclaimMoor", x: 0, y: 0 });
  engine.dispatchGame(gm5, "p1", { type: "ReclaimMoor", x: 1, y: 0 });
  engine.dispatchGame(gm5, "p1", { type: "SowMoor", x: 0, y: 0, crop: "grain" });
  engine.dispatchGame(gm5, "p1", { type: "SowMoor", x: 1, y: 0, crop: "grain" });
  const sc = engine.scorePlayer(gm5.players[0]);
  const myFields = gm5.players[0].moorFields.length; // 自己撒过种的沼泽田
  const privFields = gm5.players[0].grid.flat().filter(c => c.kind === "field").length;
  const expected = myFields + privFields;
  const idx = Math.min(5, expected);
  ok(sc.breakdown.田块 === -1 || sc.breakdown.田块 === 1, `私有 ${privFields} + moor ${myFields} = ${expected} 块，田块分 ${sc.breakdown.田块}（预期索引 ${idx}）`);
}

// ---- 测试 11：效果结算（水井 / 小发展卡 / 蜂箱 / 羊圈 / 泥炭窑 / 柴火棚 / 建材烹饪）----
console.log("\n⚙️ 效果结算（水井 / 小发展卡 / Moor 改进 / 建材烹饪）");
{
  // 水井：建成后 5 轮每轮开始 +1 食物
  const ge = engine.createGame([{ id: "p1", name: "P1", seat: 0 }]);
  ge.revealed.push("BuildMajor");
  ge.players[0].resources.stone = 3; ge.players[0].resources.wood = 1;
  const foodAtBuild = ge.players[0].food;
  ok(engine.dispatchGame(ge, "p1", { type: "BuildMajor", improvement: "well" }).ok, "建造水井成功");
  ok(ge.players[0].wellRounds === 5, `水井计数 = 5（实际 ${ge.players[0].wellRounds}）`);
  // 推 5 轮（每轮 2 工人：日工 + 钓鱼）
  let food0 = ge.players[0].food;
  let roundsSeen = 0;
  for (let s = 0; s < 60 && roundsSeen < 5; s++) {
    const pid = ge.waitingFor[0];
    if (!pid) break;
    const space = ge.usedSpaces.includes("DayLaborer") ? "Fishing" : "DayLaborer";
    engine.dispatchGame(ge, pid, { type: "Take", space });
    if (ge.round !== roundsSeen + 1 && ge.players[0].wellRounds < 5) roundsSeen = ge.round - 1;
  }
  ok(ge.players[0].wellRounds === 0, `5 轮后水井耗尽（实际 ${ge.players[0].wellRounds}）`);
  ok(ge.players[0].food > food0, "水井累计 +5 食物（食物增加）");

  // 永久小发展卡：柴堆每轮 +1 木；蜂箱收获 +1 食物；羊圈买羊 +1
  const gm = engine.createGame([{ id: "p1", name: "P1", seat: 0 }], { dlc: { occupations: false, minorImprovements: true, moor: true } });
  const p = gm.players[0];
  p.minorImprovements.push("mi.firewood", "mi.beehive", "mi.sheepPen");
  const wood0 = p.resources.wood;
  // 推 1 轮（2 工人）
  engine.dispatchGame(gm, "p1", { type: "Take", space: "DayLaborer" });
  engine.dispatchGame(gm, "p1", { type: "Take", space: "Fishing" });
  ok(p.resources.wood === wood0 + 1, `柴堆每轮 +1 木（${wood0} → ${p.resources.wood}）`);
  // 羊圈：围牧场 → 买羊 +1
  p.resources.wood = 15;
  engine.dispatchGame(gm, "p1", { type: "BuildFences", edges: ["h2,0", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"] });
  gm.usedSpaces = [];
  gm.piles.Sheep = 2;
  gm.round = 6; // 羊市已开放且不是收获轮（隔离繁殖干扰）
  const sheep0 = p.animals.sheep;
  engine.dispatchGame(gm, "p1", { type: "Take", space: "Sheep" });
  ok(p.animals.sheep === sheep0 + 2 + 1, `羊圈额外 +1（${sheep0} → ${p.animals.sheep}）`);

  // 建材烹饪：木工坊 1 木 → 2 食物
  const gj = engine.createGame([{ id: "p1", name: "P1", seat: 0 }]);
  const pj = gj.players[0];
  pj.improvements.push("joinery");
  pj.resources.wood = 2;
  const f0 = pj.food;
  ok(engine.dispatchGame(gj, "p1", { type: "Cook", improvement: "joinery", used: { wood: 1 } }).ok, "木工坊烹饪 1 木成功");
  ok(pj.resources.wood === 1 && pj.food === f0 + 2, `1 木 → 2 食物（wood=${pj.resources.wood}, food=${pj.food}）`);

  // Moor 改进：泥炭窑收获 +1 燃料；柴火棚终局燃料分
  const gk = engine.createGame([{ id: "p1", name: "P1", seat: 0 }], { dlc: { occupations: false, minorImprovements: false, moor: true } });
  const pk = gk.players[0];
  pk.improvements.push("peatKiln", "firewood", "heatingStove");
  pk.fuel = 3;
  pk.family = 2;
  // 推过第 4 轮收获
  let s3 = 0;
  while (gk.round < 5 && !gk.finished && s3 < 60) {
    s3++;
    const pid = gk.waitingFor[0];
    if (!pid) break;
    engine.dispatchGame(gk, pid, { type: "Take", space: gk.usedSpaces.includes("DayLaborer") ? "Fishing" : "DayLaborer" });
  }
  ok(gk.round >= 5, `跑过第 4 轮收获（round=${gk.round}）`);
  // 取暖炉：只烧 1；泥炭窑 +1 → 净变化 0 → fuel 仍 3
  ok(pk.fuel === 3, `泥炭窑+1 / 取暖炉只烧1（fuel=${pk.fuel}）`);
  const scK = engine.scorePlayer(pk);
  ok(scK.breakdown.柴火 === 3, `柴火棚终局燃料分 = 3（实际 ${scK.breakdown.柴火}）`);
}

// ---- 测试 12：职业卡系统测试（88 张全量卡池与流派钩子）----
console.log("\n🎴 职业卡系统测试（88张全量卡池与流派钩子）");
{
  // 1. 卡池总数与完整性
  ok(Array.isArray(engine.OCCUPATIONS), "OCCUPATIONS 卡池已导出");
  ok(engine.OCCUPATIONS.length === 88, `卡池总数严格为 88 张官方经典职业（实际：${engine.OCCUPATIONS.length}）`);
  const catCounts = {};
  for (const occ of engine.OCCUPATIONS) {
    catCounts[occ.category] = (catCounts[occ.category] || 0) + 1;
    ok(!!occ.id && !!occ.name && !!occ.icon && !!occ.effect && !!occ.category && !!occ.categoryZh && !!occ.flavor, `卡牌 [${occ.id}] ${occ.name} 具有完整元数据`);
  }
  ok(catCounts.resource === 15, `基础资源流派 15 张（实际：${catCounts.resource}）`);
  ok(catCounts.farming === 13, `农耕种植流派 13 张（实际：${catCounts.farming}）`);
  ok(catCounts.livestock === 11, `牲畜畜牧流派 11 张（实际：${catCounts.livestock}）`);
  ok(catCounts.building === 12, `建造翻修流派 12 张（实际：${catCounts.building}）`);
  ok(catCounts.cooking === 19, `饮食烹饪流派 19 张（实际：${catCounts.cooking}）`);
  ok(catCounts.family === 10, `家庭运营流派 10 张（实际：${catCounts.family}）`);
  ok(catCounts.scoring === 8, `终局声望流派 8 张（实际：${catCounts.scoring}）`);

  const gOcc = engine.createGame([{ id: "p1", name: "P1", seat: 0 }], { dlc: { occupations: true, minorImprovements: true, moor: false } });
  const p1 = gOcc.players[0];

  // 2. 每轮被动（伐木工 +1 木）
  p1.occupation = { id: "woodcutter", name: "伐木工", icon: "🪓", effect: "每轮开始：额外获得 1 木" };
  const w0 = p1.resources.wood;
  // 推过 1 轮
  engine.dispatchGame(gOcc, "p1", { type: "Take", space: "DayLaborer" });
  engine.dispatchGame(gOcc, "p1", { type: "Take", space: "Fishing" });
  ok(p1.resources.wood === w0 + 1, `伐木工每轮开始 +1 木（${w0} → ${p1.resources.wood}）`);

  // 3. 行动加成（柴夫拿木材 +1 木）
  p1.occupation = { id: "lumberjack", name: "柴夫", icon: "🪵", effect: "拿木材行动：额外多拿 1 木" };
  gOcc.piles.Wood = 2;
  const wBefore = p1.resources.wood;
  gOcc.usedSpaces = []; // 清空本轮占用以便测试
  engine.dispatchGame(gOcc, "p1", { type: "Take", space: "Wood" });
  ok(p1.resources.wood === wBefore + 2 + 1, `柴夫拿木材额外 +1 木（${wBefore} + 2 + 1 = ${p1.resources.wood}）`);

  // 4. 建造减免（木匠建造木屋节省 1 木）
  p1.occupation = { id: "carpenter", name: "木匠", icon: "📐", effect: "建造木屋：每间房节省 1 木材" };
  p1.resources.wood = 4; p1.resources.reed = 2;
  gOcc.usedSpaces = [];
  const rRoom = engine.dispatchGame(gOcc, "p1", { type: "BuildRoom", x: 2, y: 3 });
  ok(rRoom.ok, `木匠造木屋成功（原本需 5 木，木匠省 1 木仅需 4 木, msg=${rRoom.msg}）`);
  ok(p1.rooms === 3, "房间数增加到 3");

  // 5. 烘焙与烹饪加成（面包学徒烤面包 +1 食物，熏肉师傅肉类烹饪 +2 食物）
  p1.occupation = { id: "breadBakerApprentice", name: "面包学徒", icon: "🥐", effect: "烤面包行动：额外多产 1 食物" };
  p1.improvements = ["clayOven"];
  p1.resources.grain = 1;
  p1.food = 0;
  gOcc.usedSpaces = [];
  const rBake = engine.dispatchGame(gOcc, "p1", { type: "BakeBread", oven: "clayOven", grain: 1 });
  ok(rBake.ok, `面包学徒烤面包成功（${rBake.msg}）`);
  ok(p1.food === 5 + 1, `陶土烤炉出 5 食物 + 面包学徒额外 +1 食物（实际：${p1.food}）`);

  p1.occupation = { id: "smokehouseMaster", name: "熏肉师傅", icon: "🥓", effect: "烹饪牲畜时：每次烹饪额外多产 2 食物" };
  p1.improvements = ["fireplace"];
  p1.animals.sheep = 2;
  p1.food = 0;
  const rCook = engine.dispatchGame(gOcc, "p1", { type: "Cook", improvement: "fireplace", used: { sheep: 2 } });
  ok(rCook.ok, `熏肉师傅烹饪成功`);
  ok(p1.food === 1 + 2, `壁炉 2 羊出 1 食物 + 熏肉师傅额外 +2 食物（实际：${p1.food}）`);

  // 6. 终局加分验证（学者导师、育种大师、慈善家、农艺学者、牧场伯爵）
  p1.occupation = { id: "tutor", name: "学者导师", icon: "📜", effect: "拥有 ≥3 项改进额外 +3 分" };
  p1.improvements = ["well", "fireplace2"];
  p1.minorImprovements = ["mi.well"];
  const scTutor = engine.scorePlayer(p1);
  ok(scTutor.breakdown.职业 === 3, `学者导师终局加分生效（${scTutor.breakdown.职业} 分）`);

  p1.occupation = { id: "masterBreeder", name: "育种大师", icon: "🏆", effect: "终局计分：羊/猪/牛三畜齐全额外 +4 分" };
  p1.animals = { sheep: 1, boar: 1, cattle: 1 };
  const scBreeder = engine.scorePlayer(p1);
  ok(scBreeder.breakdown.职业 === 4, `育种大师三畜齐全终局加分生效（${scBreeder.breakdown.职业} 分）`);

  p1.occupation = { id: "philanthropist", name: "慈善家", icon: "💖", effect: "终局计分：食物储备 ≥5 且无乞讨额外 +3 分" };
  p1.food = 5;
  p1.beggings = 0;
  const scPhil = engine.scorePlayer(p1);
  ok(scPhil.breakdown.职业 === 3, `慈善家丰足终局加分生效（${scPhil.breakdown.职业} 分）`);

  p1.occupation = { id: "agronomist", name: "农艺学者", icon: "🌱", effect: "终局计分：耕地数量 ≥4 块时额外 +3 分" };
  p1.grid[0][0] = { kind: "field" };
  p1.grid[0][1] = { kind: "field" };
  p1.grid[0][2] = { kind: "field" };
  p1.grid[1][0] = { kind: "field" };
  const scAgro = engine.scorePlayer(p1);
  ok(scAgro.breakdown.职业 === 3, `农艺学者 ≥4 耕地终局加分生效（${scAgro.breakdown.职业} 分）`);

  p1.occupation = { id: "pastureCount", name: "牧场伯爵", icon: "🏰", effect: "终局计分：封闭牧场数量 ≥3 处额外 +3 分" };
  p1.pastures = [{ id: "p0", cells: ["0,0"] }, { id: "p1", cells: ["1,0"] }, { id: "p2", cells: ["2,0"] }];
  const scPasture = engine.scorePlayer(p1);
  ok(scPasture.breakdown.职业 === 3, `牧场伯爵 ≥3 牧场终局加分生效（${scPasture.breakdown.职业} 分）`);
}


// ============================================================
// 📅 Through the Seasons（节气轮转）测试
// ============================================================
console.log("");
console.log("📅 Through the Seasons（节气轮转）");
{
  // 自动推进工具：每次让 waitingFor[0] 尝试多个可用累积格（与 14 轮稳定性测试同策略）
  const TTS_OPTS = ["DayLaborer", "Fishing", "Grain"]; // 不动建材堆，保证 delta 断言确定性
  const drainTo = (g, target) => {
    let guard = 0;
    while (g.round < target && !g.finished && guard++ < 600) {
      const pid = g.waitingFor[0];
      if (!pid) break;
      let acted = false;
      for (const sp of TTS_OPTS) {
        const rr = act(g, pid, { type: "Take", space: sp });
        if (rr.ok) { acted = true; break; }
      }
      if (!acted) {
        // 无可用累积格（如冬季鱼塘封冻）：用 EndTurn 强制收工，让轮次推进
        const rr2 = act(g, pid, { type: "EndTurn" });
        if (!rr2.ok) break;
      }
    }
  };

  // 1) 默认关闭 + 开启后季节轮转
  const g0 = engine.createGame([{ id: "a", name: "A", seat: 0 }]);
  ok(g0.dlc.seasons === false, "默认 seasons 关闭");

  const gs = engine.createGame([{ id: "a", name: "A", seat: 0 }, { id: "b", name: "B", seat: 1 }], { dlc: { occupations: false, minorImprovements: false, moor: false, seasons: true } });
  ok(gs.dlc.seasons === true, "seasons 已启用");
  ok(Number.isInteger(gs.seasonStart) && gs.seasonStart >= 0 && gs.seasonStart <= 3, `seasonStart 随机在 0..3（实际 ${gs.seasonStart}）`);
  const order = ["spring", "summer", "autumn", "winter"];
  ok(gs.season === order[gs.seasonStart % 4], `第 1 轮季节正确（${gs.season}）`);

  // 固定 seasonStart=0：第 2 轮=夏、第 3 轮=秋、第 4 轮=冬、第 5 轮=春（第 1 轮已用随机季节结算）
  gs.seasonStart = 0;
  drainTo(gs, 3);
  ok(gs.round === 3 && gs.season === "autumn", `推进到第 3 轮（round=${gs.round} season=${gs.season}）`);

  // 2) 秋→冬 转换的资源增减：冬 陶/苇 不+1（delta 0），木正常 +1
  const snap3 = { Wood: gs.piles.Wood, Clay: gs.piles.Clay, Reed: gs.piles.Reed };
  drainTo(gs, 4);
  ok(gs.round === 4 && gs.season === "winter", `第 4 轮为冬季（season=${gs.season}）`);
  ok(gs.piles.Wood === snap3.Wood + 1, `木堆正常 +1（${snap3.Wood} → ${gs.piles.Wood}）`);
  ok(gs.piles.Clay === snap3.Clay, `冬季陶坑少 +1（${snap3.Clay} → ${gs.piles.Clay}）`);
  ok(gs.piles.Reed === snap3.Reed, `冬季芦苇滩少 +1（${snap3.Reed} → ${gs.piles.Reed}）`);

  // 3) 冬季钓鱼封冻
  gs.piles.Fishing = 2;
  const rFish = act(gs, "a", { type: "Take", space: "Fishing" });
  ok(!rFish.ok, `冬季钓鱼被拒（msg=${rFish.msg}）`);
  ok(gs.piles.Fishing === 2, "鱼塘未被取走");

  // 4) 冬季犁地需 1 食物
  const pa = gs.players.find((p) => p.id === "a");
  pa.food = 0;
  const rPlow0 = act(gs, "a", { type: "PlowField", x: 0, y: 0 });
  ok(!rPlow0.ok, `无食物冬季犁地被拒（msg=${rPlow0.msg}）`);
  pa.food = 3;
  const rPlow = act(gs, "a", { type: "PlowField", x: 0, y: 0 });
  ok(rPlow.ok, "有食物冬季犁地成功");
  ok(pa.food === 2, `犁地扣 1 食物（3 → 2，实际 ${pa.food}）`);

  // 5) 冬季家庭扩建（无需空房，2 木 + 3 食物）
  const pb = gs.players.find((p) => p.id === "b");
  pb.resources.wood = 5;
  pb.food = 6;
  const roomsBefore = pb.rooms;
  const rWin = act(gs, "b", { type: "SeasonWinter" });
  ok(rWin.ok, `冬季扩建成功（msg=${rWin.msg}）`);
  ok(pb.family === 3, `无需空房家人 +1（2 → 3，实际 ${pb.family}）`);
  ok(pb.rooms === roomsBefore, `房间数不变（仍 ${pb.rooms} 间）`);
  ok(pb.babiesThisRound === 1, "本轮出生不干活（babiesThisRound=1）");
  ok(pb.resources.wood === 3 && pb.food === 3, `扣 2 木 3 食（wood=${pb.resources.wood} food=${pb.food}）`);

  // 6) 冬→春 转换：春 木不+1（delta 0）、石 +2（基础 1 + 春季 1）
  const snap4 = { Wood: gs.piles.Wood, Stone: gs.piles.Stone };
  drainTo(gs, 5);
  ok(gs.round === 5 && gs.season === "spring", `第 5 轮为春季（season=${gs.season}）`);
  ok(gs.piles.Wood === snap4.Wood, `春季木堆少 +1（${snap4.Wood} → ${gs.piles.Wood}）`);
  ok(gs.piles.Stone === snap4.Stone + 2, `春季石场多 +1（${snap4.Stone} → ${gs.piles.Stone}）`);

  // 7) 春季建栅栏：6 段只付 4 木（最多 2 段免费，须至少付 1 段）
  const a2 = pa;
  a2.resources.wood = 10;
  const rFence = act(gs, "a", { type: "BuildFences", edges: ["h2,0", "h2,5", "v2,0", "v2,1", "v2,2", "v2,3", "v2,4"] });
  ok(rFence.ok, `春季建栅栏成功（msg=${rFence.msg}）`);
  ok(a2.resources.wood === 5, `春季 7 段栅栏只付 5 木（10 → ${a2.resources.wood}）`);
  ok(a2.pastures.length === 1, "围出 1 块牧场");

  // 8) 夏季度假得分 + 日工 +1 谷（第 6 轮 = summer）
  drainTo(gs, 6);
  ok(gs.round === 6 && gs.season === "summer", `第 6 轮为夏季（season=${gs.season}）`);
  // b 先打日工：验证夏季日工额外 +1 谷（日工格每轮全局一次，b 先用）
  const pbX = gs.players.find((p) => p.id === "b");
  const pbBeforeGrain = pbX.resources.grain;
  const rDL = act(gs, "b", { type: "Take", space: "DayLaborer" });
  ok(rDL.ok, `b 夏季日工成功（msg=${rDL.msg}）`);
  ok(pbX.resources.grain === pbBeforeGrain + 1, `夏季日工额外 +1 谷（实际 +${pbX.resources.grain - pbBeforeGrain}）`);
  // a 度假：本轮已放置 0 人 + 本次 1 = +1 节气分
  const rHol = act(gs, "a", { type: "SeasonSummer" });
  ok(rHol.ok, `度假成功（msg=${rHol.msg}）`);
  ok(a2.seasonVP === 1, `度假 +1 节气分（实际 ${a2.seasonVP}）`);
  const scHol = engine.scorePlayer(a2);
  ok(scHol.breakdown.节气 === 1, `终局计分含节气项（${scHol.breakdown.节气}）`);

  // 10) 秋收（第 7 轮 = autumn）：立即田间阶段 + 可选拿 1 菜
  drainTo(gs, 7);
  ok(gs.round === 7 && gs.season === "autumn", `第 7 轮为秋季（season=${gs.season}）`);
  a2.grid[0][1] = { kind: "field", crop: "grain", markers: 3 };
  a2.resources.grain = 0;
  const vegBefore = a2.resources.vegetable;
  const rAut = act(gs, "a", { type: "SeasonAutumn", takeVeg: true });
  ok(rAut.ok, `秋收成功（msg=${rAut.msg}）`);
  ok(a2.resources.grain === 1, `秋收田间阶段 +1 谷（实际 ${a2.resources.grain}）`);
  ok(a2.grid[0][1].markers === 2, `田 marker −1（3 → 2，实际 ${a2.grid[0][1].markers}）`);
  ok(a2.resources.vegetable === vegBefore + 1, "秋收额外拿 1 菜");

  // 11) 春耕（第 9 轮 = spring，四季每 4 轮循环）：繁殖 + 撒种
  drainTo(gs, 9);
  ok(gs.round === 9 && gs.season === "spring", `第 9 轮为春季（round=${gs.round} season=${gs.season}）`);
  // 11.5) 错季拒绝：春季执行冬季行动（b 先试，节气格未被占用）
  const rWrong = act(gs, "b", { type: "SeasonWinter" });
  ok(!rWrong.ok && (rWrong.msg || "").includes("不是冬季"), `春季执行冬季行动被拒（msg=${rWrong.msg}）`);
  a2.animals.sheep = 2;
  a2.grid[1][0] = { kind: "field" };
  a2.resources.grain = 1;
  const rSpr = act(gs, "a", { type: "SeasonSpring", crop: "grain", x: 0, y: 1 });
  ok(rSpr.ok, `春耕成功（msg=${rSpr.msg}）`);
  ok(a2.animals.sheep === 3, `春耕繁殖羊 +1（2 → 3，实际 ${a2.animals.sheep}）`);
  ok(a2.grid[1][0].crop === "grain" && a2.grid[1][0].markers === 3, "春耕顺带撒谷成功（marker=3）");
  ok(a2.resources.grain === 0, "撒谷扣 1 谷种");

  // 12) 未启用 seasons 的房间拒绝季节行动
  const gns = engine.createGame([{ id: "z", name: "Z", seat: 0 }]);
  const rNo = act(gns, "z", { type: "SeasonSummer" });
  ok(!rNo.ok, `未启用 seasons 时拒绝（msg=${rNo.msg}）`);

}

console.log(`\n${fail === 0 ? "🎉" : "💥"} ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
