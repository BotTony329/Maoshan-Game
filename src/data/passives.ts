/**
 * 被动法宝图鉴 —— 8 件，效果全部落在 PlayerStats 上。
 * perLevel 描述“每升一级”的增量，World 重算属性时累加。
 */
import type { PassiveDef } from '../game/types';

export const PASSIVES: Record<string, PassiveDef> = {
  robe: {
    id: 'robe',
    name: '八卦道袍',
    desc: '法体强健，生命上限提升',
    maxLevel: 5,
    perLevel: { maxHp: 25 },
    color: 0x5d8aa8,
    texture: 'icon_robe',
  },
  shoes: {
    id: 'shoes',
    name: '草鞋',
    desc: '步履轻快，移动速度提升',
    maxLevel: 5,
    perLevel: { speed: 0.08 },
    color: 0xb8a06a,
    texture: 'icon_shoes',
  },
  cinnabar: {
    id: 'cinnabar',
    name: '朱砂笔',
    desc: '画符着力，所有伤害提升',
    maxLevel: 5,
    perLevel: { damage: 0.10 },
    color: 0xd23c3c,
    texture: 'icon_cinnabar',
  },
  bronze_bell: {
    id: 'bronze_bell',
    name: '三清铃',
    desc: '法器共鸣，所有范围扩大',
    maxLevel: 5,
    perLevel: { area: 0.12 },
    color: 0xc9a2ff,
    texture: 'icon_bronze_bell',
  },
  yinyang_jade: {
    id: 'yinyang_jade',
    name: '阴阳玉',
    desc: '周天运转，法术冷却缩短',
    maxLevel: 5,
    perLevel: { cooldown: 0.07 },
    color: 0x88c9a1,
    texture: 'icon_yinyang',
  },
  gourd: {
    id: 'gourd',
    name: '玉葫芦',
    desc: '灵液自生，持续回复生命',
    maxLevel: 5,
    perLevel: { regen: 0.6 },
    color: 0xd8b25c,
    texture: 'icon_gourd',
  },
  scripture: {
    id: 'scripture',
    name: '度人经',
    desc: '参悟道藏，获取经验提升',
    maxLevel: 5,
    perLevel: { xpGain: 0.10 },
    color: 0xe8d28a,
    texture: 'icon_scripture',
  },
  ward_armor: {
    id: 'ward_armor',
    name: '罡气',
    desc: '护体罡气，每次受击减伤',
    maxLevel: 5,
    perLevel: { armor: 1.5 },
    color: 0x9fd8ff,
    texture: 'icon_armor',
  },
  kuijia: {
    id: 'kuijia',
    name: '玄铁甲胄',
    desc: '重甲披身，固若金汤',
    maxLevel: 5,
    perLevel: { armor: 2, maxHp: 20 },
    color: 0x8a95a8,
    texture: 'icon_kuijia',
    marketOnly: true, // 仅鬼市有售，不进入局内升级池
  },
};

export const PASSIVE_LIST = Object.values(PASSIVES);
