/**
 * 装备系统 —— 鬼市购买、开局前在「背包」配置（一局 ≤ EQUIP_CAP 件）。
 * 两个模式通用；装备是"改变规则"的道具，购买后永久拥有。
 */
export interface EquipDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  color: number;
  icon: string;
}

/** 一局可携带的装备上限 */
export const EQUIP_CAP = 3;

export const EQUIPMENT: EquipDef[] = [
  {
    id: 'blood',
    name: '血珠',
    desc: '每诛一邪，回复 1 点生命',
    price: 250,
    color: 0xd84a3a,
    icon: 'orb_blood',
  },
  {
    id: 'thunder',
    name: '雷珠',
    desc: '每 6 秒自动落下一道天雷',
    price: 300,
    color: 0x8fd3ff,
    icon: 'orb_thunder',
  },
  {
    id: 'ghost',
    name: '鬼珠',
    desc: '魂魄吸附半径翻倍，经验 +15%',
    price: 220,
    color: 0xb0e8ff,
    icon: 'orb_ghost',
  },
  {
    id: 'flame',
    name: '焰珠',
    desc: '受击时炸出灼烧冲击环（3 秒一触）',
    price: 320,
    color: 0xff9a3c,
    icon: 'orb_flame',
  },
  {
    id: 'wind',
    name: '风珠',
    desc: '移速 +15%，每秒回复 0.6 生命',
    price: 260,
    color: 0xbfe8c8,
    icon: 'orb_wind',
  },
  {
    id: 'sickle',
    name: '吸血镰刀',
    desc: '每诛一邪额外回复 2 点生命（与术士杖汲魂叠加）',
    price: 400,
    color: 0x8ac9a8,
    icon: 'icon_sickle',
  },
  {
    id: 'shoes',
    name: '布鞋',
    desc: '步履轻快，移速 +12%',
    price: 280,
    color: 0xc8b8e8,
    icon: 'icon_shoes',
  },
  {
    id: 'basin',
    name: '聚宝盆',
    desc: '结算铜钱 +20%',
    price: 350,
    color: 0xe8c33c,
    icon: 'icon_basin',
  },
  {
    id: 'charm',
    name: '玄铁护符',
    desc: '护甲 +2',
    price: 300,
    color: 0x8a95a8,
    icon: 'icon_charm',
  },
];
