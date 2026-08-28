/**
 * 关卡之门 —— 一关打完亮出的抉择。
 * 门种效果结算在 World.chooseDoor；这里只管数据与掷门。
 * 冥品商店门：仅进入地府（第 2 境起）后 10% 概率出现。
 */
import { Rng } from '../core/math';
import { SHOP_DOOR } from './shop';
import type { DoorDef, DoorId } from '../game/types';

export const DOORS: Record<DoorId, DoorDef> = {
  next: {
    id: 'next',
    name: '下行之路',
    desc: '寻常的下一段路，安稳走完便是嘉奖',
    color: 0x9fd88f,
  },
  supply: {
    id: 'supply',
    name: '补给站',
    desc: '游方货郎的补给摊：回复五成生命，得 150 文',
    color: 0x7fd8c8,
  },
  mob: {
    id: 'mob',
    name: '小怪房',
    desc: '恶鬼筑巢：刷怪 +60%，多得 200 文',
    color: 0xe8c33c,
  },
  boss: {
    id: 'boss',
    name: 'Boss 房',
    desc: '有大家伙挡路：开场迎战，多得 300 文',
    color: 0xd84a3a,
  },
  shop: {
    id: 'shop',
    name: '冥品商店',
    desc: '地府银行分号：用冥币购特殊道具',
    color: 0x9fd8ff,
  },
  extract: {
    id: 'extract',
    name: '撤离门',
    desc: '活着出去：携带赃物与奖金全额入账',
    color: 0x5ce87a,
  },
};

/** 掷门：一关亮 1~3 扇；冥品商店门仅入地府后 10% 独立判定混入 */
export function rollDoors(stage: number, rng: Rng): DoorDef[] {
  const roll = rng.next();
  const count = roll < 0.3 ? 3 : roll < 0.75 ? 2 : 1;

  const pool: { id: DoorId; weight: number }[] = [
    { id: 'next', weight: 5 },
    { id: 'supply', weight: 2.5 },
    { id: 'mob', weight: 2.5 },
    { id: 'boss', weight: stage >= 2 ? 1.8 : 0.6 },
  ];
  const shopRoll = stage >= SHOP_DOOR.minStage && rng.next() < SHOP_DOOR.chance;

  const picked: DoorId[] = [];
  // 撤离门：第 5 境起 30% 独立判定（搜打撤的“撤”）
  const extractRoll = stage >= 5 && rng.next() < 0.3;
  if (count === 1 && !shopRoll && !extractRoll) {
    picked.push('next'); // 唯一门且无商店/撤离时保底是路
  }
  if (shopRoll) picked.push('shop');
  if (extractRoll) picked.push('extract');
  while (picked.length < count) {
    const avail = pool.filter((p) => !picked.includes(p.id));
    if (avail.length === 0) break;
    const chosen = rng.weightedPick(avail);
    picked.push(chosen.id);
  }

  // 打乱展示顺序，避免“好门永远在右边”
  return rng.shuffle(picked).map((id) => DOORS[id]);
}
