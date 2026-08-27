/**
 * 冥品商店 —— 关卡门后的局内商店。
 * 只有进入地府（第 2 境起）掷门 10% 出现；用冥币买局内特殊道具。
 * 这里是地府银行存款与局内战斗的唯一交点：存的钱能在关里救急变强。
 */
export interface ShopItemDef {
  id: string;
  name: string;
  desc: string;
  /** 价格（冥币） */
  price: number;
  color: number;
  icon: string;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'rice_bag',
    name: '糯米袋',
    desc: '立即回复五成生命',
    price: 100,
    color: 0xe8e2c9,
    icon: 'icon_rice',
  },
  {
    id: 'cracker',
    name: '爆竹捆',
    desc: '全屏妖邪受 500 点伤害',
    price: 150,
    color: 0xff7a3c,
    icon: 'icon_bomb',
  },
  {
    id: 'fury_incense',
    name: '追魂香',
    desc: '本局伤害 +25%',
    price: 200,
    color: 0xd84a3a,
    icon: 'icon_cinnabar',
  },
  {
    id: 'secret_scroll',
    name: '秘传符',
    desc: '随机一件武器升 1 级',
    price: 300,
    color: 0x9fd8ff,
    icon: 'icon_scripture',
  },
  {
    id: 'jade_pendant',
    name: '镇魂玉佩',
    desc: '本局护甲 +3',
    price: 400,
    color: 0x88c9a1,
    icon: 'icon_yinyang',
  },
];

/** 商店门出现条件：进入地府（第 2 境起），掷门 10% */
export const SHOP_DOOR = {
  minStage: 2,
  chance: 0.1,
};
