/**
 * 玩家属性结算 —— 被动法宝加成统一在此折算。
 *
 * 字段语义分两组：
 * - ADDITIVE（maxHp/regen/armor）：最终值 = 基础值 + 累计加成
 * - MULT（speed/damage/area/xpGain/magnet）：最终值 = 基础值 × (1 + 累计加成)
 * - cooldown 特殊：是“冷却缩短比例”的累计和（封顶），由武器 stat 计算时消费
 */
import { BASE_STATS } from '../data/config';
import { PASSIVES } from '../data/passives';
import type { Player, PlayerStats } from './types';

const ADDITIVE: readonly (keyof PlayerStats)[] = ['maxHp', 'regen', 'armor'];
const MULT: readonly (keyof PlayerStats)[] = ['speed', 'damage', 'area', 'xpGain', 'magnet'];

/** 冷却缩短比例封顶，防止堆满后武器变成机关枪 */
export const MAX_COOLDOWN_REDUCTION = 0.6;

/** passiveId -> 每级增量（启动时从图鉴展开成查表） */
const PASSIVE_BONUS: Record<string, Partial<PlayerStats>> = Object.fromEntries(
  Object.values(PASSIVES).map((p) => [p.id, p.perLevel]),
);

export function recalcStats(player: Player): void {
  const bonus: PlayerStats = {
    maxHp: 0, speed: 0, damage: 0, area: 0, cooldown: 0,
    regen: 0, xpGain: 0, armor: 0, magnet: 0,
  };

  for (const [passiveId, level] of player.passives) {
    const inc = PASSIVE_BONUS[passiveId];
    if (!inc || level <= 0) continue;
    for (let l = 0; l < level; l++) {
      for (const [field, value] of Object.entries(inc)) {
        bonus[field as keyof PlayerStats] += value;
      }
    }
  }

  const result: PlayerStats = { ...BASE_STATS };
  for (const field of ADDITIVE) result[field] = BASE_STATS[field] + bonus[field];
  for (const field of MULT) result[field] = BASE_STATS[field] * (1 + bonus[field]);
  result.cooldown = Math.min(bonus.cooldown, MAX_COOLDOWN_REDUCTION);

  // 上限提升时同步回复差值，避免“升级道袍反而血条变空”的观感问题
  const gained = result.maxHp - player.stats.maxHp;
  if (gained > 0) player.hp += gained;

  player.stats = result;
}
