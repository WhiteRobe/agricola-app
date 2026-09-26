// ============================================================
// 教程抽屉（右侧滑出，可被任意页面调用）
// ============================================================

import { OCCUPATIONS } from "./dlc-data.js";

const TUT_HTML = `
<div class="toc">
  <h4>📑 目录</h4>
  <ol>
    <li><a href="#intro">游戏是什么</a></li>
    <li><a href="#goal">目标与胜负</a></li>
    <li><a href="#setup">起始设置</a></li>
    <li><a href="#flow">每轮核心流程</a></li>
    <li><a href="#board">行动板与常规行动</a></li>
    <li><a href="#harvest">收获阶段详解（重要结算）</a></li>
    <li><a href="#roles">家人扩建与牲畜饲养</a></li>
    <li><a href="#score">最终计分规则</a></li>
    <li><a href="#tips">新手实用策略</a></li>
  </ol>
</div>
<article class="tut">
  <h2 id="intro">1. 游戏是什么</h2>
  <p>《农家乐》（<b>Agricola</b>）是享誉全球的经典德式工人放置策略桌游。在游戏中，你扮演 17 世纪的一名农场主，从两间简陋的小木屋与两名家庭成员起步，在 <b>14 轮</b> 的岁月流转中经营拓展你的农庄。</p>
  <p>通过派遣家人采集建材、扩建翻修房屋、开垦耕地、播种庄稼、围建牧场、繁育牲畜并储备口粮，最终看谁能建立起最富庶繁荣、没有短板的模范农庄！</p>
  <p>本游戏支持 <b>1–4 人</b> 同房间竞技或单人练习，并支持开启全套 88 张官方经典职业卡、小发展卡、沼泽农夫（荒野之地）及节气轮转等丰富扩展。</p>

  <h2 id="goal">2. 目标与胜负</h2>
  <p>游戏的目标是在第 14 轮结束后获得<b>最高的综合胜利点数</b>。《农家乐》推崇全面发展的农庄生态，严厉惩罚偏科或饥荒：</p>
  <ul>
    <li>✅ <b>积极得分项</b>：农田数量、封闭牧场、谷物储备、蔬菜储备、绵羊、野猪、黄牛、房屋品质（陶屋/石屋）、家庭成员数（每人 +3 分）、重大改进设施与加分卡牌。</li>
    <li>❌ <b>短板扣分项</b>：农场内未被利用的<b>荒地</b>每格 -1 分；五大农产品（谷物、蔬菜、绵羊、野猪、黄牛）中任何一项<b>拥有数为 0</b> 时，单项倒扣 -1 分！</li>
    <li>❌ <b>饥荒/严寒绝罚</b>：若在收获阶段无法喂饱家人或缺少取暖燃料，每缺少 1 点将强制获得 1 张<b>乞讨卡</b>，终局<b>每张扣除 3 分</b>（极其惨重）！</li>
  </ul>
  <p>14 轮全部结束后，总积分最高者获胜！</p>

  <h2 id="setup">3. 起始设置</h2>
  <div class="kb-card">
    <h4>🌱 初始农场与资源</h4>
    <ul>
      <li><b>农庄板块</b>：每个人拥有一张 3×5 共 15 格的农庄版图，初始占有 2 间相邻木屋，其余 13 格为未开发的空地。</li>
      <li><b>家庭成员</b>：初始拥有 2 名家人（住在木屋中，每名家人每轮可作为 1 名工人派出行动）。</li>
      <li><b>起始口粮</b>：起始玩家拥有 2 点食物，其他顺位玩家每人拥有 3 点食物。</li>
    </ul>
    <p class="muted" style="font-size:12px;margin:8px 0 0">
      注：牧场容量固定为每格 2 只牲畜，必须围成封闭的矩形栅栏才能生效。
    </p>
  </div>

  <h2 id="flow">4. 每轮核心流程</h2>
  <div class="flow">
    <div class="flow-step"><div class="ic">📋</div><span class="nm">1. 揭开新行动</span></div>
    <div class="flow-step"><div class="ic">➕</div><span class="nm">2. 资源累积</span></div>
    <div class="flow-step"><div class="ic">🧑‍🌾</div><span class="nm">3. 派工工作</span></div>
    <div class="flow-step"><div class="ic">🛏</div><span class="nm">4. 工人回家</span></div>
    <div class="flow-step"><div class="ic">🌾</div><span class="nm">5. 收获阶段</span></div>
  </div>
  <p>整场游戏共 14 轮，分为 6 个农事阶段。每一轮按照以下节奏循环：</p>
  <ol style="margin:6px 0;padding-left:20px;line-height:1.7">
    <li><b>揭开新行动</b>：每轮版图翻开一张新的行动回合卡（如建栅栏、翻修、添丁等），翻开后终生可用。</li>
    <li><b>资源累积</b>：木材堆、陶土坑、芦苇滩、采石场、谷物堆、蔬菜地、鱼塘等格自动增加资源。若上一轮无人拿取，资源会持续累加上去，谁去执行即可拿走该格内的<b>全部累积资源</b>！</li>
    <li><b>派工工作（核心玩法）</b>：由起始玩家开始，大家顺时针轮流派遣 1 名家庭成员到行动板上<b>未被占用的</b>行动格执行操作。<b>同一行动格每轮仅限 1 人进入</b>，先到先得！</li>
    <li><b>工人回家</b>：所有玩家放完手头所有工人后，大家将工人召回农舍，准备下一轮。</li>
    <li><b>收获阶段（关键结算）</b>：在第 4、7、9、11、13、14 轮结束时，系统将自动进入丰收结算！</li>
  </ol>

  <h2 id="board">5. 行动板与常规行动</h2>
  <h3>🪵 永久累积资源格（每轮自动递增）</h3>
  <p>取用该格行动时，将直接拿走该格当前累积的<b>全部</b>物资：</p>
  <ul>
    <li><b>木材堆</b>：每轮累积 +1 木材（建造房屋、围建牧场栅栏的基础建材）。</li>
    <li><b>陶土坑</b>：每轮累积 +1 陶土（建造烤炉/壁炉、将木屋翻修为陶屋的核心建材）。</li>
    <li><b>芦苇滩</b>：每轮累积 +1 芦苇（建造新房屋与翻修屋顶时必不可少）。</li>
    <li><b>采石场</b>：第 4 轮起每轮累积 +1 石材（建造水井、烤炉及翻修最高级石屋的珍贵建材）。</li>
    <li><b>谷物堆</b>：每轮累积 +1 谷物（既是耕地播种的种子，也是烤面包或应急充饥的主食）。</li>
    <li><b>蔬菜地</b>：第 4 轮起每轮累积 +1 蔬菜（可播种繁殖，或直接折抵食物）。</li>
    <li><b>鱼塘</b>：每轮累积 +1 食物。</li>
    <li><b>日工</b>：固定产出 2 点食物（虽无建材收益，但能快速解口粮燃眉之急）。</li>
  </ul>
  <h3>🐑 动物市场（第 4/8/12 轮开放 · 免费牵取）</h3>
  <p><b>羊市</b>第 4 轮开放、<b>猪市</b>第 8 轮开放、<b>牛市</b>第 12 轮开放。每个市场每轮免费累积 1 只对应牲畜，取用时牵走格内<b>全部</b>动物且<b>不需要付食物</b>。<br>
  ⚠️ <b>注意容纳容量</b>：农场内必须先用栅栏围出封闭的矩形牧场才能装下牲畜（每格牧场容纳 2 只，单牧场仅能饲养同一种动物）。如果牧场装不下，多余的牲畜会逃跑返回公共供应区！</p>
  <h3>🔨 常规与回合卡行动</h3>
  <ul>
    <li><b>起始玩家</b>：夺得下一轮的首动先行权，并额外拿走 1 点食物。</li>
    <li><b>犁地</b>：在农场开垦 1 块新农田（必须与现有农田正交相邻）。</li>
    <li><b>播种/烤面包</b>：在空农田上播种谷物或蔬菜；或使用建成的烤炉将谷物烘烤成高额食物。</li>
    <li><b>建房间</b>：每间房消耗 5 木材/陶土/石材（取决于当前房屋材质）+ 2 芦苇，必须与现有房间相邻。</li>
    <li><b>建栅栏</b>（第 1 轮揭示）：消耗木材在农庄格边缘搭建封闭牧场（每段栅栏消耗 1 木材）。</li>
    <li><b>大改进</b>（第 3 轮揭示）：抢建壁炉、烹饪灶、陶土烤炉、石头烤炉、水井等强大公共设施。</li>
    <li><b>翻修</b>（第 5 轮揭示）：整栋房屋全面升级（木屋→陶屋，陶屋→石屋），每间房消耗 1 陶土/石材 + 1 芦苇。</li>
    <li><b>添丁</b>（第 6 轮揭示）：在拥有空房间的前提下，消耗 2 点食物添 1 名家庭成员。</li>
  </ul>

  <h2 id="harvest">6. 【重要结算】收获阶段是什么？</h2>
  <div class="kb-card" style="border-left:4px solid var(--gold);background:var(--gold-light)">
    <p style="font-size:14px;line-height:1.7;margin:0">
      <b>收获阶段（Harvest Phase）</b>是农庄生活每逢农事季节交替时的“年终大考”！整局 14 轮游戏中，共有 <b>6 次收获阶段</b>，分别在 <b>第 4、7、9、11、13、14 轮结束时</b> 自动触发。<br>
      <b>收获阶段是全自动执行的，不占用任何工人和行动次数。</b> 当所有玩家放完工人后，系统会严格按照以下 <b>三大步骤依次自动结算</b>：
    </p>
  </div>

  <h3>🌾 第一步：农田收割（Field Phase）</h3>
  <p>检查每位玩家农庄里所有<b>已经播种了作物</b>的农田：</p>
  <ul style="line-height:1.7;padding-left:20px">
    <li>每块有作物的农田，会自动收割 <b>1 份作物（谷物或蔬菜）</b> 进入你的个人库存仓库。</li>
    <li>田里剩余的标记留在田间，等待下一次收获阶段继续收割。
      （<b>谷物</b>每次播种放入 3 份，可收割 3 次；<b>蔬菜</b>每次播种放入 2 份，可收割 2 次）。</li>
    <li>当某块田的所有作物全部收割完毕后，该农田恢复为空闲耕地，之后可以再次执行播种。全程全自动，完全无需工人参与！</li>
  </ul>

  <h3>🍞 第二步：喂养家人与房屋取暖（Feeding & Heating Phase）</h3>
  <p>这是全游戏最严苛、最关键的考验！你的家庭成员必须吃饱穿暖：</p>
  <ul style="line-height:1.7;padding-left:20px">
    <li><b>每位成年家人消耗 2 点食物</b>；<b>本轮新出生的婴儿只需消耗 1 点食物</b>（下一轮起成年，同样需 2 食物）。</li>
    <li><b>扣除顺序</b>：优先扣除你的食物储备；若食物不足，系统会自动按 1:1 的比例扣除你库存中的谷物（1 谷物 = 1 食物）或蔬菜（1 蔬菜 = 1 食物）充饥抵扣。</li>
    <li><b>💡 烹饪省粮诀窍</b>：生吃谷物非常浪费！若你提前建有「壁炉」或「烹饪灶」，可以在平时或收获前将谷物、蔬菜或牲畜烹饪成高额食物；若建有「烤炉」，也可以在播种/烤面包行动中将谷物烤成海量面包（陶土烤炉 1 谷物 → 5 食物）！</li>
    <li><b>🌲 沼泽农夫扩展专属（保暖与喂牛）</b>：
      <br>· <b>房屋取暖</b>：每位家人还需消耗 <b>1 点燃料</b> 为房屋保暖（若建有「取暖炉」大改进，全家保底仅需 1 点燃料）。
      <br>· <b>黄牛喂草</b>：每头黄牛需消耗 <b>1 点干草</b>。若缺少干草，黄牛将饿死跑回供应区。</li>
    <li><b>🚨 严酷的绝罚：乞讨卡！</b>
      <br>若用尽一切谷物与蔬菜后仍然缺少食物，或者在沼泽农夫扩展中缺少取暖燃料：<b>每缺少 1 点，就会被强制领取 1 张乞讨卡！</b>
      <br><b>每张乞讨卡在最终计分时倒扣 3 分</b>（2 张就是 -6 分，扣分极其致命）。因此，宁可暂缓建房，也一定要提前备足口粮！</li>
  </ul>

  <h3>🐣 第三步：牲畜繁殖（Breeding Phase）</h3>
  <p>检查每位玩家农场内的圈养牲畜：</p>
  <ul style="line-height:1.7;padding-left:20px">
    <li>只要你拥有 <b>至少 2 只相同类型的成年动物</b>（≥2 只绵羊、≥2 只野猪、或 ≥2 只黄牛），它们就会自然繁育出 <b>1 只该种动物的幼崽</b>！</li>
    <li>无论你有 2 只、3 只还是 5 只绵羊，每个收获阶段每种动物<b>最多只繁殖 1 只幼崽</b>。</li>
    <li>⚠️ <b>注意牧场容量</b>：你的农场必须有空余的牧场空间才能收容新生幼崽。如果牧场容量已满，多出的幼崽将直接逃跑，无法获得！</li>
  </ul>

  <h2 id="roles">7. 家人扩建与牲畜饲养</h2>
  <div class="kb-card">
    <h4>👨‍👩‍👧 家人（人丁）的战略价值</h4>
    <p style="margin:6px 0;line-height:1.7">
      在工人放置游戏中，<b>每多一名家人 = 每轮多一次行动机会</b>！更多工人意味着你可以同时抢占木材、石材、犁地和食物，形成滚雪球优势。终局时每名家人还直接提供 <b>+3 分</b>（5 人满编 = 15 分）。
    </p>
    <h4 style="margin-top:10px">👶 添丁的条件与步骤</h4>
    <p style="margin:6px 0;line-height:1.7">
      ① 必须先<b>建造新房间</b>（农场房间数必须大于现有家属数，有空房才能生孩子）；<br>
      ② 派遣工人执行「添丁」行动，并消耗 <b>2 点食物</b>（婴儿抚养费）；<br>
      ③ <b>新生儿当轮不能工作</b>，当轮收获阶段只需吃 1 点食物；从下一轮开始成为正常劳动力，可执行完整动作。
    </p>
  </div>
  <div class="kb-card">
    <h4>🐑 牲畜的三大核心价值</h4>
    <ol style="margin:6px 0;padding-left:20px;line-height:1.7">
      <li><b>计分阶梯</b>：绵羊达到 8 只拿满 4 分；野猪达到 7 只拿满 4 分；黄牛达到 6 只拿满 4 分。若任何一种动物数量为 0，单项倒扣 -1 分！</li>
      <li><b>收获繁殖</b>：成对自动生崽，实现牲畜资产的自然复利增长；</li>
      <li><b>烹饪救急换粮</b>：建造壁炉或烹饪灶后，可随时宰杀烹饪牲畜换取大量食物（如烹饪灶将 1 只绵羊/野猪换为 2 食物），是防止断粮拿乞讨卡的最强保险。</li>
    </ol>
    <h4 style="margin-top:10px">🏡 牲畜容纳与【室内宠物】官方规则</h4>
    <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
      <li><b>封闭牧场</b>：每格牧场容纳 <b>2 只</b>动物。牧场内每建 1 座马厩，该牧场所有格子的容量<b>翻倍至每格 4 只</b>；同一封闭牧场内<b>严禁混养</b>不同种类的牲畜。</li>
      <li><b>未圈栅栏的独立马厩</b>：每座立于空地的独立马厩可单独容纳 <b>1 只</b>任意牲畜，并免除该格的荒地扣分。</li>
      <li><b>🏡 室内宠物（House Pet 经典规则）</b>：无论你的农舍有多少间房间，整个农舍<b>总共且仅可免费寄养恰好 1 只动物作为家庭宠物</b>（任意绵羊、野猪或黄牛，免圈舍免栅栏）。若前期无牧场或某物种落单（如 12 羊 + 1 猪），该动物会自动寄养在农舍门前，正常计分但无法在室内交配繁殖。</li>
    </ul>
  </div>

  <h2 id="score">8. 最终计分规则</h2>
  <p>游戏在第 14 轮结束后进行全面计分核算。依据 2016 正统修订版规则：</p>
  <h3>农田数量（私有农田 + 已播种的沼泽田）</h3>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse">
    <thead><tr style="text-align:left"><th>农田数</th><th>0 块</th><th>1 块</th><th>2 块</th><th>3 块</th><th>4 块</th><th>5+ 块</th></tr></thead>
    <tbody><tr><td>得分</td><td>-1 分</td><td>-1 分</td><td>1 分</td><td>2 分</td><td>3 分</td><td>4 分</td></tr></tbody>
  </table></div>

  <h3>封闭牧场数量</h3>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse">
    <thead><tr style="text-align:left"><th>牧场数</th><th>0 处</th><th>1 处</th><th>2 处</th><th>3 处</th><th>4+ 处</th></tr></thead>
    <tbody><tr><td>得分</td><td>-1 分</td><td>1 分</td><td>2 分</td><td>3 分</td><td>4 分</td></tr></tbody>
  </table></div>

  <h3>作物与牲畜得分阶梯</h3>
  <div class="kb-card"><table style="width:100%;font-size:12.5px;border-collapse:collapse;text-align:center">
    <thead><tr><th>项目 \\ 数量</th><th>0 份/只</th><th>1 档</th><th>2 档</th><th>3 档</th><th>满分档 (4分)</th></tr></thead>
    <tbody>
      <tr><td style="text-align:left">🌾 谷物</td><td>-1 分</td><td>1–3 份 → 1 分</td><td>4–5 份 → 2 分</td><td>6–7 份 → 3 分</td><td>≥8 份 → 4 分</td></tr>
      <tr><td style="text-align:left">🥕 蔬菜</td><td>-1 分</td><td>1 份 → 1 分</td><td>2 份 → 2 分</td><td>3 份 → 3 分</td><td>≥4 份 → 4 分</td></tr>
      <tr><td style="text-align:left">🐑 绵羊</td><td>-1 分</td><td>1–3 只 → 1 分</td><td>4–5 只 → 2 分</td><td>6–7 只 → 3 分</td><td>≥8 只 → 4 分</td></tr>
      <tr><td style="text-align:left">🐗 野猪</td><td>-1 分</td><td>1–2 只 → 1 分</td><td>3–4 只 → 2 分</td><td>5–6 只 → 3 分</td><td>≥7 只 → 4 分</td></tr>
      <tr><td style="text-align:left">🐄 黄牛</td><td>-1 分</td><td>1 只 → 1 分</td><td>2–3 只 → 2 分</td><td>4–5 只 → 3 分</td><td>≥6 只 → 4 分</td></tr>
    </tbody>
  </table></div>

  <h3>房屋品质与综合项</h3>
  <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
    <li><b>木屋</b>：0 分 / 每间</li>
    <li><b>陶屋</b>：+1 分 / 每间</li>
    <li><b>石屋</b>：+2 分 / 每间</li>
    <li><b>家庭成员</b>：+3 分 / 每名家人</li>
    <li><b>乞讨卡</b>：-3 分 / 每张（严厉绝罚）</li>
    <li><b>未利用荒地</b>：-1 分 / 每格</li>
    <li><b>重大改进与职业卡</b>：按卡牌票面印刷的分值直接累加。</li>
  </ul>

  <h2 id="tips">9. 新手实用策略</h2>
  <div class="tip-box">
    <ol style="line-height:1.8;padding-left:20px">
      <li><b>前 3 轮备足口粮与建材</b>：第 1 轮抢起始玩家 (+1 食物) 与日工 (+2 食物)，积极拿取累积的木材与芦苇。</li>
      <li><b>第 4 轮首次收获前做好防范</b>：首次收获需要 4 点食物（2名家人×2），务必提前备好食物或备好可烤的面包，绝不拿乞讨卡。</li>
      <li><b>尽早扩建房屋与添丁</b>：尽早攒足 5 木材 + 2 芦苇建第 3 间房，并在第 6 轮开放添丁时第一时间增加工人，抢占行动优势。</li>
      <li><b>消灭所有负分项</b>：农场填满无荒地（每格避免 -1 分），谷物、蔬菜、绵羊、野猪、黄牛各至少保留 1 份/只（全部消除单项 -1 分短板）。</li>
      <li><b>及时升级石屋</b>：后期将房屋两度翻修至石屋，不仅每间房稳拿 2 分，还能配合高级工坊大爆发。</li>
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
  const seasons = !!(dlc && dlc.seasons);
  if (!occupations && !minorImprovements && !moor && !seasons) {
    // 没启用任何 DLC —— 不应进入这里（按钮已经隐藏）
    return;
  }

  const sections = [];
  if (occupations) {
    sections.push(`
      <h3>🎴 职业</h3>
      <div class="kb-card">
        <p><b>开局每位玩家从 7 张随机「职业」里精选 1 张就任，整局生效。</b>未选的不在本局里再用。每张职业赋予玩家独特的被动能力或资源收益。</p>
        <p class="muted" style="font-size:12px">例：伐木工 → 每轮自动 +1 木材；牧羊人 → 羊市行动后额外 +1 只绵羊；面包师 → 每次烤面包额外 +1 食物。</p>
        <h4 style="margin:10px 0 6px">本局提示</h4>
        <p>游戏开局时，在弹出的「🎴 从手牌 7 选 1 张职业」面板中选择一张心仪的职业就任，全场生效。</p>
        <h4 style="margin:10px 0 6px">怎么打</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li>看到「+1 木材」「+1 只」字样的都是永久被动，挂在你的角色上即时生效</li>
          <li>看到「免行动 / 不消耗」字样的（如「犁地不消耗行动」），触发该动作时自动跳过工人消耗</li>
          <li>根据所选职业的能力倾向，在中前期及早确立自己的核心流派（如农耕、畜牧、添丁或工坊）</li>
        </ul>
      </div>
    `);
  }
  if (minorImprovements) {
    sections.push(`
      <h3>🎴 小发展卡</h3>
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
      </div>
    `);
  }
  if (moor) {
    sections.push(`
      <h3>🌲 沼泽农夫（荒野之地扩展）</h3>
      <div class="kb-card">
        <p><b>两条新生命线</b>：除了在收获阶段<b>喂饱家人</b>（食物），每逢收获阶段还要为农舍<b>取暖</b>（燃料），并为<b>黄牛喂干草</b>。若资源不足，缺少食物或燃料将立刻<b>被强制获得 1 张乞讨卡</b>（终局 -3 分/张），缺少干草将导致<b>黄牛饿死</b>。</p>
        <h4 style="margin:10px 0 6px">UI 入口</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li><b>玩家状态条</b>（每名玩家卡顶部）多出「🔥 燃料 / 🌾 干草」两个格子；</li>
          <li><b>行动板「🌲 荒野之地」Tab</b>：多出<b>燃料堆</b>和<b>干草堆</b>累积格，点击即可拿走格内全部累积物资；</li>
          <li><b>公有沼泽板</b>（4×4 格）：点击沼泽格选中，可执行「🌱 拓荒」（消耗 1 木材 + 1 芦苇，奖励 1 燃料并开垦为农田）以及「🌾 播种谷物」「🥕 播种蔬菜」；</li>
          <li>自己<b>播种过的</b>沼泽田在收获阶段会自动收割 1 份作物（谷物可收 3 次、蔬菜可收 2 次），并计入终局农田得分。</li>
        </ul>
        <h4 style="margin:10px 0 6px">运营策略</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li>提前储备燃料和干草，避免在第 4、7、9、11、13、14 轮结束的收获阶段受到严酷惩罚；</li>
          <li>拓荒后<b>不能还原为沼泽荒地</b>，但田间作物收割完毕后可重新被任何人再次播种；</li>
          <li>本应用新增了 5 张「荒野之地」大改进，全部实装：<b>取暖炉</b>（收获阶段全家仅需 1 燃料保暖）、<b>泥炭窑</b>（每次收获阶段自动 +1 燃料）、<b>沼泽灶</b>（点标签随时烹饪，1 谷物/蔬菜/绵羊/野猪 → 2 食物；3 黄牛 → 2 食物）、<b>瓷砖烤炉</b>（烤面包每次最多 2 谷物 → 每份谷物 4 食物）、<b>柴火棚</b>（终局每份剩余燃料直接折算 +1 分）。</li>
        </ul>
        <p class="muted" style="font-size:12px">💡 可与「职业 / 小发展卡」自由叠加勾选；不勾选则完全不生效，经典房间不受任何影响。</p>
      </div>
    `);
  }
  if (seasons) {
    sections.push(`
      <h3>📅 节气轮转（四季扩展）</h3>
      <div class="kb-card">
        <p><b>每一轮代表一个季节</b>：开局随机从一个季节起跑，按 <b>春 → 夏 → 秋 → 冬</b> 循环轮转，直到 14 轮结束。季节会改变资源产量、开放/关闭部分行动，并在回合卡区多出一个<b>「节气行动」格</b>（每轮限 1 人）。</p>
        <h4 style="margin:10px 0 6px">四季效果</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.8">
          <li><b>🌸 春</b>：木材堆 −1、采石场 +1；<b>建栅栏最多 2 段免费</b>（须至少付费 1 段）；节气行动 = <b>春耕</b>（立即繁殖一次，可顺带播种一块农田）</li>
          <li><b>☀️ 夏</b>：陶土坑 +1、采石场 −1、钓鱼 +1；<b>建房附赠 1 马厩</b>；日工额外 +1 谷物；节气行动 = <b>度假</b>（本轮已放置的每名家人含本次各 +1 节气分，终局计入总分）</li>
          <li><b>🍂 秋</b>：木材堆 +1、芦苇滩 +1；<b>建大改进减 1 建材</b>；节气行动 = <b>秋收</b>（立即执行一次田间阶段，可再拿 1 蔬菜）</li>
          <li><b>❄️ 冬</b>：陶土坑 −1、芦苇滩 −1；<b>犁地需付 1 食物</b>；鱼塘封冻（第 11 轮起解冻）；节气行动 = <b>家庭扩建</b>（无需空房添 1 人，消耗 2 木材 + 3 食物）</li>
        </ul>
        <h4 style="margin:10px 0 6px">运营策略</h4>
        <ul style="margin:6px 0;padding-left:20px;line-height:1.7">
          <li>开局看<b>头部季节徽章</b>与背景轮盘确认当前季节，提前囤受短缺影响的资源（如冬季抢囤陶土与芦苇）；</li>
          <li><b>春季</b>集中围大牧场（享受免费栅栏段），<b>夏季</b>尽早建房拿马厩、把工人都派出去后再度假拿满高分；</li>
          <li><b>秋季</b>是抢建大改进的黄金窗口（−1 建材），<b>冬季</b>记得犁地要留 1 食物、靠「家庭扩建」突破空房限制。</li>
        </ul>
        <p class="muted" style="font-size:12px">💡 与其他扩展可自由叠加；度假所得的「节气分」在得分计算面板中单列一行。终局计入总分。</p>
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
          ${occupations ? "<li>🎴 职业</li>" : ""}
          ${minorImprovements ? "<li>🎴 小发展卡</li>" : ""}
          ${moor ? "<li>🌲 沼泽农夫（荒野之地）</li>" : ""}
          ${seasons ? "<li>📅 节气轮转（四季扩展）</li>" : ""}
          ${(!occupations && !minorImprovements && !moor && !seasons) ? '<li class="muted">（未启用任何 DLC）</li>' : ""}
        </ul>
        <p class="muted" style="font-size:12px;margin-top:8px">
          由本房间主持人在创建房间时勾选。
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

// ============================================================
// 流派玩法抽屉 —— 悬浮球的「💡 流派玩法」专用面板
// ============================================================
export const STRATEGIES = [
  {
    id: "grain_bake",
    name: "🌾 农耕面包流",
    shortName: "🌾 农耕面包",
    subtitle: "稳定口粮 · 自给自足 · 农田作物满分",
    tag: "食物无忧",
    summary: "以早起犁地、播种谷物与蔬菜为核心，第 3 轮抢建烤炉将谷物高倍转化为食物，彻底告别断粮危机，终局拿满农田（4分）与作物高分。",
    phases: [
      { round: "前期 (第 1-4 轮)", desc: "全力抢占「谷物」与「犁地」，第 3 轮大改进揭示后第一时间抢建「陶土烤炉」（3 陶土 + 1 石材）。" },
      { round: "中期 (第 5-8 轮)", desc: "播种谷物（1 份谷物收获 3 份谷物），收获阶段利用烤炉一键将谷物烤成高额食物（每份谷物 5 食物），轻松度过喂养期并扩种蔬菜。" },
      { round: "后期 (第 9-14 轮)", desc: "农田与蔬菜地轮番丰收，多余蔬菜可直接食用或配合烹饪，最后补建 1 块小牧场养 1 对绵羊消除单项 -1 分短板。" }
    ],
    jobs: [
      { name: "粮商", icon: "🌾", desc: "每轮初自动 +1 谷物" },
      { name: "播种者", icon: "🌱", desc: "单次播种行动可同时为 2 块农田播种" },
      { name: "犁地手", icon: "🚜", desc: "单次犁地可额外多开垦 1 块田" },
      { name: "面包师", icon: "🍞", desc: "每次烤面包时额外多得 1 食物" },
      { name: "磨坊主", icon: "⚙️", desc: "烤面包行动每份谷物多得 1 食物" }
    ],
    pros: "食物发动机启动后极其稳定，不惧任何收获阶段的喂养惩罚；农田与作物轻松拿下 8~12 分。",
    cons: "初期木材较少可能导致住房与栅栏进度稍缓，终局前务必补养基础牲畜避免单项 -1 分。"
  },
  {
    id: "livestock",
    name: "🐑 畜牧繁育流",
    shortName: "🐑 畜牧繁育",
    subtitle: "以肉养家 · 自动繁育 · 终局高爆发",
    tag: "成对繁衍",
    summary: "前期囤积木材建造封闭大牧场，中后期按节奏引入绵羊、野猪、黄牛，利用每次收获阶段的成对自动繁殖实现资源滚雪球，配合壁炉随时宰杀换粮。",
    phases: [
      { round: "前期 (第 1-4 轮)", desc: "全力拿取累积木材堆，在第 1 或第 3 轮建起栅栏封闭牧场（推荐 4~6 格连通牧场）。" },
      { round: "中期 (第 5-8 轮)", desc: "第 4 轮羊市一开直接牵走绵羊；抢建「壁炉」或「烹饪灶」，把繁衍出的多余绵羊烹饪换成食物（以肉养家）。" },
      { round: "后期 (第 9-14 轮)", desc: "第 8 轮牵野猪、第 12 轮牵黄牛，成对自然繁殖将三种牲畜均养至计分断点上限（绵羊≥8、野猪≥7、黄牛≥6）。" }
    ],
    jobs: [
      { name: "牧羊人", icon: "🐑", desc: "羊市行动额外获赠 1 只绵羊" },
      { name: "养猪人", icon: "🐗", desc: "猪市行动额外获赠 1 只野猪" },
      { name: "牧牛人", icon: "🐄", desc: "牛市行动额外获赠 1 只黄牛" },
      { name: "栅栏工", icon: "🪵", desc: "建造栅栏行动完成后返还 2 木材" },
      { name: "屠夫", icon: "🔪", desc: "宰杀牲畜烹饪时额外产出大量食物" },
      { name: "制皮匠", icon: "👞", desc: "宰杀黄牛或野猪时额外获得 2 食物" }
    ],
    pros: "中后期爆发力惊人，牲畜自繁自殖提供源源不断的食物与极高的终局牲畜总分（可达 12~16 分）。",
    cons: "前期木材竞争极度激烈，且第 4 轮首次收获阶段前牲畜尚未繁衍，需要提前备好口粮以防乞讨。"
  },
  {
    id: "population",
    name: "🏠 快速添丁流",
    shortName: "🏠 快速添丁",
    subtitle: "工人数压制 · 步步领先 · 人多力量大",
    tag: "行动点碾压",
    summary: "以最短路径建造第 3、第 4 间房屋，并在第 6 轮添丁开放后第一时间生下新工人，从 2 动飞跃至 4~5 动，以行动点数的绝对优势碾压全场。",
    phases: [
      { round: "前期 (第 1-4 轮)", desc: "全力争抢「芦苇」与「木材」，在第 4 轮前造出第 3 间木屋。" },
      { round: "中期 (第 5-7 轮)", desc: "第 5 轮翻修为陶屋（每间 1 分），第 6 轮「添丁」揭示立刻生下第 3 名工人！紧接着造房再生第 4 人。" },
      { round: "后期 (第 8-14 轮)", desc: "利用多出的工人疯狂扫荡版图上所有高累积池，最后翻修为石屋（每间 2 分），拿满人丁分（每人 3 分）和房屋分。" }
    ],
    jobs: [
      { name: "木匠", icon: "🪵", desc: "建造木屋每间房减少 1 木材消耗" },
      { name: "保姆", icon: "🍼", desc: "添丁时婴儿当轮无需口粮，极大减轻初期负担" },
      { name: "翻修工", icon: "🔨", desc: "翻修时完全省去全部芦苇消耗" },
      { name: "旅店老板", icon: "🏮", desc: "每轮初自动获赠食客留下的 1 食物" },
      { name: "砌砖工", icon: "🧱", desc: "建造陶屋与翻修时节省 1 陶土" }
    ],
    pros: "工人数量多 = 每轮能做别人两倍的事，后期几乎可以包揽版图上所有的优质行动格。",
    cons: "家庭成员增加后每轮收获阶段喂养压力骤增（每人每轮 2 食物），必须尽早配合壁炉、烤炉或水井提供稳定粮食。"
  },
  {
    id: "industry",
    name: "🏛 工业与声望流",
    shortName: "🏛 工业声望",
    subtitle: "奢华石屋 · 高分工坊 · 声望加成",
    tag: "质量致胜",
    summary: "不依赖广袤农田，聚焦陶土、石材和芦苇，快速两度翻修进入石屋时代，垄断水井与各加工坊，搭配终局声望职业一举定乾坤。",
    phases: [
      { round: "前期 (第 1-4 轮)", desc: "收集陶土与芦苇，第 4 轮采石场开放后抢占石材，优先抢下「水井」（累计产 5 食物）。" },
      { round: "中期 (第 5-8 轮)", desc: "翻修为陶屋后迅速二次翻修为石屋（每间 2 分，终局单房屋可拿 8~10 分）。" },
      { round: "后期 (第 9-14 轮)", desc: "抢建「木工坊」、「陶器坊」、「编筐坊」，将手头多余的木材/陶土/芦苇在收获阶段转化为食物或终局胜利点。" }
    ],
    jobs: [
      { name: "石匠", icon: "⛏", desc: "每轮初自动 +1 石材" },
      { name: "泥瓦工", icon: "🏺", desc: "每轮初自动 +1 陶土" },
      { name: "建筑师", icon: "📐", desc: "终局按砖石高级房屋数量额外累积分数" },
      { name: "学者导师", icon: "📜", desc: "拥有 ≥3 张改进卡时，终局直接额外 +3 分" },
      { name: "村长", icon: "👴", desc: "全局 0 乞讨卡时，终局额外 +3 分" }
    ],
    pros: "占地紧凑，单靠房屋品质与改进卡就能斩获 20~25 点纯分，受外界板块竞争干扰小。",
    cons: "需提防空地扣分，中后期需适度用小片农田或栅栏填补剩余荒地，避免每块空地扣 1 分。"
  },
  {
    id: "moor",
    name: "🌲 荒野拓荒保暖流",
    shortName: "🌲 荒野拓荒",
    subtitle: "沼泽农夫专属 · 燃料生金 · 沼泽开拓",
    tag: "沼泽农夫专属",
    summary: "专精「沼泽农夫（荒野之地）」扩展的“燃料与泥炭”体系，尽早开垦公有沼泽板并建造专属保暖设施，终局将剩余燃料转化为真金白银的胜利点。",
    phases: [
      { round: "前期 (第 1-4 轮)", desc: "积极拿取「收集燃料」与「沼泽拓荒」，利用拓荒赠送的燃料轻松熬过第 4 轮收获阶段的保暖检查。" },
      { round: "中期 (第 5-8 轮)", desc: "抢建「取暖炉」（收获阶段全家只消耗 1 燃料）或「泥炭窑」（收获阶段自动获赠燃料）。在公有沼泽板上播种作物计入农田得分。" },
      { round: "后期 (第 9-14 轮)", desc: "建造「柴火棚」，大量囤积燃料，在终局时每份剩余燃料直接折算为 1 分真实胜利点。" }
    ],
    jobs: [
      { name: "柴火棚", icon: "🪵", desc: "大改进：终局时每份剩余燃料直接 +1 分" },
      { name: "取暖炉", icon: "🔥", desc: "大改进：每轮收获阶段全家仅需 1 燃料保暖" },
      { name: "泥炭窑", icon: "🏺", desc: "大改进：每次收获阶段自动获赠 1 燃料" },
      { name: "炭烧工", icon: "🔥", desc: "伐木时可顺带制备燃料" },
      { name: "割草甸", icon: "🌾", desc: "专属行动：包揽全部干草堆，喂饱黄牛群" }
    ],
    pros: "化严寒为动力，彻底免去缺燃料扣分，终局凭借庞大燃料储量爆发额外 5~8 分。",
    cons: "仅在房间启用「沼泽农夫（荒野之地）」扩展时生效；需要合理分配木材与芦苇以兼顾拓荒成本。"
  },
  {
    id: "balanced",
    name: "⚖️ 稳健全能平衡流",
    shortName: "⚖️ 稳健全能",
    subtitle: "滴水不漏 · 消灭负分 · 稳健高胜率",
    tag: "新手推荐",
    summary: "依据计分规则的“断点递进原理”，避免单一项目过度溢出，优先填补各项的“第一档正分”，消除所有负分项，稳拿 40+ 高分。",
    checklist: [
      "🌾 耕地：犁出 2~4 块农田（田块得分从 -1 跃升至 +1~2 分）",
      "🥕 作物：至少存留 1 谷物 1 蔬菜（分别摆脱 -1 分惩罚）",
      "🐑 牲畜：绵羊、野猪、黄牛各养至少 1 对（全部摆脱 -1 分惩罚并在收获阶段成对繁殖）",
      "🏠 房屋：翻修至 3~4 间陶屋（每间 +1 分）或石屋（每间 +2 分）",
      "👶 人丁：发展至 3~5 名家庭成员（每人 +3 分）",
      "🌲 空地：开垦耕地或圈牧场填满 15 个格子，0 荒地（消灭所有 -1 分惩罚）"
    ],
    chant: "一轮看木苇，二轮备口粮；四轮前造房，五轮速翻修；六轮添丁旺，七轮始耕牧；动物各留种，空地皆成荫。",
    pros: "容错率极高，全面消灭负分，各项稳步得分，在 2~4 人局中胜率极高。",
    cons: "若遭遇对手极端卡位某一关键资源（如芦苇），需具备随时调转次选策略的应变能力。"
  }
];

let _stratDrawerEl = null;
let _stratBackdropEl = null;
let _curStratId = "grain_bake";

export function openStrategyDrawer(stratId = "grain_bake") {
  if (_stratDrawerEl) {
    switchStratTab(stratId);
    return;
  }
  _curStratId = stratId;

  _stratBackdropEl = document.createElement("div");
  _stratBackdropEl.className = "tut-backdrop";
  _stratBackdropEl.onclick = closeStrategyDrawer;
  document.body.appendChild(_stratBackdropEl);

  _stratDrawerEl = document.createElement("aside");
  _stratDrawerEl.className = "tut-drawer";
  _stratDrawerEl.innerHTML = `
    <div class="tut-drawer-head">
      <h2 class="mt0 mb0">💡 农家乐流派玩法指南</h2>
      <button class="btn ghost small" id="stratClose">关闭 ×</button>
    </div>
    <div class="tut-drawer-body">
      <!-- 流派切换 Tab 栏 -->
      <div class="strat-tabs" id="stratTabList">
        ${STRATEGIES.map((s) => `
          <button class="strat-tab-btn ${s.id === _curStratId ? "active" : ""}" data-sid="${s.id}" type="button">
            ${s.shortName}
          </button>
        `).join("")}
      </div>

      <!-- 流派内容展示区 -->
      <div id="stratContent"></div>
    </div>
  `;
  document.body.appendChild(_stratDrawerEl);
  _stratDrawerEl.querySelector("#stratClose").onclick = closeStrategyDrawer;

  // 绑定 Tab 点击事件
  _stratDrawerEl.querySelectorAll(".strat-tab-btn").forEach((btn) => {
    btn.onclick = () => switchStratTab(btn.dataset.sid);
  });

  renderStratContent(_curStratId);

  requestAnimationFrame(() => {
    _stratBackdropEl.classList.add("show");
    _stratDrawerEl.classList.add("show");
  });
  document.addEventListener("keydown", onStratEscClose);
}

function switchStratTab(sid) {
  _curStratId = sid;
  if (!_stratDrawerEl) return;
  _stratDrawerEl.querySelectorAll(".strat-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.sid === sid);
  });
  renderStratContent(sid);
}

function renderStratContent(sid) {
  if (!_stratDrawerEl) return;
  const container = _stratDrawerEl.querySelector("#stratContent");
  if (!container) return;
  const st = STRATEGIES.find((s) => s.id === sid) || STRATEGIES[0];

  let html = `
    <div class="kb-card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <h3 style="margin:0;font-size:16px;color:var(--leaf-dark)">${st.name}</h3>
        <span class="strat-badge">${st.tag}</span>
      </div>
      <p style="margin:6px 0 0;font-size:12px;color:var(--ink-2);font-weight:600">${st.subtitle}</p>
      <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:var(--ink)">${st.summary}</p>
    </div>
  `;

  // 阶段节奏
  if (st.phases && st.phases.length) {
    html += `
      <h4 style="margin:16px 0 8px;font-size:14px;color:var(--ink)">⏱ 运营节奏与阶段重心</h4>
      <div class="phase-timeline">
        ${st.phases.map((p) => `
          <div class="phase-item">
            <b>${p.round}</b>：${p.desc}
          </div>
        `).join("")}
      </div>
    `;
  }

  // 核心职业 / 卡牌
  if (st.jobs && st.jobs.length) {
    html += `
      <h4 style="margin:16px 0 8px;font-size:14px;color:var(--ink)">🎴 核心职业 / 设施推荐</h4>
      <div class="job-tags-grid">
        ${st.jobs.map((j) => `
          <div class="job-tag-card">
            <div class="jt-head">${j.icon} ${j.name}</div>
            <div class="jt-desc">${j.desc}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // 平衡流检查清单与口诀
  if (st.checklist) {
    html += `
      <h4 style="margin:16px 0 8px;font-size:14px;color:var(--ink)">📋 终局高分黄金检查清单</h4>
      <ul style="margin:6px 0;padding-left:20px;line-height:1.7;font-size:13px">
        ${st.checklist.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <div class="tip-box" style="margin-top:12px">
        <b>💡 农家乐运营口诀：</b><br>
        <i>${st.chant}</i>
      </div>
    `;
  }

  // 优缺点评价
  if (st.pros || st.cons) {
    html += `
      <div class="strat-procon">
        <div class="strat-box pro">
          <b>✅ 核心优势</b><br>${st.pros}
        </div>
        <div class="strat-box con">
          <b>⚠️ 潜在风险与应对</b><br>${st.cons}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function onStratEscClose(e) {
  if (e.key === "Escape") closeStrategyDrawer();
}

export function closeStrategyDrawer() {
  if (_stratDrawerEl) {
    _stratDrawerEl.classList.remove("show");
    setTimeout(() => { _stratDrawerEl?.remove(); _stratDrawerEl = null; }, 280);
  }
  if (_stratBackdropEl) {
    _stratBackdropEl.classList.remove("show");
    setTimeout(() => { _stratBackdropEl?.remove(); _stratBackdropEl = null; }, 280);
  }
  document.removeEventListener("keydown", onStratEscClose);
}

// ============================================================
// 职业全图鉴抽屉（88 张官方经典职业，7 大流派分类 + 实时搜索）
// ============================================================

let _occDrawerEl = null;
let _occBackdropEl = null;
let _curOccCat = "all";
let _occSearchKey = "";

const OCC_CATEGORIES = [
  { id: "all", name: "全部", count: 88, icon: "🎴" },
  { id: "resource", name: "基础资源", count: 15, icon: "🪵" },
  { id: "farming", name: "农耕种植", count: 13, icon: "🌾" },
  { id: "livestock", name: "牲畜畜牧", count: 11, icon: "🐑" },
  { id: "building", name: "建造翻修", count: 12, icon: "🏠" },
  { id: "cooking", name: "饮食烹饪", count: 19, icon: "🍳" },
  { id: "family", name: "家庭运营", count: 10, icon: "👶" },
  { id: "scoring", name: "终局声望", count: 8, icon: "🏆" },
];

export function openOccupationGalleryDrawer(defaultCat = "all") {
  if (_occDrawerEl) {
    switchOccCatTab(defaultCat);
    return;
  }
  _curOccCat = defaultCat;
  _occSearchKey = "";

  _occBackdropEl = document.createElement("div");
  _occBackdropEl.className = "tut-backdrop";
  _occBackdropEl.onclick = closeOccupationGalleryDrawer;
  document.body.appendChild(_occBackdropEl);

  _occDrawerEl = document.createElement("aside");
  _occDrawerEl.className = "tut-drawer occ-gallery-drawer";
  _occDrawerEl.innerHTML = `
    <div class="tut-drawer-head">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:20px">🎴</span>
        <h2 class="mt0 mb0" style="font-size:16px;margin:0">经典职业卡全图鉴 (88 张)</h2>
      </div>
      <button class="btn ghost small" id="occGalleryClose">关闭 ×</button>
    </div>
    <div class="tut-drawer-body">
      <!-- 规则误解消除与科普提示 -->
      <div class="tip-box" style="margin-bottom:14px;font-size:13px;line-height:1.6">
        <b>💡 《农家乐》卡池与手牌规则说明：</b><br>
        本作完整收录 <b>88 张官方经典职业卡</b>（涵盖基础资源、农耕种植、牲畜畜牧、建造翻修、饮食烹饪、家庭运营、终局声望 7 大核心流派）。开局系统将从卡池中为每位玩家<b>随机盲抽 7 张候选手牌</b>（7 选 1），挑选 1 张作为本局终生职业。在这里您可以随时通览全部 88 张职业卡的效果与背景设定！
      </div>

      <!-- 搜索栏 -->
      <div class="gallery-search-wrap" style="margin-bottom:12px">
        <input type="search" id="occSearchInput" class="gallery-search-input" placeholder="🔍 实时搜索：职业名称、效果描述或风味传记..." />
      </div>

      <!-- 流派分类 Tab 栏 -->
      <div class="strat-tabs" id="occCatTabList">
        ${OCC_CATEGORIES.map((c) => `
          <button class="strat-tab-btn ${c.id === _curOccCat ? "active" : ""}" data-cat="${c.id}" type="button">
            ${c.icon} ${c.name} (${c.count})
          </button>
        `).join("")}
      </div>

      <!-- 筛选统计信息 -->
      <div id="occGalleryMeta" style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;font-weight:600"></div>

      <!-- 卡牌网格展示区 -->
      <div id="occGalleryGrid" class="gallery-cards-grid"></div>
    </div>
  `;
  document.body.appendChild(_occDrawerEl);
  _occDrawerEl.querySelector("#occGalleryClose").onclick = closeOccupationGalleryDrawer;

  // 绑定分类 Tab
  _occDrawerEl.querySelectorAll(".strat-tab-btn").forEach((btn) => {
    btn.onclick = () => switchOccCatTab(btn.dataset.cat);
  });

  // 绑定搜索输入
  const searchInput = _occDrawerEl.querySelector("#occSearchInput");
  if (searchInput) {
    searchInput.oninput = (e) => {
      _occSearchKey = (e.target.value || "").trim().toLowerCase();
      renderOccGalleryCards();
    };
  }

  renderOccGalleryCards();

  requestAnimationFrame(() => {
    _occBackdropEl.classList.add("show");
    _occDrawerEl.classList.add("show");
  });
  document.addEventListener("keydown", onOccEscClose);
}

function switchOccCatTab(cat) {
  _curOccCat = cat;
  if (!_occDrawerEl) return;
  _occDrawerEl.querySelectorAll(".strat-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.cat === cat);
  });
  renderOccGalleryCards();
}

function renderOccGalleryCards() {
  if (!_occDrawerEl) return;
  const grid = _occDrawerEl.querySelector("#occGalleryGrid");
  const meta = _occDrawerEl.querySelector("#occGalleryMeta");
  if (!grid) return;

  const filtered = OCCUPATIONS.filter((o) => {
    if (_curOccCat !== "all" && o.category !== _curOccCat) return false;
    if (_occSearchKey) {
      const text = `${o.name} ${o.effect} ${o.flavor || ""} ${o.categoryZh || ""}`.toLowerCase();
      if (!text.includes(_occSearchKey)) return false;
    }
    return true;
  });

  if (meta) {
    meta.innerHTML = `展示 <b>${filtered.length}</b> / 88 张职业卡${_occSearchKey ? `（包含关键词 "${escapeHtml(_occSearchKey)}"）` : ""}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-hint" style="grid-column:1/-1;text-align:center;padding:36px 12px;color:var(--ink-2)">
        <div style="font-size:28px;margin-bottom:8px">🔍</div>
        <div>没有找到匹配 "${escapeHtml(_occSearchKey)}" 的职业卡</div>
        <button class="btn btn-outline small" style="margin-top:10px" id="btnResetOccSearch">清空搜索条件</button>
      </div>
    `;
    const resetBtn = grid.querySelector("#btnResetOccSearch");
    if (resetBtn) {
      resetBtn.onclick = () => {
        _occSearchKey = "";
        const input = _occDrawerEl.querySelector("#occSearchInput");
        if (input) input.value = "";
        renderOccGalleryCards();
      };
    }
    return;
  }

  grid.innerHTML = filtered.map((occ) => `
    <div class="gallery-card occ-gallery-card">
      <div class="gc-head">
        <span class="gc-icon">${occ.icon}</span>
        <span class="gc-name">${escapeHtml(occ.name)}</span>
        <span class="gc-cat">${escapeHtml(occ.categoryZh || "基础")}</span>
      </div>
      <div class="gc-effect">${escapeHtml(occ.effect)}</div>
      ${occ.flavor ? `<div class="gc-flavor">“${escapeHtml(occ.flavor)}”</div>` : ""}
    </div>
  `).join("");
}

function onOccEscClose(e) {
  if (e.key === "Escape") closeOccupationGalleryDrawer();
}

export function closeOccupationGalleryDrawer() {
  if (_occDrawerEl) {
    _occDrawerEl.classList.remove("show");
    setTimeout(() => { _occDrawerEl?.remove(); _occDrawerEl = null; }, 280);
  }
  if (_occBackdropEl) {
    _occBackdropEl.classList.remove("show");
    setTimeout(() => { _occBackdropEl?.remove(); _occBackdropEl = null; }, 280);
  }
  document.removeEventListener("keydown", onOccEscClose);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}