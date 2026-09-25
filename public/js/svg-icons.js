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
      // 燃料（Farmers of the Moor）：切块深黑泥炭块堆叠
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
      // 干草（Farmers of the Moor）：扎绑好的长方形金黄干草捆
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
 * 农场格背景：木屋、陶屋、石屋材质纹理
 * @param {"wood"|"clay"|"stone"} roomType
 */
export function roomTileSvg(roomType = "wood") {
  if (roomType === "stone") {
    // 沉稳石屋：错落方整花岗岩石块砌筑，带勾缝
    return `url("data:image/svg+xml;utf8,<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' fill='%239ca4ae'/><rect x='1' y='1' width='30' height='14' rx='1' fill='%23b4bcc6' stroke='%23484f58' stroke-width='0.9'/><rect x='33' y='1' width='30' height='14' rx='1' fill='%238a929c' stroke='%23484f58' stroke-width='0.9'/><rect x='1' y='17' width='14' height='14' rx='1' fill='%23a4acb6' stroke='%23484f58' stroke-width='0.9'/><rect x='17' y='17' width='30' height='14' rx='1' fill='%23c2cacf' stroke='%23484f58' stroke-width='0.9'/><rect x='49' y='17' width='14' height='14' rx='1' fill='%238a929c' stroke='%23484f58' stroke-width='0.9'/><rect x='1' y='33' width='30' height='14' rx='1' fill='%238a929c' stroke='%23484f58' stroke-width='0.9'/><rect x='33' y='33' width='30' height='14' rx='1' fill='%23a4acb6' stroke='%23484f58' stroke-width='0.9'/><rect x='1' y='49' width='20' height='14' rx='1' fill='%23c2cacf' stroke='%23484f58' stroke-width='0.9'/><rect x='23' y='49' width='24' height='14' rx='1' fill='%238a929c' stroke='%23484f58' stroke-width='0.9'/><rect x='49' y='49' width='14' height='14' rx='1' fill='%23b4bcc6' stroke='%23484f58' stroke-width='0.9'/></svg>")`;
  }
  if (roomType === "clay") {
    // 德式半木陶屋：赤陶红砖配深色交叉木框架 (Half-timbered)
    return `url("data:image/svg+xml;utf8,<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' fill='%23d97555'/><rect x='2' y='2' width='60' height='60' fill='%23eb8a6a'/><line x1='0' y1='32' x2='64' y2='32' stroke='%23542a18' stroke-width='4'/><line x1='32' y1='0' x2='32' y2='64' stroke='%23542a18' stroke-width='4'/><line x1='0' y1='0' x2='32' y2='32' stroke='%236e3922' stroke-width='3'/><line x1='32' y1='32' x2='64' y2='0' stroke='%236e3922' stroke-width='3'/><circle cx='32' cy='32' r='2' fill='%232b1308'/></svg>")`;
  }
  // 简朴木屋：横向深色橡木长板，带木板缝与铸铁钉
  return `url("data:image/svg+xml;utf8,<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' fill='%237a542b'/><rect x='0' y='1' width='64' height='14' fill='%239e703f'/><rect x='0' y='17' width='64' height='14' fill='%238c6235'/><rect x='0' y='33' width='64' height='14' fill='%239e703f'/><rect x='0' y='49' width='64' height='14' fill='%237d552b'/><line x1='0' y1='15.5' x2='64' y2='15.5' stroke='%23402710' stroke-width='1.5'/><line x1='0' y1='31.5' x2='64' y2='31.5' stroke='%23402710' stroke-width='1.5'/><line x1='0' y1='47.5' x2='64' y2='47.5' stroke='%23402710' stroke-width='1.5'/><circle cx='6' cy='8' r='1.2' fill='%23261608'/><circle cx='58' cy='8' r='1.2' fill='%23261608'/><circle cx='8' cy='24' r='1.2' fill='%23261608'/><circle cx='56' cy='24' r='1.2' fill='%23261608'/><circle cx='6' cy='40' r='1.2' fill='%23261608'/><circle cx='58' cy='40' r='1.2' fill='%23261608'/></svg>")`;
}

/**
 * 农田犁沟背景与生长的作物矢量图
 * @param {"grain"|"vegetable"|null} crop 作物类型
 * @param {number} markers 剩余收获轮次 (1/2/3)
 */
export function fieldContentSvg(crop = null, markers = 0) {
  if (!crop || markers <= 0) {
    // 翻好的肥沃犁田（未播种）：带有泥土犁沟与一颗破土小萌芽
    return `<div class="field-soil-wrap">
      <svg viewBox="0 0 60 60" class="field-sprout-svg" xmlns="http://www.w3.org/2000/svg">
        <path d="M 28 44 Q 30 32 30 26" stroke="#488628" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 30 26 C 24 24, 20 28, 22 34 C 27 34, 29 30, 30 26 Z" fill="#69db7c"/>
        <path d="M 30 26 C 36 22, 40 24, 38 30 C 34 32, 31 28, 30 26 Z" fill="#51cf66"/>
      </svg>
    </div>`;
  }

  if (crop === "grain") {
    // 生长中的谷物：根据剩余 markers 数量（1~3）渲染成排饱满麦穗
    const ears = [];
    if (markers >= 1) ears.push({ cx: 30, cy: 30, sc: 1.1 });
    if (markers >= 2) ears.push({ cx: 18, cy: 33, sc: 0.9 });
    if (markers >= 3) ears.push({ cx: 42, cy: 33, sc: 0.9 });

    return `<div class="field-crops-wrap">
      <svg viewBox="0 0 60 60" class="field-crop-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cropGrain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffe066"/>
            <stop offset="60%" stop-color="#fab005"/>
            <stop offset="100%" stop-color="#b27300"/>
          </linearGradient>
        </defs>
        ${ears.map(e => `
          <g transform="translate(${e.cx - 15}, ${e.cy - 20}) scale(${e.sc * 0.65})">
            <path d="M 12 40 C 18 32, 26 22, 34 10" stroke="#af740b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            <ellipse cx="20" cy="27" rx="3" ry="5.5" transform="rotate(-35 20 27)" fill="url(#cropGrain)"/>
            <ellipse cx="25" cy="23" rx="3" ry="5.5" transform="rotate(35 25 23)" fill="url(#cropGrain)"/>
            <ellipse cx="24" cy="21" rx="3" ry="5.5" transform="rotate(-35 24 21)" fill="url(#cropGrain)"/>
            <ellipse cx="29" cy="17" rx="3" ry="5.5" transform="rotate(35 29 17)" fill="url(#cropGrain)"/>
            <ellipse cx="33" cy="11" rx="2.5" ry="4.8" transform="rotate(30 33 11)" fill="url(#cropGrain)"/>
          </g>
        `).join("")}
      </svg>
      <span class="crop-harvest-badge">剩余 ${markers} 次</span>
    </div>`;
  }

  // crop === "vegetable": 根部半埋在土里的胡萝卜带绿缨
  const roots = [];
  if (markers >= 1) roots.push({ cx: 24, cy: 30 });
  if (markers >= 2) roots.push({ cx: 36, cy: 32 });

  return `<div class="field-crops-wrap">
    <svg viewBox="0 0 60 60" class="field-crop-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cropVeg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff922b"/>
          <stop offset="100%" stop-color="#d9480f"/>
        </linearGradient>
      </defs>
      ${roots.map(r => `
        <g transform="translate(${r.cx - 12}, ${r.cy - 16}) scale(0.65)">
          <path d="M 18 10 C 22 5, 26 2, 24 0 C 21 2, 18 6, 17 9 Z" fill="#40c057"/>
          <path d="M 15 10 C 13 4, 11 1, 9 2 C 10 5, 12 7, 13 10 Z" fill="#37b24d"/>
          <path d="M 21 9 C 23 13, 20 15, 17 20 C 13 25, 8 32, 6 34 C 7 24, 13 13, 17 9 Z" fill="url(#cropVeg)" stroke="#802100" stroke-width="0.8"/>
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
