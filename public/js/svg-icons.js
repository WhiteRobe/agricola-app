// ============================================================
// 《农家乐 Agricola》高保真矢量手绘桌游素材库 (SVG Icon Engine)
// 17 世纪中欧古典德式桌游风：原木切面、烧结赤陶、编结芦苇、木雕米普与版画图腾
// ============================================================

/**
 * 资源 Token 矢量图（原木截面、陶砖、芦苇捆、石块、麦穗、胡萝卜、酸面包、泥炭、干草）
 * @param {"wood"|"clay"|"reed"|"stone"|"grain"|"vegetable"|"food"|"fuel"|"hay"} kind
 * @param {number} size 尺寸 (px)
 */
export function tokenSvg(kind, size = 26) {
  const s = size;
  switch (kind) {
    case "wood":
      // 原木：圆柱截面，外层深色树皮，内部年轮同心椭圆与木纹裂隙
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-wood" aria-label="木材" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="barkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#5a3818"/>
            <stop offset="50%" stop-color="#734922"/>
            <stop offset="100%" stop-color="#462a12"/>
          </linearGradient>
          <linearGradient id="woodCutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e6c38a"/>
            <stop offset="50%" stop-color="#d4aa6e"/>
            <stop offset="100%" stop-color="#bd9152"/>
          </linearGradient>
          <filter id="tokShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#2a1805" flood-opacity="0.35"/>
          </filter>
        </defs>
        <g filter="url(#tokShadow)">
          <!-- 木段身躯（斜放角度） -->
          <path d="M 12 14 L 34 26 L 28 38 L 6 26 Z" fill="url(#barkGrad)" stroke="#3d2109" stroke-width="1.2"/>
          <!-- 树皮裂槽 -->
          <path d="M 16 19 L 30 28" stroke="#3d2109" stroke-width="1" stroke-linecap="round"/>
          <path d="M 12 24 L 23 31" stroke="#3d2109" stroke-width="0.8" stroke-linecap="round"/>
          <!-- 原木截面椭圆 -->
          <ellipse cx="12" cy="20" rx="7" ry="9" transform="rotate(-30 12 20)" fill="url(#woodCutGrad)" stroke="#5a3818" stroke-width="1.4"/>
          <!-- 年轮内圈 -->
          <ellipse cx="12" cy="20" rx="4.5" ry="6" transform="rotate(-30 12 20)" fill="none" stroke="#9e7039" stroke-width="0.8" stroke-dasharray="8 2"/>
          <ellipse cx="12" cy="20" rx="2" ry="2.8" transform="rotate(-30 12 20)" fill="none" stroke="#875c29" stroke-width="0.7"/>
          <circle cx="12" cy="20" r="0.8" fill="#5a3818"/>
        </g>
      </svg>`;

    case "clay":
      // 陶土：带烧结温润微光与厚度倒角的红砖块
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-clay" aria-label="陶土" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="clayTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#df6b49"/>
            <stop offset="100%" stop-color="#c45332"/>
          </linearGradient>
          <linearGradient id="claySide" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a43d22"/>
            <stop offset="100%" stop-color="#7d2c16"/>
          </linearGradient>
          <linearGradient id="clayFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#b84729"/>
            <stop offset="100%" stop-color="#93331a"/>
          </linearGradient>
        </defs>
        <!-- 3D 棱台陶砖 -->
        <g filter="drop-shadow(1px 2px 2px rgba(50,20,10,0.38))">
          <!-- 顶面 -->
          <polygon points="12,14 36,14 42,20 18,20" fill="url(#clayTop)" stroke="#68210e" stroke-width="1"/>
          <!-- 正面 -->
          <polygon points="12,14 18,20 18,34 12,28" fill="url(#clayFront)" stroke="#68210e" stroke-width="1"/>
          <!-- 侧面 -->
          <polygon points="18,20 42,20 42,34 18,34" fill="url(#claySide)" stroke="#68210e" stroke-width="1"/>
          <!-- 砖面孔眼/质感凹陷 -->
          <ellipse cx="26" cy="26" rx="2" ry="2.5" fill="#58190a" opacity="0.6"/>
          <ellipse cx="34" cy="26" rx="2" ry="2.5" fill="#58190a" opacity="0.6"/>
          <!-- 倒角高光线 -->
          <line x1="12" y1="14" x2="36" y2="14" stroke="#ff9f80" stroke-width="0.8" opacity="0.8"/>
          <line x1="18" y1="20" x2="42" y2="20" stroke="#ff9f80" stroke-width="0.8" opacity="0.6"/>
        </g>
      </svg>`;

    case "reed":
      // 芦苇：天然中欧湿地芦苇捆扎，带金黄麻绳系扣
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-reed" aria-label="芦苇" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="reedStem" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a4bf6b"/>
            <stop offset="40%" stop-color="#7e9e42"/>
            <stop offset="100%" stop-color="#557322"/>
          </linearGradient>
          <linearGradient id="reedPlume" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#d6b885"/>
            <stop offset="100%" stop-color="#9e7b47"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(30,40,10,0.3))">
          <!-- 芦苇杆身 -->
          <path d="M 16 38 C 19 28, 17 18, 15 10" stroke="url(#reedStem)" stroke-width="3" stroke-linecap="round"/>
          <path d="M 24 40 C 24 28, 23 18, 23 8" stroke="url(#reedStem)" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M 32 38 C 29 28, 30 18, 32 10" stroke="url(#reedStem)" stroke-width="3" stroke-linecap="round"/>
          <!-- 顶部芦花绒穗 -->
          <ellipse cx="14" cy="8" rx="2" ry="4" transform="rotate(-10 14 8)" fill="url(#reedPlume)"/>
          <ellipse cx="23" cy="6" rx="2.2" ry="4.5" fill="url(#reedPlume)"/>
          <ellipse cx="33" cy="8" rx="2" ry="4" transform="rotate(10 33 8)" fill="url(#reedPlume)"/>
          <!-- 麻绳捆扎带（双道） -->
          <rect x="17" y="24" width="14" height="3" rx="1.5" fill="#cbb27a" stroke="#684f22" stroke-width="0.8"/>
          <rect x="18" y="28" width="12" height="2.5" rx="1.2" fill="#ba9e62" stroke="#684f22" stroke-width="0.8"/>
          <line x1="24" y1="24" x2="24" y2="30.5" stroke="#4a3715" stroke-width="0.7"/>
        </g>
      </svg>`;

    case "stone":
      // 石材：多面体冷灰板岩/花岗岩雕刻块，带有分明采石切面
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-stone" aria-label="石材" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="stoneTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#bac2cb"/>
            <stop offset="100%" stop-color="#939da9"/>
          </linearGradient>
          <linearGradient id="stoneFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#727c89"/>
            <stop offset="100%" stop-color="#555e69"/>
          </linearGradient>
          <linearGradient id="stoneRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#5a636e"/>
            <stop offset="100%" stop-color="#3d444d"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(20,25,35,0.4))">
          <!-- 主体多边形 -->
          <polygon points="12,18 24,10 38,15 28,24" fill="url(#stoneTop)" stroke="#2b313a" stroke-width="1"/>
          <polygon points="12,18 28,24 25,40 8,32" fill="url(#stoneFront)" stroke="#2b313a" stroke-width="1"/>
          <polygon points="28,24 38,15 42,30 25,40" fill="url(#stoneRight)" stroke="#2b313a" stroke-width="1"/>
          <!-- 棱角高光线 -->
          <polyline points="12,18 24,10 38,15" fill="none" stroke="#dbe1e8" stroke-width="1" stroke-linecap="round"/>
          <line x1="28" y1="24" x2="25" y2="40" stroke="#8fa0b5" stroke-width="0.8"/>
        </g>
      </svg>`;

    case "grain":
      // 谷物：饱满金黄麦穗，带颗粒状麦粒与长芒
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-grain" aria-label="谷物" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grainGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffdc54"/>
            <stop offset="50%" stop-color="#f0b429"/>
            <stop offset="100%" stop-color="#cb880e"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(70,45,10,0.3))">
          <!-- 茎秆 -->
          <path d="M 12 40 C 18 32, 26 22, 34 10" stroke="#af740b" stroke-width="2" stroke-linecap="round" fill="none"/>
          <!-- 麦芒（左侧与右侧尖芒） -->
          <line x1="22" y1="24" x2="14" y2="16" stroke="#af740b" stroke-width="1" stroke-linecap="round"/>
          <line x1="26" y1="19" x2="19" y2="11" stroke="#af740b" stroke-width="1" stroke-linecap="round"/>
          <line x1="30" y1="14" x2="26" y2="6" stroke="#af740b" stroke-width="1" stroke-linecap="round"/>
          <line x1="26" y1="22" x2="34" y2="17" stroke="#af740b" stroke-width="1" stroke-linecap="round"/>
          <line x1="29" y1="17" x2="38" y2="12" stroke="#af740b" stroke-width="1" stroke-linecap="round"/>
          <!-- 麦粒对（左右交错排列） -->
          <ellipse cx="19" cy="27" rx="3" ry="5.5" transform="rotate(-35 19 27)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
          <ellipse cx="25" cy="23" rx="3" ry="5.5" transform="rotate(35 25 23)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
          <ellipse cx="23" cy="21" rx="3" ry="5.5" transform="rotate(-35 23 21)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
          <ellipse cx="29" cy="17" rx="3" ry="5.5" transform="rotate(35 29 17)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
          <ellipse cx="28" cy="14" rx="2.8" ry="5.2" transform="rotate(-35 28 14)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
          <ellipse cx="33" cy="11" rx="2.5" ry="4.8" transform="rotate(30 33 11)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
          <ellipse cx="34" cy="8" rx="2" ry="4" transform="rotate(-15 34 8)" fill="url(#grainGold)" stroke="#925c00" stroke-width="0.8"/>
        </g>
      </svg>`;

    case "vegetable":
      // 蔬菜：大地拔出的深橙色胡萝卜，带羽状鲜绿叶
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-veg" aria-label="蔬菜" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="carrotBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff7b2b"/>
            <stop offset="60%" stop-color="#e8590c"/>
            <stop offset="100%" stop-color="#b03400"/>
          </linearGradient>
          <linearGradient id="carrotLeaf" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#69db7c"/>
            <stop offset="100%" stop-color="#2f9e44"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(50,20,5,0.35))">
          <!-- 绿缨叶丛 -->
          <path d="M 32 16 C 36 10, 42 7, 40 5 C 37 6, 33 10, 31 14 Z" fill="url(#carrotLeaf)"/>
          <path d="M 33 14 C 36 8, 38 4, 35 3 C 33 5, 30 10, 30 13 Z" fill="url(#carrotLeaf)"/>
          <path d="M 30 16 C 28 9, 26 5, 23 6 C 24 9, 27 12, 28 15 Z" fill="url(#carrotLeaf)"/>
          <!-- 根体（圆润上端锥入泥土） -->
          <path d="M 34 14 C 37 18, 33 21, 28 26 C 22 33, 14 41, 10 43 C 9 43, 9 42, 11 39 C 14 31, 23 18, 28 14 C 30 12, 33 12, 34 14 Z" fill="url(#carrotBody)" stroke="#802100" stroke-width="1"/>
          <!-- 泥土横条纹 -->
          <path d="M 27 19 Q 25 21 23 20" stroke="#802100" stroke-width="0.9" fill="none" stroke-linecap="round"/>
          <path d="M 23 25 Q 21 27 19 25" stroke="#802100" stroke-width="0.8" fill="none" stroke-linecap="round"/>
          <path d="M 18 31 Q 16 33 14 31" stroke="#802100" stroke-width="0.7" fill="none" stroke-linecap="round"/>
        </g>
      </svg>`;

    case "food":
      // 食物：柴火窑烤圆面包，深色脆皮割纹与麦香焦斑
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-food" aria-label="食物" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="breadCrust" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#e8ba7a"/>
            <stop offset="60%" stop-color="#b87b32"/>
            <stop offset="100%" stop-color="#703f13"/>
          </radialGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(40,20,5,0.4))">
          <!-- 面包圆体 -->
          <ellipse cx="24" cy="25" rx="18" ry="14" fill="url(#breadCrust)" stroke="#522a08" stroke-width="1.3"/>
          <!-- 顶部烘焙划痕 (Crust Scores) -->
          <path d="M 14 20 Q 24 18 34 22" stroke="#fbe4be" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          <path d="M 16 26 Q 24 24 32 28" stroke="#fbe4be" stroke-width="1.8" stroke-linecap="round" fill="none"/>
          <path d="M 19 16 Q 24 28 27 34" stroke="#522a08" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.4"/>
          <!-- 焦脆微斑点 -->
          <circle cx="21" cy="22" r="0.9" fill="#422004"/>
          <circle cx="28" cy="23" r="0.8" fill="#422004"/>
        </g>
      </svg>`;

    case "fuel":
      // 燃料（沼泽农夫扩展）：切块深黑泥炭块堆叠
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-fuel" aria-label="燃料" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="peatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4a3b32"/>
            <stop offset="50%" stop-color="#31251e"/>
            <stop offset="100%" stop-color="#1d140e"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(10,5,0,0.5))">
          <!-- 底层泥炭砖 -->
          <polygon points="10,26 26,20 38,24 22,30" fill="#3a2c22" stroke="#120c07" stroke-width="1"/>
          <polygon points="10,26 22,30 22,40 10,36" fill="#251a14" stroke="#120c07" stroke-width="1"/>
          <polygon points="22,30 38,24 38,34 22,40" fill="#1b120c" stroke="#120c07" stroke-width="1"/>
          <!-- 顶层泥炭砖 -->
          <polygon points="14,16 30,10 40,14 24,20" fill="url(#peatGrad)" stroke="#120c07" stroke-width="1"/>
          <polygon points="14,16 24,20 24,28 14,24" fill="#2d211a" stroke="#120c07" stroke-width="1"/>
          <polygon points="24,20 40,14 40,22 24,28" fill="#1f150e" stroke="#120c07" stroke-width="1"/>
          <!-- 微弱暗红炭火余温高光 -->
          <circle cx="28" cy="18" r="1.5" fill="#ff4d00" opacity="0.75" filter="drop-shadow(0 0 2px #ff6a00)"/>
        </g>
      </svg>`;

    case "hay":
      // 干草（沼泽农夫扩展）：扎绑好的长方形金黄干草捆
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-token token-hay" aria-label="干草" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e9d282"/>
            <stop offset="50%" stop-color="#cca742"/>
            <stop offset="100%" stop-color="#a47d25"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(45,30,5,0.35))">
          <polygon points="8,18 28,12 40,16 20,22" fill="#dfc674" stroke="#725514" stroke-width="1"/>
          <polygon points="8,18 20,22 20,36 8,32" fill="#cca742" stroke="#725514" stroke-width="1"/>
          <polygon points="20,22 40,16 40,30 20,36" fill="#aa8327" stroke="#725514" stroke-width="1"/>
          <!-- 捆绳（双道黑绳） -->
          <line x1="14" y1="16" x2="14" y2="34" stroke="#483309" stroke-width="1.2"/>
          <line x1="30" y1="14" x2="30" y2="33" stroke="#483309" stroke-width="1.2"/>
          <!-- 散落碎草芒 -->
          <line x1="7" y1="20" x2="5" y2="19" stroke="#725514" stroke-width="0.8"/>
          <line x1="39" y1="28" x2="42" y2="29" stroke="#725514" stroke-width="0.8"/>
        </g>
      </svg>`;

    default:
      return `<span style="font-size:${s}px">📦</span>`;
  }
}

/**
 * 经典农家乐木制动物 Animeeple 矢量图（羊、野猪、黄牛）
 * 遵循实体德式木块剪影造型与顶部漫反射木纹高光
 * @param {"sheep"|"boar"|"cattle"} type
 * @param {number} size 尺寸 (px)
 */
export function animalSvg(type, size = 30) {
  const s = size;
  switch (type) {
    case "sheep":
      // 木羊：白/浅米色蓬松云朵剪影，带黑木蹄子与头部小耳
      return `<svg width="${s}" height="${s}" viewBox="0 0 54 44" class="agri-animeeple meeple-sheep" aria-label="羊" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sheepWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#f2ebe0"/>
            <stop offset="100%" stop-color="#d4c7b2"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(40,30,20,0.35))">
          <!-- 身体（圆润羊毛轮廓） -->
          <path d="M 12 18 C 10 14, 14 8, 20 10 C 24 6, 32 6, 36 9 C 40 8, 45 12, 43 17 C 47 21, 46 28, 41 30 C 40 34, 34 35, 30 33 C 26 35, 18 35, 14 31 C 9 29, 8 22, 12 18 Z" fill="url(#sheepWood)" stroke="#68563d" stroke-width="1.3"/>
          <!-- 羊头 -->
          <ellipse cx="11" cy="18" rx="6.5" ry="5.5" fill="#4d3b27"/>
          <!-- 小耳朵 -->
          <ellipse cx="14" cy="13" rx="2" ry="3.5" transform="rotate(-30 14 13)" fill="#4d3b27"/>
          <!-- 木四肢腿 -->
          <rect x="16" y="32" width="3.2" height="7" rx="1.5" fill="#4d3b27"/>
          <rect x="23" y="32" width="3.2" height="7" rx="1.5" fill="#4d3b27"/>
          <rect x="31" y="32" width="3.2" height="7" rx="1.5" fill="#4d3b27"/>
          <rect x="37" y="31" width="3.2" height="7" rx="1.5" fill="#4d3b27"/>
          <!-- 木雕倒角顶边高光 -->
          <path d="M 20 10 C 24 7, 32 7, 36 10" stroke="#ffffff" stroke-width="1" stroke-linecap="round" fill="none"/>
        </g>
      </svg>`;

    case "boar":
      // 野猪：深黑褐色粗壮身形、拱起鬃背与微翘的小獠牙
      return `<svg width="${s}" height="${s}" viewBox="0 0 56 44" class="agri-animeeple meeple-boar" aria-label="野猪" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boarWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#5a3d28"/>
            <stop offset="60%" stop-color="#3d2817"/>
            <stop offset="100%" stop-color="#24160c"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(20,10,5,0.45))">
          <!-- 躯干（宽阔脊背与垂腹） -->
          <path d="M 8 24 L 14 17 C 18 13, 28 11, 38 14 C 44 16, 48 20, 47 26 C 47 31, 41 33, 34 32 C 26 33, 16 32, 12 28 Z" fill="url(#boarWood)" stroke="#1a0f07" stroke-width="1.3"/>
          <!-- 猪头与吻鼻 -->
          <polygon points="6,24 14,17 14,29" fill="url(#boarWood)" stroke="#1a0f07" stroke-width="1.2"/>
          <ellipse cx="6" cy="24" rx="2" ry="3" fill="#24160c"/>
          <!-- 尖耳 -->
          <polygon points="14,17 18,10 19,16" fill="#24160c"/>
          <!-- 粗木短腿 -->
          <rect x="14" y="30" width="4" height="8" rx="1.5" fill="#24160c"/>
          <rect x="22" y="30" width="3.8" height="8" rx="1.5" fill="#24160c"/>
          <rect x="33" y="30" width="4" height="8" rx="1.5" fill="#24160c"/>
          <rect x="41" y="28" width="3.8" height="8" rx="1.5" fill="#24160c"/>
          <!-- 小翘尾 -->
          <path d="M 47 24 Q 52 23 50 20" stroke="#3d2817" stroke-width="2" fill="none" stroke-linecap="round"/>
        </g>
      </svg>`;

    case "cattle":
      // 黄牛：中世纪栗色健硕躯体、微微隆起的肩脊与挺拔米色牛角
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 46" class="agri-animeeple meeple-cattle" aria-label="牛" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cowWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#a65e2e"/>
            <stop offset="50%" stop-color="#84451b"/>
            <stop offset="100%" stop-color="#5e2e0e"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(35,15,5,0.4))">
          <!-- 脊背与躯干 -->
          <path d="M 16 16 C 22 13, 34 14, 46 16 C 50 18, 52 24, 50 30 C 47 34, 38 35, 28 35 C 20 35, 16 31, 15 27 Z" fill="url(#cowWood)" stroke="#3d1b06" stroke-width="1.3"/>
          <!-- 牛头与颈部 -->
          <path d="M 8 24 L 16 16 L 16 28 L 10 28 Z" fill="url(#cowWood)" stroke="#3d1b06" stroke-width="1.2"/>
          <!-- 牛角（米白色挺翘双角） -->
          <path d="M 14 16 Q 13 8 9 9 Q 12 12 13 16" fill="#e8dbc3" stroke="#4a371c" stroke-width="0.8"/>
          <path d="M 16 15 Q 18 8 22 9 Q 19 12 17 16" fill="#e8dbc3" stroke="#4a371c" stroke-width="0.8"/>
          <!-- 粗实木腿 -->
          <rect x="18" y="32" width="4.5" height="10" rx="2" fill="#4a2208"/>
          <rect x="25" y="32" width="4.2" height="10" rx="2" fill="#4a2208"/>
          <rect x="38" y="32" width="4.5" height="10" rx="2" fill="#4a2208"/>
          <rect x="45" y="30" width="4.2" height="10" rx="2" fill="#4a2208"/>
          <!-- 牛尾 -->
          <path d="M 50 20 Q 55 24 53 32" stroke="#5e2e0e" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="53" cy="32" r="1.5" fill="#3d1b06"/>
        </g>
      </svg>`;

    default:
      return `<span style="font-size:${s}px">🐾</span>`;
  }
}

/**
 * 奔跑的小人 (Running Farmer Meeple) —— 「行动中」回合指示
 * 木雕质感的奔跑农夫剪影 + 速度线，配合 CSS .runner-anim 呈现奔跑弹跳
 * @param {string} colorHex 主体色（默认叶绿 var(--leaf) 色系 #5c8d4e）
 * @param {number} size 尺寸 (px)
 */
export function runnerSvg(colorHex = "#5c8d4e", size = 18) {
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="agri-runner" aria-label="奔跑的农夫" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="runnerLight_${s}" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <g>
      <!-- 速度线（奔跑动感） -->
      <line x1="2" y1="16" x2="10" y2="16" stroke="${colorHex}" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
      <line x1="1" y1="23" x2="8" y2="23" stroke="${colorHex}" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
      <line x1="3" y1="30" x2="10" y2="30" stroke="${colorHex}" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
      <!-- 木雕农夫奔跑剪影 -->
      <path d="
        M 30 6
        C 33 6, 35.4 8.4, 35.4 11.4
        C 35.4 13.4, 34.3 15.1, 32.8 16
        L 36.5 18.5
        L 43.5 16.5
        C 45.6 16, 46.6 18.8, 44.8 19.9
        L 37.5 24
        L 32 21.5
        L 34.5 30
        L 40 37.5
        C 41.4 39.6, 38.6 41.6, 36.9 39.8
        L 30.5 32.5
        L 27.5 25
        L 24 32
        L 20.5 41
        C 19.7 43.2, 16.5 42.4, 16.9 40.1
        L 20.5 30
        L 24.5 21
        L 20 22.5
        L 15.5 27.5
        C 13.9 29.2, 11.4 27.1, 12.7 25.1
        L 18 18
        C 19 16.6, 20.4 15.9, 22 15.7
        L 28.2 14.8
        C 27.4 13.9, 26.9 12.7, 26.9 11.4
        C 26.9 8.4, 27.4 6, 30 6 Z"
        fill="${colorHex}"
        stroke="rgba(40,20,5,0.55)"
        stroke-width="1.2"
        stroke-linejoin="round"/>
      <path d="
        M 30 6
        C 33 6, 35.4 8.4, 35.4 11.4
        C 35.4 13.4, 34.3 15.1, 32.8 16
        L 36.5 18.5
        L 43.5 16.5
        C 45.6 16, 46.6 18.8, 44.8 19.9
        L 37.5 24
        L 32 21.5
        L 34.5 30
        L 40 37.5
        C 41.4 39.6, 38.6 41.6, 36.9 39.8
        L 30.5 32.5
        L 27.5 25
        L 24 32
        L 20.5 41
        C 19.7 43.2, 16.5 42.4, 16.9 40.1
        L 20.5 30
        L 24.5 21
        L 20 22.5
        L 15.5 27.5
        C 13.9 29.2, 11.4 27.1, 12.7 25.1
        L 18 18
        C 19 16.6, 20.4 15.9, 22 15.7
        L 28.2 14.8
        C 27.4 13.9, 26.9 12.7, 26.9 11.4
        C 26.9 8.4, 27.4 6, 30 6 Z"
        fill="url(#runnerLight_${s})"/>
      <!-- 扬起的尘土 -->
      <circle cx="8" cy="40" r="1.6" fill="${colorHex}" opacity="0.4"/>
      <circle cx="12.5" cy="43" r="1.1" fill="${colorHex}" opacity="0.3"/>
      <circle cx="5" cy="43.5" r="0.9" fill="${colorHex}" opacity="0.25"/>
    </g>
  </svg>`;
}

/**
 * 经典木质农夫工人体块 (Player Farmer Meeple)
 * 用于行动格落座、玩家卡槽位与当前回合指示
 * @param {string} colorHex 玩家专属色 (#c0392b 砖红, #5c8d4e 苔绿, #2980b9 河蓝, #d4a017 暖金)
 * @param {number} size 尺寸 (px)
 * @param {string} label 内部字符（如 1/2/3/4 或名字首字）
 */
export function meepleSvg(colorHex = "#c0392b", size = 28, label = "") {
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 44 44" class="agri-meeple" aria-label="工人米普" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="meepleLight_${s}" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <filter id="mDrop" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#1a1005" flood-opacity="0.4"/>
      </filter>
    </defs>
    <g filter="url(#mDrop)">
      <!-- 经典桌游木人剪影 (Carved Wooden Meeple) -->
      <path d="
        M 22 5
        C 25.5 5, 27.5 7.5, 27.5 11
        C 27.5 13, 26.5 14.5, 25 15.5
        C 29 17, 34 19, 37 23
        C 38 24.5, 36.5 27, 34 26
        C 31 25, 28 24, 26.5 24.5
        L 27 38
        C 27 39.5, 24 39.5, 24 38
        L 23 29
        L 21 29
        L 20 38
        C 20 39.5, 17 39.5, 17 38
        L 17.5 24.5
        C 16 24, 13 25, 10 26
        C 7.5 27, 6 24.5, 7 23
        C 10 19, 15 17, 19 15.5
        C 17.5 14.5, 16.5 13, 16.5 11
        C 16.5 7.5, 18.5 5, 22 5 Z"
        fill="${colorHex}"
        stroke="rgba(40,20,5,0.6)"
        stroke-width="1.3"
        stroke-linejoin="round"
      />
      <!-- 原木高光折射面 -->
      <path d="
        M 22 5
        C 25.5 5, 27.5 7.5, 27.5 11
        C 27.5 13, 26.5 14.5, 25 15.5
        C 29 17, 34 19, 37 23
        C 38 24.5, 36.5 27, 34 26
        C 31 25, 28 24, 26.5 24.5
        L 27 38
        C 27 39.5, 24 39.5, 24 38
        L 23 29
        L 21 29
        L 20 38
        C 20 39.5, 17 39.5, 17 38
        L 17.5 24.5
        C 16 24, 13 25, 10 26
        C 7.5 27, 6 24.5, 7 23
        C 10 19, 15 17, 19 15.5
        C 17.5 14.5, 16.5 13, 16.5 11
        C 16.5 7.5, 18.5 5, 22 5 Z"
        fill="url(#meepleLight_${s})"
      />
      ${label ? `<text x="22" y="24" font-size="9" font-weight="900" text-anchor="middle" fill="#ffffff" filter="drop-shadow(0 1px 1px #000)">${label}</text>` : ""}
    </g>
  </svg>`;
}

/**
 * 经典木质牲畜圈舍 / 马厩 (3D Stereoscopic Barn & Stable Model)
 * @param {boolean} inPasture 是否位于封闭牧场内（在牧场内容量翻倍）
 * @param {boolean} isWinter 是否为冬季（带屋顶积雪微霜）
 * @param {number} size 尺寸 (px)
 */
export function stableSvg(inPasture = false, isWinter = false, size = 44) {
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="agri-stable-3d ${inPasture ? "stable-in-pasture" : "stable-solo"}" aria-label="圈舍" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stableRoofL_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#b85834"/>
        <stop offset="100%" stop-color="#803318"/>
      </linearGradient>
      <linearGradient id="stableRoofR_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#722c15"/>
        <stop offset="100%" stop-color="#461709"/>
      </linearGradient>
      <linearGradient id="stableWall_${s}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#b68146"/>
        <stop offset="100%" stop-color="#6a441b"/>
      </linearGradient>
    </defs>
    <g filter="drop-shadow(-2px 4px 4px rgba(25,12,4,0.48))">
      <!-- 椭圆地基投影 -->
      <ellipse cx="32" cy="55" rx="26" ry="7" fill="rgba(25,12,4,0.32)"/>
      <!-- 正面山墙木立面 -->
      <polygon points="32,12 56,27 53,52 11,52 8,27" fill="url(#stableWall_${s})" stroke="#3e220a" stroke-width="1.4"/>
      <!-- 正面原木墙体横向缝与角部木榫 -->
      <line x1="11" y1="35" x2="53" y2="35" stroke="#482b10" stroke-width="1.2"/>
      <line x1="11" y1="43" x2="53" y2="43" stroke="#482b10" stroke-width="1.2"/>
      <circle cx="10" cy="35" r="1.5" fill="#301805"/>
      <circle cx="54" cy="35" r="1.5" fill="#301805"/>
      <circle cx="10" cy="43" r="1.5" fill="#301805"/>
      <circle cx="54" cy="43" r="1.5" fill="#301805"/>
      <!-- 拱门入口与深暗内膛 -->
      <path d="M 23 52 L 23 34 C 23 28, 41 28, 41 34 L 41 52 Z" fill="#200f04" stroke="#4a250a" stroke-width="1.2"/>
      <!-- 门口金黄干草堆料槽 -->
      <ellipse cx="32" cy="49" rx="7" ry="3.5" fill="#e5b338"/>
      <path d="M 27 49 Q 32 43 37 49" stroke="#ffe066" stroke-width="1.5" fill="none"/>
      <!-- 3D 双坡屋顶：左坡受光面 -->
      <polygon points="32,9 32,27 5,28 6,10" fill="url(#stableRoofL_${s})" stroke="#381006" stroke-width="1.3"/>
      <!-- 3D 双坡屋顶：右坡阴影面 -->
      <polygon points="32,9 58,26 55,29 32,27" fill="url(#stableRoofR_${s})" stroke="#2a0a03" stroke-width="1.3"/>
      <!-- 屋顶屋脊压顶梁木 -->
      <line x1="6" y1="9" x2="32" y2="9" stroke="#d47952" stroke-width="2.2" stroke-linecap="round"/>
      <!-- 侧边木支撑斜桁架 -->
      <line x1="10" y1="28" x2="23" y2="42" stroke="#3e220a" stroke-width="1.3"/>
      <line x1="54" y1="28" x2="41" y2="42" stroke="#3e220a" stroke-width="1.3"/>
      <!-- 山墙顶部木雕公鸡/马头风向标 -->
      <path d="M 32 9 L 32 3 M 29 5 Q 32 2 35 5" stroke="#d9aa38" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <!-- 冬季屋脊与屋檐积雪微霜 -->
      ${isWinter ? `<path d="M 5 9 Q 18 7 32 8 Q 45 17 58 26" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.95"/><path d="M 5 28 Q 18 26 32 27 Q 44 27 55 29" stroke="#e6f2ff" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.9"/>` : ""}
      <!-- 封闭牧场内 2× 双倍容量铜牌徽饰 -->
      ${inPasture ? `<g transform="translate(32, 22)">
        <circle cx="0" cy="0" r="5.5" fill="#f8d348" stroke="#7a5508" stroke-width="1" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.4))"/>
        <text x="0" y="2.5" font-size="7" font-weight="900" text-anchor="middle" fill="#583902">2×</text>
      </g>` : ""}
    </g>
  </svg>`;
}

/**
 * 3D 实体原木栅栏横梁 (3D Split-Rail Fence Timber Beam)
 * @param {"h"|"v"} orientation 横向 (h) 或纵向 (v)
 * @param {number} length 栅栏段长度 (像素)
 */
export function fenceRailSvg(orientation = "h", length = 76) {
  const l = length;
  if (orientation === "h") {
    // 横向双排立体削皮原木栅栏梁，带有中间立柱加固与木纹倒角
    return `<svg width="${l}" height="14" viewBox="0 0 ${l} 14" class="fence-rail-svg rail-h" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="railTopH" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#dfa56b"/>
          <stop offset="50%" stop-color="#ba7d42"/>
          <stop offset="100%" stop-color="#734217"/>
        </linearGradient>
      </defs>
      <!-- 上梁原木 -->
      <rect x="0" y="1" width="${l}" height="4.5" rx="1.5" fill="url(#railTopH)" stroke="#381b07" stroke-width="0.9"/>
      <line x1="2" y1="2" x2="${l - 2}" y2="2" stroke="#f4d1a8" stroke-width="0.8" opacity="0.85"/>
      <!-- 下梁原木 -->
      <rect x="0" y="8" width="${l}" height="4.5" rx="1.5" fill="url(#railTopH)" stroke="#381b07" stroke-width="0.9"/>
      <line x1="2" y1="9" x2="${l - 2}" y2="9" stroke="#f4d1a8" stroke-width="0.8" opacity="0.85"/>
      <!-- 中间垂直固定短木桩（左右各1/3处） -->
      <rect x="${Math.max(4, Math.round(l * 0.33) - 2)}" y="0" width="4.5" height="14" rx="1.2" fill="#5c3412" stroke="#250f02" stroke-width="0.8"/>
      <rect x="${Math.max(8, Math.round(l * 0.67) - 2)}" y="0" width="4.5" height="14" rx="1.2" fill="#5c3412" stroke="#250f02" stroke-width="0.8"/>
    </svg>`;
  }

  // 纵向双排立体削皮原木栅栏梁
  return `<svg width="14" height="${l}" viewBox="0 0 14 ${l}" class="fence-rail-svg rail-v" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="railTopV" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#dfa56b"/>
        <stop offset="50%" stop-color="#ba7d42"/>
        <stop offset="100%" stop-color="#734217"/>
      </linearGradient>
    </defs>
    <!-- 左竖梁原木 -->
    <rect x="1" y="0" width="4.5" height="${l}" rx="1.5" fill="url(#railTopV)" stroke="#381b07" stroke-width="0.9"/>
    <line x1="2" y1="2" x2="2" y2="${l - 2}" stroke="#f4d1a8" stroke-width="0.8" opacity="0.85"/>
    <!-- 右竖梁原木 -->
    <rect x="8" y="0" width="4.5" height="${l}" rx="1.5" fill="url(#railTopV)" stroke="#381b07" stroke-width="0.9"/>
    <line x1="9" y1="2" x2="9" y2="${l - 2}" stroke="#f4d1a8" stroke-width="0.8" opacity="0.85"/>
    <!-- 中间横向固定短木桩 -->
    <rect x="0" y="${Math.max(4, Math.round(l * 0.33) - 2)}" width="14" height="4.5" rx="1.2" fill="#5c3412" stroke="#250f02" stroke-width="0.8"/>
    <rect x="0" y="${Math.max(8, Math.round(l * 0.67) - 2)}" width="14" height="4.5" rx="1.2" fill="#5c3412" stroke="#250f02" stroke-width="0.8"/>
  </svg>`;
}

/**
 * 未开垦荒地微地貌（立体碎石、杂草丛、拓荒树桩点缀）
 */
export function emptySoilSvg() {
  return `<svg viewBox="0 0 64 64" class="empty-soil-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g filter="drop-shadow(0 1px 1px rgba(0,0,0,0.2))">
      <!-- 拓荒树桩与年轮裂纹 -->
      <ellipse cx="46" cy="46" rx="6" ry="3.8" fill="#8c7858" stroke="#5a4930" stroke-width="0.9"/>
      <ellipse cx="46" cy="46" rx="3.5" ry="2.2" fill="none" stroke="#6f5d41" stroke-width="0.7"/>
      <circle cx="46" cy="46" r="0.8" fill="#463824"/>
      <!-- 立体碎石块 -->
      <polygon points="12,48 18,46 20,50 14,52" fill="#a49372" stroke="#685a42" stroke-width="0.8"/>
      <polygon points="18,46 22,48 20,50" fill="#c0b090"/>
      <ellipse cx="26" cy="51" rx="2.5" ry="1.4" fill="#887656"/>
      <!-- 野生杂草嫩丛与野花点缀 -->
      <path d="M 12 20 Q 15 11 18 18 Q 21 9 24 19" stroke="#7ca358" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M 38 16 Q 41 9 44 17" stroke="#6b9445" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <circle cx="18" cy="10" r="1.5" fill="#f8e36e"/>
    </g>
  </svg>`;
}

/**
 * 农场格背景：木屋、陶屋、石屋材质纹理（2D 扁平模式保留）
 * @param {"wood"|"clay"|"stone"} roomType
 */
export function roomTileSvg(roomType = "wood") {
  if (roomType === "stone") {
    // 沉稳石屋：错落方整花岗岩石块砌筑，带深色凹凸勾缝与微青苔
    return `url("data:image/svg+xml;utf8,<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' fill='%2388909a'/><rect x='1' y='1' width='30' height='14' rx='1' fill='%23adb6c0' stroke='%233e444c' stroke-width='1'/><rect x='33' y='1' width='30' height='14' rx='1' fill='%239ca4ad' stroke='%233e444c' stroke-width='1'/><rect x='1' y='17' width='14' height='14' rx='1' fill='%239ca4ad' stroke='%233e444c' stroke-width='1'/><rect x='17' y='17' width='30' height='14' rx='1' fill='%23c0c8cf' stroke='%233e444c' stroke-width='1'/><rect x='49' y='17' width='14' height='14' rx='1' fill='%2388909a' stroke='%233e444c' stroke-width='1'/><rect x='1' y='33' width='30' height='14' rx='1' fill='%239ca4ad' stroke='%233e444c' stroke-width='1'/><rect x='33' y='33' width='30' height='14' rx='1' fill='%23adb6c0' stroke='%233e444c' stroke-width='1'/><rect x='1' y='49' width='20' height='14' rx='1' fill='%23c0c8cf' stroke='%233e444c' stroke-width='1'/><rect x='23' y='49' width='24' height='14' rx='1' fill='%2388909a' stroke='%233e444c' stroke-width='1'/><rect x='49' y='49' width='14' height='14' rx='1' fill='%239ca4ad' stroke='%233e444c' stroke-width='1'/><circle cx='46' cy='18' r='1.5' fill='%235b7548'/><circle cx='4' cy='48' r='1.5' fill='%235b7548'/></svg>")`;
  }
  if (roomType === "clay") {
    // 德式半木陶屋：赤陶红砖配深色交叉木框架 (Half-timbered / Fachwerk)
    return `url("data:image/svg+xml;utf8,<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' fill='%23c95a38'/><rect x='2' y='2' width='60' height='60' fill='%23e07250'/><line x1='0' y1='32' x2='64' y2='32' stroke='%23482010' stroke-width='4'/><line x1='32' y1='0' x2='32' y2='64' stroke='%23482010' stroke-width='4'/><line x1='0' y1='0' x2='32' y2='32' stroke='%235e2c18' stroke-width='3'/><line x1='32' y1='32' x2='64' y2='0' stroke='%235e2c18' stroke-width='3'/><line x1='0' y1='32' x2='32' y2='64' stroke='%235e2c18' stroke-width='3'/><line x1='32' y1='32' x2='64' y2='64' stroke='%235e2c18' stroke-width='3'/><circle cx='32' cy='32' r='2.5' fill='%23220c04'/></svg>")`;
  }
  // 简朴原木屋：深色橡木长板、年轮木钉与接缝
  return `url("data:image/svg+xml;utf8,<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' fill='%236f4820'/><rect x='0' y='1' width='64' height='14' fill='%23936332'/><rect x='0' y='17' width='64' height='14' fill='%23805328'/><rect x='0' y='33' width='64' height='14' fill='%23936332'/><rect x='0' y='49' width='64' height='14' fill='%23744922'/><line x1='0' y1='15.5' x2='64' y2='15.5' stroke='%23381e08' stroke-width='1.8'/><line x1='0' y1='31.5' x2='64' y2='31.5' stroke='%23381e08' stroke-width='1.8'/><line x1='0' y1='47.5' x2='64' y2='47.5' stroke='%23381e08' stroke-width='1.8'/><circle cx='6' cy='8' r='1.4' fill='%231f1004'/><circle cx='58' cy='8' r='1.4' fill='%231f1004'/><circle cx='8' cy='24' r='1.4' fill='%231f1004'/><circle cx='56' cy='24' r='1.4' fill='%231f1004'/><circle cx='6' cy='40' r='1.4' fill='%231f1004'/><circle cx='58' cy='40' r='1.4' fill='%231f1004'/></svg>")`;
}

/**
 * 3D 实体农舍建筑模型 (Stereoscopic Architectural House Model)
 * 在 2.5D 透视下拔地而起：山墙坡屋顶、受光/背光面、木门、暖光窗棂、烟囱与袅袅青烟
 * @param {"wood"|"clay"|"stone"} roomType
 * @param {boolean} isWinter 是否为冬季
 * @param {number} size 尺寸 (px)
 */
export function roomModelSvg(roomType = "wood", isWinter = false, size = 52) {
  const s = size;
  if (roomType === "stone") {
    // 沉稳花岗岩石砌庄园城堡模型
    return `<svg width="${s}" height="${s}" viewBox="0 0 68 68" class="agri-house-3d house-stone" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stRoofL_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#607182"/>
          <stop offset="100%" stop-color="#3d4955"/>
        </linearGradient>
        <linearGradient id="stRoofR_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#333d47"/>
          <stop offset="100%" stop-color="#20272e"/>
        </linearGradient>
        <linearGradient id="stWall_${s}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#b0b9c2"/>
          <stop offset="100%" stop-color="#737c85"/>
        </linearGradient>
      </defs>
      <g filter="drop-shadow(-3px 5px 4px rgba(20,25,30,0.5))">
        <!-- 地基阴影 -->
        <ellipse cx="34" cy="60" rx="28" ry="7" fill="rgba(15,20,25,0.36)"/>
        <!-- 正面石砌山墙 -->
        <polygon points="34,10 60,26 57,56 11,56 8,26" fill="url(#stWall_${s})" stroke="#2a3036" stroke-width="1.4"/>
        <!-- 花岗岩错落石砖勾缝 -->
        <line x1="11" y1="36" x2="57" y2="36" stroke="#434b54" stroke-width="1"/>
        <line x1="11" y1="46" x2="57" y2="46" stroke="#434b54" stroke-width="1"/>
        <line x1="24" y1="26" x2="24" y2="36" stroke="#434b54" stroke-width="1"/>
        <line x1="44" y1="26" x2="44" y2="36" stroke="#434b54" stroke-width="1"/>
        <line x1="34" y1="36" x2="34" y2="46" stroke="#434b54" stroke-width="1"/>
        <!-- 铁艺拱形城堡厚木门 -->
        <path d="M 27 56 L 27 38 C 27 32, 41 32, 41 38 L 41 56 Z" fill="#2d1c10" stroke="#180e07" stroke-width="1.2"/>
        <circle cx="39" cy="47" r="1.2" fill="#c4a35a"/>
        <!-- 暖光石窗 -->
        <rect x="15" y="38" width="7" height="9" rx="1.5" fill="#f8e79b" stroke="#363e46" stroke-width="1"/>
        <line x1="18.5" y1="38" x2="18.5" y2="47" stroke="#363e46" stroke-width="0.8"/>
        <!-- 顶部石砌大烟囱与升腾微烟 -->
        <rect x="44" y="6" width="6" height="12" fill="#58626c" stroke="#2a3036" stroke-width="1"/>
        <ellipse cx="47" cy="6" rx="3.5" ry="1.2" fill="#363e46"/>
        <path d="M 47 4 Q 50 1 48 -2 Q 45 -5 49 -8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.65"/>
        <!-- 双坡青石屋顶：左坡受光面 -->
        <polygon points="34,7 34,26 5,27 6,8" fill="url(#stRoofL_${s})" stroke="#22282e" stroke-width="1.3"/>
        <!-- 双坡青石屋顶：右坡阴影面 -->
        <polygon points="34,7 62,25 59,28 34,26" fill="url(#stRoofR_${s})" stroke="#191d21" stroke-width="1.3"/>
        <line x1="6" y1="7.5" x2="34" y2="7.5" stroke="#8997a5" stroke-width="2" stroke-linecap="round"/>
        <!-- 冬季白雪屋脊 -->
        ${isWinter ? `<path d="M 5 7.5 Q 20 6 34 7 Q 48 16 62 25" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" fill="none"/>` : ""}
      </g>
    </svg>`;
  }

  if (roomType === "clay") {
    // 德式黑森林半木结构红砖陶屋模型 (Fachwerk)
    return `<svg width="${s}" height="${s}" viewBox="0 0 68 68" class="agri-house-3d house-clay" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clRoofL_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#df5c32"/>
          <stop offset="100%" stop-color="#a43314"/>
        </linearGradient>
        <linearGradient id="clRoofR_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8c2b10"/>
          <stop offset="100%" stop-color="#551505"/>
        </linearGradient>
      </defs>
      <g filter="drop-shadow(-3px 5px 4px rgba(35,15,5,0.48))">
        <!-- 地基阴影 -->
        <ellipse cx="34" cy="60" rx="28" ry="7" fill="rgba(30,12,5,0.32)"/>
        <!-- 奶白灰浆山墙面 -->
        <polygon points="34,10 60,26 57,56 11,56 8,26" fill="#faeed9" stroke="#48220f" stroke-width="1.4"/>
        <!-- 德式黑深色交叉木梁框架 (Fachwerk Beams) -->
        <line x1="10" y1="36" x2="58" y2="36" stroke="#4a2410" stroke-width="2.5"/>
        <line x1="10" y1="56" x2="58" y2="56" stroke="#4a2410" stroke-width="2.5"/>
        <line x1="22" y1="26" x2="22" y2="56" stroke="#4a2410" stroke-width="2"/>
        <line x1="46" y1="26" x2="46" y2="56" stroke="#4a2410" stroke-width="2"/>
        <!-- 交叉人字斜撑 -->
        <line x1="11" y1="36" x2="22" y2="56" stroke="#4a2410" stroke-width="1.8"/>
        <line x1="57" y1="36" x2="46" y2="56" stroke="#4a2410" stroke-width="1.8"/>
        <!-- 红砖小木门 -->
        <rect x="27" y="38" width="14" height="18" fill="#753018" stroke="#361509" stroke-width="1.2"/>
        <circle cx="38" cy="48" r="1.2" fill="#ffd166"/>
        <!-- 绿色百叶小窗 -->
        <rect x="14" y="39" width="6" height="8" fill="#f8e79b" stroke="#3d6830" stroke-width="1"/>
        <rect x="48" y="39" width="6" height="8" fill="#f8e79b" stroke="#3d6830" stroke-width="1"/>
        <!-- 红砖小烟囱 -->
        <rect x="45" y="7" width="5.5" height="11" fill="#b84524" stroke="#4d1607" stroke-width="1"/>
        <!-- 陡峭红陶瓦片屋顶：左坡受光面 -->
        <polygon points="34,7 34,26 5,27 6,8" fill="url(#clRoofL_${s})" stroke="#401407" stroke-width="1.3"/>
        <!-- 右坡阴影面 -->
        <polygon points="34,7 62,25 59,28 34,26" fill="url(#clRoofR_${s})" stroke="#2b0a03" stroke-width="1.3"/>
        <line x1="6" y1="7.5" x2="34" y2="7.5" stroke="#f48c66" stroke-width="2" stroke-linecap="round"/>
        <!-- 冬季白雪屋脊 -->
        ${isWinter ? `<path d="M 5 7.5 Q 20 6 34 7 Q 48 16 62 25" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" fill="none"/>` : ""}
      </g>
    </svg>`;
  }

  // 默认：原木山墙原木屋模型 (Rustic Timber Cottage)
  return `<svg width="${s}" height="${s}" viewBox="0 0 68 68" class="agri-house-3d house-wood" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wdRoofL_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#b67a3f"/>
        <stop offset="100%" stop-color="#7c4a1e"/>
      </linearGradient>
      <linearGradient id="wdRoofR_${s}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#693c16"/>
        <stop offset="100%" stop-color="#3d1f08"/>
      </linearGradient>
      <linearGradient id="wdWall_${s}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#9e6631"/>
        <stop offset="100%" stop-color="#583514"/>
      </linearGradient>
    </defs>
    <g filter="drop-shadow(-3px 5px 4px rgba(30,15,5,0.48))">
      <!-- 地基阴影 -->
      <ellipse cx="34" cy="60" rx="28" ry="7" fill="rgba(25,12,4,0.32)"/>
      <!-- 正面原木堆叠立面 -->
      <polygon points="34,10 60,26 57,56 11,56 8,26" fill="url(#wdWall_${s})" stroke="#361c07" stroke-width="1.4"/>
      <!-- 叠木缝与两侧切角年轮 -->
      <line x1="11" y1="34" x2="57" y2="34" stroke="#3d2209" stroke-width="1.3"/>
      <line x1="11" y1="42" x2="57" y2="42" stroke="#3d2209" stroke-width="1.3"/>
      <line x1="11" y1="50" x2="57" y2="50" stroke="#3d2209" stroke-width="1.3"/>
      <!-- 原木木桩截面圆圈 -->
      <circle cx="10" cy="34" r="2.2" fill="#caa066" stroke="#48270b" stroke-width="0.8"/>
      <circle cx="58" cy="34" r="2.2" fill="#caa066" stroke="#48270b" stroke-width="0.8"/>
      <circle cx="10" cy="42" r="2.2" fill="#caa066" stroke="#48270b" stroke-width="0.8"/>
      <circle cx="58" cy="42" r="2.2" fill="#caa066" stroke="#48270b" stroke-width="0.8"/>
      <circle cx="10" cy="50" r="2.2" fill="#caa066" stroke="#48270b" stroke-width="0.8"/>
      <circle cx="58" cy="50" r="2.2" fill="#caa066" stroke="#48270b" stroke-width="0.8"/>
      <!-- 拱形深橡木门 -->
      <path d="M 26 56 L 26 36 C 26 31, 42 31, 42 36 L 42 56 Z" fill="#2d1607" stroke="#48240b" stroke-width="1.2"/>
      <circle cx="39" cy="46" r="1.2" fill="#ffd166"/>
      <!-- 暖光小木窗 -->
      <rect x="15" y="38" width="6.5" height="7.5" rx="1" fill="#ffeaa7" stroke="#48240b" stroke-width="1"/>
      <!-- 石砌烟囱与袅袅烟雾 -->
      <rect x="44" y="6" width="6" height="12" fill="#757f88" stroke="#384046" stroke-width="1"/>
      <path d="M 47 4 Q 50 1 48 -2 Q 45 -5 49 -8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/>
      <!-- 人字形双坡原木屋顶：左坡受光面 -->
      <polygon points="34,7 34,26 5,27 6,8" fill="url(#wdRoofL_${s})" stroke="#2b1404" stroke-width="1.3"/>
      <!-- 右坡阴影面 -->
      <polygon points="34,7 62,25 59,28 34,26" fill="url(#wdRoofR_${s})" stroke="#1f0d02" stroke-width="1.3"/>
      <line x1="6" y1="7.5" x2="34" y2="7.5" stroke="#dcb074" stroke-width="2.2" stroke-linecap="round"/>
      <!-- 冬季白雪屋脊 -->
      ${isWinter ? `<path d="M 5 7.5 Q 20 6 34 7 Q 48 16 62 25" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" fill="none"/>` : ""}
    </g>
  </svg>`;
}

/**
 * 农田犁沟背景与生长的作物立体模型 (Clean & Realistic Flat Soil Plots with Upright Crops)
 * @param {"grain"|"vegetable"|null} crop 作物类型
 * @param {number} markers 剩余收获轮次 (1/2/3)
 */
export function fieldContentSvg(crop = null, markers = 0) {
  if (!crop || markers <= 0) {
    // 翻好的深色肥沃整齐犁田（未播种）：平整规整的深棕耕犁泥垄 + 中间一小株破土嫩芽
    return `<div class="field-soil-wrap">
      <svg viewBox="0 0 48 48" class="field-soil-flat" xmlns="http://www.w3.org/2000/svg">
        <!-- 规整平整的四道直犁垄线，平铺于地表 -->
        <rect x="2" y="2" width="44" height="44" rx="2" fill="#38200b"/>
        <line x1="3" y1="9" x2="45" y2="9" stroke="#523114" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="3" y1="11" x2="45" y2="11" stroke="#221204" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="3" y1="19" x2="45" y2="19" stroke="#523114" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="3" y1="21" x2="45" y2="21" stroke="#221204" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="3" y1="29" x2="45" y2="29" stroke="#523114" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="3" y1="31" x2="45" y2="31" stroke="#221204" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="3" y1="39" x2="45" y2="39" stroke="#523114" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="3" y1="41" x2="45" y2="41" stroke="#221204" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div class="field-sprout-billboard">
        <svg viewBox="0 0 24 24" class="field-sprout-svg" xmlns="http://www.w3.org/2000/svg">
          <g filter="drop-shadow(0 2px 2px rgba(0,0,0,0.5))">
            <path d="M 12 21 L 12 11" stroke="#488628" stroke-width="2" stroke-linecap="round"/>
            <path d="M 12 11 C 7 8, 5 13, 7 17 C 10 17, 11 13, 12 11 Z" fill="#69db7c"/>
            <path d="M 12 11 C 17 8, 19 13, 17 17 C 14 17, 13 13, 12 11 Z" fill="#51cf66"/>
          </g>
        </svg>
      </div>
    </div>`;
  }

  if (crop === "grain") {
    // 生长中的茂密立体金黄麦浪田！
    const tiers = [];
    if (markers >= 1) tiers.push({ cx: 24, cy: 22, sc: 1.05, rot: 0 });
    if (markers >= 2) tiers.push({ cx: 14, cy: 25, sc: 0.85, rot: -7 });
    if (markers >= 3) tiers.push({ cx: 34, cy: 25, sc: 0.85, rot: 7 });

    return `<div class="field-crops-wrap">
      <svg viewBox="0 0 48 48" class="field-crop-svg wheat-field-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wheatGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fff085"/>
            <stop offset="45%" stop-color="#fab005"/>
            <stop offset="100%" stop-color="#a66a00"/>
          </linearGradient>
          <linearGradient id="wheatStem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e5a11c"/>
            <stop offset="100%" stop-color="#734907"/>
          </linearGradient>
        </defs>
        ${tiers.map(t => `
          <g transform="translate(${t.cx}, ${t.cy}) rotate(${t.rot}) scale(${t.sc * 0.7})" filter="drop-shadow(0 2px 2px rgba(30,15,0,0.45))">
            <!-- 麦秆束身 -->
            <path d="M -8 18 Q -3 6 0 -8" stroke="url(#wheatStem)" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M 0 20 Q 0 6 0 -10" stroke="url(#wheatStem)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            <path d="M 8 18 Q 3 6 0 -8" stroke="url(#wheatStem)" stroke-width="2" stroke-linecap="round" fill="none"/>
            <!-- 左右饱满麦穗颗粒与金色麦芒 -->
            <ellipse cx="-6" cy="3" rx="3.2" ry="5.5" transform="rotate(-30 -6 3)" fill="url(#wheatGold)"/>
            <ellipse cx="6" cy="3" rx="3.2" ry="5.5" transform="rotate(30 6 3)" fill="url(#wheatGold)"/>
            <ellipse cx="-4" cy="-3" rx="3" ry="5.2" transform="rotate(-28 -4 -3)" fill="url(#wheatGold)"/>
            <ellipse cx="4" cy="-3" rx="3" ry="5.2" transform="rotate(28 4 -3)" fill="url(#wheatGold)"/>
            <ellipse cx="0" cy="-10" rx="2.8" ry="5" fill="url(#wheatGold)"/>
            <!-- 麦穗顶芒针线 -->
            <line x1="-6" y1="0" x2="-10" y2="-6" stroke="#ffe066" stroke-width="1" stroke-linecap="round"/>
            <line x1="6" y1="0" x2="10" y2="-6" stroke="#ffe066" stroke-width="1" stroke-linecap="round"/>
            <line x1="0" y1="-12" x2="0" y2="-19" stroke="#ffe066" stroke-width="1.2" stroke-linecap="round"/>
          </g>
        `).join("")}
      </svg>
      <span class="crop-harvest-badge">剩余 ${markers} 次</span>
    </div>`;
  }

  // crop === "vegetable": 垄土上半露出饱满的橙红胡萝卜头，顶上茂密羽状绿缨
  const roots = [];
  if (markers >= 1) roots.push({ cx: 24, cy: 25, sc: 1.0 });
  if (markers >= 2) roots.push({ cx: 14, cy: 28, sc: 0.85 });

  return `<div class="field-crops-wrap">
    <svg viewBox="0 0 48 48" class="field-crop-svg carrot-patch-3d" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="carrotOrange" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffa94d"/>
          <stop offset="45%" stop-color="#fd7e14"/>
          <stop offset="100%" stop-color="#d9480f"/>
        </linearGradient>
      </defs>
      ${roots.map(r => `
        <g transform="translate(${r.cx}, ${r.cy}) scale(${r.sc * 0.75})" filter="drop-shadow(0 2px 2px rgba(35,15,5,0.4))">
          <!-- 茂密羽状绿缨叶片 -->
          <path d="M 0 -2 Q -9 -14 -6 -20 Q -2 -12 0 -2" fill="#40c057"/>
          <path d="M 0 -2 Q 0 -18 2 -22 Q 4 -14 0 -2" fill="#51cf66"/>
          <path d="M 0 -2 Q 9 -14 6 -20 Q 2 -12 0 -2" fill="#37b24d"/>
          <!-- 泥土里露出的粗壮胡萝卜头 -->
          <path d="M -7 0 C -7 -2, 7 -2, 7 0 C 6 8, 3 17, 0 22 C -3 17, -6 8, -7 0 Z" fill="url(#carrotOrange)" stroke="#802100" stroke-width="1"/>
          <line x1="-4" y1="4" x2="3" y2="4" stroke="#a43306" stroke-width="1"/>
          <line x1="-3" y1="9" x2="2" y2="9" stroke="#a43306" stroke-width="1"/>
        </g>
      `).join("")}
    </svg>
    <span class="crop-harvest-badge">剩余 ${markers} 次</span>
  </div>`;
}

/**
 * 经典农事版画行动图标 (17th Century Woodcut Action Icons)
 * @param {string} id 行动空间 ID (PlowField, SowOrBake, BuildRoom, StartPlayer, Fences, Renovate, BuildMajor, etc.)
 * @param {number} size 尺寸 (px)
 */
export function actionWoodcutSvg(id, size = 32) {
  const s = size;
  switch (id) {
    case "PlowField":
      // 马拉中世纪深翻木犁
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M 6 16 L 24 24 L 40 20"/>
          <path d="M 24 24 L 20 38"/>
          <path d="M 16 38 L 32 38"/>
          <path d="M 24 24 L 34 36"/>
          <path d="M 6 32 C 12 36, 20 38, 28 36"/>
        </g>
      </svg>`;

    case "SowOrBake":
      // 交叉的麦穗与柴窑烤面包长木铲
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <line x1="8" y1="40" x2="38" y2="10"/>
          <ellipse cx="38" cy="10" rx="6" ry="4" transform="rotate(-45 38 10)"/>
          <line x1="10" y1="10" x2="38" y2="38"/>
          <path d="M 10 10 L 16 12 L 12 16 Z" fill="currentColor"/>
          <path d="M 16 16 L 22 18 L 18 22 Z" fill="currentColor"/>
          <path d="M 22 22 L 28 24 L 24 28 Z" fill="currentColor"/>
        </g>
      </svg>`;

    case "BuildRoom":
      // 中欧山墙式原木谷仓农房
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <polygon points="24,6 42,20 6,20" fill="rgba(192,73,47,0.15)"/>
          <rect x="10" y="20" width="28" height="22"/>
          <rect x="20" y="28" width="8" height="14" fill="currentColor" opacity="0.3"/>
          <line x1="10" y1="31" x2="38" y2="31"/>
          <line x1="24" y1="6" x2="24" y2="20"/>
        </g>
      </svg>`;

    case "StartPlayer":
      // 晨鸣报晓的大公鸡风向标 / 原木木雕
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <circle cx="24" cy="24" r="18" stroke-dasharray="3 3"/>
          <path d="M 24 10 Q 30 16 32 22 Q 38 22 36 28 C 34 32, 28 34, 24 34 C 18 34, 14 30, 16 24 C 14 20, 18 12, 24 10 Z" fill="rgba(217,164,65,0.2)"/>
          <polygon points="12,22 8,24 12,26" fill="currentColor"/>
          <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
        </g>
      </svg>`;

    case "Fences":
      // 双排十字咬合的立体原木栅栏
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none">
          <line x1="6" y1="18" x2="42" y2="18"/>
          <line x1="6" y1="30" x2="42" y2="30"/>
          <line x1="12" y1="10" x2="12" y2="38" stroke-width="3"/>
          <line x1="24" y1="10" x2="24" y2="38" stroke-width="3"/>
          <line x1="36" y1="10" x2="36" y2="38" stroke-width="3"/>
        </g>
      </svg>`;

    case "FamilyGrowth":
      // 温暖的手工实木婴儿摇篮
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M 8 18 L 40 18 L 34 32 L 14 32 Z" fill="rgba(92,141,78,0.15)"/>
          <path d="M 8 36 Q 24 44 40 36"/>
          <line x1="14" y1="32" x2="14" y2="38"/>
          <line x1="34" y1="32" x2="34" y2="38"/>
          <path d="M 12 18 Q 18 10 24 18"/>
        </g>
      </svg>`;

    case "Renovate":
      // 泥瓦匠方铲与木匠斧头
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <line x1="10" y1="38" x2="32" y2="16"/>
          <polygon points="32,16 38,10 44,16 38,22" fill="currentColor" opacity="0.3"/>
          <line x1="36" y1="38" x2="18" y2="20"/>
          <path d="M 14 16 L 22 24 L 20 28 L 10 20 Z" fill="currentColor"/>
        </g>
      </svg>`;

    case "BuildMajor":
      // 带烟囱与温热火苗的古典壁炉
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <rect x="8" y="14" width="32" height="28" rx="2"/>
          <path d="M 16 42 Q 16 26 24 26 Q 32 26 32 42 Z" fill="rgba(192,73,47,0.2)"/>
          <path d="M 22 36 Q 24 30 25 36 Q 26 32 27 36" stroke="#c0492f" stroke-width="2"/>
          <rect x="14" y="6" width="6" height="8"/>
        </g>
      </svg>`;

    case "Fishing":
      // 传统竹编鱼篓与跃起的鳟鱼
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M 8 28 C 14 18, 34 18, 40 28 C 34 38, 14 38, 8 28 Z" fill="rgba(77,127,163,0.15)"/>
          <polygon points="40,28 46,22 46,34" fill="currentColor" opacity="0.4"/>
          <circle cx="16" cy="28" r="1.5" fill="currentColor"/>
          <path d="M 20 28 Q 26 24 32 28"/>
        </g>
      </svg>`;

    case "DayLaborer":
      // 双手搬运与工时计时
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <circle cx="24" cy="24" r="16"/>
          <polyline points="24,14 24,24 32,24"/>
          <line x1="8" y1="40" x2="40" y2="40" stroke-width="3"/>
        </g>
      </svg>`;

    case "GatherFuel":
      // 沼泽泥炭铲
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <line x1="16" y1="8" x2="32" y2="34"/>
          <polygon points="28,28 38,32 32,42 22,38" fill="currentColor" opacity="0.3"/>
          <line x1="12" y1="8" x2="20" y2="8" stroke-width="2.5"/>
        </g>
      </svg>`;

    case "CutMeadow":
      // 长柄割草大镰刀 (Austrian Scythe)
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M 12 40 L 32 10" stroke-width="2.5"/>
          <path d="M 32 10 Q 44 8 42 22" stroke-width="3" stroke-linecap="round"/>
          <line x1="20" y1="28" x2="25" y2="25"/>
        </g>
      </svg>`;

    case "ReclaimMoor":
      // 破土开荒十字镐
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" class="act-woodcut" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <line x1="12" y1="36" x2="36" y2="12" stroke-width="2.5"/>
          <path d="M 26 6 Q 38 10 42 22 Q 30 18 26 6 Z" fill="currentColor" opacity="0.35"/>
        </g>
      </svg>`;

    // ---- 累积资源格：直接复用实体 Token（原木/陶砖/芦苇/石块/麦穗/萝卜） ----
    case "Wood": return tokenSvg("wood", s);
    case "Clay": return tokenSvg("clay", s);
    case "Reed": return tokenSvg("reed", s);
    case "Stone": return tokenSvg("stone", s);
    case "Grain": return tokenSvg("grain", s);
    case "Vegetable": return tokenSvg("vegetable", s);

    // ---- 动物市场：复用木雕动物米普 ----
    case "Sheep": return animalSvg("sheep", s);
    case "Boar": return animalSvg("boar", s);
    case "Cattle": return animalSvg("cattle", s);

    default:
      return `<span style="font-size:${s}px">⚡</span>`;
  }
}

/**
 * 经典大发展设施专属版画徽章 (Major Improvements Woodcut Art)
 * 8 大主力工坊设施：水井、壁炉、烹饪灶、陶土烤炉、石烤炉、木工坊、陶工坊、制篮工坊
 * @param {string} id
 * @param {number} size 尺寸 (px)
 */
export function majorImprovementSvg(id, size = 44) {
  const s = size;
  switch (id) {
    case "Well":
      // 水井：石砌圆井、木制支架摇臂与悬吊水桶
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-well" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wellStone" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#9aa2ab"/>
            <stop offset="100%" stop-color="#646b74"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(20,25,30,0.35))">
          <!-- 井顶遮雨木棚 -->
          <polygon points="26,6 46,18 42,21 26,11 10,21 6,18" fill="#7a4b22" stroke="#3d2109" stroke-width="1.2"/>
          <!-- 木支柱与辘轳横梁 -->
          <line x1="12" y1="19" x2="12" y2="35" stroke="#543011" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="40" y1="19" x2="40" y2="35" stroke="#543011" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="12" y1="21" x2="40" y2="21" stroke="#543011" stroke-width="2"/>
          <!-- 吊绳与提水木桶 -->
          <line x1="26" y1="21" x2="26" y2="29" stroke="#bda574" stroke-width="1.4"/>
          <rect x="23" y="29" width="6" height="7" rx="1" fill="#8c5826" stroke="#3b1f07" stroke-width="0.8"/>
          <!-- 圆形石砌井台 -->
          <ellipse cx="26" cy="38" rx="18" ry="8" fill="url(#wellStone)" stroke="#393e45" stroke-width="1.3"/>
          <ellipse cx="26" cy="37" rx="12" ry="4.5" fill="#324956" stroke="#222b30" stroke-width="1"/>
          <!-- 井水水光 -->
          <ellipse cx="26" cy="37.5" rx="8" ry="2.5" fill="#5c879d" opacity="0.85"/>
        </g>
      </svg>`;

    case "Fireplace_2":
    case "Fireplace_3":
      // 壁炉：厚重石砌火塘、铁艺吊钩与跃动的红炭火苗
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-fireplace" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fpStone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#8f5038"/>
            <stop offset="100%" stop-color="#5a2e1d"/>
          </linearGradient>
          <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ff3e00"/>
            <stop offset="50%" stop-color="#ff9900"/>
            <stop offset="100%" stop-color="#ffee55"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(40,15,5,0.4))">
          <!-- 外部石造拱形炉体 -->
          <path d="M 10 44 L 10 20 Q 10 10 26 10 Q 42 10 42 20 L 42 44 Z" fill="url(#fpStone)" stroke="#381b10" stroke-width="1.4"/>
          <!-- 内膛黑色炭坑 -->
          <path d="M 16 44 L 16 26 Q 16 18 26 18 Q 36 18 36 26 L 36 44 Z" fill="#24120a"/>
          <!-- 炉火 -->
          <path d="M 21 42 Q 22 30 26 24 Q 30 30 31 42 Q 26 38 21 42 Z" fill="url(#fireGrad)"/>
          <circle cx="26" cy="32" r="3" fill="#ffffff" opacity="0.75"/>
          <!-- 烟囱顶部石梁 -->
          <rect x="8" y="8" width="36" height="5" rx="1.5" fill="#4d2414" stroke="#2a1006" stroke-width="1"/>
        </g>
      </svg>`;

    case "CookingHearth_4":
    case "CookingHearth_5":
      // 烹饪灶：专业铸铁烹饪台、双耳大炖锅与升腾香气
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-hearth" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(1px 2px 2px rgba(30,20,10,0.4))">
          <!-- 灶台底座 -->
          <rect x="8" y="24" width="36" height="20" rx="3" fill="#a44c32" stroke="#542012" stroke-width="1.4"/>
          <rect x="13" y="32" width="26" height="12" rx="1.5" fill="#32140a"/>
          <!-- 灶底火炭 -->
          <circle cx="20" cy="38" r="2" fill="#ff6b00"/>
          <circle cx="26" cy="37" r="2.5" fill="#ffbb00"/>
          <circle cx="32" cy="38" r="2" fill="#ff6b00"/>
          <!-- 铸铁大炖锅 -->
          <path d="M 16 24 C 16 16, 36 16, 36 24 Z" fill="#454c54" stroke="#22272c" stroke-width="1.3"/>
          <ellipse cx="26" cy="18" rx="10" ry="2" fill="#58626c"/>
          <line x1="14" y1="20" x2="16" y2="20" stroke="#22272c" stroke-width="2"/>
          <line x1="36" y1="20" x2="38" y2="20" stroke="#22272c" stroke-width="2"/>
          <!-- 蒸腾热气波浪线 -->
          <path d="M 22 14 Q 20 10 23 6" stroke="#f1d08a" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.85"/>
          <path d="M 29 13 Q 32 9 29 5" stroke="#f1d08a" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.85"/>
        </g>
      </svg>`;

    case "ClayOven":
      // 陶土烤炉：圆形红泥柴火穹顶窑，散发出烘烤香气
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-clayoven" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="clayDome" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e06943"/>
            <stop offset="100%" stop-color="#9a3c1c"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(40,15,5,0.4))">
          <!-- 泥窑底座 -->
          <rect x="10" y="38" width="32" height="6" rx="2" fill="#753018" stroke="#40180a" stroke-width="1.2"/>
          <!-- 半球形红陶圆顶 -->
          <path d="M 12 38 C 12 18, 40 18, 40 38 Z" fill="url(#clayDome)" stroke="#521f0e" stroke-width="1.4"/>
          <!-- 拱形烤口 -->
          <path d="M 20 38 L 20 28 C 20 23, 32 23, 32 28 L 32 38 Z" fill="#2d1208" stroke="#ff8c42" stroke-width="1"/>
          <!-- 炉内面包暖光 -->
          <ellipse cx="26" cy="34" rx="4" ry="2" fill="#ffd166"/>
        </g>
      </svg>`;

    case "StoneOven":
      // 石烤炉：双层厚重石砌烘焙巨窑，带长柄木质烤面包铲
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-stoneoven" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="soStone" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a4acb5"/>
            <stop offset="100%" stop-color="#646b73"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(25,25,30,0.4))">
          <!-- 方石外立面 -->
          <rect x="8" y="14" width="36" height="30" rx="3" fill="url(#soStone)" stroke="#393e44" stroke-width="1.4"/>
          <line x1="8" y1="28" x2="44" y2="28" stroke="#393e44" stroke-width="1"/>
          <!-- 拱门石圈 -->
          <path d="M 17 40 L 17 26 C 17 20, 35 20, 35 26 L 35 40 Z" fill="#202428" stroke="#525b63" stroke-width="1.2"/>
          <!-- 炉火暖光 -->
          <ellipse cx="26" cy="35" rx="5" ry="2.5" fill="#f4a261"/>
          <!-- 依靠在旁的烤面包长木铲 -->
          <line x1="39" y1="8" x2="44" y2="42" stroke="#875323" stroke-width="2" stroke-linecap="round"/>
          <ellipse cx="38" cy="11" rx="3" ry="4.5" transform="rotate(-15 38 11)" fill="#b07d46" stroke="#5c3411" stroke-width="0.8"/>
        </g>
      </svg>`;

    case "Joinery":
      // 木工坊：手工角尺、木工刨刀与原木年轮
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-joinery" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(1px 2px 2px rgba(35,20,5,0.4))">
          <!-- 工作木台 -->
          <rect x="8" y="30" width="36" height="14" rx="2" fill="#845528" stroke="#482b12" stroke-width="1.3"/>
          <line x1="14" y1="36" x2="14" y2="44" stroke="#482b12" stroke-width="2"/>
          <line x1="38" y1="36" x2="38" y2="44" stroke="#482b12" stroke-width="2"/>
          <!-- 木工刨刀 -->
          <polygon points="14,24 30,24 28,30 12,30" fill="#c49764" stroke="#503112" stroke-width="1"/>
          <rect x="22" y="19" width="3.5" height="5" fill="#3c4349"/>
          <!-- 手摇钻/角尺 -->
          <path d="M 32 10 L 44 22 L 40 25 L 34 19 L 34 26 L 30 26 Z" fill="#d9a441" stroke="#684a14" stroke-width="1"/>
        </g>
      </svg>`;

    case "Pottery":
      // 陶工坊：旋转陶轮底座与刚刚拉胚成型的红陶双耳花瓶
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-pottery" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="potGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e2704b"/>
            <stop offset="100%" stop-color="#a43e20"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(40,15,5,0.4))">
          <!-- 陶轮飞轮底盘 -->
          <ellipse cx="26" cy="40" rx="18" ry="5" fill="#69717a" stroke="#363b40" stroke-width="1.3"/>
          <ellipse cx="26" cy="38" rx="12" ry="3.5" fill="#939ca6"/>
          <!-- 优雅红陶花瓶 -->
          <path d="M 21 16 L 31 16 C 31 22, 37 25, 34 32 C 32 36, 20 36, 18 32 C 15 25, 21 22, 21 16 Z" fill="url(#potGrad)" stroke="#5c1f0d" stroke-width="1.3"/>
          <ellipse cx="26" cy="16" rx="5" ry="1.5" fill="#f89370"/>
        </g>
      </svg>`;

    case "BasketmakersWorkshop":
      // 制篮工坊：精细手工编结的芦苇柳条双提梁菜篮
      return `<svg width="${s}" height="${s}" viewBox="0 0 52 52" class="major-art art-basket" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="basketReed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d6b885"/>
            <stop offset="100%" stop-color="#997843"/>
          </linearGradient>
        </defs>
        <g filter="drop-shadow(1px 2px 2px rgba(35,30,10,0.4))">
          <!-- 提手藤圈 -->
          <path d="M 16 26 C 16 10, 36 10, 36 26" stroke="#7a5a29" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <!-- 篮身梯形轮廓 -->
          <polygon points="12,24 40,24 35,42 17,42" fill="url(#basketReed)" stroke="#583f19" stroke-width="1.4"/>
          <!-- 经纬编织十字花纹 -->
          <line x1="14" y1="30" x2="38" y2="30" stroke="#684c22" stroke-width="1.2"/>
          <line x1="15" y1="36" x2="37" y2="36" stroke="#684c22" stroke-width="1.2"/>
          <line x1="22" y1="24" x2="20" y2="42" stroke="#684c22" stroke-width="1.2"/>
          <line x1="26" y1="24" x2="26" y2="42" stroke="#684c22" stroke-width="1.2"/>
          <line x1="30" y1="24" x2="32" y2="42" stroke="#684c22" stroke-width="1.2"/>
        </g>
      </svg>`;

    default:
      return `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#d9a441"/></svg>`;
  }
}

/**
 * 7 大职业流派中世纪古典火漆印章徽饰 (Occ Genre Seals)
 * 替代系统 Emoji，统一德式版画风
 * @param {"resource"|"farming"|"livestock"|"building"|"cooking"|"family"|"prestige"} category
 * @param {number} size 尺寸 (px)
 */
export function categorySealSvg(category, size = 20) {
  const s = size;
  let glyph = "";
  let bg = "#6b5030";

  switch (category) {
    case "resource":
      bg = "#5a432b";
      glyph = `<path d="M 8 18 L 18 8 M 12 6 L 20 14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;
      break;
    case "farming":
      bg = "#47703c";
      glyph = `<path d="M 8 18 Q 14 10 18 6 Q 16 14 8 18 Z" fill="#ffffff"/>`;
      break;
    case "livestock":
      bg = "#804e28";
      glyph = `<path d="M 6 12 Q 10 6 14 12 Q 18 6 22 12" stroke="#ffffff" stroke-width="2" fill="none"/>`;
      break;
    case "building":
      bg = "#9c3822";
      glyph = `<polygon points="12,6 20,12 4,12" fill="#ffffff"/><rect x="7" y="12" width="10" height="7" fill="#ffffff"/>`;
      break;
    case "cooking":
      bg = "#a86820";
      glyph = `<circle cx="12" cy="14" r="5" fill="#ffffff"/><path d="M 9 9 Q 12 6 15 9" stroke="#ffffff" stroke-width="1.5" fill="none"/>`;
      break;
    case "family":
      bg = "#4d7fa3";
      glyph = `<circle cx="12" cy="9" r="3" fill="#ffffff"/><path d="M 7 19 C 7 14, 17 14, 17 19 Z" fill="#ffffff"/>`;
      break;
    case "prestige":
      bg = "#8a2a1e";
      glyph = `<polygon points="12,5 14,10 19,10 15,13 17,18 12,15 7,18 9,13 5,10 10,10" fill="#f8d648"/>`;
      break;
    default:
      bg = "#555555";
      glyph = `<circle cx="12" cy="12" r="4" fill="#ffffff"/>`;
  }

  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" class="genre-seal genre-${category}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10.5" fill="${bg}" stroke="#ffffff" stroke-width="1" stroke-opacity="0.45" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))"/>
    ${glyph}
  </svg>`;
}

