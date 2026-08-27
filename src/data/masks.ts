/**
 * 鬼面具 —— 闯关模式专属的人物强化道具（鬼市·闯关页有售）。
 * 只在闯幽冥生效：每deep一关的推进感 + 长线养成。
 * 每个面具 3 级，买得越贵加得越多，全部拥有即全部生效（人物成长线，不做取舍）。
 */
export interface MaskDef {
  id: string;
  name: string;
  desc: string;
  color: number;
  icon: string;
  /** 每级效果描述（UI 展示） */
  perLevel: string;
}

export const MASK_MAX_LEVEL = 3;

export const MASKS = [
  {
    id: 'rage',
    name: '怒之鬼面',
    desc: '狞笑的赤面，战意灼烧',
    perLevel: '伤害 +8%',
    color: 0xd84a3a,
    icon: 'mask_rage',
  },
  {
    id: 'guard',
    name: '韧之鬼面',
    desc: '斑驳的青面，刀枪不入',
    perLevel: '护甲 +1',
    color: 0x88c9a1,
    icon: 'mask_guard',
  },
  {
    id: 'swift',
    name: '疾之鬼面',
    desc: '残影的白面，踏风而行',
    perLevel: '移速 +5%',
    color: 0xbfe8e8,
    icon: 'mask_swift',
  },
  {
    id: 'vitality',
    name: '血之鬼面',
    desc: '泣血的绯面，生气勃勃',
    perLevel: '生命上限 +20',
    color: 0xe86a8a,
    icon: 'mask_vitality',
  },
  {
    id: 'fang',
    name: '噬之鬼面',
    desc: '獠牙的黑面，食魄疗己',
    perLevel: '击杀回血 +0.5',
    color: 0x5a5f8c,
    icon: 'mask_fang',
  },
  {
    id: 'greed',
    name: '贪之鬼面',
    desc: '眯眼的金面，见钱眼开',
    perLevel: '结算铜钱 +15%',
    color: 0xd8b74a,
    icon: 'mask_greed',
  },
] as const;

/** 某级的价格（1/2/3 级）：越养越贵 */
export function maskPrice(nextLevel: number): number {
  return nextLevel === 1 ? 300 : nextLevel === 2 ? 600 : 1000;
}
