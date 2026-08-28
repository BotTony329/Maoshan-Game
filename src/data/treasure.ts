/**
 * 搜打撤 · 宝箱 —— 闯幽冥每关随机刷新的可拾取赃物。
 * 价值越高越罕见（10 文 30% → 5000 文 2%）；携带状态不入账，
 * 只有走撤离门活着出去才换成铜钱——死了尽失。
 */
import { Rng } from '../core/math';

export interface TreasureTier {
  value: number;
  /** 出现概率（单次掷骰的累计区间宽度） */
  weight: number;
}

/** 价值档位（权重合计 = 0.9：90% 关卡有宝箱，10% 空手） */
export const TREASURE_TIERS: TreasureTier[] = [
  { value: 5000, weight: 0.02 },
  { value: 1000, weight: 0.08 },
  { value: 400, weight: 0.15 },
  { value: 150, weight: 0.25 },
  { value: 50, weight: 0.2 },
  { value: 10, weight: 0.2 },
];

/** 深度加成：每深入一境宝箱价值 ×1.25，封顶 5000 文 */
export function treasureDepthMult(stage: number): number {
  return Math.min(1 + 0.25 * (stage - 1), 5000 / 10);
}

/** 掷一次本关宝箱价值。返回 0 = 本关没有宝箱 */
export function rollTreasure(stage: number, rng: Rng): number {
  const roll = rng.next();
  if (roll >= 0.9) return 0; // 10% 的空关
  let acc = 0;
  const r2 = rng.next();
  for (const tier of TREASURE_TIERS) {
    acc += tier.weight / 0.9; // 归一化到剩余 0.9 区间
    if (r2 < acc) {
      const mult = treasureDepthMult(stage);
      return Math.min(5000, Math.round((tier.value * mult) / 10) * 10);
    }
  }
  return 10;
}
