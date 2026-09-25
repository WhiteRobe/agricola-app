// ============================================================
// 教程抽屉（右侧滑出，可被任意页面调用）
// ============================================================

const TUT_HTML = `
<div class="toc">
  <h4>📑 目录</h4>
  <ol>
    <li><a href="#intro">游戏是什么</a></li>
    <li><a href="#goal">目标与胜负</a></li>
    <li><a href="#setup">起始设置</a></li>
    <li><a href="#flow">每轮流程</a></li>
    <li><a href="#board">行动板</a></li>
    <li><a href="#harvest">收获</a></li>
    <li><a href="#roles">人丁与牲畜</a></li>
    <li><a href="#score">最终计分</a></li>
    <li><a href="#tips">新手建议</a></li>
  </ol>
</div>
<article class="tut">
  <h2 id="intro">1. 游戏是什么</h2>
  <p>《农场主》（<b>Agricola</b>）是经典德式策略桌游。<b>14 轮</b>后，看谁的农场最兴旺。 每人管理一片 <b>3×5 的农场</b>，每轮派家庭成员去 <b>行动板</b> 上执行拿资源、建房子、犁地、养动物等动作。</p>
  <p>本应用采用 <b>家庭变体</b>（无职业/小发展卡，更易上手），<b>1–4 人</b>同房间对战。</p>

  <h2 id="goal">2. 目标与胜负</h2>
  <ul>
    <li>✅ 田地、牧场、动物、谷物、蔬菜、家人 → 越多越好</li>
    <li>❌ 每块 <b>未利用空地</b> -1 分</li>
    <li>❌ 每张 <b>乞讨卡</b>（没喂饱家人）-3 分</li>
    <li>🏠 木屋 0 分 / 陶屋 1 分 / 石屋 2 分（每间）</li>
  </ul>
  <p>最高分者获胜。</p>

  <h2 id="setup">3. 起始设置</h2>
  <div class="kb-card">
    <h4>🌱 起始资源</h4>
    <ul>
      <li><b>起始玩家</b>（轮次标记拥有者）：2 食物</li>
      <li><b>其他玩家</b>：每人 3 食物</li>
      <li><b>2 名家庭成员</b>（可作为工人执行动作）</li>
      <li><b>2 间木屋</b>（放于相邻格）</li>
    </ul>
    <p class="muted" style="font-size:12px;margin:8px 0 0">
      注：原版的「马厩」（每座 1 木、最多 4 座，让所在牧场容量翻倍）本版本尚未实现，所以牧场容量固定为每格 2 只。
    </p>
  </div>

  <h2 id="flow">4. 每轮流程</h2>
  <div class="flow">
    <div class="flow-step"><div class="ic">📋</div><span class="nm">1. 揭回合卡</span></div>
    <div class="flow-step"><div class="ic">➕</div><span class="nm">2. 累积</span></div>
    <div class="flow-step"><div class="ic">🧑‍🌾</div><span class="nm">3. 工作</span></div>
    <div class="flow-step"><div class="ic">🛏</div><span class="nm">4. 回家</span></div>
    <div class="flow-step"><div class="ic">🌾</div><span class="nm">5. 收获</span></div>
  </div>
  <p>在第 4/7/9/11/13/14 轮之后触发收获阶段。</p>

  <h2 id="board">5. 行动板</h2>
  <h3>🪵 永久资源格（每轮累积）</h3>
  <p>木🪵/陶🧱/芦苇🎋/石⛏ 是建材。谷🌾/菜🥕 收获后喂家人。食物🍞 每轮必需。<br>
  <b>取用时拿走该格全部累积资源</b>（不是固定 1 个）。<br>
  🛠 日工固定 +2 食物，无资源成本，但会占用 1 名家人。</p>
  <h3>🐑 动物市场（累积格 · 免费）</h3>
  <p>羊市第 5 轮、猪市第 9 轮、牛市第 13 轮开放。每个市场<b>每轮 +1 头</b>，
  取用时拿走该格<b>全部</b>动物且<b>不花食物</b>。养不下的会跑回供应区。<br>
  容量：每格牧场 2 只，一个牧场只能养一种动物。<b>围好栅栏不会自动来动物</b> ——
  要另外去动物市场拿（或等收获时繁殖）。</p>
  <h3>🎴 回合卡行动</h3>
  <p>回合卡<b>翻出后就永久留在版图上</b>，之后每轮都能用（同一格每轮只能用一次）：</p>
  <ul>
    <li>第 <b>1</b> 轮：🪵 建栅栏</li>
    <li>第 <b>3</b> 轮：🔧 建造重大改进</li>
    <li>第 <b>5</b> 轮：🔨 翻修</li>
    <li>第 <b>6</b> 轮：👶 添丁</li>
  </ul>
  <p>另外这几格从第 1 轮起就永久可用，不需要等揭示：
  🚜 起始玩家、🏠 建房间、🌱 犁地、🌾 撒种/烤面包、🐟 钓鱼、🛠 日工、以及各类资源格。</p>

  <h2 id="roles">6. 人丁与牲畜的作用</h2>
  <div class="kb-card">
    <h4>👨‍👩‍👧 家人（人丁）</h4>
    <p style="margin:6px 0">每名家人每轮提供 <b>1 次行动</b>（工人放置）。<br>
      收获时每人需 <b>2 食物</b>；食物不够 → 每缺 1 点 = <b>1 张乞讨卡</b>（终局 -3 分/张）。<br>
      每名家人终局 <b>+3 分</b>，5 名家人 = 15 分（很可观）。</p>
    <h4 style="margin-top:10px">👶 添丁</h4>
    <p style="margin:6px 0">花 <b>2 食物</b> + 需要 <b>1 间空房</b>，家人 +1（上限 5 人）。<br>
      <b>新生儿当轮不能工作</b>；该轮收获只需喂 1 食物，下一轮起正常（需 2 食物）。</p>
  </div>
  <div class="kb-card">
    <h4>🐑 牲畜的三大作用</h4>
    <ol style="margin:6px 0;padding-left:20px">
      <li><b>计分</b>：羊 8 只 = 4 分（1/4/6/8 只 → 1/2/3/4 分）；猪 7 只 = 4 分（1/3/5/7）；牛 6 只 = 4 分（1/2/4/6）</li>
      <li><b>繁殖</b>：收获时同类 ≥2 只 → 自动 +1 只（需有容量，否则不繁殖）</li>
      <li><b>烹饪救急</b>：用壁炉/烹饪灶随时换成食物（羊→2、猪→3、牛→4 食物）</li>
    </ol>
  </div>

  <h2 id="harvest">6. 收获（指定轮次）</h2>
  <h3>① 🌾 田地阶段</h3>
  <p>每块<b>已播种</b>的田，取走 <b>1 个</b>谷/菜（剩余的标记留在田里）。<br>
    谷田撒一次可收 <b>3 次</b>，菜田可收 <b>2 次</b>；标记用完后田变空，可以重新撒种。</p>
  <h3>② 🍞 喂养阶段</h3>
  <p>每位家人需 2 食物（本轮新生的婴儿只需 1）。先用食物；不够 → 用谷物 → 用蔬菜；仍缺 → 每缺 1 点 = 1 张乞讨卡（-3 分）。</p>
  <h3>③ 🐣 繁殖阶段</h3>
  <p>每种动物只要有 <b>2 只及以上</b>，就自动 +1 只（需牧场还有空位，否则不繁殖）。</p>

  <h2 id="score">7. 最终计分</h2>
  <p>详见游戏中右上角 🏆 排行榜 实时显示。修订版 2016 计分表：</p>
  <h3>田地（公有田 + 私有田，含自己撒过种的沼泽田）</h3>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse">
    <thead><tr style="text-align:left"><th>数量</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5+</th></tr></thead>
    <tbody><tr><td>分</td><td>-1</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody>
  </table></div>

  <h3>牧场（每格牧场 2 头容量）</h3>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse">
    <thead><tr style="text-align:left"><th>数量</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4+</th></tr></thead>
    <tbody><tr><td>分</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody>
  </table></div>

  <h3>谷物 / 蔬菜 / 羊 / 猪 / 牛</h3>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse;text-align:center">
    <thead><tr><th>数量 →</th><th>0</th><th>1-3</th><th>4-5</th><th>6-7</th><th>8+</th></tr></thead>
    <tbody>
      <tr><td style="text-align:left">🌾 谷</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
      <tr><td style="text-align:left">🥕 菜</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
      <tr><td style="text-align:left">🐑 羊</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
    </tbody>
  </table></div>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse;text-align:center">
    <thead><tr><th>数量 →</th><th>0</th><th>1-2</th><th>3-4</th><th>5-6</th><th>7+</th></tr></thead>
    <tbody><tr><td style="text-align:left">🐗 猪</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody>
  </table></div>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse;text-align:center">
    <thead><tr><th>数量 →</th><th>0</th><th>1</th><th>2-3</th><th>4-5</th><th>6+</th></tr></thead>
    <tbody><tr><td style="text-align:left">🐄 牛</td><td>-1</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody>
  </table></div>

  <h3>其他</h3>
  <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
    <li>木屋 0 / 陶屋 +1 / 石屋 +2（<b>每间</b>）</li>
    <li>家人 +3 / 每个（终局数）</li>
    <li>乞讨卡 -3 / 每张</li>
    <li>未利用空地 -1 / 每格</li>
  </ul>

  <h2 id="tips">8. 新手建议</h2>
  <div class="tip-box">
    <ol>
      <li>第 1 轮抢起始玩家 +1 食物，再用日工 +2 食物</li>
      <li>早期：拿 5 木 + 2 芦苇建第 3 间木屋（多一间房才能添丁）</li>
      <li>中期（轮 5+）：围牧场买羊；先攒够 6 段栅栏的木头（6 木）</li>
      <li>后期：翻修要两步 —— 木屋→陶屋（每间 +1 分）→石屋（每间 +2 分）</li>
      <li>避免乞讨卡：宁可少吃也要吃饱</li>
    </ol>
  </div>
</article>
`;

let _drawerEl = null;
let _backdropEl = null;

export function openTutorialDrawer() {
  if (_drawerEl) return;
  _backdropEl = document.createElement("div");
  _backdropEl.className = "tut-backdrop";
  _backdropEl.onclick = closeTutorialDrawer;
  document.body.appendChild(_backdropEl);

  _drawerEl = document.createElement("aside");
  _drawerEl.className = "tut-drawer";
  _drawerEl.innerHTML = `
    <div class="tut-drawer-head">
      <h2 class="mt0 mb0">📖 游玩教程</h2>
      <button class="btn ghost small" id="tutClose">关闭 ×</button>
    </div>
    <div class="tut-drawer-body">${TUT_HTML}</div>
  `;
  document.body.appendChild(_drawerEl);
  _drawerEl.querySelector("#tutClose").onclick = closeTutorialDrawer;
  _drawerEl.querySelectorAll(".toc a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      const el = _drawerEl.querySelector("#" + id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  requestAnimationFrame(() => {
    _backdropEl.classList.add("show");
    _drawerEl.classList.add("show");
  });
  document.addEventListener("keydown", onEscClose);
}

function onEscClose(e) { if (e.key === "Escape") closeTutorialDrawer(); }

export function closeTutorialDrawer() {
  if (_drawerEl) {
    _drawerEl.classList.remove("show");
    setTimeout(() => { _drawerEl?.remove(); _drawerEl = null; }, 280);
  }
  if (_backdropEl) {
    _backdropEl.classList.remove("show");
    setTimeout(() => { _backdropEl?.remove(); _backdropEl = null; }, 280);
  }
  document.removeEventListener("keydown", onEscClose);
}

export function bindTutorialTriggers(root = document) {
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-tutorial]");
    if (!t) return;
    e.preventDefault();
    openTutorialDrawer();
  });
}

// ============================================================
// DLC 规则抽屉 —— 仅当房间启用了 DLC 时由悬浮球的「🎴 DLC 规则」按钮触发
// 按勾选状态动态列出各 DLC 的玩法说明
// ============================================================
let _dlcDrawerEl = null;
let _dlcBackdropEl = null;

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** 取某段说明的多行渲染（接收 string | string[]） */
function renderLines(txt) {
  if (Array.isArray(txt)) return txt.map((x) => `<li>${escHtml(x)}</li>`).join("");
  return String(txt || "").split(/\r?\n/).map((x) => `<p style="margin:6px 0">${escHtml(x)}</p>`).join("");
}

export function openDlcDrawer(dlc) {
  if (_dlcDrawerEl) return;
  const occupations = !!(dlc && dlc.occupations);
  const minorImprovements = !!(dlc && dlc.minorImprovements);
  const moor = !!(dlc && dlc.moor);
  if (!occupations && !minorImprovements && !moor) {
    // 没启用任何 DLC —— 不应进入这里（按钮已经隐藏）
    return;
  }

  const sections = [];
  if (occupations) {
    sections.push(`
      <h3>🎴 职业（Occupations）</h3>
      <div class="kb-card">
        <p><b>开局每位玩家从 7 张随机「职业」里选 1 张，整局生效。</b>未选的不在本局里再用。每张职业给玩家一个<b>被动能力</b>。</p>
        <p class="muted" style="font-size:12px">例：伐木工 → 每轮自动 +1 木；牧羊人 → 买羊行动后 +1 只。</p>
        <h4 style="margin:10px 0 6px">本局提示</h4>
        <p>每回合开局时，先在玩家卡下方的「🎴 从手牌 7 选 1 张职业」面板里点一张；选过的卡会高亮显示「已选」。职业不消耗工人、可在开局阶段自由重选。</p>
        <h4 style="margin:10px 0 6px">怎么打</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li>看到「+1 木」「+1 只」字样的都是永久被动，挂在你放上就生效</li>
          <li>看到「免行动 / 不消耗」字样的（如「犁地不消耗行动」），触发那类动作时自动跳过</li>
          <li>某些职业需要把某些操作「推迟到该轮特定阶段」才生效；不知道就放正常节奏打</li>
        </ul>
        <p class="muted" style="font-size:12px">⚠ 本集合的「职业」是该 DLC 的<strong>精简子集（18 张）</strong>，效果都按本应用文字说明生效，不会偷偷改你的回合。</p>
      </div>
    `);
  }
  if (minorImprovements) {
    sections.push(`
      <h3>🎴 小发展卡（Minor Improvements）</h3>
      <div class="kb-card">
        <p><b>开房间时从牌库随机抽 1 张加入行动板</b>。任何玩家<b>消耗 1 名工人</b>就可以把它抢入个人持有；抢过之后这张卡就只属于该玩家（一次性卡当场结算并从场上移除）。</p>
        <h4 style="margin:10px 0 6px">场上在哪里</h4>
        <p>行动板<b>顶部</b>多出来的「🎴 小发展卡」一行；点一下就抢。<b>永久加成</b>的小发展卡会以 tag 形式显示在你的玩家卡库存区。</p>
        <h4 style="margin:10px 0 6px">怎么用</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li>一次性卡（🪣 井 / 🛒 市集 / 🥣 厨助）：抢到就立刻拿食物并从场上消失，不占任何后续回合</li>
          <li>永久加成卡：抢到后永久拥有，效果在你后续的相应操作中体现</li>
          <li>抢卡不便宜 —— 等同一次正常行动；如果场上卡不合算，可以等下轮再抢</li>
        </ul>
        <p class="muted" style="font-size:12px">⚠ 本集合「小发展卡」是该 DLC 的<strong>精简子集（12 张）</strong>，全部效果均已实装结算：一次性卡（井/市集/厨助/大谷仓）抢到立刻生效；永久卡（柴堆/纺车/砖块/石堆每轮 +1 资源、蜂箱收获 +1 食物、羊/猪/牛圈买动物 +1 只）自动在相应时机结算，可从玩家卡 tag 看到持有。</p>
      </div>
    `);
  }
  if (moor) {
    sections.push(`
      <h3>🌲 荒野之地（Farmers of the Moor）</h3>
      <div class="kb-card">
        <p><b>两条新生命线</b>：除了每轮<b>喂饱家人</b>（食物），每轮还要给家人<b>取暖</b>（燃料），每收获轮要给<b>牛喂干草</b>。任何资源不足 = 立刻<b>拿 1 张乞讨卡</b>（燃料）/ <b>减 1 头牛</b>（干草）。</p>
        <h4 style="margin:10px 0 6px">UI 入口</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li><b>玩家状态条</b>（每名玩家卡顶部）多出「🔥 燃料 / 🌾 干草」两个格子</li>
          <li><b>行动板顶部</b>多一行「🌲 荒野之地（燃料 / 干草 · 每轮累积）」，含<b>燃料堆</b>和<b>干草堆</b>，点击拿走累积堆全部</li>
          <li><b>沼泽板</b>行动板再下方：4×4 公有沼泽。点格子选中，再点「🌱 拓荒」「🌾 撒谷」「🥕 撒菜」之一；<b>拓荒</b>需要 1 木 + 1 芦苇并奖励 1 燃料</li>
          <li>自己<b>撒过种的</b>沼泽田在收获阶段会自动收 1 个 marker（按谷 3 / 菜 2 收获），并计入 fields break-point 计分</li>
        </ul>
        <h4 style="margin:10px 0 6px">怎么打</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li><b>每轮</b>必抢燃料和干草（开局没库存的第 1 轮很可能就<b>先饿死家人</b>）</li>
          <li><b>第 4 / 7 / 9 / 11 / 13 / 14 轮</b>是收获轮，没燃料 = 乞讨卡，没干草 = 牛死</li>
          <li>拓荒后<b>不能还原沼泽</b>，但田地 marker 用完后可重新被任何人撒种</li>
          <li>本应用新增了 5 张「荒野之地」大改进，全部实装：<b>取暖炉</b>（每轮只烧 1 燃料）、<b>泥炭窑</b>（收获 +1 燃料）、<b>沼泽灶</b>（点标签随时烹饪，1 谷/菜/羊/猪 → 2 食物）、<b>瓷砖烤炉</b>（烤面包 2 谷 → 每谷 4 食物）、<b>柴火棚</b>（终局每份剩余燃料 +1 分）</li>
        </ul>
        <p class="muted" style="font-size:12px">⚠ 本实现是「加法型」扩展，<b>与「职业 + 小发展卡」可叠加勾选</b>。勾选「荒野之地」后，所有相关代码用 <code>g.dlc?.moor</code> 守卫，<b>不勾选的老房间完全不变</b>。</p>
      </div>
    `);
  }

  _dlcBackdropEl = document.createElement("div");
  _dlcBackdropEl.className = "tut-backdrop";
  _dlcBackdropEl.onclick = closeDlcDrawer;
  document.body.appendChild(_dlcBackdropEl);

  _dlcDrawerEl = document.createElement("aside");
  _dlcDrawerEl.className = "tut-drawer";
  _dlcDrawerEl.innerHTML = `
    <div class="tut-drawer-head">
      <h2 class="mt0 mb0">🎴 DLC 规则</h2>
      <button class="btn ghost small" id="dlcClose">关闭 ×</button>
    </div>
    <div class="tut-drawer-body">
      <div class="toc" style="margin-bottom:14px">
        <h4 style="margin:0 0 6px">📑 本房间启用的扩展</h4>
        <ul style="margin:0;padding-left:18px;line-height:1.7">
${occupations ? "<li>🎴 职业（Occupations）</li>" : ""}
          ${minorImprovements ? "<li>🎴 小发展卡（Minor Improvements）</li>" : ""}
          ${moor ? "<li>🌲 荒野之地（Farmers of the Moor）</li>" : ""}
          ${(!occupations && !minorImprovements && !moor) ? '<li class="muted">（未启用任何 DLC）</li>' : ""}
        </ul>
        <p class="muted" style="font-size:12px;margin-top:8px">
          由本房间主持人在创建房间时勾选。仅显示本局用到的部分，其余扩展说明见 README / dlc.md。
        </p>
      </div>
      ${sections.join("")}
    </div>
  `;
  document.body.appendChild(_dlcDrawerEl);
  _dlcDrawerEl.querySelector("#dlcClose").onclick = closeDlcDrawer;

  requestAnimationFrame(() => {
    _dlcBackdropEl.classList.add("show");
    _dlcDrawerEl.classList.add("show");
  });
  document.addEventListener("keydown", onDlcEscClose);
}

function onDlcEscClose(e) { if (e.key === "Escape") closeDlcDrawer(); }

export function closeDlcDrawer() {
  if (_dlcDrawerEl) {
    _dlcDrawerEl.classList.remove("show");
    setTimeout(() => { _dlcDrawerEl?.remove(); _dlcDrawerEl = null; }, 280);
  }
  if (_dlcBackdropEl) {
    _dlcBackdropEl.classList.remove("show");
    setTimeout(() => { _dlcBackdropEl?.remove(); _dlcBackdropEl = null; }, 280);
  }
  document.removeEventListener("keydown", onDlcEscClose);
}