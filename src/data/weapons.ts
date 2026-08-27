/**
 * 武器图鉴 —— 8 把武器，行为模型互不相同（见 WeaponBehaviorId）。
 * 只有数据，行为策略在 game/behaviors/weapons.ts，通过注册表查表派发。
 *
 * levels[0] 为 Lv1 全量基础值；其后每级只写覆盖项，逐级叠加。
 * 数值平衡调整只改本文件。
 */
import type { WeaponDef } from '../game/types';

export const WEAPONS: Record<string, WeaponDef> = {
  talisman: {
    id: 'talisman',
    name: '飞符',
    desc: '黄符化光，自动追射最近的妖邪',
    behavior: 'talisman',
    maxLevel: 8,
    color: 0xf5d76e,
    texture: 'icon_talisman',
    levels: [
      { damage: 10, cooldown: 1.0, amount: 1, speed: 380, pierce: 0, note: '掷出一张飞符' },
      { amount: 2, note: '+1 张飞符' },
      { damage: 14, cooldown: 0.9, note: '伤害提升' },
      { amount: 3, note: '+1 张飞符' },
      { pierce: 1, cooldown: 0.8, note: '飞符可穿透 1 名敌人' },
      { amount: 4, damage: 18, note: '+1 张飞符' },
      { cooldown: 0.65, speed: 460, note: '掷符更快更远' },
      { amount: 6, damage: 24, pierce: 2, note: '符如飞蝗，穿邪破鬼' },
    ],
  },

  peach_sword: {
    id: 'peach_sword',
    name: '桃木剑',
    desc: '桃木神剑绕身飞斩，近身者皆伤',
    behavior: 'orbit',
    maxLevel: 8,
    color: 0xe8845c,
    texture: 'icon_sword',
    levels: [
      { damage: 8, amount: 1, speed: 2.4, area: 60, duration: 0.5, note: '一柄桃木剑绕身' },
      { amount: 2, note: '+1 柄桃木剑' },
      { damage: 12, area: 70, note: '剑更大更利' },
      { amount: 3, speed: 3.0, note: '+1 柄，转速提升' },
      { damage: 16, area: 80, duration: 0.4, note: '伤害提升' },
      { amount: 4, note: '+1 柄桃木剑' },
      { damage: 22, area: 95, speed: 3.6, note: '剑罡外放' },
      { amount: 6, damage: 30, area: 110, duration: 0.3, note: '五雷桃木剑阵' },
    ],
  },

  rice_ward: {
    id: 'rice_ward',
    name: '糯米阵',
    desc: '糯米驱邪，周身阴秽受灼且迟滞',
    behavior: 'aura',
    maxLevel: 8,
    color: 0xe8e2c9,
    texture: 'icon_rice',
    levels: [
      { damage: 4, cooldown: 0.5, area: 90, note: '糯米灼烧近身之敌' },
      { area: 110, note: '阵域扩大' },
      { damage: 6, note: '灼烧更烈' },
      { area: 135, cooldown: 0.45, note: '阵域继续扩大' },
      { damage: 9, note: '灼烧更烈' },
      { area: 160, note: '阵域扩大' },
      { damage: 13, cooldown: 0.35, note: '灼烧更烈' },
      { area: 195, damage: 18, note: '糯米如雪，邪祟辟易' },
    ],
    // aura 行为额外约定：所有等级附带 25% 减速（写死在行为内）
  },

  coin_sword: {
    id: 'coin_sword',
    name: '铜钱剑',
    desc: '古钱串剑破邪而出，贯穿成排鬼怪',
    behavior: 'coin',
    maxLevel: 8,
    color: 0xf0c33c,
    texture: 'icon_coin',
    levels: [
      { damage: 22, cooldown: 1.6, amount: 1, speed: 520, pierce: 3, note: '掷出穿邪钱剑' },
      { pierce: 5, note: '穿透提升' },
      { amount: 2, damage: 28, note: '+1 柄钱剑' },
      { cooldown: 1.35, speed: 600, note: '出剑更快' },
      { pierce: 8, damage: 34, note: '穿透大幅提升' },
      { amount: 3, note: '+1 柄钱剑' },
      { damage: 44, cooldown: 1.15, note: '伤害提升' },
      { amount: 5, pierce: 12, damage: 55, note: '万贯钱剑，贯穿尸山' },
    ],
  },

  bagua_mirror: {
    id: 'bagua_mirror',
    name: '八卦镜',
    desc: '镜光如练，灼穿一线妖魔',
    behavior: 'mirror',
    maxLevel: 8,
    color: 0x9fd8ff,
    texture: 'icon_mirror',
    levels: [
      { damage: 14, cooldown: 2.2, amount: 1, area: 420, duration: 0.55, note: '射出一线镜光' },
      { damage: 20, note: '光束更炽' },
      { duration: 0.75, area: 480, note: '照射更久更远' },
      { damage: 27, note: '光束更炽' },
      { amount: 2, cooldown: 2.0, note: '双镜齐射' },
      { damage: 36, duration: 0.9, note: '光束更炽' },
      { area: 560, cooldown: 1.8, note: '镜光更长' },
      { amount: 3, damage: 48, duration: 1.1, note: '八卦镜阵，三光涤秽' },
    ],
  },

  soul_bell: {
    id: 'soul_bell',
    name: '镇魂铃',
    desc: '铃音荡开，震退周身鬼怪',
    behavior: 'bell',
    maxLevel: 8,
    color: 0xc9a2ff,
    texture: 'icon_bell',
    levels: [
      { damage: 12, cooldown: 2.6, area: 150, knockback: 220, duration: 0.45, note: '荡开一圈铃音' },
      { area: 185, note: '音域扩大' },
      { damage: 18, knockback: 260, note: '震退更强' },
      { area: 225, cooldown: 2.3, note: '音域扩大' },
      { damage: 26, knockback: 300, note: '震退更强' },
      { area: 270, cooldown: 2.0, note: '音域扩大' },
      { damage: 36, knockback: 340, note: '铃音催魂' },
      { area: 330, damage: 48, knockback: 380, duration: 0.35, note: '九霄铃音，群魔退散' },
    ],
  },

  thunder: {
    id: 'thunder',
    name: '天雷符',
    desc: '召天雷轰击敌群，雷落之处焦土成片',
    behavior: 'thunder',
    maxLevel: 8,
    color: 0x8fd3ff,
    texture: 'icon_thunder',
    levels: [
      { damage: 30, cooldown: 2.8, amount: 1, area: 70, duration: 0.5, note: '一道天雷落下' },
      { amount: 2, note: '+1 道天雷' },
      { damage: 42, area: 80, note: '雷区扩大' },
      { amount: 3, cooldown: 2.5, note: '+1 道天雷' },
      { damage: 56, note: '雷威更盛' },
      { amount: 4, area: 95, note: '+1 道天雷' },
      { damage: 74, cooldown: 2.2, note: '雷威更盛' },
      { amount: 6, damage: 95, area: 115, duration: 0.4, note: '五雷正法，天罚降世' },
    ],
  },

  ink_line: {
    id: 'ink_line',
    name: '墨斗线',
    desc: '墨线旋绕而出，如龙卷扫荡四野',
    behavior: 'ink',
    maxLevel: 8,
    color: 0x5a5f8c,
    texture: 'icon_ink',
    levels: [
      { damage: 9, cooldown: 3.4, amount: 2, area: 60, speed: 3.2, duration: 2.0, note: '墨刃两道旋出' },
      { amount: 3, note: '+1 道墨刃' },
      { damage: 13, area: 75, note: '墨刃更长' },
      { amount: 4, duration: 2.4, note: '+1 道墨刃' },
      { damage: 18, speed: 3.8, note: '旋转更急' },
      { amount: 5, area: 90, note: '+1 道墨刃' },
      { damage: 24, duration: 2.8, note: '墨刃更长' },
      { amount: 8, damage: 32, area: 110, speed: 4.4, duration: 3.2, note: '墨龙缠身，秽尽皆摧' },
    ],
  },

  fire_talisman: {
    id: 'fire_talisman',
    name: '火符',
    desc: '三昧真火附符而爆，炸开一片焦土',
    behavior: 'bomb',
    maxLevel: 8,
    color: 0xff7a3c,
    texture: 'icon_fire',
    levels: [
      { damage: 26, cooldown: 1.6, amount: 1, speed: 300, area: 62, pierce: 0, duration: 1.6, note: '掷出爆裂火符' },
      { area: 74, note: '爆裂范围扩大' },
      { amount: 2, damage: 34, note: '+1 张火符' },
      { cooldown: 1.4, speed: 340, note: '掷符更快' },
      { area: 88, damage: 42, note: '爆裂范围扩大' },
      { amount: 3, note: '+1 张火符' },
      { damage: 54, cooldown: 1.2, note: '火力更猛' },
      { amount: 4, damage: 68, area: 105, note: '九焰焚天，邪秽皆烬' },
    ],
  },

  spark_talisman: {
    id: 'spark_talisman',
    name: '电符',
    desc: '雷光缠身跳跃，在妖邪之间连串贯穿',
    behavior: 'chain',
    maxLevel: 8,
    color: 0x8fd3ff,
    texture: 'icon_spark',
    marketOnly: true, // 萨满道途专属起手，不进局内升级池
    levels: [
      { damage: 16, cooldown: 1.8, amount: 2, area: 230, speed: 500, note: '雷光连跳 2 次' },
      { amount: 3, note: '连跳 +1 次' },
      { damage: 22, area: 260, note: '跳距更远' },
      { amount: 4, cooldown: 1.6, note: '连跳 +1 次' },
      { damage: 30, note: '雷威更盛' },
      { amount: 6, area: 290, note: '连跳 +2 次' },
      { damage: 40, cooldown: 1.35, note: '雷威更盛' },
      { amount: 9, damage: 52, area: 330, note: '天雷勾动，链缚群邪' },
    ],
  },

  guandao: {
    id: 'guandao',
    name: '关刀',
    desc: '青龙偃月横扫，面朝方向片甲不留',
    behavior: 'sweep',
    maxLevel: 8,
    color: 0x7ec8a0,
    texture: 'icon_guandao',
    marketOnly: true, // 武士道途专属起手，不进局内升级池
    levels: [
      { damage: 38, cooldown: 1.5, amount: 1, area: 120, knockback: 300, duration: 0.22, note: '横扫面朝一片' },
      { damage: 50, note: '刀锋更利' },
      { area: 140, knockback: 340, note: '扫得更远' },
      { amount: 2, cooldown: 1.35, note: '前后两向连扫' },
      { damage: 66, area: 155, note: '刀锋更利' },
      { cooldown: 1.2, knockback: 380, note: '出刀更快' },
      { damage: 88, area: 170, note: '刀气纵横' },
      { amount: 3, damage: 112, area: 185, duration: 0.18, note: '武圣临凡，横扫八荒' },
    ],
  },

  wand: {
    id: 'wand',
    name: '西洋魔杖',
    desc: '番邦奇杖，星火会自己拐弯咬人',
    behavior: 'wand',
    maxLevel: 8,
    color: 0xf5d76e,
    texture: 'icon_wand',
    levels: [
      { damage: 12, cooldown: 1.1, amount: 2, speed: 330, area: 220, duration: 2.2, note: '两缕星火自动索敌' },
      { amount: 3, note: '+1 缕星火' },
      { damage: 17, note: '星火更炽' },
      { amount: 4, cooldown: 0.95, note: '+1 缕星火' },
      { area: 260, duration: 2.5, note: '追踪更久更远' },
      { amount: 6, damage: 23, note: '+2 缕星火' },
      { damage: 31, cooldown: 0.85, note: '星火更炽' },
      { amount: 8, damage: 40, area: 300, duration: 2.8, note: '群星环绕，指哪打哪' },
    ],
  },

  hunting_bow: {
    id: 'hunting_bow',
    name: '猎弓',
    desc: '猎人短弓连珠，箭箭咬向最近的妖邪',
    behavior: 'talisman',
    maxLevel: 8,
    color: 0xb8a06a,
    texture: 'icon_bow',
    marketOnly: true, // 猎人道途专属起手
    levels: [
      { damage: 8, cooldown: 0.72, amount: 1, speed: 470, pierce: 1, area: 1, duration: 1.6, note: '连珠快箭' },
      { cooldown: 0.66, note: '拉弓更快' },
      { amount: 2, damage: 11, note: '+1 支箭' },
      { pierce: 2, cooldown: 0.6, note: '箭可穿透' },
      { amount: 3, damage: 14, note: '+1 支箭' },
      { cooldown: 0.52, speed: 540, note: '连珠如雨' },
      { amount: 4, damage: 18, note: '+1 支箭' },
      { amount: 6, damage: 23, pierce: 3, cooldown: 0.46, note: '万箭归巢' },
    ],
  },

  soul_curse: {
    id: 'soul_curse',
    name: '蚀魂咒',
    desc: '邪术侵蚀魂魄，咒死之疫还会四散传染',
    behavior: 'curse',
    maxLevel: 8,
    color: 0x9a5ac8,
    texture: 'icon_curse',
    marketOnly: true, // 术士道途专属起手
    levels: [
      { damage: 20, cooldown: 1.3, amount: 1, speed: 290, area: 1, duration: 3, note: '咒蚀 3 秒，死后传染' },
      { damage: 26, note: '咒蚀更深' },
      { amount: 2, cooldown: 1.2, note: '+1 道咒火' },
      { duration: 3.5, damage: 33, note: '侵蚀更久' },
      { amount: 3, note: '+1 道咒火' },
      { damage: 42, cooldown: 1.05, note: '咒蚀更深' },
      { amount: 4, duration: 4, note: '+1 道咒火' },
      { amount: 6, damage: 55, cooldown: 0.95, note: '万魂噬尽，疫行千里' },
    ],
  },

  godslayer: {
    id: 'godslayer',
    name: '弑神枪',
    desc: '传说神器：枪出如龙，荡涤满屏妖邪。地府银行的终局理财产品',
    behavior: 'nuke',
    maxLevel: 8,
    color: 0xffd24a,
    texture: 'icon_godslayer',
    marketOnly: true, // 鬼市传说位，标价 999999 文
    levels: [
      { damage: 1500, cooldown: 1.2, amount: 1, area: 1, speed: 1, duration: 0.5, pierce: 0, note: '枪气荡涤全屏' },
      { damage: 2000, cooldown: 1.15, note: '枪气更烈' },
      { damage: 2600, cooldown: 1.1, note: '枪气更烈' },
      { damage: 3300, cooldown: 1.05, note: '枪气更烈' },
      { damage: 4200, cooldown: 1.0, note: '枪出惊神' },
      { damage: 5400, cooldown: 0.95, note: '枪出惊神' },
      { damage: 7000, cooldown: 0.9, note: '枪出惊神' },
      { damage: 9999, cooldown: 0.8, note: '一枪定乾坤，诸邪退避' },
    ],
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);
