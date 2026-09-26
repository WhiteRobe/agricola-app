import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../src/game/dlc.ts", import.meta.url), "utf8");
const cards = ["OCCUPATIONS", "MINOR_IMPROVEMENTS"].map((name) => {
  const match = source.match(new RegExp(`export const ${name}: [^=]+ = (\\[[\\s\\S]*?\\n\\]);`));
  if (!match) throw new Error(`找不到 ${name} 卡牌数据`);
  return `export const ${name} = ${match[1]};`;
});

writeFileSync(
  new URL("../public/js/dlc-data.js", import.meta.url),
  `// 由 scripts/sync-dlc.mjs 从 src/game/dlc.ts 生成，请勿手工修改。\n${cards.join("\n\n")}\n`,
);
