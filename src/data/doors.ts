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

/** 掷门：每轮必出 2~3 扇，「下行之路」永远在场作为保底；
 *  特殊门（补给/小怪/Boss/商店/撤离）独立判定，超出名额时随机淘汰。
 *  撤离门：第 5 境起 30% 出现——绝不强迫撤离，走不走由你。 */
export function rollDoors(stage: number, rng: Rng): DoorDef[] {
  const count = rng.next() < 0.5 ? 2 : 3;

  // 特殊门独立判定（各自通过概率才进入候选）
  const rolled: DoorId[] = [];
  if (stage >= 5 && rng.next() < 0.3) rolled.push('extract');
  if (stage >= SHOP_DOOR.minStage && rng.next() < SHOP_DOOR.chance) rolled.push('shop');
  if (stage >= 2 && rng.next() < 0.35) rolled.push('boss');
  if (rng.next() < 0.4) rolled.push('mob');
  if (rng.next() < 0.4) rolled.push('supply');

  const picked: DoorId[] = ['next']; // 保底：永远有路可走

  // 已判定的特殊门按序入列（超出名额随机淘汰）
  const shuffled = rng.shuffle(rolled);
  while (picked.length < count && shuffled.length > 0) {
    picked.push(shuffled.shift()!);
  }
  // 名额未满：从未入选的特殊门随机补位（保持类型多样性）
  const rest = rng.shuffle((['mob', 'supply', 'boss', 'shop', 'extract'] as DoorId[])
    .filter((d) => !picked.includes(d) && (d !== 'extract' || stage >= 5) && (d !== 'boss' || stage >= 2) && (d !== 'shop' || stage >= SHOP_DOOR.minStage)));
  while (picked.length < count && rest.length > 0) {
    picked.push(rest.shift()!);
  }

  // 打乱展示顺序，避免“好门永远在右边”
  return rng.shuffle(picked).map((id) => DOORS[id]);
}
