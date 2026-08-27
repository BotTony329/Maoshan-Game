/**
 * 宝珠 —— 鬼市独家机制道具（局内升级池里拿不到），一局至多携带 ORB_CAP 颗。
 * 全是“改变规则”的效果而非数值贴，保证搭配策略感。
 */
import type { OrbDef } from '../game/types';

/** 一局可携带的宝珠上限 */
export const ORB_CAP = 2;

export const ORBS: Record<string, OrbDef> = {
  blood: {
    id: 'blood',
    name: '血珠',
    desc: '每诛一邪，回复 1 点生命',
    price: 250,
    color: 0xd84a3a,
    texture: 'orb_blood',
  },
  thunder: {
    id: 'thunder',
    name: '雷珠',
    desc: '每 6 秒自动落下一道天雷',
    price: 300,
    color: 0x8fd3ff,
    texture: 'orb_thunder',
  },
  ghost: {
    id: 'ghost',
    name: '鬼珠',
    desc: '魂魄吸附半径翻倍，经验 +15%',
    price: 220,
    color: 0xb0e8ff,
    texture: 'orb_ghost',
  },
  flame: {
    id: 'flame',
    name: '焰珠',
    desc: '受击时炸出灼烧冲击环（3 秒一触）',
    price: 320,
    color: 0xff9a3c,
    texture: 'orb_flame',
  },
  wind: {
    id: 'wind',
    name: '风珠',
    desc: '移速 +15%，每秒回复 0.6 生命',
    price: 260,
    color: 0xbfe8c8,
    texture: 'orb_wind',
  },
};

export const ORB_LIST = Object.values(ORBS);
