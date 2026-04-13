#!/usr/bin/env node
/**
 * build-pinyin-dict.js
 *
 * Generates src/pinyin-dict.js from the full CJK Unified Ideographs block
 * using pypinyin for pinyin lookups, with 3-tier frequency sorting.
 *
 * Prerequisites:
 *   pip install pypinyin
 *
 * Usage:
 *   node scripts/build-pinyin-dict.js
 *
 * ═══════════════════════════════════════════════════════════════
 *  HOW CHARACTER FREQUENCY SORTING WORKS
 * ═══════════════════════════════════════════════════════════════
 *
 *  For each pinyin syllable, candidates are ordered in 3 tiers:
 *
 *    Tier 1 - Seed dictionary (src/pinyin-dict.js before expansion)
 *      These ~3,200 chars are hand-curated and already in good
 *      frequency order. They always appear first.
 *
 *    Tier 2 - Embedded frequency list (FREQ_CHARS below)
 *      Any characters NOT in the seed but present in this list
 *      are sorted by their position in FREQ_CHARS. This catches
 *      moderately common chars the seed missed.
 *
 *    Tier 3 - Remaining characters
 *      Everything else, sorted by Unicode code point. These are
 *      rare/archaic characters that most users won't need.
 *
 * ═══════════════════════════════════════════════════════════════
 *  HOW TO UPDATE THE FREQUENCY LIST
 * ═══════════════════════════════════════════════════════════════
 *
 *  The FREQ_CHARS string below is a ranked list of Chinese characters
 *  ordered by decreasing frequency. To improve sorting quality:
 *
 *  1. Obtain a frequency list. Good sources:
 *
 *     - Jun Da's Modern Chinese Character Frequency List
 *       https://lingua.mtsu.edu/chinese-computing/statistics/
 *       (downloadable .txt; ~9,933 chars ranked by corpus frequency)
 *
 *     - SUBTLEX-CH (subtitle corpus frequencies)
 *       https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch
 *       (~6,000 chars with frequency counts from film subtitles)
 *
 *     - The 通用规范汉字表 (Table of General Standard Chinese Characters)
 *       Official PRC standard defining 8,105 characters in 3 levels:
 *         Level 1: 3,500 most common
 *         Level 2: 3,000 common
 *         Level 3: 1,605 specialized
 *
 *  2. Format as a plain string of characters in frequency order
 *     (most frequent first). No separators needed; duplicates are
 *     automatically skipped.
 *     Example: "的一是不了人我在有他这中大..."
 *
 *  3. Replace the FREQ_CHARS value in this script with your new list.
 *     Characters already in the seed dict are automatically skipped
 *     (they keep their Tier 1 ordering), so overlap is fine.
 *
 *  4. Run:  node scripts/build-pinyin-dict.js
 *
 *  5. Bump CACHE_NAME in sw.js after updating.
 *
 *  Tip: ~5,000-8,000 characters provides excellent coverage.
 *  Beyond that there are diminishing returns since the tail
 *  characters are extremely rare.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'src', 'pinyin-dict.js');

// ── Embedded frequency list ──────────────────────────────────────
// Chars ordered by decreasing frequency from modern Chinese corpora.
// Chars already in the seed dictionary are auto-skipped during sorting.
// See "HOW TO UPDATE" section above for instructions.

const FREQ_CHARS =
  "的一是不了人我在有他这中大来上个国和也子时道说那要没会就" +
  "什么能出以去着对都好过里还后自心天生下多如然面前本事可新" +
  "从实到把种两间发已样又于起她小但头只老力进走长让太因家高" +
  "想分被点正问意无法身成三话回明真现果经部动向它民给日比才" +
  "几将二手打呢此气先用很感更全而安别处总条白最怎活合叫女水" +
  "路第次各门与外名听公加变美再业反接位定乐城直万关信系请报" +
  "应使找像战特候做主其地如世情任平认口记表完期通觉容花目光" +
  "清理内带解产声式运教场些望见收九八越书东将四度红保治北类" +
  "求数西该命离海备始管许且算义持件局住官相传形深何区提今品" +
  "思规近放组级技争非验交快切取示院色往华整格风办亲集少强考" +
  "际质空金判共建政料便由议接张害至角落讲计设改京单青确队难" +
  "早除研石济象功复制片农划志观具步孩增脸专黄阳谁程吗亚妈语" +
  "护遍广兰存引约注必普究项破例球节房吧土投底某微支福视适火" +
  "察服府低影推众拿吃室周读妇药差针卫死退欢热纪似松尼属木演" +
  "乡古简字参责英食刚写哪余排确江派层陈续显春查紧独介宣企环" +
  "假待够季付病案须卖烟座值飞团险境伤居杀练客楼较固养严修占" +
  "欧段降呼歌负洲端忽速挂省未停脑供忙套父积亡苦托互败密河守" +
  "令充根答否置池半挥朝旧编测码阿欲苏遗千野忘剧配味素采旅奖" +
  "致极圈革群评武抓雷批跑梦散温错湖录秀厅刻渐印绝句控诉左升" +
  "款杂曲沉忆靠伯窗村布承招杯培轮碰狗账忍饭悲拍残牛秘释右典" +
  "弟席雨终刘压逐拉凡缺雪默免愿鬼暗胡涉博照范审恐铁乱补倒虑" +
  "尊障遇裁梅恋乘遥混智辞厚趣健偷呆疑奶恢频毕竟吸旦悄峰征延" +
  "喊姐纱玩伸础均孙销偶痛拔扫描驾仅维赞抗择陆拥凤仿翻魔纷冲" +
  "阵挑朴折腿透摇柔阻抢朱吐签械幻杜抱吹呈暴盖副坦牌零乃幼迹" +
  "宗削弱缓洋曹档催徐珠旁奏阔侧刺犯浓胜课桌损溪锋塔仁汽侵措" +
  "趋促伙敬尤齐闻坚郑遮扩吊罚盾赶骗抵岁炮谅啊晓纵恼燃版祖模" +
  "灯棋秋碍疯孤鼓纯浪妻灵漫伪膀撤垂淡遭缩暂晋穿泛巨拒姑弃伏" +
  "吨辛屈扰绍陶键兼勇阁瞬奴铜誓妙圆脂昏净陪扭颗醒兽旋唐贯翼" +
  "恒乏碎辈践悟辨鹰曼忠患叹鉴蒙酸兔悉矛焦裤歧穆竹滚嫁剑循赖" +
  "乳腐塞艇冈漏庆稍辟苗慌娘锐惨偿剥慧慰扇凝奔疆贴舆伐攻姿妨" +
  "缝暑勒赋鹿牺惕碗稳锻咱叙潜辜堪扶搅拖墙柜惑悬蔬侮盆栏拦坟" +
  "膝剪寸饮畜竖祝腰揭尝敞淋泡壶浴扮瓷疫蓬蜂涌嘲彭燕颤雾谱朗" +
  "喝翠踪辫膜驱歉丹颈卓鸥碑沃垄纺滩盲纤汪妄膨耻杠胁猎辱涂盈" +
  "扁巷厕稀俘矮绳捕碌淑岭婆吟侠栽逮扣缴攀驳拟婚掠沫梁渡锅厨" +
  "嫂汇蜡屡拆榜罩衬俱拘宅坑阀泄沿溃帐篇仆叠倾淹衡搏拢枯聋滴" +
  "奈颊沾啃雀哈弥讶遣彼暮刃漆肢藏禅冻厉弦蛋饶笼摊绒猪寂挫滥" +
  "猫阱闭闷靖肃魄抑蔑碳艰甩巩贿赂汁谦芳鹅棚泊枣瓣桐棍柿芽椅" +
  "漠堡拙笛韵辄骤恕蚀摄帜碟敷苟侈甸盏矢唤匕颅壤涕枢熄惟瑟瀑" +
  "讽萎叮雏骚骄掀跨衍俯阎畔蹄谣懈颠匿粟僵攘浊挟沮诫鞠甫愕屿" +
  "蕴忌焚溅亢峻薯渲坠诵璧弧叛峭蔗粹媳妾谐艘渺靶搁铸堤贮氢嗅" +
  "瞻褐嘱筑颁脾朽殖歹拣卤锈桨蝶帘膏琢麓斟眷雇裘铲嗜蠢棘簸瓮" +
  "靡馈栈芙汰坎怠萌榨拧贬渗漓椭锤磕蹲苛辗嚷鲸俭铭啸窜隧崛擅" +
  "壕缆咐庇隘仕诡篡缉蛮穴宦巢枕旷柬秤豁磷遐邃鼎沦滞诽陡桩寡" +
  "魁鄙廊隶盎痹渍窖潦栖暇骡啤嫉昧瘫矩翰藻竣拱楷恤吭瞧憎龟蚁" +
  "袒疲茅惶沼猴旱泥拂辙涮纬屑邪丐尬邑裹粘腥捡霉崩苍痕碧琼汤" +
  "帅帽淮绅涅哑铅氏搜驼壳碘丑棵牧蛛昭谭侯粥宵呐蹬枚嫩蔡佣崇" +
  "渠犹寓匆苹徘淀泻窄搂棠瞅剖叨掐楠庸蔓逸趁翘怖虏澄臀卦嗓朦" +
  "颖歼陷涧磊浆晤黎曙蔚痴胚腻斧鑫橡蜀幕帆喻勃惰瞎蒸媒忧寺祥" +
  "菩慈瞭虐袭碱笨拐吵乖脖宰厘锣昔蜻衔逻疮钩呕矿裂僻赚窃蕾咸" +
  "庐缸盔氛浏肪禄唇嚼萄弊琳矫棺叉坊嘘滤壁辅蚊谨拽匠寨瓦弓逗" +
  "桑妃贰搭赐甘枫伺瘦趴恳涛肆溜蜜绣坯逢聘韧嘶翁扳铡飓忿菊喉" +
  "潇缕汹禽遏逊凳仲眩嗽榴彰葬菌诧弛绰莫俊鲤荆棱烹祈茄笙椒莓" +
  "赌磋娇钓涩吩榻甥唬掺梗蜘雁锚弘鹃屁渊垮庶澜砍窍绸蒲嗡矗朔" +
  "湘拄筒魅兆鹤遁嘈啥崖陌肖唾泌屉沧砌蝴篮厢侄惹稚窥耿哄肘壹" +
  "凑诀萝蚌阑珊腮帖绞烁蝇嘉翡淫玫膛聊蟹灶憾簇筷瘟蓄斑鞭蜓拗" +
  "嚣腕殿戳鳞飒筝甬黛玛瘤匙涎冕渤澈嗦萧跷辍诲觅邸夭淤寥隅霜" +
  "赎搀锭粱鸽蛙嗤遂萃彦飙蚤坞唧憨砰邯佬痊屹猾鳄裔蛤蹊鸾";

// ── Main ─────────────────────────────────────────────────────────

console.log('Building pinyin dictionary...');
console.log('Requires: Python 3 with pypinyin (pip install pypinyin)\n');

// Step 1: Read seed dictionary
let seedMap = {};
let seedChars = new Set();
try {
  const existing = fs.readFileSync(OUTPUT, 'utf-8');
  const regex = /(\w+):\s*\[([^\]]+)\]/g;
  let m;
  while ((m = regex.exec(existing)) !== null) {
    const syl = m[1];
    const chars = (m[2].match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1));
    seedMap[syl] = chars;
    chars.forEach(c => seedChars.add(c));
  }
  console.log(`Seed dictionary: ${seedChars.size} unique chars, ${Object.keys(seedMap).length} syllables`);
} catch {
  console.log('No existing dictionary found; Tier 1 will be empty.');
}

// Step 2: Build frequency rank for non-seed chars
const freqRank = {};
let rank = 0;
for (const ch of FREQ_CHARS) {
  if (!freqRank.hasOwnProperty(ch) && !seedChars.has(ch)) {
    freqRank[ch] = rank++;
  }
}
console.log(`Frequency list: ${rank} non-seed chars ranked for Tier 2`);

// Step 3: Get pinyin via pypinyin
const pyScriptPath = path.join(__dirname, '_pinyin_gen.py');
fs.writeFileSync(pyScriptPath, `
import json
from pypinyin import pinyin, Style
m = {}
for cp in range(0x4E00, 0x9FFF + 1):
    ch = chr(cp)
    try:
        py = pinyin(ch, style=Style.NORMAL, heteronym=False)
        if py and py[0] and py[0][0]:
            syl = py[0][0].strip()
            if syl:
                m.setdefault(syl, []).append(ch)
    except:
        pass
print(json.dumps(m, ensure_ascii=False))
`);

let rawMap;
try {
  const result = execSync(`python3 "${pyScriptPath}"`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8',
  });
  rawMap = JSON.parse(result);
} catch (err) {
  console.error('Failed to run pypinyin. Install: pip install pypinyin');
  process.exit(1);
} finally {
  try { fs.unlinkSync(pyScriptPath); } catch {}
}

// Step 4: 3-tier sort
const finalMap = {};
let t1 = 0, t2 = 0, t3 = 0;

for (const syl of Object.keys(rawMap).sort()) {
  const allSet = new Set(rawMap[syl]);
  const used = new Set();

  const tier1 = (seedMap[syl] || []).filter(c => allSet.has(c));
  tier1.forEach(c => used.add(c));
  t1 += tier1.length;

  const tier2 = [...allSet]
    .filter(c => !used.has(c) && freqRank.hasOwnProperty(c))
    .sort((a, b) => freqRank[a] - freqRank[b]);
  tier2.forEach(c => used.add(c));
  t2 += tier2.length;

  const tier3 = [...allSet]
    .filter(c => !used.has(c))
    .sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  t3 += tier3.length;

  finalMap[syl] = [...tier1, ...tier2, ...tier3];
}

const totalEntries = Object.values(finalMap).reduce((s, v) => s + v.length, 0);
const uniqueChars = new Set(Object.values(finalMap).flat()).size;

// Step 5: Write JS
const lines = [
  '/* ================================================',
  '   Comprehensive Pinyin Dictionary',
  `   ${Object.keys(finalMap).length} syllables, ~${totalEntries} character entries`,
  '   Characters from CJK Unified Ideographs (U+4E00-U+9FFF)',
  '   Frequency-sorted using 3-tier priority:',
  `     1. Seed dictionary (${t1} hand-curated common chars)`,
  `     2. Embedded frequency list (${t2} corpus-ranked chars)`,
  `     3. Remaining ${t3} chars by Unicode code point`,
  '   ================================================ */',
  '',
  'const PINYIN_MAP = {',
];

for (const syl of Object.keys(finalMap).sort()) {
  const charStr = finalMap[syl].map(c => `"${c}"`).join(', ');
  lines.push(`  ${syl}: [${charStr}],`);
}

lines.push('};');
lines.push('');
lines.push('// Export for use in app.js');
lines.push('// (loaded via <script> tag before app.js)');

fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf-8');
const size = fs.statSync(OUTPUT).size;

console.log('');
console.log(`Done! ${OUTPUT}`);
console.log(`   Syllables:    ${Object.keys(finalMap).length}`);
console.log(`   Entries:      ${totalEntries}`);
console.log(`   Unique chars: ${uniqueChars}`);
console.log(`   File size:    ${(size / 1024).toFixed(0)} KB`);
console.log('');
console.log('Sorting breakdown:');
console.log(`   Tier 1 (seed dict):      ${t1}`);
console.log(`   Tier 2 (frequency list): ${t2}`);
console.log(`   Tier 3 (code point):     ${t3}`);
console.log('');
console.log('Remember to bump CACHE_NAME in sw.js!');